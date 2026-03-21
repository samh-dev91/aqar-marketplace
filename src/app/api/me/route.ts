import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';

const updateSchema = z.object({
  nameAr: z.string().min(2).max(100).optional(),
  nameEn: z.string().min(2).max(100).optional(),
  email: z.string().email().optional().nullable(),
  preferredCity: z.string().max(100).optional().nullable(),
  budgetMin: z.number().positive().optional().nullable(),
  budgetMax: z.number().positive().optional().nullable(),
});

/**
 * GET /api/me
 * Returns the authenticated consumer's profile.
 * x-consumer-id is injected by middleware.
 */
export async function GET(req: NextRequest): Promise<NextResponse> {
  const consumerId = req.headers.get('x-consumer-id');
  if (!consumerId) {
    return NextResponse.json({ success: false, message: 'غير مصرح.' }, { status: 401 });
  }

  const consumer = await db.consumer.findUnique({
    where: { id: consumerId },
    select: {
      id: true,
      phone: true,
      email: true,
      nameAr: true,
      nameEn: true,
      avatarUrl: true,
      preferredCity: true,
      preferredDistricts: true,
      budgetMin: true,
      budgetMax: true,
      monthlyBudget: true,
      preferredTypes: true,
      searchPreferences: true,
      lastActiveAt: true,
      createdAt: true,
      updatedAt: true,
      // phoneHash excluded intentionally
    },
  });

  if (!consumer) {
    return NextResponse.json({ success: false, message: 'المستخدم غير موجود.' }, { status: 404 });
  }

  return NextResponse.json({
    success: true,
    data: {
      ...consumer,
      budgetMin: consumer.budgetMin?.toString() ?? null,
      budgetMax: consumer.budgetMax?.toString() ?? null,
      monthlyBudget: consumer.monthlyBudget?.toString() ?? null,
    },
  });
}

/**
 * PUT /api/me
 * Update the authenticated consumer's profile.
 */
export async function PUT(req: NextRequest): Promise<NextResponse> {
  const consumerId = req.headers.get('x-consumer-id');
  if (!consumerId) {
    return NextResponse.json({ success: false, message: 'غير مصرح.' }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ success: false, message: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, errors: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const { nameAr, nameEn, email, preferredCity, budgetMin, budgetMax } = parsed.data;

  const updated = await db.consumer.update({
    where: { id: consumerId },
    data: {
      ...(nameAr !== undefined ? { nameAr } : {}),
      ...(nameEn !== undefined ? { nameEn } : {}),
      ...(email !== undefined ? { email } : {}),
      ...(preferredCity !== undefined ? { preferredCity } : {}),
      ...(budgetMin !== undefined ? { budgetMin: budgetMin ?? null } : {}),
      ...(budgetMax !== undefined ? { budgetMax: budgetMax ?? null } : {}),
    },
    select: {
      id: true,
      phone: true,
      email: true,
      nameAr: true,
      nameEn: true,
      avatarUrl: true,
      preferredCity: true,
      preferredDistricts: true,
      budgetMin: true,
      budgetMax: true,
      monthlyBudget: true,
      preferredTypes: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return NextResponse.json({
    success: true,
    data: {
      ...updated,
      budgetMin: updated.budgetMin?.toString() ?? null,
      budgetMax: updated.budgetMax?.toString() ?? null,
      monthlyBudget: updated.monthlyBudget?.toString() ?? null,
    },
  });
}
