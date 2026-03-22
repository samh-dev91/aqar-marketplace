import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { redis } from '@/lib/redis';
import { sendWhatsApp } from '@/lib/whatsapp';

export const dynamic = 'force-dynamic';

interface ProjectInquiryBody {
  name?: string;
  phone?: string;
  message?: string;
  unitType?: string;
}

export async function POST(
  req: NextRequest,
  { params }: { params: { slug: string } }
): Promise<NextResponse> {
  const body = await req.json() as ProjectInquiryBody;
  const { name, phone, message, unitType } = body;

  if (!name?.trim() || !phone?.trim()) {
    return NextResponse.json({ error: 'الاسم ورقم الهاتف مطلوبان' }, { status: 400 });
  }

  // Rate limit: 5 inquiries per phone per hour
  const rateKey = `rl:project-inquiry:${phone.replace(/\D/g, '')}`;
  const count = await redis.incr(rateKey);
  if (count === 1) await redis.expire(rateKey, 3600);
  if (count > 5) {
    return NextResponse.json({ error: 'تم تجاوز الحد المسموح به. حاول لاحقاً.' }, { status: 429 });
  }

  const project = await db.project.findUnique({
    where: { slug: params.slug, isActive: true },
    select: { id: true, nameAr: true, developerNameAr: true },
  });

  if (!project) {
    return NextResponse.json({ error: 'المشروع غير موجود' }, { status: 404 });
  }

  console.log(
    `[Project Inquiry] ${project.nameAr} — ${name} (${phone}): ${message ?? ''} | Unit: ${unitType ?? 'any'}`
  );

  // Send WhatsApp confirmation to consumer (fire-and-forget)
  void sendWhatsApp(
    phone,
    `شكراً ${name}،\n\nتم استلام استفساركم عن مشروع ${project.nameAr} من ${project.developerNameAr}.\n\nسيتواصل معكم الوسيط المسؤول عن المشروع قريباً.\n\nعقار ثرست — أوثق منصة عقارية في مصر`
  );

  return NextResponse.json({ success: true, message: 'تم استلام استفسارك بنجاح' });
}
