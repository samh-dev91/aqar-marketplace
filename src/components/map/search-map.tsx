'use client';
import { useEffect, useRef, useCallback } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

interface MapListing {
  slug: string;
  titleAr: string;
  askingPrice: string | number;
  latitude: number | null;
  longitude: number | null;
  verificationTier: string;
  bedrooms: number | null;
  bathrooms: number | null;
  imageUrls: string[];
}

interface SearchMapProps {
  listings: MapListing[];
  onBoundsChange?: (bbox: string) => void;
}

const TIER_COLORS: Record<string, string> = {
  GOLD: '#D4AC0D',
  VERIFIED: '#1B4F72',
  LISTED: '#6B7280',
};

export function SearchMap({ listings, onBoundsChange }: SearchMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);

  const clearMarkers = useCallback(() => {
    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];
  }, []);

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
      style: 'mapbox://styles/mapbox/streets-v12',
      center: [31.24, 30.06], // Cairo center
      zoom: 11,
    });

    map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');

    if (onBoundsChange) {
      map.current.on('moveend', () => {
        if (!map.current) return;
        const b = map.current.getBounds();
        if (!b) return;
        const bbox = `${b.getWest()},${b.getSouth()},${b.getEast()},${b.getNorth()}`;
        onBoundsChange(bbox);
      });
    }

    return () => {
      clearMarkers();
      map.current?.remove();
      map.current = null;
    };
  }, [onBoundsChange, clearMarkers]);

  useEffect(() => {
    if (!map.current) return;
    clearMarkers();

    const geoListings = listings.filter(l => l.latitude !== null && l.longitude !== null);

    for (const listing of geoListings) {
      const color = TIER_COLORS[listing.verificationTier] ?? '#6B7280';
      const price = typeof listing.askingPrice === 'number'
        ? new Intl.NumberFormat('ar-EG', { notation: 'compact', maximumFractionDigits: 1 }).format(listing.askingPrice)
        : listing.askingPrice;

      const el = document.createElement('div');
      el.innerHTML = `<div style="background:${color};color:white;padding:4px 8px;border-radius:12px;font-family:Cairo,sans-serif;font-size:12px;font-weight:700;cursor:pointer;box-shadow:0 1px 4px rgba(0,0,0,0.3);white-space:nowrap;">${price}</div>`;

      const popup = new mapboxgl.Popup({ offset: 10, closeButton: false })
        .setHTML(`
          <div style="font-family:Cairo,sans-serif;direction:rtl;min-width:200px;">
            ${listing.imageUrls[0] ? `<img src="${listing.imageUrls[0]}" style="width:100%;height:120px;object-fit:cover;border-radius:4px 4px 0 0;" />` : ''}
            <div style="padding:8px;">
              <p style="margin:0 0 4px;font-size:13px;font-weight:600;">${listing.titleAr}</p>
              <p style="margin:0 0 4px;font-size:12px;color:#1B4F72;font-weight:700;">${price} ج.م</p>
              ${listing.bedrooms ? `<p style="margin:0;font-size:11px;color:#666;">${listing.bedrooms} غرف · ${listing.bathrooms ?? 0} حمام</p>` : ''}
              <a href="/listings/${listing.slug}" style="display:block;margin-top:8px;background:#1B4F72;color:white;text-align:center;padding:6px;border-radius:6px;text-decoration:none;font-size:12px;">عرض التفاصيل</a>
            </div>
          </div>
        `);

      const marker = new mapboxgl.Marker({ element: el })
        .setLngLat([listing.longitude!, listing.latitude!])
        .setPopup(popup)
        .addTo(map.current!);

      markersRef.current.push(marker);
    }

    // Fit map to markers
    if (geoListings.length > 0 && map.current) {
      const bounds = new mapboxgl.LngLatBounds();
      geoListings.forEach(l => bounds.extend([l.longitude!, l.latitude!]));
      map.current.fitBounds(bounds, { padding: 60, maxZoom: 14 });
    }
  }, [listings, clearMarkers]);

  return <div ref={mapContainer} className="w-full h-full min-h-[400px]" />;
}
