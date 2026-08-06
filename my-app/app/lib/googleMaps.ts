/**
 * Shared Google Maps JS API loader — used by both LocationMap.tsx (live
 * vehicle tracking) and RouteFormModal (route distance auto-calculation),
 * so both features share one script load instead of racing to inject
 * duplicate <script> tags.
 */

const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

declare global {
  interface Window {
    google?: typeof google;
  }
}

// Module-level promise: every caller on the page shares one script/load.
let loaderPromise: Promise<void> | null = null;

export function loadGoogleMapsScript(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.google?.maps?.Map) return Promise.resolve();
  if (loaderPromise) return loaderPromise;

  loaderPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    // No `loading=async`/`importLibrary` here — that flow needs Google's
    // official bootstrap shim run before this script loads. A plain script
    // tag like this loads the full "maps" library synchronously, so
    // `google.maps.Map`/`google.maps.Marker`/`google.maps.DistanceMatrixService`
    // are real constructors as soon as onload fires.
    script.src = `https://maps.googleapis.com/maps/api/js?key=${API_KEY}`;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load Google Maps"));
    document.head.appendChild(script);
  });
  return loaderPromise;
}

export function hasGoogleMapsApiKey(): boolean {
  return Boolean(API_KEY);
}
