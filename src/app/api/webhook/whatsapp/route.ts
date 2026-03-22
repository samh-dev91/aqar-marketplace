import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { db } from '@/lib/db';
import { sendWhatsApp } from '@/lib/whatsapp';

export const dynamic = 'force-dynamic';

// Verify Ultramsg webhook token
function verifyUltramsg(req: NextRequest): boolean {
  const token = process.env.ULTRAMSG_TOKEN;
  if (!token) return true; // skip in dev
  const bodyToken = req.nextUrl.searchParams.get('token');
  return bodyToken === token;
}

function hashPhone(phone: string): string {
  return crypto.createHash('sha256').update(phone).digest('hex');
}

interface UltramsgWebhookBody {
  data?: {
    from?: string;
    body?: string;
    type?: string;
  };
}

interface SearchApiResponse {
  data?: Array<{
    titleAr: string;
    askingPrice: string;
    slug: string;
    bedrooms?: number;
  }>;
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  if (!verifyUltramsg(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: UltramsgWebhookBody;
  try {
    body = (await req.json()) as UltramsgWebhookBody;
  } catch {
    return NextResponse.json({ ok: true }); // ignore non-JSON
  }

  const from = body.data?.from?.replace('@c.us', '').replace(/\D/g, '') ?? '';
  const text = (body.data?.body ?? '').trim().toLowerCase();
  if (!from || body.data?.type !== 'chat') return NextResponse.json({ ok: true });

  // Normalize phone: ensure it starts with 20 for Egypt
  let phone = from;
  if (!phone.startsWith('20') && phone.startsWith('0')) {
    phone = '20' + phone.slice(1);
  } else if (!phone.startsWith('20')) {
    phone = '20' + phone;
  }

  const normalizedPhone = `+${phone}`;

  // Check for YES / NO response to an open inquiry
  const isYes = ['نعم', 'yes', 'اوكي', 'ok', 'اوك', 'يس', 'موافق'].some(
    (w) => text === w || text.startsWith(w)
  );
  const isNo = ['لا', 'no', 'الغاء', 'الغ', 'إلغاء', 'cancel'].some(
    (w) => text === w || text.startsWith(w)
  );

  if (isYes || isNo) {
    // Phone in DB is stored as full normalized phone (e.g. +201xxxxxxxxx)
    // Try exact match first, then fall back to hash lookup
    const phoneHash = hashPhone(normalizedPhone);

    const openInquiries = await db.inquiry.findMany({
      where: {
        status: 'WHATSAPP_SENT',
        expiresAt: { gt: new Date() },
        consumerPhoneHash: phoneHash,
      },
      include: {
        listing: {
          select: { titleAr: true, slug: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 1,
    });

    if (openInquiries.length > 0) {
      const inquiry = openInquiries[0];
      const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? '';

      if (isYes) {
        await db.inquiry.update({
          where: { id: inquiry.id },
          data: {
            status: 'OPTED_IN',
            consumerOptedInAt: new Date(),
            optInMethod: 'WHATSAPP',
          },
        });
        await sendWhatsApp(
          normalizedPhone,
          `شكراً! تم مشاركة رقمك مع الوسيط العقاري المسؤول عن ${inquiry.listing?.titleAr ?? 'العقار'}. سيتواصل معك قريباً.\n\nرابط العقار: ${appUrl}/listings/${inquiry.listing?.slug ?? ''}`
        );
      } else {
        await db.inquiry.update({
          where: { id: inquiry.id },
          data: {
            status: 'DECLINED',
            // NOTE: schema does not have a declinedAt field — status change records the event
          },
        });
        await sendWhatsApp(
          normalizedPhone,
          'تم إلغاء طلب مشاركة رقمك. لن يتم إرسال بياناتك للوسيط.\n\nيمكنك دائماً الاستفسار مجدداً من موقع عقار ثرست.'
        );
      }
      return NextResponse.json({ ok: true });
    }
  }

  // Search bot: pattern matching for property search
  // Patterns: "شقق المعادي", "فيلا التجمع 4 غرف", "شقق للبيع القاهرة الجديدة"
  const searchPatterns = [
    /شقق?\s+(.+)/,
    /فيلا\s+(.+)/,
    /عقار\s+(.+)/,
    /بحث\s+(.+)/,
  ];

  for (const pattern of searchPatterns) {
    const match = text.match(pattern);
    if (match) {
      const query = match[1].trim();
      const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
      try {
        const res = await fetch(
          `${appUrl}/api/search?q=${encodeURIComponent(query)}&limit=3`
        );
        const data = (await res.json()) as SearchApiResponse;
        const listings = data.data ?? [];

        if (listings.length === 0) {
          await sendWhatsApp(
            normalizedPhone,
            `لم نجد نتائج لـ "${query}". جرب البحث على: ${appUrl}/search?q=${encodeURIComponent(query)}`
          );
        } else {
          const lines = listings
            .map(
              (l, i) =>
                `${i + 1}. ${l.titleAr}\n   💰 ${Number(l.askingPrice).toLocaleString('ar-EG')} ج.م${l.bedrooms ? ` · ${l.bedrooms} غرف` : ''}\n   🔗 ${appUrl}/listings/${l.slug}`
            )
            .join('\n\n');
          await sendWhatsApp(
            normalizedPhone,
            `وجدنا ${listings.length} نتائج لـ "${query}":\n\n${lines}\n\nللبحث المتقدم: ${appUrl}/search?q=${encodeURIComponent(query)}`
          );
        }
      } catch {
        const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
        await sendWhatsApp(
          normalizedPhone,
          `للبحث عن عقارات، زور: ${appUrl}/search?q=${encodeURIComponent(query)}`
        );
      }
      return NextResponse.json({ ok: true });
    }
  }

  return NextResponse.json({ ok: true });
}
