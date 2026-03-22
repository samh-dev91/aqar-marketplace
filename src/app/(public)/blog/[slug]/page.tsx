import React from 'react';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Calendar } from 'lucide-react';

export const revalidate = 86400; // 24h ISR

interface BlogPost {
  titleAr: string;
  publishedAt: string;
  contentAr: string;
  excerptAr: string;
}

const BLOG_POSTS: Record<string, BlogPost> = {
  'best-areas-cairo-2026': {
    titleAr: 'أفضل مناطق القاهرة للسكن في 2026',
    publishedAt: '2026-01-15',
    excerptAr: 'نستعرض في هذا التقرير أفضل المناطق السكنية في القاهرة من حيث الأسعار وجودة الحياة والخدمات.',
    contentAr: `
      تقرير شامل عن أفضل المناطق العقارية في القاهرة...

      تُعدّ القاهرة من أكبر المدن في الشرق الأوسط وأفريقيا، وتضم عشرات المناطق السكنية التي تتنوع
      بين الراقية والمتوسطة والشعبية. في هذا التقرير نستعرض أبرز المناطق التي تشهد إقبالاً كبيراً
      في عام 2026.

      ## التجمع الخامس — مدينة القاهرة الجديدة

      يُعدّ التجمع الخامس من أسرع المناطق نمواً في القاهرة، ويتميز بالبنية التحتية الحديثة
      والمشاريع السكنية المتنوعة. يُناسب الأسر الباحثة عن الهدوء والخدمات المتكاملة.

      ## المعادي

      منطقة راقية وهادئة، تشتهر بمدارسها الدولية وحدائقها الواسعة. تُعدّ خياراً مفضلاً
      للعائلات والأجانب المقيمين في مصر.

      ## الزمالك

      جزيرة في قلب القاهرة، تجمع بين الطابع الكلاسيكي والرقي. الأسعار مرتفعة لكنها
      تعكس قيمة فريدة لا تجدها في أي مكان آخر.

      ## 6 أكتوبر

      مدينة صناعية وسكنية متكاملة، تشهد طفرة عمرانية كبيرة وأسعاراً تنافسية مقارنة
      بالمناطق الأخرى في القاهرة الكبرى.
    `,
  },
  'mortgage-guide-egypt-2026': {
    titleAr: 'دليل التمويل العقاري في مصر 2026',
    publishedAt: '2026-02-01',
    excerptAr: 'كل ما تحتاج معرفته عن قروض الإسكان والتمويل العقاري في مصر — الشروط، البنوك، والأوراق المطلوبة.',
    contentAr: `
      ## ما هو التمويل العقاري؟

      التمويل العقاري هو قرض طويل الأجل تمنحه البنوك أو شركات التمويل لمساعدتك على شراء
      وحدة سكنية، على أن تُسدَّد الأقساط شهرياً على مدى سنوات.

      ## أبرز البنوك المانحة للتمويل العقاري في مصر

      - **البنك الأهلي المصري:** يقدم قروضاً تصل إلى 80% من قيمة العقار بفائدة تنافسية.
      - **بنك مصر:** برامج متنوعة للمصريين وغير المصريين.
      - **بنك القاهرة:** فترات سداد تصل إلى 25 سنة.
      - **بنك الإسكان والتعمير:** متخصص في التمويل العقاري للشريحة المتوسطة.

      ## الأوراق المطلوبة

      1. بطاقة الرقم القومي سارية المفعول
      2. مستندات الدخل (مفردات مرتب أو إقرار ضريبي)
      3. عقد ابتدائي أو عقد البيع
      4. تقرير التقييم العقاري

      ## نصائح عملية

      - لا تتجاوز قسط السداد 30% من دخلك الشهري.
      - قارن بين العروض قبل التوقيع.
      - استخدم حاسبة الأقساط في منصة عقار ثرست لتقدير تكلفة القرض.
    `,
  },
  'new-cairo-vs-6th-october': {
    titleAr: 'التجمع الخامس أم 6 أكتوبر: أيهما أفضل للاستثمار؟',
    publishedAt: '2026-02-15',
    excerptAr: 'مقارنة شاملة بين التجمع الخامس ومدينة 6 أكتوبر من حيث الأسعار، العائد الاستثماري، والخدمات.',
    contentAr: `
      ## مقدمة

      يُعدّ التجمع الخامس ومدينة 6 أكتوبر من أكثر الوجهات طلباً من المستثمرين العقاريين في مصر.
      في هذا المقال نضع كلاً منهما على الميزان.

      ## التجمع الخامس

      **المميزات:**
      - قريب من مطار القاهرة الدولي
      - مشاريع مميزة: مدينتي، كمبوند القرنفل، تاج سيتي
      - أسعار مرتفعة تعكس قيمة استثمارية حقيقية
      - طلب إيجاري قوي من المصريين العائدين من الخارج

      **العيوب:**
      - أسعار مرتفعة نسبياً للمستثمر الجديد
      - الازدحام في المداخل الرئيسية

      ## مدينة 6 أكتوبر

      **المميزات:**
      - أسعار تنافسية ومساحات أكبر
      - مناخ أفضل وهواء أنقى
      - قريبة من المناطق الصناعية (فرص إيجار للعمالة المتخصصة)
      - مشاريع جديدة تطرحها كبرى الشركات

      **العيوب:**
      - بُعد نسبي عن وسط القاهرة
      - العائد الإيجاري أقل من التجمع الخامس

      ## الخلاصة

      إن كنت تبحث عن عائد إيجاري سريع وقيمة رأسمالية متصاعدة — **التجمع الخامس** هو الأفضل.
      أما إن كنت تبحث عن وحدة بمساحة أكبر بسعر معقول — فـ**6 أكتوبر** خيار لا يُهمل.
    `,
  },
};

export function generateStaticParams() {
  return Object.keys(BLOG_POSTS).map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const post = BLOG_POSTS[params.slug];
  if (!post) return {};

  return {
    title: `${post.titleAr} | عقار ثرست`,
    description: post.excerptAr,
    openGraph: {
      title: `${post.titleAr} | عقار ثرست`,
      description: post.excerptAr,
      type: 'article',
      locale: 'ar_EG',
      publishedTime: post.publishedAt,
    },
  };
}

export default function BlogPostPage({ params }: { params: { slug: string } }) {
  const post = BLOG_POSTS[params.slug];
  if (!post) notFound();

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://aqar-trust.com';

  const articleSchema = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: post.titleAr,
    datePublished: post.publishedAt,
    inLanguage: 'ar',
    publisher: {
      '@type': 'Organization',
      name: 'عقار ثرست',
      url: appUrl,
      logo: {
        '@type': 'ImageObject',
        url: `${appUrl}/icons/pwa-192x192.png`,
      },
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': `${appUrl}/blog/${params.slug}`,
    },
  };

  // Format the date for display
  const formattedDate = new Date(post.publishedAt).toLocaleDateString('ar-EG', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  // Split content into paragraphs for rendering
  const paragraphs = post.contentAr
    .trim()
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }}
      />

      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10" dir="rtl">
        {/* Breadcrumb */}
        <nav className="text-sm text-gray-500 flex items-center gap-1.5 mb-8" aria-label="breadcrumb">
          <a href="/" className="hover:text-primary-700 transition-colors">الرئيسية</a>
          <span>/</span>
          <a href="/blog" className="hover:text-primary-700 transition-colors">المدونة</a>
          <span>/</span>
          <span className="text-gray-900 font-medium truncate">{post.titleAr}</span>
        </nav>

        {/* Article header */}
        <header className="mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 leading-tight mb-4">
            {post.titleAr}
          </h1>
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Calendar size={15} />
            <time dateTime={post.publishedAt}>{formattedDate}</time>
            <span>·</span>
            <span>عقار ثرست</span>
          </div>
          <p className="mt-4 text-lg text-gray-600 leading-relaxed border-r-4 border-primary-700 pr-4">
            {post.excerptAr}
          </p>
        </header>

        {/* Article body */}
        <article className="prose prose-lg prose-headings:font-bold prose-headings:text-gray-900 max-w-none text-gray-700 leading-relaxed space-y-4">
          {paragraphs.map((para, i) => {
            if (para.startsWith('## ')) {
              return (
                <h2 key={i} className="text-xl font-bold text-gray-900 mt-8 mb-3">
                  {para.replace('## ', '')}
                </h2>
              );
            }
            if (para.startsWith('**') && para.endsWith('**')) {
              return (
                <p key={i} className="font-semibold text-gray-800">
                  {para.replace(/\*\*/g, '')}
                </p>
              );
            }
            if (para.startsWith('- ')) {
              return (
                <li key={i} className="list-disc list-inside text-gray-700">
                  {para.replace('- ', '')}
                </li>
              );
            }
            if (/^\d+\./.test(para)) {
              return (
                <li key={i} className="list-decimal list-inside text-gray-700">
                  {para.replace(/^\d+\.\s*/, '')}
                </li>
              );
            }
            return (
              <p key={i} className="text-gray-700 leading-relaxed">
                {para}
              </p>
            );
          })}
        </article>

        {/* CTA */}
        <div className="mt-12 p-6 bg-primary-50 border border-primary-100 rounded-2xl text-center">
          <p className="text-gray-700 font-medium mb-4">
            شاهد أحدث الإعلانات العقارية الموثقة في عقار ثرست
          </p>
          <Link
            href="/search"
            className="inline-flex items-center gap-2 bg-primary-700 hover:bg-primary-900 text-white font-semibold px-8 py-3 rounded-xl transition-colors"
          >
            تصفح العقارات الآن
          </Link>
        </div>
      </div>
    </>
  );
}
