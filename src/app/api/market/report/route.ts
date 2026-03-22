import { NextRequest, NextResponse } from 'next/server';
import { generateMarketReport, type MarketReportData } from '@/services/market-report';
import { redis } from '@/lib/redis';

export const dynamic = 'force-dynamic';
export const revalidate = 3600; // 1 hour

export async function GET(req: NextRequest): Promise<NextResponse> {
  const period = req.nextUrl.searchParams.get('period') ?? undefined;
  const cacheKey = `market:report:${period ?? 'current'}`;

  // Try cache first (1-hour TTL)
  try {
    const cached = await redis.get(cacheKey);
    if (cached) {
      return NextResponse.json(JSON.parse(cached) as MarketReportData, {
        headers: { 'X-Cache': 'HIT' },
      });
    }
  } catch {
    // Redis unavailable — fall through to live query
  }

  const report = await generateMarketReport(period);

  try {
    void redis.setex(cacheKey, 3600, JSON.stringify(report));
  } catch {
    // Redis unavailable — non-fatal
  }

  return NextResponse.json(report, {
    headers: { 'X-Cache': 'MISS' },
  });
}
