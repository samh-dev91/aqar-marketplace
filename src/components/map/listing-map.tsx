'use client';
import { useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

interface ListingMapProps {
  latitude: number;
  longitude: number;
  title: string;
  price: string;
  googleMapsUrl?: string | null;
}

export function ListingMap({ latitude, longitude, title, price, googleMapsUrl }: ListingMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);

  useEffect(() => {
    if (map.current || !mapContainer.current) return;

    mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? '';

    // Set RTL text plugin
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
      center: [longitude, latitude],
      zoom: 15,
      attributionControl: false,
    });

    // Add navigation controls
    map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');

    // Custom marker element
    const el = document.createElement('div');
    el.className = 'listing-map-marker';
    el.innerHTML = `
      <div style="background:#1B4F72;color:white;padding:6px 10px;border-radius:20px;font-family:Cairo,sans-serif;font-size:13px;font-weight:700;white-space:nowrap;box-shadow:0 2px 8px rgba(0,0,0,0.3);">
        ${price}
      </div>
      <div style="width:0;height:0;border-left:8px solid transparent;border-right:8px solid transparent;border-top:8px solid #1B4F72;margin:0 auto;"></div>
    `;

    new mapboxgl.Marker({ element: el, anchor: 'bottom' })
      .setLngLat([longitude, latitude])
      .setPopup(
        new mapboxgl.Popup({ offset: 25 }).setHTML(
          `<p style="font-family:Cairo,sans-serif;font-size:13px;margin:0;padding:4px;">${title}</p>`
        )
      )
      .addTo(map.current);

    return () => {
      map.current?.remove();
      map.current = null;
    };
  }, [latitude, longitude, title, price]);

  const googleUrl = googleMapsUrl ?? `https://www.google.com/maps?q=${latitude},${longitude}`;

  return (
    <div className="relative rounded-xl overflow-hidden border border-gray-200">
      <div ref={mapContainer} className="h-[250px] md:h-[350px] w-full" />
      <a
        href={googleUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="absolute bottom-3 left-3 bg-white text-gray-800 text-sm px-3 py-1.5 rounded-lg shadow-md hover:bg-gray-50 transition font-cairo"
      >
        فتح في خرائط جوجل ↗
      </a>
    </div>
  );
}
