import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { Calendar, ArrowLeft } from 'lucide-react';

export const revalidate = 86400; // 24h ISR

export const metadata: Metadata = {
  title: 'المدونة العقارية | عقار ثرست',
  description: 'مقالات وتقارير عقارية متخصصة — أسواق، تمويل، واستثمار في مصر.',
  openGraph: {
    title: 'المدونة العقارية | عقار ثرست',
    description: 'مقالات وتقارير عقارية متخصصة — أسواق، تمويل، واستثمار في مصر.',
    type: 'website',
    locale: 'ar_EG',
  },
};

interface BlogPostMeta {
  slug: string;
  titleAr: string;
  publishedAt: string;
  excerptAr: string;
}

const POSTS: BlogPostMeta[] = [
  {
    slug: 'best-areas-cairo-2026',
    titleAr: 'أفضل مناطق القاهرة للسكن في 2026',
    publishedAt: '2026-01-15',
    excerptAr:
      'نستعرض في هذا التقرير أفضل المناطق السكنية في القاهرة من حيث الأسعار وجودة الحياة والخدمات.',
  },
  {
    slug: 'mortgage-guide-egypt-2026',
    titleAr: 'دليل التمويل العقاري في مصر 2026',
    publishedAt: '2026-02-01',
    excerptAr:
      'كل ما تحتاج معرفته عن قروض الإسكان والتمويل العقاري في مصر — الشروط، البنوك، والأوراق المطلوبة.',
  },
  {
    slug: 'new-cairo-vs-6th-october',
    titleAr: 'التجمع الخامس أم 6 أكتوبر: أيهما أفضل للاستثمار؟',
    publishedAt: '2026-02-15',
    excerptAr:
      'مقارنة شاملة بين التجمع الخامس ومدينة 6 أكتوبر من حيث الأسعار، العائد الاستثماري، والخدمات.',
  },
];

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://aqar-trust.com';

const itemListSchema = {
  '@context': 'https://schema.org',
  '@type': 'ItemList',
  name: 'المدونة العقارية — عقار ثرست',
  itemListElement: POSTS.map((post, index) => ({
    '@type': 'ListItem',
    position: index + 1,
    url: `${APP_URL}/blog/${post.slug}`,
    name: post.titleAr,
  })),
};

export default function BlogIndexPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListSchema) }}
      />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10" dir="rtl">
        {/* Page header */}
        <header className="mb-10">
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-3">
            المدونة العقارية
          </h1>
          <p className="text-gray-500 text-lg">
            مقالات وتقارير متخصصة في السوق العقاري المصري
          </p>
        </header>

        {/* Post list */}
        <div className="space-y-6">
          {POSTS.map((post) => {
            const formattedDate = new Date(post.publishedAt).toLocaleDateString('ar-EG', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            });

            return (
              <article
                key={post.slug}
                className="bg-white border border-gray-100 rounded-2xl shadow-sm p-6 hover:shadow-md transition-shadow"
              >
                <Link href={`/blog/${post.slug}`} className="block group">
                  <h2 className="text-xl font-bold text-gray-900 group-hover:text-primary-700 transition-colors mb-2">
                    {post.titleAr}
                  </h2>
                  <p className="text-gray-600 leading-relaxed mb-4">{post.excerptAr}</p>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm text-gray-400">
                      <Calendar size={14} />
                      <time dateTime={post.publishedAt}>{formattedDate}</time>
                    </div>
                    <span className="flex items-center gap-1 text-primary-700 text-sm font-medium group-hover:gap-2 transition-all">
                      اقرأ المقال
                      <ArrowLeft size={14} />
                    </span>
                  </div>
                </Link>
              </article>
            );
          })}
        </div>

        {/* Bottom CTA */}
        <div className="mt-12 text-center">
          <Link
            href="/search"
            className="inline-flex items-center gap-2 bg-primary-700 hover:bg-primary-900 text-white font-semibold px-8 py-3.5 rounded-xl transition-colors shadow-md"
          >
            تصفح أحدث الإعلانات
          </Link>
        </div>
      </div>
    </>
  );
}
