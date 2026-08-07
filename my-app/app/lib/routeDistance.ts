/**
 * Server-only helper for auto-calculating driving distance/time between two
 * free-text locations, via OpenRouteService (openrouteservice.org) — a free,
 * OpenStreetMap-based routing API that doesn't require a billing account
 * (unlike Google's Distance Matrix API, which this replaced). Runs as a
 * Server Action rather than a client-side call so ORS_API_KEY never reaches
 * the browser; ORS has no JS SDK anyway, just a plain REST API.
 */
"use server";

const ORS_BASE = "https://api.openrouteservice.org";

export type RouteDistanceResult =
  | { distanceKm: string; estimatedTime: string; error?: undefined }
  | { distanceKm?: undefined; estimatedTime?: undefined; error: string };

export async function calculateRouteDistance(
  origin: string,
  destination: string
): Promise<RouteDistanceResult> {
  const apiKey = process.env.ORS_API_KEY;
  if (!apiKey) return { error: "Distance lookup isn't configured." };

  try {
    const [originCoord, destCoord] = await Promise.all([
      geocode(origin, apiKey),
      geocode(destination, apiKey),
    ]);
    if (!originCoord || !destCoord) {
      return { error: "Couldn't find one of these locations." };
    }

    const res = await fetch(`${ORS_BASE}/v2/matrix/driving-car`, {
      method: "POST",
      headers: {
        Authorization: apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        locations: [originCoord, destCoord],
        sources: [0],
        destinations: [1],
        metrics: ["distance", "duration"],
      }),
    });
    if (!res.ok) {
      console.warn("ORS matrix lookup failed:", res.status, await res.text().catch(() => ""));
      return { error: "Distance lookup failed." };
    }

    const data = await res.json();
    const distanceMeters = data?.distances?.[0]?.[0];
    const durationSeconds = data?.durations?.[0]?.[0];
    if (typeof distanceMeters !== "number" || typeof durationSeconds !== "number") {
      return { error: "Couldn't calculate distance for these locations." };
    }

    return {
      distanceKm: (distanceMeters / 1000).toFixed(1),
      estimatedTime: formatDuration(durationSeconds),
    };
  } catch (e) {
    console.warn("ORS distance lookup error:", e);
    return { error: "Distance lookup failed." };
  }
}

/** Geocodes free text to an ORS [lon, lat] pair via its Pelias-based search endpoint. */
async function geocode(text: string, apiKey: string): Promise<[number, number] | null> {
  const url = new URL(`${ORS_BASE}/geocode/search`);
  url.searchParams.set("api_key", apiKey);
  url.searchParams.set("text", text);
  url.searchParams.set("size", "1");

  const res = await fetch(url.toString());
  if (!res.ok) return null;
  const data = await res.json();
  const coord = data?.features?.[0]?.geometry?.coordinates;
  return Array.isArray(coord) && coord.length === 2 ? [coord[0], coord[1]] : null;
}

function formatDuration(seconds: number): string {
  const totalMinutes = Math.round(seconds / 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0) return `${minutes} min${minutes === 1 ? "" : "s"}`;
  if (minutes === 0) return `${hours} hour${hours === 1 ? "" : "s"}`;
  return `${hours} hour${hours === 1 ? "" : "s"} ${minutes} min${minutes === 1 ? "" : "s"}`;
}
