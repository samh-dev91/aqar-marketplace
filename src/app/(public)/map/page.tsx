import type { Metadata } from 'next';
import dynamic from 'next/dynamic';

export const metadata: Metadata = {
  title: 'خريطة أسعار العقارات في القاهرة',
  description: 'استكشف متوسطات أسعار العقارات في مناطق القاهرة على خريطة تفاعلية.',
};

const DistrictHeatmap = dynamic(
  () => import('@/components/map/district-heatmap').then(m => m.DistrictHeatmap),
  { ssr: false, loading: () => <div className="w-full h-full bg-gray-100 animate-pulse rounded-xl" /> }
);

export default function MapPage() {
  return (
    <div className="flex flex-col h-[calc(100vh-64px)]">
      <div className="px-4 py-3 border-b bg-white" dir="rtl">
        <h1 className="text-lg font-bold text-primary-900 font-tajawal">خريطة أسعار العقارات</h1>
        <p className="text-sm text-gray-500 font-cairo">انقر على المنطقة لعرض متوسط الأسعار والعقارات المتاحة</p>
      </div>
      <div className="flex-1">
        <DistrictHeatmap />
      </div>
    </div>
  );
}
