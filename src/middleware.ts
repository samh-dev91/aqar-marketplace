import { NextRequest, NextResponse } from 'next/server';

/**
 * Next.js middleware for consumer auth.
 *
 * Protected routes: /api/favorites/*, /api/alerts/*, /api/me/*
 *
 * Reads `Authorization: Bearer <token>` header.
 * Validates the token via the internal /api/auth/session endpoint.
 * On success: forwards request with `x-consumer-id` header set.
 * On failure: returns 401 JSON.
 *
 * Cannot use Prisma directly here (edge runtime constraint), so
 * we delegate to the /api/auth/session route handler.
 */
export async function middleware(req: NextRequest): Promise<NextResponse> {
  const authHeader = req.headers.get('authorization');
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    return NextResponse.json(
      { success: false, message: 'غير مصرح. يرجى تسجيل الدخول أولاً.' },
      { status: 401 }
    );
  }

  // Validate session via internal endpoint
  const sessionUrl = new URL('/api/auth/session', req.nextUrl.origin);
  sessionUrl.searchParams.set('token', token);

  let consumerId: string;
  try {
    const sessionRes = await fetch(sessionUrl.toString(), {
      method: 'GET',
      headers: { 'content-type': 'application/json' },
    });

    if (!sessionRes.ok) {
      return NextResponse.json(
        { success: false, message: 'الجلسة منتهية الصلاحية أو غير صالحة. يرجى تسجيل الدخول مجدداً.' },
        { status: 401 }
      );
    }

    const data = (await sessionRes.json()) as { consumerId?: string };
    if (!data.consumerId) {
      return NextResponse.json(
        { success: false, message: 'غير مصرح.' },
        { status: 401 }
      );
    }
    consumerId = data.consumerId;
  } catch {
    return NextResponse.json(
      { success: false, message: 'خطأ في التحقق من الجلسة. حاول مرة أخرى.' },
      { status: 500 }
    );
  }

  // Clone the request and inject x-consumer-id for downstream route handlers
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set('x-consumer-id', consumerId);

  return NextResponse.next({
    request: { headers: requestHeaders },
  });
}

export const config = {
  matcher: ['/api/favorites/:path*', '/api/alerts/:path*', '/api/me/:path*'],
};
