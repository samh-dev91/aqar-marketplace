import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { redis } from '@/lib/redis';

export const dynamic = 'force-dynamic';

export async function GET(): Promise<NextResponse> {
  const checks: Record<string, 'ok' | 'error'> = {};

  // DB check
  try {
    await db.$queryRaw`SELECT 1`;
    checks.database = 'ok';
  } catch {
    checks.database = 'error';
  }

  // Redis check
  try {
    await redis.ping();
    checks.redis = 'ok';
  } catch {
    checks.redis = 'error';
  }

  const allOk = Object.values(checks).every((v) => v === 'ok');
  return NextResponse.json(
    { status: allOk ? 'ok' : 'degraded', checks, timestamp: new Date().toISOString() },
    { status: allOk ? 200 : 503 }
  );
}
