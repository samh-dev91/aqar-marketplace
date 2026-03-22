import type { MetadataRoute } from 'next';
import { db } from '@/lib/db';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://aqar-trust.com';

const BLOG_SLUGS = [
  'best-areas-cairo-2026',
  'mortgage-guide-egypt-2026',
  'new-cairo-vs-6th-october',
];

const MARKET_INDEX_ENTRIES: Array<{ year: number; month: number }> = [
  { year: 2026, month: 1 },
  { year: 2026, month: 2 },
  { year: 2026, month: 3 },
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: APP_URL,
      lastModified: now,
      changeFrequency: 'daily',
      priority: 1.0,
    },
    {
      url: `${APP_URL}/search`,
      lastModified: now,
      changeFrequency: 'hourly',
      priority: 0.9,
    },
    // Estimate
    {
      url: `${APP_URL}/estimate`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    // Finance
    {
      url: `${APP_URL}/finance`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: `${APP_URL}/finance/pre-qualify`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.6,
    },
    // Blog index
    {
      url: `${APP_URL}/blog`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.6,
    },
  ];

  // Blog post pages
  const blogRoutes: MetadataRoute.Sitemap = BLOG_SLUGS.map((slug) => ({
    url: `${APP_URL}/blog/${slug}`,
    lastModified: now,
    changeFrequency: 'monthly' as const,
    priority: 0.6,
  }));

  // Market index pages
  const marketIndexRoutes: MetadataRoute.Sitemap = MARKET_INDEX_ENTRIES.map(({ year, month }) => ({
    url: `${APP_URL}/market/index/${year}/${month}`,
    lastModified: now,
    changeFrequency: 'monthly' as const,
    priority: 0.5,
  }));

  let listingRoutes: MetadataRoute.Sitemap = [];
  let guideRoutes: MetadataRoute.Sitemap = [];
  let projectRoutes: MetadataRoute.Sitemap = [];

  try {
    const [listings, districtPairs, projects] = await Promise.all([
      db.listing.findMany({
        where: { isActive: true },
        select: { slug: true, updatedAt: true },
        orderBy: { updatedAt: 'desc' },
        // Reserve slots for other routes — max 50000 total in a single sitemap
        take: 49800,
      }),
      db.districtStats.findMany({
        select: { city: true, district: true },
        distinct: ['city', 'district'],
      }),
      db.project.findMany({
        where: { isActive: true },
        select: { slug: true, updatedAt: true },
      }),
    ]);

    listingRoutes = listings.map((l) => ({
      url: `${APP_URL}/listings/${l.slug}`,
      lastModified: l.updatedAt,
      changeFrequency: 'hourly' as const,
      priority: 0.8,
    }));

    guideRoutes = districtPairs.map(({ city, district }) => ({
      url: `${APP_URL}/guide/${encodeURIComponent(city)}/${encodeURIComponent(district)}`,
      lastModified: now,
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    }));

    projectRoutes = projects.map((p) => ({
      url: `${APP_URL}/projects/${p.slug}`,
      lastModified: p.updatedAt,
      changeFrequency: 'weekly' as const,
      priority: 0.75,
    }));
  } catch {
    // If DB is unavailable at build time, return static routes only
  }

  return [
    ...staticRoutes,
    ...blogRoutes,
    ...marketIndexRoutes,
    ...guideRoutes,
    ...projectRoutes,
    ...listingRoutes,
  ];
}
