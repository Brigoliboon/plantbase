"use client";

import { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";

const accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || '';

export default function LocationPicker() {
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
    }

    marker.on("dragend", onDragEnd);

    return () => {
      mapRef.current?.remove();
    };
  }, []);

  return (
    <>
      <div
        ref={mapContainerRef}
        id="map"
        style={{ height: "400px", width: "100%" }}
      />
      {coords && (
        <div
          style={{
            background: "rgba(0, 0, 0, 0.5)",
            color: "#fff",
            position: "absolute",
            bottom: "40px",
            left: "10px",
            padding: "5px 10px",
            fontFamily: "monospace",
            fontSize: "11px",
            borderRadius: "3px"
          }}
        >
          <p style={{ margin: 0 }}>Longitude: {coords.lng}</p>
          <p style={{ margin: 0 }}>Latitude: {coords.lat}</p>
        </div>
      )}
    </>
  );
}