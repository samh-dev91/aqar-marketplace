import { NextRequest, NextResponse } from 'next/server';
import { generateMarketReport, saveMarketReport } from '@/services/market-report';
import { redis } from '@/lib/redis';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest): Promise<NextResponse> {
  const secret = req.headers.get('x-cron-secret');
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const report = await generateMarketReport();
  await saveMarketReport(report);

  // Bust the cached report so the next GET fetches fresh data
  try {
    await redis.del('market:report:current');
  } catch {
    // Redis unavailable — non-fatal
  }

  return NextResponse.json({
    ok: true,
    period: report.period,
    districts: report.totalDistricts,
    totalListings: report.totalListings,
  });
}
