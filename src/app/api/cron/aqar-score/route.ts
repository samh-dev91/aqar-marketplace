import { NextRequest, NextResponse } from 'next/server';
import { aqarScoreService } from '@/services/aqar-score';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest): Promise<NextResponse> {
  const secret = req.headers.get('x-cron-secret');
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  await aqarScoreService.updateDistrictStats();
  const { updated, errors } = await aqarScoreService.recomputeAll();

  return NextResponse.json({ ok: true, updated, errors });
}
