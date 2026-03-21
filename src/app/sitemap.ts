import type { MetadataRoute } from 'next';
import { db } from '@/lib/db';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://aqar-trust.com';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: APP_URL,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1.0,
    },
    {
      url: `${APP_URL}/search`,
      lastModified: new Date(),
      changeFrequency: 'hourly',
      priority: 0.9,
    },
  ];

  let listingRoutes: MetadataRoute.Sitemap = [];

  try {
    const listings = await db.listing.findMany({
      where: { isActive: true },
      select: { slug: true, updatedAt: true },
      orderBy: { updatedAt: 'desc' },
      take: 49998, // reserve 2 slots for static routes (max 50000 total)
    });

    listingRoutes = listings.map((l) => ({
      url: `${APP_URL}/listings/${l.slug}`,
      lastModified: l.updatedAt,
      changeFrequency: 'hourly' as const,
      priority: 0.8,
    }));
  } catch {
    // If DB is unavailable at build time, return static routes only
  }

  return [...staticRoutes, ...listingRoutes];
}
