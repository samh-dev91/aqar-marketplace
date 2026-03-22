import { Metadata } from 'next';
import { PreQualifyForm } from './pre-qualify-form';

export const metadata: Metadata = {
  title: 'التأهل للتمويل العقاري | عقار ثرست',
  description: 'احسب الحد الأقصى للتمويل العقاري المتاح لك بناءً على دخلك',
};

export default function PreQualifyPage() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-right mb-2">التأهل للتمويل العقاري</h1>
      <p className="text-gray-600 text-right mb-8">احسب الحد الأقصى للتمويل بناءً على دخلك الشهري</p>
      <PreQualifyForm />
    </div>
  );
}
