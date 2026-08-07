/**
 * Shows a delivery's live GPS position on a Google Map, with a marker that
 * moves in place (via `marker.setPosition`) as new coordinates come in,
 * instead of tearing down and recreating the map on every update.
 */
"use client";

import { useEffect, useRef, useState } from "react";
import { hasGoogleMapsApiKey, loadGoogleMapsScript } from "@/app/lib/googleMaps";
import { getRouteDirections } from "@/app/lib/routeDistance";
import styles from "./LocationMap.module.css";

export function LocationMap({
  latitude,
  longitude,
  destination,
}: {
  latitude: number;
  longitude: number;
  /** Free-text delivery destination — when given, draws the driving route to it (via OpenRouteService). */
  destination?: string;
}) {
  const mapDivRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const markerRef = useRef<google.maps.Marker | null>(null);
  const polylineRef = useRef<google.maps.Polyline | null>(null);
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

        // Draws the intended driving route to the destination once, from
        // the position at mount time — recalculating on every location
        // ping would burn through the (free-tier) directions quota for a
        // road path that doesn't change as the vehicle drives it.
        if (destination) {
          getRouteDirections(latitude, longitude, destination).then((result) => {
            if (cancelled || !mapRef.current || !result.path) return;
            polylineRef.current = new window.google!.maps.Polyline({
              path: result.path,
              map: mapRef.current,
              strokeColor: "#2563eb",
              strokeWeight: 4,
              strokeOpacity: 0.8,
            });
          });
        }
      })
      .catch((e) => {
        console.error("LocationMap load error:", e);
        if (!cancelled) setLoadError(true);
      });
    return () => {
      cancelled = true;
    };
    // Map + route are only created once at mount — the effect below
    // handles marker position updates as new pings come in.
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
