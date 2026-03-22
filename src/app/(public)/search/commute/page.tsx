'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const SearchMap = dynamic(
  () => import('@/components/map/search-map').then(m => m.SearchMap),
  { ssr: false }
);

const TRAVEL_TIMES = [15, 30, 45, 60];
const PROFILES = [
  { value: 'driving', label: 'سيارة' },
  { value: 'walking', label: 'مشي' },
  { value: 'cycling', label: 'دراجة' },
];

interface IsochroneFeature {
  geometry: { coordinates: number[][][] };
}

export default function CommutePage() {
  const router = useRouter();
  const [address, setAddress] = useState('');
  const [minutes, setMinutes] = useState(30);
  const [profile, setProfile] = useState('driving');
  const [loading, setLoading] = useState(false);

  const handleSearch = async () => {
    if (!address) return;
    setLoading(true);
    try {
      // Geocode address using Mapbox Geocoding API
      const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? '';
      const geoRes = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(address)}.json?access_token=${token}&country=EG&language=ar`
      );
      const geoData = await geoRes.json() as { features: Array<{ center: [number, number] }> };
      if (!geoData.features?.[0]) { setLoading(false); return; }
      const [lng, lat] = geoData.features[0].center;

      // Get isochrone
      const isoRes = await fetch(`/api/search/commute?lng=${lng}&lat=${lat}&minutes=${minutes}&profile=${profile}`);
      const isoData = await isoRes.json() as { features: IsochroneFeature[] };
      if (isoData.features?.[0]) {
        const coords = isoData.features[0].geometry.coordinates[0];
        // Encode polygon for search URL
        const encoded = encodeURIComponent(JSON.stringify(coords));
        router.push(`/search?polygon=${encoded}&commute=${minutes}min`);
      }
    } catch (err) {
      console.error('Commute search error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      <div className="max-w-2xl mx-auto px-4 py-10">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold font-tajawal text-primary-900 mb-2">ابحث قريباً من العمل</h1>
          <p className="text-gray-600 font-cairo">ابحث عن عقارات ضمن وقت تنقل محدد من موقعك</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 space-y-5">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2 font-cairo">عنوان العمل أو المكان</label>
            <input
              type="text"
              value={address}
              onChange={e => setAddress(e.target.value)}
              placeholder="مثال: مدينة نصر، القاهرة"
              className="w-full border border-gray-300 rounded-xl px-4 py-3 font-cairo text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2 font-cairo">وقت التنقل المقبول</label>
            <div className="flex gap-2">
              {TRAVEL_TIMES.map(t => (
                <button
                  key={t}
                  onClick={() => setMinutes(t)}
                  className={`flex-1 py-2 rounded-lg text-sm font-cairo font-medium transition ${
                    minutes === t ? 'bg-primary-700 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >{t} دقيقة</button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2 font-cairo">وسيلة التنقل</label>
            <div className="flex gap-2">
              {PROFILES.map(p => (
                <button
                  key={p.value}
                  onClick={() => setProfile(p.value)}
                  className={`flex-1 py-2 rounded-lg text-sm font-cairo font-medium transition ${
                    profile === p.value ? 'bg-primary-700 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >{p.label}</button>
              ))}
            </div>
          </div>

          <button
            onClick={handleSearch}
            disabled={!address || loading}
            className="w-full bg-primary-700 text-white py-3 rounded-xl font-cairo font-semibold text-sm disabled:opacity-50 hover:bg-primary-800 transition"
          >
            {loading ? 'جاري البحث...' : 'ابحث في المنطقة'}
          </button>
        </div>
      </div>
    </div>
  );
}
