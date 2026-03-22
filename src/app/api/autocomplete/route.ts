import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { redis } from '@/lib/redis';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest): Promise<NextResponse> {
  // Sliding window rate limit: 60 req/min per IP
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
  try {
    const rateLimitKey = `rl:autocomplete:${ip}`;
    const count = await redis.incr(rateLimitKey);
    if (count === 1) await redis.expire(rateLimitKey, 60);
    if (count > 60) {
      return NextResponse.json({ suggestions: [] }, { status: 429 });
    }
  } catch { /* Redis unavailable — allow request */ }

  const q = req.nextUrl.searchParams.get('q')?.trim() ?? '';

  if (q.length < 2) {
    return NextResponse.json({ success: true, data: [] });
  }

  const cacheKey = `autocomplete:${q.toLowerCase()}`;
  try {
    const cached = await redis.get(cacheKey);
    if (cached) {
      return NextResponse.json({ success: true, data: JSON.parse(cached) });
    }
  } catch { /* Redis unavailable */ }

  // Search districts and cities
  const [districts, cities] = await Promise.all([
    db.listing.findMany({
      where: {
        isActive: true,
        district: { contains: q, mode: 'insensitive' },
      },
      select: { district: true, city: true },
      distinct: ['district', 'city'],
      take: 5,
    }),
    db.listing.findMany({
      where: {
        isActive: true,
        city: { contains: q, mode: 'insensitive' },
      },
      select: { city: true },
      distinct: ['city'],
      take: 3,
    }),
  ]);

  const results = [
    ...cities.map((c) => ({ type: 'city', label: c.city, value: c.city })),
    ...districts
      .filter((d) => d.district)
      .map((d) => ({ type: 'district', label: `${d.district}، ${d.city}`, value: d.district!, city: d.city })),
  ];

  try {
    await redis.setex(cacheKey, 300, JSON.stringify(results)); // cache 5min
  } catch { /* Redis unavailable */ }

  return NextResponse.json({ success: true, data: results });
}
