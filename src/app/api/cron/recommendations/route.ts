import { NextRequest, NextResponse } from 'next/server';
import { buildDailyRecommendations } from '@/services/cron';

export const dynamic = 'force-dynamic';

/**
 * POST /api/cron/recommendations
 * Requires x-cron-secret header matching CRON_SECRET env var.
 *
 * Triggers the daily co-view matrix build for item-based recommendations.
 * Should be called once per day (e.g. 2am Cairo).
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  const secret = req.headers.get('x-cron-secret');
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await buildDailyRecommendations();
    return NextResponse.json({
      success: true,
      message: 'Recommendation matrix built successfully',
    });
  } catch (err) {
    console.error('[cron/recommendations] Error:', err);
    return NextResponse.json(
      { success: false, message: 'Failed to build recommendation matrix' },
      { status: 500 }
    );
  }
}
