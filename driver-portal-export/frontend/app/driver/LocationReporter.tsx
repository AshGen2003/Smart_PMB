/**
 * Client Component mounted on the driver dashboard's active-task card
 * while a task is "in_transit": uses the browser's Geolocation API to
 * report the driver's position periodically (via `watchPosition`,
 * throttled to avoid spamming the server) and renders the live map from
 * locally-tracked state, so it updates immediately without waiting on a
 * full page revalidation after each ping.
 */
"use client";

import { useEffect, useRef, useState } from "react";
import { LocateFixed } from "lucide-react";
import { LocationMap, LocationMapPlaceholder } from "@/app/components/LocationMap";
import styles from "./DriverDashboard.module.css";

type LatLng = { latitude: number; longitude: number };

// Minimum time between location pings sent to the server — watchPosition
// can fire far more often than this (every few seconds on a moving
// vehicle), and there's no need to persist every single reading.
const MIN_PING_INTERVAL_MS = 20_000;

async function sendPing(deliveryId: number, coords: LatLng) {
  await fetch(`/api/driver/deliveries/${deliveryId}/location`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(coords),
  }).catch(() => {
    // Transient network hiccups just skip a ping — watchPosition will
    // fire again soon and the next one gets a fresh shot.
  });
}

export function LocationReporter({
  deliveryId,
  isInTransit,
  initialLocation,
}: {
  deliveryId: number;
  isInTransit: boolean;
  initialLocation: LatLng | null;
}) {
  const [location, setLocation] = useState<LatLng | null>(initialLocation);
  const [error, setError] = useState<string | null>(null);
  const [updating, setUpdating] = useState(false);
  const lastSentAt = useRef(0);

  useEffect(() => {
    if (!isInTransit || !("geolocation" in navigator)) return;

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const coords = { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
        setLocation(coords);
        const now = Date.now();
        if (now - lastSentAt.current >= MIN_PING_INTERVAL_MS) {
          lastSentAt.current = now;
          sendPing(deliveryId, coords);
        }
      },
      () => setError("Couldn't access your location — check location permissions for this site."),
      { enableHighAccuracy: true, maximumAge: 10_000 }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, [isInTransit, deliveryId]);

  function updateNow() {
    if (!("geolocation" in navigator)) return;
    setUpdating(true);
    setError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
        setLocation(coords);
        lastSentAt.current = Date.now();
        sendPing(deliveryId, coords).finally(() => setUpdating(false));
      },
      () => {
        setError("Couldn't access your location — check location permissions for this site.");
        setUpdating(false);
      },
      { enableHighAccuracy: true }
    );
  }

  if (!isInTransit) {
    return <LocationMapPlaceholder message="Location tracking starts once you start the trip." />;
  }

  return (
    <>
      {location ? (
        <LocationMap latitude={location.latitude} longitude={location.longitude} />
      ) : (
        <LocationMapPlaceholder message="Waiting for your first location update…" />
      )}
      <div className={styles.locationRow}>
        <span className={styles.locationStatus}>
          {error ?? (location ? "Sharing your live location." : "Requesting location…")}
        </span>
        <button type="button" className={styles.updateLocationBtn} onClick={updateNow} disabled={updating}>
          <LocateFixed size={14} /> {updating ? "Updating…" : "Update location now"}
        </button>
      </div>
    </>
  );
}
