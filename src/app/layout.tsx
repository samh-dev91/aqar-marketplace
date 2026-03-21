import type { Metadata } from 'next';
import { Cairo, Tajawal, Inter } from 'next/font/google';
import { NextIntlClientProvider } from 'next-intl';
import { getLocale, getMessages } from 'next-intl/server';
import './globals.css';

const cairo = Cairo({
  subsets: ['arabic', 'latin'],
  variable: '--font-cairo',
  display: 'swap',
});

const tajawal = Tajawal({
  subsets: ['arabic'],
  weight: ['400', '500', '700'],
  variable: '--font-tajawal',
  display: 'swap',
});

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: 'عقار ثرست — أوثق منصة عقارية في مصر',
    template: '%s | عقار ثرست',
  },
  description: 'ابحث عن عقارك المثالي بكل ثقة. عقارات موثقة، بيانات حقيقية، بدون إعلانات وهمية.',
  keywords: ['عقارات', 'شقق للبيع', 'فيلا للبيع', 'القاهرة', 'مصر'],
  openGraph: {
    type: 'website',
    locale: 'ar_EG',
    siteName: 'عقار ثرست',
  },
  robots: { index: true, follow: true },
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();
  const messages = await getMessages();
  const dir = locale === 'ar' ? 'rtl' : 'ltr';

  return (
    <html lang={locale} dir={dir} suppressHydrationWarning>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body
        className={`${cairo.variable} ${tajawal.variable} ${inter.variable} ${
          locale === 'ar' ? 'font-cairo' : 'font-inter'
        } bg-background text-gray-900 antialiased`}
      >
        <NextIntlClientProvider messages={messages}>
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
