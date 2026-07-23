/**
 * Shows a delivery's live GPS position on a Google Map, with a marker that
 * moves in place (via `marker.setPosition`) as new coordinates come in,
 * instead of tearing down and recreating the map on every update.
 */
"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./LocationMap.module.css";

const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

declare global {
  interface Window {
    google?: typeof google;
  }
}

// Google's script tag is loaded lazily on first mount. A module-level
// promise means every LocationMap instance on the page shares one
// script/load instead of racing to inject their own <script> tags.
let loaderPromise: Promise<void> | null = null;

function loadGoogleMapsScript(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.google?.maps?.Map) return Promise.resolve();
  if (loaderPromise) return loaderPromise;

  loaderPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    // No `loading=async`/`importLibrary` here — that flow needs Google's
    // official bootstrap shim run before this script loads. A plain script
    // tag like this loads the full "maps" library synchronously, so
    // `google.maps.Map`/`google.maps.Marker` are real constructors as soon
    // as onload fires.
    script.src = `https://maps.googleapis.com/maps/api/js?key=${API_KEY}`;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load Google Maps"));
    document.head.appendChild(script);
  });
  return loaderPromise;
}

export function LocationMap({
  latitude,
  longitude,
}: {
  latitude: number;
  longitude: number;
}) {
  const mapDivRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const markerRef = useRef<google.maps.Marker | null>(null);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (!API_KEY) {
      setLoadError(true);
      return;
    }
    loadGoogleMapsScript()
      .then(() => {
        if (cancelled || !mapDivRef.current || mapRef.current) return;
        const { Map, Marker } = window.google!.maps;
        mapRef.current = new Map(mapDivRef.current, {
          center: { lat: latitude, lng: longitude },
          zoom: 14,
          disableDefaultUI: true,
          zoomControl: true,
        });
        markerRef.current = new Marker({
          position: { lat: latitude, lng: longitude },
          map: mapRef.current,
        });
      })
      .catch((e) => {
        console.error("LocationMap load error:", e);
        if (!cancelled) setLoadError(true);
      });
    return () => {
      cancelled = true;
    };
    // Map is only created once — the effect below handles position updates.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!mapRef.current || !markerRef.current) return;
    const position = { lat: latitude, lng: longitude };
    markerRef.current.setPosition(position);
    mapRef.current.panTo(position);
  }, [latitude, longitude]);

  if (loadError) {
    return <LocationMapPlaceholder message="Live map unavailable — couldn't load Google Maps." />;
  }

  return <div ref={mapDivRef} className={styles.frame} role="img" aria-label="Live vehicle location" />;
}

/** Shown in place of the map before the driver's first location ping arrives. */
export function LocationMapPlaceholder({ message }: { message: string }) {
  return <div className={styles.placeholder}>{message}</div>;
}
