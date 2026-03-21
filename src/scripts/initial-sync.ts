/**
 * Initial data sync from CRM to marketplace.
 * Run once: npx tsx src/scripts/initial-sync.ts
 */

import { config } from 'dotenv';
config({ path: '.env.local' });

import { db } from '../lib/db';
import { crmBridgeApi } from '../lib/crm-api';
import { processWebhook } from '../services/listing-sync';

async function main() {
  console.log('Starting initial sync from CRM...');

  let page = 1;
  let total = 0;
  let synced = 0;

  while (true) {
    console.log(`Fetching page ${page}...`);
    let result: Awaited<ReturnType<typeof crmBridgeApi.getListings>>;

    try {
      result = await crmBridgeApi.getListings(page, 50);
    } catch (err) {
      console.error('Failed to fetch from CRM bridge:', err);
      break;
    }

    if (page === 1) {
      total = result.total;
      console.log(`Total listings to sync: ${total}`);
    }

    for (const listing of result.data) {
      try {
        await processWebhook({
          event: 'LISTING_PUBLISHED',
          firmId: listing.firmId,
          firmSlug: listing.firmSlug,
          propertyId: listing.id,
          timestamp: new Date().toISOString(),
          data: {
            titleAr: listing.titleAr,
            titleEn: listing.titleEn,
            propertyType: listing.propertyType,
            transactionType: listing.transactionType,
            address: listing.address,
            district: listing.district,
            city: listing.city,
            area: listing.area != null ? listing.area : undefined,
            bedrooms: listing.bedrooms ?? undefined,
            bathrooms: listing.bathrooms ?? undefined,
            floor: undefined,
            totalFloors: undefined,
            parkingSpaces: undefined,
            isFurnished: undefined,
            askingPrice: listing.askingPrice,
            pricePerSqm: listing.pricePerSqm ?? undefined,
            images: listing.images,
            status: undefined,
            isExclusive: listing.isExclusive,
            firmNameAr: listing.firmNameAr,
            firmNameEn: listing.firmNameEn,
            firmLogoUrl: listing.firmLogoUrl,
            brokerDisplayName: listing.brokerDisplayName,
          },
        });
        synced++;
        if (synced % 10 === 0) console.log(`Synced ${synced}/${total}...`);
      } catch (err) {
        console.error(`Failed to sync listing ${listing.id}:`, err);
      }
    }

    if (!result.hasMore) break;
    page++;
  }

  console.log(`Initial sync complete. Synced ${synced}/${total} listings.`);

  // Also sync district stats
  console.log('Syncing district stats...');
  try {
    const stats = await crmBridgeApi.getDistrictStats() as Array<{
      city: string; district: string; propertyType: string; transactionType: string;
      avgPricePerSqm: number; medianPrice: number; avgDaysOnMarket: number;
      dealVelocity: number; listingCount: number;
    }>;
    for (const stat of stats) {
      await db.districtStats.upsert({
        where: {
          city_district_propertyType_transactionType: {
            city: stat.city,
            district: stat.district,
            propertyType: stat.propertyType,
            transactionType: stat.transactionType,
          },
        },
        create: {
          city: stat.city, district: stat.district,
          propertyType: stat.propertyType, transactionType: stat.transactionType,
          avgPricePerSqm: stat.avgPricePerSqm,
          medianPrice: stat.medianPrice,
          avgDaysOnMarket: stat.avgDaysOnMarket,
          dealVelocity: stat.dealVelocity,
          priceChange6m: 0,
          priceChange12m: 0,
          listingCount: stat.listingCount,
        },
        update: {
          avgPricePerSqm: stat.avgPricePerSqm,
          medianPrice: stat.medianPrice,
          avgDaysOnMarket: stat.avgDaysOnMarket,
          dealVelocity: stat.dealVelocity,
          listingCount: stat.listingCount,
          computedAt: new Date(),
        },
      });
    }
    console.log(`Synced ${stats.length} district stats.`);
  } catch (err) {
    console.error('District stats sync failed:', err);
  }

  await db.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
