import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import dynamic from 'next/dynamic';
import { MapPin, Calendar, Home, CheckCircle } from 'lucide-react';
import { ListingCard } from '@/components/listing/listing-card';
import { formatPrice } from '@/lib/format';
import type { ListingCard as ListingCardType } from '@/types/listing';

const UnitMatrix = dynamic(
  () =>
    import('@/components/project/unit-matrix').then((m) => m.UnitMatrix),
  { ssr: false },
);

const ProjectInquiryModal = dynamic(
  () =>
    import('./project-inquiry-modal').then((m) => m.ProjectInquiryModal),
  { ssr: false },
);

export const revalidate = 3600;

interface ProjectListing {
  id: string;
  slug: string;
  titleAr: string;
  propertyType: string;
  bedrooms: number | null;
  bathrooms: number | null;
  area: string | null;
  floor: number | null;
  askingPrice: string;
  verificationTier: string;
  aqarScore: number | null;
  images: string[];
  status: string;
}

interface ProjectDetail {
  id: string;
  slug: string;
  nameAr: string;
  nameEn: string | null;
  developerNameAr: string;
  coverImageUrl: string | null;
  galleryImages: string[];
  videoUrl: string | null;
  district: string;
  city: string;
  latitude: string | null;
  longitude: string | null;
  deliveryYear: number | null;
  totalUnits: number | null;
  availableUnits: number | null;
  minPrice: string;
  maxPrice: string | null;
  hasFinancing: boolean;
  minDownPayment: number | null;
  maxYears: number | null;
  amenities: string[];
  descriptionAr: string | null;
  listings: ProjectListing[];
}

const AMENITY_DETAILS: Record<string, { icon: string; label: string }> = {
  pool: { icon: '🏊', label: 'حمام سباحة' },
  gym: { icon: '🏋️', label: 'صالة رياضية' },
  security: { icon: '🔒', label: 'حراسة 24/7' },
  parking: { icon: '🚗', label: 'مواقف سيارات' },
  garden: { icon: '🌳', label: 'حدائق' },
  club: { icon: '🎾', label: 'نادي رياضي' },
  mosque: { icon: '🕌', label: 'مسجد' },
  school: { icon: '🏫', label: 'مدارس' },
  mall: { icon: '🛍️', label: 'مول تجاري' },
  hospital: { icon: '🏥', label: 'مستشفى' },
};

async function getProject(slug: string): Promise<ProjectDetail | null> {
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'}/api/projects/${slug}`,
      { next: { revalidate: 3600 } },
    );
    if (!res.ok) return null;
    const data = (await res.json()) as { data?: ProjectDetail };
    return data.data ?? null;
  } catch {
    return null;
  }
}

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const project = await getProject(params.slug);
  if (!project) return { title: 'مشروع غير موجود' };
  return {
    title: `${project.nameAr} — ${project.developerNameAr}`,
    description:
      project.descriptionAr ??
      `مشروع ${project.nameAr} في ${project.district}، ${project.city}. يبدأ السعر من ${formatPrice(Number(project.minPrice))}.`,
  };
}

function toListingCard(
  l: ProjectListing,
  project: ProjectDetail,
): ListingCardType {
  const tier = (
    ['LISTED', 'VERIFIED', 'GOLD'].includes(l.verificationTier)
      ? l.verificationTier
      : 'LISTED'
  ) as 'LISTED' | 'VERIFIED' | 'GOLD';

  return {
    id: l.id,
    slug: l.slug,
    titleAr: l.titleAr,
    titleEn: undefined,
    propertyType: l.propertyType,
    transactionType: 'SALE',
    address: `${project.district}، ${project.city}`,
    district: project.district,
    city: project.city,
    area: l.area !== null ? Number(l.area) : undefined,
    bedrooms: l.bedrooms ?? undefined,
    bathrooms: l.bathrooms ?? undefined,
    askingPrice: l.askingPrice,
    pricePerSqm: undefined,
    priceIsHidden: false,
    images: l.images,
    verificationTier: tier,
    isStale: false,
    lastSyncAt: new Date().toISOString(),
    aqarScore: l.aqarScore ?? undefined,
    brokerDisplayName: undefined,
    firmNameAr: project.developerNameAr,
    firmNameEn: project.nameEn ?? undefined,
    firmLogoUrl: undefined,
    hasFinancing: project.hasFinancing,
    monthlyFrom: undefined,
    viewCount: 0,
    favoriteCount: 0,
    isActive: l.status === 'AVAILABLE',
    publishedAt: new Date().toISOString(),
  };
}

export default async function ProjectDetailPage({
  params,
}: {
  params: { slug: string };
}) {
  const project = await getProject(params.slug);
  if (!project) notFound();

  const hasFloorData = project.listings.some((l) => l.floor !== null);
  const listingCards = project.listings.slice(0, 12).map((l) =>
    toListingCard(l, project),
  );

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      {/* Hero Image */}
      <div className="relative h-64 md:h-96 bg-primary-900">
        {project.coverImageUrl ? (
          <Image
            src={project.coverImageUrl}
            alt={project.nameAr}
            fill
            className="object-cover"
            sizes="100vw"
            priority
          />
        ) : (
          <div className="h-full bg-gradient-to-br from-primary-900 to-primary-700" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
        <div className="absolute bottom-6 right-6 text-white">
          <p className="text-sm font-cairo text-white/70 mb-1">
            {project.developerNameAr}
          </p>
          <h1 className="text-3xl font-bold font-tajawal">{project.nameAr}</h1>
          <div className="flex items-center gap-2 mt-2 text-sm font-cairo text-white/80">
            <MapPin size={14} />
            <span>
              {project.district}، {project.city}
            </span>
            {project.deliveryYear && (
              <>
                <span>·</span>
                <Calendar size={14} />
                <span>تسليم {project.deliveryYear}</span>
              </>
            )}
          </div>
        </div>
        {/* Verified badge */}
        <div className="absolute top-4 end-4 bg-primary-700 text-white text-xs font-cairo font-bold px-3 py-1.5 rounded-full flex items-center gap-1.5">
          <CheckCircle size={12} />
          مشروع موثق على عقار ثرست
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              {
                label: 'إجمالي الوحدات',
                value: project.totalUnits?.toString() ?? '—',
              },
              {
                label: 'الوحدات المتاحة',
                value: project.availableUnits?.toString() ?? '—',
              },
              {
                label: 'يبدأ من',
                value: formatPrice(Number(project.minPrice)),
              },
              {
                label: 'مقدم',
                value:
                  project.minDownPayment !== null
                    ? `${project.minDownPayment}%`
                    : 'نقداً',
              },
            ].map((stat) => (
              <div
                key={stat.label}
                className="bg-white rounded-xl border border-gray-200 p-4 text-center"
              >
                <p className="text-xs text-gray-400 font-cairo mb-1">
                  {stat.label}
                </p>
                <p className="font-bold font-tajawal text-primary-900">
                  {stat.value}
                </p>
              </div>
            ))}
          </div>

          {/* Description */}
          {project.descriptionAr && (
            <div className="bg-white rounded-2xl border border-gray-200 p-6">
              <h2 className="font-bold font-tajawal text-gray-900 mb-3">
                عن المشروع
              </h2>
              <p className="text-sm text-gray-600 font-cairo leading-relaxed">
                {project.descriptionAr}
              </p>
            </div>
          )}

          {/* Amenities */}
          {project.amenities.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-200 p-6">
              <h2 className="font-bold font-tajawal text-gray-900 mb-4">
                المميزات والخدمات
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {project.amenities.map((a) => {
                  const details = AMENITY_DETAILS[a];
                  return (
                    <div
                      key={a}
                      className="flex items-center gap-2 text-sm font-cairo text-gray-700"
                    >
                      <span className="text-xl">{details?.icon ?? '✓'}</span>
                      <span>{details?.label ?? a}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Unit Matrix */}
          {hasFloorData && project.listings.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-200 p-6">
              <h2 className="font-bold font-tajawal text-gray-900 mb-4 flex items-center gap-2">
                <Home size={18} className="text-primary-600" />
                مصفوفة الوحدات
              </h2>
              <UnitMatrix
                units={project.listings.map((l) => ({
                  slug: l.slug,
                  titleAr: l.titleAr,
                  bedrooms: l.bedrooms,
                  area: l.area,
                  askingPrice: l.askingPrice,
                  floor: l.floor,
                  status: l.status,
                }))}
                onSelectUnit={(unit) => {
                  window.location.href = `/listings/${unit.slug}`;
                }}
              />
            </div>
          )}

          {/* Available listings */}
          {listingCards.length > 0 && (
            <div>
              <h2 className="font-bold font-tajawal text-gray-900 mb-4">
                الوحدات المتاحة في المشروع
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {listingCards.map((listing) => (
                  <ListingCard key={listing.slug} listing={listing} />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Financing card */}
          {project.hasFinancing && (
            <div
              className="border border-amber-200 rounded-2xl p-5"
              style={{
                background:
                  'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)',
              }}
            >
              <h3 className="font-bold font-tajawal text-amber-900 mb-3">
                نظام الأقساط
              </h3>
              <div className="space-y-2 text-sm font-cairo">
                {project.minDownPayment !== null && (
                  <div className="flex justify-between">
                    <span className="text-amber-700">الدفعة المقدمة</span>
                    <span className="font-bold text-amber-900">
                      {project.minDownPayment}%
                    </span>
                  </div>
                )}
                {project.maxYears !== null && (
                  <div className="flex justify-between">
                    <span className="text-amber-700">مدة الأقساط</span>
                    <span className="font-bold text-amber-900">
                      حتى {project.maxYears} سنة
                    </span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-amber-700">يبدأ السعر من</span>
                  <span className="font-bold text-amber-900">
                    {formatPrice(Number(project.minPrice))}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Inquiry CTA */}
          <div className="bg-white rounded-2xl border border-gray-200 p-5 sticky top-20">
            <h3 className="font-bold font-tajawal text-gray-900 mb-1">
              استفسر عن المشروع
            </h3>
            <p className="text-xs text-gray-500 font-cairo mb-4">
              سيتواصل معك المطور خلال 24 ساعة
            </p>
            <ProjectInquiryModal
              projectSlug={project.slug}
              projectName={project.nameAr}
            />
            <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-center gap-1.5 text-xs text-gray-400 font-cairo">
              <CheckCircle size={12} className="text-green-500" />
              محمي بـ Inquiry Shield — رقمك آمن
            </div>
          </div>

          {/* Back link */}
          <Link
            href="/projects"
            className="block text-center text-sm text-primary-700 hover:text-primary-900 font-cairo transition-colors"
          >
            ← عودة لجميع المشاريع
          </Link>
        </div>
      </div>
    </div>
  );
}
