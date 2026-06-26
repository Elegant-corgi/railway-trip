import type { Request, Response, NextFunction } from "express";
import stationsData from "../../data/stations.json";

interface StationEntry {
  name: string;
  city: string;
  code: string;
  lat: number;
  lng: number;
}

const stations: StationEntry[] = stationsData as StationEntry[];

// Deduplicate by city, keep first occurrence
const cityStations = new Map<string, StationEntry>();
for (const s of stations) {
  if (!cityStations.has(s.city)) cityStations.set(s.city, s);
}
const uniqueCities = Array.from(cityStations.values());

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function findNearestCity(lat: number, lng: number): StationEntry {
  let best = uniqueCities[0];
  let bestDist = Infinity;
  for (const c of uniqueCities) {
    const d = haversineKm(lat, lng, c.lat, c.lng);
    if (d < bestDist) {
      bestDist = d;
      best = c;
    }
  }
  return best;
}

export async function handleLocate(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // Extract client IP from proxy headers
    const ip =
      (req.headers["fly-client-ip"] as string) ||
      (req.headers["cf-connecting-ip"] as string) ||
      (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ||
      req.ip ||
      "";

    // Skip private/localhost IPs
    if (!ip || ip === "127.0.0.1" || ip === "::1" || ip.startsWith("192.168.") || ip.startsWith("10.")) {
      res.json({ city: "杭州", code: "HGH", lat: 30.27, lng: 120.15, source: "fallback" });
      return;
    }

    // Call ip-api.com (free, no key, 45 req/min, HTTP only)
    const geoResp = await fetch(`http://ip-api.com/json/${ip}?fields=status,lat,lon,city`);
    const geo = (await geoResp.json()) as { status: string; lat?: number; lon?: number; city?: string };

    if (geo.status !== "success" || geo.lat == null || geo.lon == null) {
      res.json({ city: "杭州", code: "HGH", lat: 30.27, lng: 120.15, source: "fallback" });
      return;
    }

    const nearest = findNearestCity(geo.lat, geo.lon);
    res.json({
      city: nearest.city,
      code: nearest.code,
      lat: nearest.lat,
      lng: nearest.lng,
      source: "ip",
      ipCity: geo.city,
    });
  } catch (err) {
    res.json({ city: "杭州", code: "HGH", lat: 30.27, lng: 120.15, source: "fallback" });
  }
}
