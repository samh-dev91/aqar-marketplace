'use client';
import { useEffect, useRef, useState, useCallback } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

// ── Types ──────────────────────────────────────────────────────────────────

type LayerKey = 'avgPricePerSqm' | 'activeListings' | 'priceChange6m';

interface LayerConfig {
  labelAr: string;
  unit: string;
  colorStops: [number, string][];
  legendStops: [string, string][];
  format: (v: number) => string;
}

const ARABIC_MONTHS = [
  'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
  'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر',
];

// Dummy 12-month price multipliers (Jan–Dec relative to current) for time-series simulation
const MONTH_MULTIPLIERS: number[] = [
  0.88, 0.89, 0.91, 0.93, 0.95, 0.97,
  0.99, 1.00, 1.02, 1.04, 1.05, 1.07,
];

const LAYER_CONFIG: Record<LayerKey, LayerConfig> = {
  avgPricePerSqm: {
    labelAr: 'متوسط السعر/م²',
    unit: 'ج.م',
    colorStops: [
      [0, '#dbeafe'],
      [5000, '#93c5fd'],
      [10000, '#3b82f6'],
      [20000, '#1d4ed8'],
      [40000, '#1e3a8a'],
    ],
    legendStops: [
      ['#1e3a8a', '> 40,000'],
      ['#1d4ed8', '20,000–40,000'],
      ['#3b82f6', '10,000–20,000'],
      ['#93c5fd', '5,000–10,000'],
      ['#dbeafe', '< 5,000'],
    ],
    format: (v) => `${Math.round(v).toLocaleString('ar-EG')} ج.م`,
  },
  activeListings: {
    labelAr: 'عدد الإعلانات',
    unit: 'إعلان',
    colorStops: [
      [0, '#dcfce7'],
      [10, '#86efac'],
      [50, '#22c55e'],
      [150, '#16a34a'],
      [300, '#14532d'],
    ],
    legendStops: [
      ['#14532d', '> 300'],
      ['#16a34a', '150–300'],
      ['#22c55e', '50–150'],
      ['#86efac', '10–50'],
      ['#dcfce7', '< 10'],
    ],
    format: (v) => `${Math.round(v).toLocaleString('ar-EG')} إعلان`,
  },
  priceChange6m: {
    labelAr: 'التغير ٦ أشهر%',
    unit: '%',
    colorStops: [
      [-20, '#dc2626'],
      [-5, '#fca5a5'],
      [0, '#f3f4f6'],
      [5, '#86efac'],
      [20, '#16a34a'],
    ],
    legendStops: [
      ['#16a34a', '> +5%'],
      ['#86efac', '0–+5%'],
      ['#f3f4f6', '0%'],
      ['#fca5a5', '0 – -5%'],
      ['#dc2626', '< -5%'],
    ],
    format: (v) => `${v >= 0 ? '+' : ''}${v.toFixed(1)}%`,
  },
};

function buildColorExpression(
  layer: LayerKey,
  multiplier = 1,
): mapboxgl.Expression {
  const cfg = LAYER_CONFIG[layer];
  const stops = cfg.colorStops.flatMap(([val, color]) => [val * multiplier, color]);
  return [
    'interpolate',
    ['linear'],
    ['get', layer],
    ...stops,
  ] as unknown as mapboxgl.Expression;
}

// ── Sparkline SVG helper ───────────────────────────────────────────────────

function buildSparklinePath(values: number[]): string {
  const w = 80;
  const h = 24;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const pts = values.map((v, i) => {
    const x = (i / (values.length - 1)) * w;
    const y = h - ((v - min) / range) * h;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  return `M${pts.join(' L')}`;
}

// ── Component ──────────────────────────────────────────────────────────────

export function DistrictHeatmap() {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const popupRef = useRef<mapboxgl.Popup | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeLayer, setActiveLayer] = useState<LayerKey>('avgPricePerSqm');
  const [monthIndex, setMonthIndex] = useState(11); // Dec = index 11 (latest)
  const [legendRange, setLegendRange] = useState<{ min: number; max: number } | null>(null);
  const activeLayerRef = useRef<LayerKey>('avgPricePerSqm');
  const monthIndexRef = useRef(11);

  // Keep refs in sync with state for use inside Mapbox callbacks
  useEffect(() => { activeLayerRef.current = activeLayer; }, [activeLayer]);
  useEffect(() => { monthIndexRef.current = monthIndex; }, [monthIndex]);

  // ── Apply paint when layer or month changes ──────────────────────────────
  const applyPaint = useCallback((layer: LayerKey, mIdx: number) => {
    if (!map.current || !map.current.isStyleLoaded()) return;
    if (!map.current.getLayer('districts-fill')) return;

    const multiplier = layer === 'avgPricePerSqm' ? MONTH_MULTIPLIERS[mIdx] : 1;
    const colorExpr = buildColorExpression(layer, multiplier);
    const opacityExpr: mapboxgl.Expression = [
      'case',
      ['boolean', ['feature-state', 'hasData'], ['boolean', ['get', 'hasData'], false]],
      0.65,
      0.2,
    ] as unknown as mapboxgl.Expression;

    map.current.setPaintProperty('districts-fill', 'fill-color', colorExpr);
    map.current.setPaintProperty('districts-fill', 'fill-opacity', opacityExpr);
  }, []);

  useEffect(() => {
    if (!map.current || loading) return;
    applyPaint(activeLayer, monthIndex);
  }, [activeLayer, monthIndex, loading, applyPaint]);

  // ── Map init ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (map.current || !mapContainer.current) return;

    mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? '';

    if (!mapboxgl.getRTLTextPluginStatus || mapboxgl.getRTLTextPluginStatus() === 'unavailable') {
      mapboxgl.setRTLTextPlugin(
        'https://api.mapbox.com/mapbox-gl-js/plugins/mapbox-gl-rtl-text/v0.3.0/mapbox-gl-rtl-text.js',
        () => {},
        true,
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

        map.current.addSource('districts', {
          type: 'geojson',
          data: geojson as GeoJSON.FeatureCollection,
        });

        // Compute legend range from data
        const features = (geojson as GeoJSON.FeatureCollection).features;
        if (features.length > 0) {
          const vals = features
            .map((f) => {
              const p = f.properties as Record<string, number>;
              return p[activeLayerRef.current] ?? 0;
            })
            .filter((v) => v > 0);
          if (vals.length > 0) {
            setLegendRange({ min: Math.min(...vals), max: Math.max(...vals) });
          }
        }

        // Fill layer
        map.current.addLayer({
          id: 'districts-fill',
          type: 'fill',
          source: 'districts',
          paint: {
            'fill-color': buildColorExpression(activeLayerRef.current, MONTH_MULTIPLIERS[monthIndexRef.current]),
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
        popupRef.current = new mapboxgl.Popup({ closeButton: true, maxWidth: '260px' });

        map.current.on('click', 'districts-fill', (e) => {
          if (!e.features?.[0]) return;
          const props = e.features[0].properties as {
            district: string;
            avgPricePerSqm: number;
            listingCount: number;
            activeListings: number;
            priceChange6m: number;
            hasData: boolean;
          };

          const change = props.priceChange6m ?? 0;
          const changeStr = change >= 0 ? `▲ ${change.toFixed(1)}%` : `▼ ${Math.abs(change).toFixed(1)}%`;
          const changeColor = change >= 0 ? '#16a34a' : '#dc2626';

          // Build sparkline from monthly multipliers applied to current avgPricePerSqm
          const basePrice = props.avgPricePerSqm ?? 0;
          const sparkValues = MONTH_MULTIPLIERS.map((m) => basePrice * m);
          const sparkPath = buildSparklinePath(sparkValues);
          const sparkColor = change >= 0 ? '#16a34a' : '#dc2626';

          const listings = props.activeListings ?? props.listingCount ?? 0;

          popupRef.current!
            .setLngLat(e.lngLat)
            .setHTML(`
              <div style="font-family:Cairo,sans-serif;direction:rtl;min-width:220px;padding:4px;">
                <h3 style="margin:0 0 8px;font-size:15px;font-weight:700;color:#1B4F72;">${props.district}</h3>
                ${props.hasData ? `
                  <p style="margin:0 0 4px;font-size:12px;"><span style="color:#666;">متوسط السعر/م²:</span> <strong>${Math.round(props.avgPricePerSqm).toLocaleString('ar-EG')} ج.م</strong></p>
                  <p style="margin:0 0 4px;font-size:12px;"><span style="color:#666;">عدد الإعلانات:</span> <strong>${listings.toLocaleString('ar-EG')}</strong></p>
                  <p style="margin:0 0 8px;font-size:12px;"><span style="color:#666;">تغير 6 أشهر:</span> <strong style="color:${changeColor};">${changeStr}</strong></p>
                  <svg width="80" height="24" style="display:block;margin:0 auto 10px;" viewBox="0 0 80 24" fill="none">
                    <path d="${sparkPath}" stroke="${sparkColor}" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
                  </svg>
                ` : '<p style="font-size:12px;color:#666;">لا توجد بيانات كافية</p>'}
                <a href="/search?district=${encodeURIComponent(props.district)}" style="display:block;background:#1B4F72;color:white;text-align:center;padding:6px;border-radius:6px;text-decoration:none;font-size:12px;">عرض عقارات المنطقة</a>
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const cfg = LAYER_CONFIG[activeLayer];

  return (
    <div className="relative w-full h-full">
      {/* Loading overlay */}
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 z-10 rounded-xl">
          <p className="text-gray-500 font-cairo text-sm">جاري تحميل الخريطة...</p>
        </div>
      )}

      <div ref={mapContainer} className="w-full h-full" />

      {/* ── Layer toggle bar (top-left) ──────────────────────────── */}
      <div
        className="absolute top-3 left-3 z-10 flex gap-1 bg-white rounded-xl shadow-md p-1"
        dir="rtl"
      >
        {(Object.keys(LAYER_CONFIG) as LayerKey[]).map((key) => (
          <button
            key={key}
            onClick={() => setActiveLayer(key)}
            className={`px-3 py-1.5 rounded-lg text-xs font-cairo font-medium transition-colors whitespace-nowrap ${
              activeLayer === key
                ? 'bg-primary-700 text-white'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            {LAYER_CONFIG[key].labelAr}
          </button>
        ))}
      </div>

      {/* ── Time-series slider (bottom-center) ──────────────────── */}
      <div
        className="absolute bottom-20 left-1/2 -translate-x-1/2 z-10 bg-white rounded-xl shadow-md px-4 py-3 w-72 sm:w-96"
        dir="rtl"
      >
        <p className="text-xs font-cairo font-semibold text-gray-700 mb-2 text-center">
          التغير السعري خلال ١٢ شهراً
        </p>
        <input
          type="range"
          min={0}
          max={11}
          step={1}
          value={monthIndex}
          onChange={(e) => setMonthIndex(Number(e.target.value))}
          className="w-full h-1.5 accent-primary-700 cursor-pointer"
          dir="ltr"
        />
        <div className="flex justify-between mt-1.5">
          {ARABIC_MONTHS.map((m, i) => (
            <span
              key={m}
              className={`text-[10px] font-cairo transition-colors ${
                i === monthIndex ? 'text-primary-700 font-bold' : 'text-gray-400'
              }`}
            >
              {/* Show only Jan, Apr, Jul, Oct to avoid crowding, plus active */}
              {i % 3 === 0 || i === monthIndex ? m.slice(0, 3) : ''}
            </span>
          ))}
        </div>
        <p className="text-center text-xs font-cairo text-primary-700 font-semibold mt-1">
          {ARABIC_MONTHS[monthIndex]}
          {activeLayer === 'avgPricePerSqm' && (
            <span className="text-gray-500 font-normal">
              {' '}— معامل التسعير: ×{MONTH_MULTIPLIERS[monthIndex].toFixed(2)}
            </span>
          )}
        </p>
      </div>

      {/* ── Legend (bottom-right) ────────────────────────────────── */}
      <div
        className="absolute bottom-8 right-3 z-10 bg-white rounded-xl shadow-md p-3 text-xs font-cairo min-w-[140px]"
        dir="rtl"
      >
        <p className="font-semibold mb-2 text-gray-700">{cfg.labelAr}</p>
        {legendRange && (
          <p className="text-[10px] text-gray-400 mb-2">
            {cfg.format(legendRange.min)} — {cfg.format(legendRange.max)}
          </p>
        )}
        <div className="space-y-1">
          {cfg.legendStops.map(([color, label]) => (
            <div key={label} className="flex items-center gap-2">
              <div className="w-4 h-3 rounded-sm flex-shrink-0" style={{ background: color }} />
              <span className="text-gray-600">
                {label} {cfg.unit}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
