import { NextRequest, NextResponse } from 'next/server';
import { runSavedSearchAlerts } from '@/services/cron';

export const dynamic = 'force-dynamic';

/**
 * POST /api/cron/saved-search-alerts
 * Requires x-cron-secret header matching CRON_SECRET env var.
 *
 * Re-runs all saved consumer searches and sends WhatsApp alerts
 * when new matching listings have appeared since the last check.
 * Should be called once per day (e.g. 8am Cairo).
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  const secret = req.headers.get('x-cron-secret');
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { processed } = await runSavedSearchAlerts();
    return NextResponse.json({
      success: true,
      processed,
    });
  } catch (err) {
    console.error('[cron/saved-search-alerts] Error:', err);
    return NextResponse.json(
      { success: false, message: 'Failed to run saved search alerts' },
      { status: 500 }
    );
  }
}
