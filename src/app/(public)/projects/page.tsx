import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { Building2, MapPin, Calendar, Home } from 'lucide-react';
import { formatPrice } from '@/lib/format';

export const metadata: Metadata = {
  title: 'مشاريع التطوير العقاري في مصر',
  description:
    'استكشف أحدث مشاريع التطوير العقاري في القاهرة والمدن الجديدة. شقق وفيلات بأسعار تنافسية وأقساط ميسرة.',
};

export const revalidate = 3600;

interface Project {
  id: string;
  slug: string;
  nameAr: string;
  developerNameAr: string;
  coverImageUrl: string | null;
  district: string;
  city: string;
  deliveryYear: number | null;
  availableUnits: number | null;
  totalUnits: number | null;
  minPrice: string;
  maxPrice: string | null;
  hasFinancing: boolean;
  minDownPayment: number | null;
  maxYears: number | null;
  amenities: string[];
}

async function getProjects(city?: string): Promise<Project[]> {
  try {
    const params = new URLSearchParams({ limit: '24' });
    if (city) params.set('city', city);
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'}/api/projects?${params.toString()}`,
      { next: { revalidate: 3600 } },
    );
    if (!res.ok) return [];
    const data = (await res.json()) as { data?: Project[] };
    return data.data ?? [];
  } catch {
    return [];
  }
}

const AMENITY_ICONS: Record<string, string> = {
  pool: '🏊',
  gym: '🏋️',
  security: '🔒',
  parking: '🚗',
  garden: '🌳',
  club: '🎾',
  mosque: '🕌',
  school: '🏫',
  mall: '🛍️',
};

export default async function ProjectsPage() {
  const projects = await getProjects();

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      {/* Hero */}
      <div className="bg-primary-900 text-white py-10 px-4">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-2xl font-bold font-tajawal mb-2">مشاريع التطوير العقاري</h1>
          <p className="text-primary-200 font-cairo text-sm">
            كمبوندات وأبراج سكنية موثقة من كبار المطورين في مصر
          </p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8">
        {projects.length === 0 ? (
          <div className="text-center py-20">
            <Building2 className="mx-auto mb-4 text-gray-300" size={48} />
            <p className="text-gray-500 font-cairo">لا توجد مشاريع متاحة حالياً</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map((project) => (
              <Link
                key={project.slug}
                href={`/projects/${project.slug}`}
                className="group bg-white rounded-2xl overflow-hidden border border-gray-200 hover:border-primary-300 hover:shadow-lg transition-all"
              >
                {/* Cover Image */}
                <div className="relative h-48 bg-gray-100">
                  {project.coverImageUrl ? (
                    <Image
                      src={project.coverImageUrl}
                      alt={project.nameAr}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-500"
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    />
                  ) : (
                    <div className="h-full flex items-center justify-center bg-gradient-to-br from-primary-900 to-primary-700">
                      <Building2 size={40} className="text-primary-300" />
                    </div>
                  )}
                  {project.hasFinancing && (
                    <span className="absolute top-3 end-3 bg-amber-400 text-amber-900 text-xs font-cairo font-bold px-2 py-1 rounded-full">
                      تمويل متاح
                    </span>
                  )}
                </div>

                <div className="p-4">
                  <h2 className="font-bold font-tajawal text-gray-900 group-hover:text-primary-700 transition">
                    {project.nameAr}
                  </h2>
                  <p className="text-xs text-gray-500 font-cairo mt-0.5">{project.developerNameAr}</p>

                  <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2 text-xs text-gray-400 font-cairo">
                    <span className="flex items-center gap-1">
                      <MapPin size={11} />
                      {project.district}، {project.city}
                    </span>
                    {project.deliveryYear && (
                      <span className="flex items-center gap-1">
                        <Calendar size={11} />
                        تسليم {project.deliveryYear}
                      </span>
                    )}
                    {project.availableUnits !== null && (
                      <span className="flex items-center gap-1">
                        <Home size={11} />
                        {project.availableUnits} وحدة متاحة
                      </span>
                    )}
                  </div>

                  {/* Amenities */}
                  {project.amenities.length > 0 && (
                    <div className="flex gap-1 mt-2 flex-wrap">
                      {project.amenities.slice(0, 4).map((a) => (
                        <span key={a} className="text-sm" title={a}>
                          {AMENITY_ICONS[a] ?? '✓'}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="mt-3 pt-3 border-t border-gray-100 flex items-end justify-between">
                    <div>
                      <p className="text-xs text-gray-400 font-cairo">يبدأ من</p>
                      <p className="font-bold text-primary-800 font-cairo text-sm">
                        {formatPrice(Number(project.minPrice))}
                      </p>
                    </div>
                    {project.hasFinancing && project.minDownPayment !== null && (
                      <span className="text-xs text-green-700 bg-green-50 px-2 py-1 rounded-full font-cairo">
                        مقدم {project.minDownPayment}%
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
