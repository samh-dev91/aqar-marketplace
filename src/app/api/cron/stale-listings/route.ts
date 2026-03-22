import { NextRequest, NextResponse } from 'next/server';
import { markStaleListings } from '@/services/cron';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest): Promise<NextResponse> {
  const secret = req.headers.get('x-cron-secret');
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const result = await markStaleListings();
  return NextResponse.json({ ok: true, ...result });
}
