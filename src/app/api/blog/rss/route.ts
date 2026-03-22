import { NextResponse } from 'next/server';

export const dynamic = 'force-static';
export const revalidate = 86400; // 24h

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://aqar-trust.com';

interface RssItem {
  slug: string;
  titleAr: string;
  descriptionAr: string;
  publishedAt: string; // ISO date string YYYY-MM-DD
}

const BLOG_ITEMS: RssItem[] = [
  {
    slug: 'best-areas-cairo-2026',
    titleAr: 'أفضل مناطق القاهرة للسكن في 2026',
    descriptionAr:
      'نستعرض في هذا التقرير أفضل المناطق السكنية في القاهرة من حيث الأسعار وجودة الحياة والخدمات.',
    publishedAt: '2026-01-15',
  },
  {
    slug: 'mortgage-guide-egypt-2026',
    titleAr: 'دليل التمويل العقاري في مصر 2026',
    descriptionAr:
      'كل ما تحتاج معرفته عن قروض الإسكان والتمويل العقاري في مصر — الشروط، البنوك، والأوراق المطلوبة.',
    publishedAt: '2026-02-01',
  },
  {
    slug: 'new-cairo-vs-6th-october',
    titleAr: 'التجمع الخامس أم 6 أكتوبر: أيهما أفضل للاستثمار؟',
    descriptionAr:
      'مقارنة شاملة بين التجمع الخامس ومدينة 6 أكتوبر من حيث الأسعار، العائد الاستثماري، والخدمات.',
    publishedAt: '2026-02-15',
  },
];

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function toRfc822(dateStr: string): string {
  return new Date(dateStr).toUTCString();
}

export async function GET(): Promise<NextResponse> {
  const items = BLOG_ITEMS.map(
    (item) => `
    <item>
      <guid isPermaLink="true">${APP_URL}/blog/${item.slug}</guid>
      <title>${escapeXml(item.titleAr)}</title>
      <description>${escapeXml(item.descriptionAr)}</description>
      <pubDate>${toRfc822(item.publishedAt)}</pubDate>
      <link>${APP_URL}/blog/${item.slug}</link>
    </item>`
  ).join('\n');

  const lastBuildDate = toRfc822(BLOG_ITEMS[0]?.publishedAt ?? new Date().toISOString());

  const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>عقار ثرست — المدونة العقارية</title>
    <link>${APP_URL}</link>
    <description>مقالات وتقارير عقارية متخصصة من منصة عقار ثرست</description>
    <language>ar</language>
    <lastBuildDate>${lastBuildDate}</lastBuildDate>
    <atom:link href="${APP_URL}/api/blog/rss" rel="self" type="application/rss+xml" />
    ${items}
  </channel>
</rss>`;

  return new NextResponse(rss, {
    status: 200,
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=3600',
    },
  });
}
