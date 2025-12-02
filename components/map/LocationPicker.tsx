"use client";

import { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";

const accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || '';

export default function LocationPicker({onValueChanged, initialCoords}: {onValueChanged: (coords: {lng: number, lat: number}) => void, initialCoords?: {lng: number, lat: number} | null}) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);

  const [coords, setCoords] = useState<{ lng: number; lat: number } | null>(
    null
  );

  function toFourDecimalPlaces(num: number) {
    return parseFloat(num.toFixed(4));
  }

  useEffect(() => {
    if (!mapContainerRef.current) return;

    mapboxgl.accessToken = accessToken;

    mapRef.current = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: "mapbox://styles/mapbox/standard",
      center: [122, 13],
      zoom: 4
    });

    const marker = new mapboxgl.Marker({ draggable: true })
      .setLngLat([122, 13])
      .addTo(mapRef.current);

    function onDragEnd() {
      const lngLat = marker.getLngLat();
      setCoords({
        lng: toFourDecimalPlaces(lngLat.lng),
        lat: toFourDecimalPlaces(lngLat.lat)
      });
      console.log('passed here')
      onValueChanged({
        lng: toFourDecimalPlaces(lngLat.lng),
        lat: toFourDecimalPlaces(lngLat.lat)
      });
    }

    marker.on("dragend", onDragEnd);

    // Set initial coords if provided
    if (initialCoords) {
      setCoords(initialCoords);
      onValueChanged(initialCoords);
    }

    return () => {
      mapRef.current?.remove();
    };
  }, []);

  return (
    <>
      <div className="mb-2 text-sm text-gray-600 dark:text-gray-400">
        <p>• Click on the map or drag the red marker to create a new location</p>
      </div>
      <div
        ref={mapContainerRef}
        id="map"
        style={{ height: "400px", width: "100%" }}
        className="border border-gray-300 dark:border-gray-600 rounded-lg"
      />
    </>
  );
}
