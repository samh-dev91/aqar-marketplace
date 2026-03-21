import { nanoid } from 'nanoid';
import Decimal from 'decimal.js';
import { db } from '@/lib/db';
import type { CrmWebhookPayload } from '@/types/crm-webhook';

function generateSlug(city: string, propertyType: string): string {
  const citySlug = city.toLowerCase().replace(/[\s_]/g, '-').replace(/[^a-z0-9-]/g, '');
  const typeSlug = propertyType.toLowerCase().replace(/[^a-z]/g, '');
  return `${typeSlug}-${citySlug}-${nanoid(8)}`;
}

function computeVerificationTier(data: CrmWebhookPayload['data']): 'LISTED' | 'VERIFIED' | 'GOLD' {
  if (!data.verificationTier) return 'LISTED';
  return data.verificationTier;
}

export async function processWebhook(payload: CrmWebhookPayload): Promise<void> {
  const { event, firmId, propertyId, data } = payload;

  switch (event) {
    case 'LISTING_PUBLISHED':
      await processPublish(firmId, propertyId, data);
      break;
    case 'LISTING_UPDATED':
      await processUpdate(firmId, propertyId, data);
      break;
    case 'LISTING_REMOVED':
      await processRemove(firmId, propertyId);
      break;
    case 'STATUS_CHANGED':
      await processStatusChange(firmId, propertyId, data.status as string);
      break;
  }

  await db.syncLog.updateMany({
    where: { crmFirmId: firmId, crmPropertyId: propertyId, status: 'PENDING' },
    data: { status: 'SUCCESS', processedAt: new Date() },
  });
}

async function processPublish(
  firmId: string,
  propertyId: string,
  data: CrmWebhookPayload['data']
): Promise<void> {
  const existing = await db.listing.findUnique({
    where: { crmFirmId_crmPropertyId: { crmFirmId: firmId, crmPropertyId: propertyId } },
    select: { id: true, slug: true, askingPrice: true },
  });

  const askingPrice = new Decimal(data.askingPrice ?? 0);
  const slug = existing?.slug ?? generateSlug(data.city, data.propertyType);
  const verificationTier = computeVerificationTier(data);

  // Track price history if price changed
  if (existing && !new Decimal(existing.askingPrice).equals(askingPrice)) {
    await db.priceHistory.create({
      data: {
        listingId: existing.id,
        price: askingPrice,
        changeType: 'SYNC',
      },
    });
  }

  const upsertData = {
    slug,
    crmFirmSlug: data.firmSlug ?? '',
    titleAr: data.titleAr,
    titleEn: data.titleEn ?? null,
    propertyType: data.propertyType,
    transactionType: data.transactionType,
    address: data.address,
    district: data.district ?? null,
    city: data.city,
    area: data.area != null ? new Decimal(data.area) : null,
    bedrooms: data.bedrooms ?? null,
    bathrooms: data.bathrooms ?? null,
    floor: data.floor ?? null,
    totalFloors: data.totalFloors ?? null,
    parkingSpaces: data.parkingSpaces ?? null,
    isFurnished: data.isFurnished ?? null,
    askingPrice,
    pricePerSqm: data.pricePerSqm != null ? new Decimal(data.pricePerSqm) : null,
    images: data.images ?? [],
    videoUrl: data.videoUrl ?? null,
    verificationTier,
    isStale: false,
    staleSince: null,
    lastSyncAt: new Date(),
    brokerDisplayName: data.brokerDisplayName ?? null,
    brokerResponseTime: data.brokerResponseTime ?? null,
    brokerDealCount: data.brokerDealCount ?? null,
    firmNameAr: data.firmNameAr,
    firmNameEn: data.firmNameEn ?? null,
    firmLogoUrl: data.firmLogoUrl ?? null,
    isActive: true,
    latitude: data.latitude != null ? new Decimal(data.latitude) : null,
    longitude: data.longitude != null ? new Decimal(data.longitude) : null,
  };

  await db.listing.upsert({
    where: { crmFirmId_crmPropertyId: { crmFirmId: firmId, crmPropertyId: propertyId } },
    create: { crmFirmId: firmId, crmPropertyId: propertyId, ...upsertData },
    update: upsertData,
  });
}

async function processUpdate(
  firmId: string,
  propertyId: string,
  data: CrmWebhookPayload['data']
): Promise<void> {
  const existing = await db.listing.findUnique({
    where: { crmFirmId_crmPropertyId: { crmFirmId: firmId, crmPropertyId: propertyId } },
  });

  if (!existing) {
    // Not in marketplace yet — publish it now
    await processPublish(firmId, propertyId, data);
    return;
  }

  const newPrice = new Decimal(data.askingPrice ?? 0);
  const priceChanged = !new Decimal(existing.askingPrice).equals(newPrice);

  if (priceChanged) {
    await db.priceHistory.create({
      data: { listingId: existing.id, price: newPrice, changeType: 'SYNC' },
    });
  }

  await db.listing.update({
    where: { id: existing.id },
    data: {
      titleAr: data.titleAr,
      titleEn: data.titleEn ?? null,
      address: data.address,
      district: data.district ?? null,
      city: data.city,
      area: data.area != null ? new Decimal(data.area) : null,
      bedrooms: data.bedrooms ?? null,
      bathrooms: data.bathrooms ?? null,
      askingPrice: newPrice,
      pricePerSqm: data.pricePerSqm != null ? new Decimal(data.pricePerSqm) : null,
      images: data.images ?? existing.images,
      isStale: false,
      lastSyncAt: new Date(),
    },
  });
}

async function processRemove(firmId: string, propertyId: string): Promise<void> {
  await db.listing.updateMany({
    where: { crmFirmId: firmId, crmPropertyId: propertyId },
    data: { isActive: false },
  });
}

async function processStatusChange(
  firmId: string,
  propertyId: string,
  status: string
): Promise<void> {
  const deactivateStatuses = ['SOLD', 'RENTED', 'WITHDRAWN'];
  if (deactivateStatuses.includes(status)) {
    await db.listing.updateMany({
      where: { crmFirmId: firmId, crmPropertyId: propertyId },
      data: { isActive: false },
    });
  }
}
