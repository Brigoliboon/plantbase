'use client';

import { useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { SamplingLocation } from '@/types';

interface LocationMapProps {
  locations: SamplingLocation[];
}

export default function LocationMap({ locations }: LocationMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);

  useEffect(() => {
    if (!mapContainer.current) return;

    // Initialize map
    mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || '';

    if (!map.current) {
      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: 'mapbox://styles/mapbox/streets-v12',
        center: [122, 13], // Default center (Philippines)
        zoom: 4,
      });
    }

    // Remove existing markers
    markersRef.current.forEach(marker => marker.remove());
    markersRef.current = [];

    // Add markers for each location
    locations.forEach((location) => {
      if (
        !location.coordinates ||
        !Array.isArray(location.coordinates.coordinates) ||
        location.coordinates.coordinates.length !== 2 ||
        !isFinite(location.coordinates.coordinates[0]) ||
        !isFinite(location.coordinates.coordinates[1])
      )
        return;

      const longitude = location.coordinates.coordinates[0];
      const latitude = location.coordinates.coordinates[1];

      const marker = new mapboxgl.Marker({ color: '#10b981' })
        .setLngLat([longitude, latitude])
        .setPopup(
          new mapboxgl.Popup().setHTML(
            `<div class="p-2">
              <h3 class="font-semibold">${location.name || location.description || 'Location'}</h3>
              <p class="text-sm text-gray-600">${location.region || ''} ${location.country || ''}</p>
            </div>`
          )
        )
        .addTo(map.current!);

      markersRef.current.push(marker);
    });

    // Fit map to show all markers
    const withCoordinates = locations.filter(
      (location) =>
        location.coordinates &&
        Array.isArray(location.coordinates.coordinates) &&
        location.coordinates.coordinates.length === 2 &&
        isFinite(location.coordinates.coordinates[0]) &&
        isFinite(location.coordinates.coordinates[1])
    );

    if (withCoordinates.length > 0 && map.current) {
      const bounds = new mapboxgl.LngLatBounds();
      withCoordinates.forEach((location) => {
        const longitude = location.coordinates!.coordinates[0];
        const latitude = location.coordinates!.coordinates[1];
        bounds.extend([longitude, latitude]);
      });
      map.current.fitBounds(bounds, { padding: 50 });
    }

    return () => {
      // Cleanup markers
      markersRef.current.forEach(marker => marker.remove());
      markersRef.current = [];
    };
  }, [locations]);

  // Cleanup map on unmount
  useEffect(() => {
    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, []);

  return <div ref={mapContainer} className="w-full h-full" />;
}

