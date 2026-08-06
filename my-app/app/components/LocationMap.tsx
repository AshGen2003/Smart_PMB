/**
 * Shows a delivery's live GPS position on a Google Map, with a marker that
 * moves in place (via `marker.setPosition`) as new coordinates come in,
 * instead of tearing down and recreating the map on every update.
 */
"use client";

import { useEffect, useRef, useState } from "react";
import { hasGoogleMapsApiKey, loadGoogleMapsScript } from "@/app/lib/googleMaps";
import styles from "./LocationMap.module.css";

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
  // Known synchronously at first render (a build-time env var, never
  // changes) — initialized directly rather than set from inside the
  // effect below, so the effect only ever calls setLoadError from an
  // async callback, never synchronously on every run.
  const [loadError, setLoadError] = useState(!hasGoogleMapsApiKey());

  useEffect(() => {
    let cancelled = false;
    if (!hasGoogleMapsApiKey()) return;
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
