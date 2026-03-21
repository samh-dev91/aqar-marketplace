import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

/**
 * GET /api/auth/session?token=xxx
 *
 * Internal session validation endpoint used by Next.js middleware.
 * Returns { consumerId } on a valid, non-expired session, or 401.
 * No authentication required — only called from same-origin middleware.
 */
export async function GET(req: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get('token');

  if (!token) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const session = await db.consumerSession.findUnique({
    where: { token },
    select: { consumerId: true, expiresAt: true },
  });

  if (!session || session.expiresAt < new Date()) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  return NextResponse.json({ consumerId: session.consumerId });
}
