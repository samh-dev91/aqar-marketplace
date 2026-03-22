'use client';
import { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

export function DistrictHeatmap() {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (map.current || !mapContainer.current) return;

    mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? '';

    if (!mapboxgl.getRTLTextPluginStatus || mapboxgl.getRTLTextPluginStatus() === 'unavailable') {
      mapboxgl.setRTLTextPlugin(
        'https://api.mapbox.com/mapbox-gl-js/plugins/mapbox-gl-rtl-text/v0.3.0/mapbox-gl-rtl-text.js',
        () => {},
        true
      );
    }

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/light-v11',
      center: [31.24, 30.06],
      zoom: 10,
    });

    map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');

    map.current.on('load', async () => {
      try {
        const res = await fetch('/api/map/districts');
        const geojson = await res.json() as { type: string; features: unknown[] };
        setLoading(false);

        if (!map.current) return;

        map.current.addSource('districts', { type: 'geojson', data: geojson as GeoJSON.FeatureCollection });

        // Fill layer - color by price
        map.current.addLayer({
          id: 'districts-fill',
          type: 'fill',
          source: 'districts',
          paint: {
            'fill-color': [
              'interpolate', ['linear'],
              ['get', 'avgPricePerSqm'],
              0, '#dbeafe',
              5000, '#93c5fd',
              10000, '#3b82f6',
              20000, '#1d4ed8',
              40000, '#1e3a8a',
            ],
            'fill-opacity': ['case', ['boolean', ['get', 'hasData'], false], 0.65, 0.2],
          },
        });

        // Border layer
        map.current.addLayer({
          id: 'districts-border',
          type: 'line',
          source: 'districts',
          paint: { 'line-color': '#1B4F72', 'line-width': 1, 'line-opacity': 0.5 },
        });

        // Popup on click
        const popup = new mapboxgl.Popup({ closeButton: true });
        map.current.on('click', 'districts-fill', (e) => {
          if (!e.features?.[0]) return;
          const props = e.features[0].properties as {
            district: string; avgPricePerSqm: number;
            listingCount: number; priceChange6m: number; hasData: boolean;
          };
          const change = props.priceChange6m ?? 0;
          const changeStr = change >= 0 ? `▲ ${change.toFixed(1)}%` : `▼ ${Math.abs(change).toFixed(1)}%`;
          const changeColor = change >= 0 ? '#16a34a' : '#dc2626';
          popup
            .setLngLat(e.lngLat)
            .setHTML(`
              <div style="font-family:Cairo,sans-serif;direction:rtl;min-width:180px;padding:4px;">
                <h3 style="margin:0 0 8px;font-size:15px;font-weight:700;color:#1B4F72;">${props.district}</h3>
                ${props.hasData ? `
                  <p style="margin:0 0 4px;font-size:12px;"><span style="color:#666;">متوسط السعر/م²:</span> <strong>${Math.round(props.avgPricePerSqm).toLocaleString('ar-EG')} ج.م</strong></p>
                  <p style="margin:0 0 4px;font-size:12px;"><span style="color:#666;">عدد العقارات:</span> <strong>${props.listingCount}</strong></p>
                  <p style="margin:0;font-size:12px;"><span style="color:#666;">تغير 6 أشهر:</span> <strong style="color:${changeColor};">${changeStr}</strong></p>
                ` : '<p style="font-size:12px;color:#666;">لا توجد بيانات كافية</p>'}
                <a href="/search?district=${encodeURIComponent(props.district)}" style="display:block;margin-top:10px;background:#1B4F72;color:white;text-align:center;padding:6px;border-radius:6px;text-decoration:none;font-size:12px;">عرض عقارات المنطقة</a>
              </div>
            `)
            .addTo(map.current!);
        });

        map.current.on('mouseenter', 'districts-fill', () => {
          if (map.current) map.current.getCanvas().style.cursor = 'pointer';
        });
        map.current.on('mouseleave', 'districts-fill', () => {
          if (map.current) map.current.getCanvas().style.cursor = '';
        });
      } catch (err) {
        console.error('Heatmap load error:', err);
        setLoading(false);
      }
    });

    return () => {
      map.current?.remove();
      map.current = null;
    };
  }, []);

  return (
    <div className="relative w-full h-full">
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 z-10 rounded-xl">
          <p className="text-gray-500 font-cairo text-sm">جاري تحميل الخريطة...</p>
        </div>
      )}
      <div ref={mapContainer} className="w-full h-full" />
      {/* Legend */}
      <div className="absolute bottom-8 left-3 bg-white rounded-lg shadow-md p-3 text-xs font-cairo" dir="rtl">
        <p className="font-semibold mb-2 text-gray-700">متوسط السعر/م²</p>
        <div className="space-y-1">
          {([['#1e3a8a', '> 40,000'], ['#1d4ed8', '20,000–40,000'], ['#3b82f6', '10,000–20,000'], ['#93c5fd', '5,000–10,000'], ['#dbeafe', '< 5,000']] as [string, string][]).map(([color, label]) => (
            <div key={label} className="flex items-center gap-2">
              <div className="w-4 h-3 rounded-sm" style={{ background: color }} />
              <span className="text-gray-600">{label} ج.م</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
