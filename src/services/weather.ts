import { cacheGet, cacheSet, TTL } from "../utils/cache";

const QWEATHER_BASE = process.env.QWEATHER_HOST || "https://devapi.qweather.com";

export interface WeatherDay {
  date: string;
  tempMin: number;
  tempMax: number;
  textDay: string;
  iconDay: string;
  windDirDay: string;
  windScaleDay: string;
}

export interface WeatherInfo {
  days: WeatherDay[];
}

export async function fetchWeather(lat: number, lng: number): Promise<WeatherInfo | null> {
  const key = process.env.QWEATHER_KEY;
  if (!key) return null;

  const cacheKey = `weather:${lat},${lng}`;
  const cached = await cacheGet<WeatherInfo>(cacheKey);
  if (cached) return cached;

  try {
    const url = `${QWEATHER_BASE}/v7/weather/3d?location=${lng},${lat}&key=${key}`;
    const resp = await fetch(url);
    if (!resp.ok) return null;

    const json = await resp.json() as { daily?: Record<string, string>[] };
    const days: WeatherDay[] = (json.daily ?? []).map((d) => ({
      date: d.fxDate,
      tempMin: Number(d.tempMin),
      tempMax: Number(d.tempMax),
      textDay: d.textDay,
      iconDay: d.iconDay,
      windDirDay: d.windDirDay,
      windScaleDay: d.windScaleDay,
    }));

    const info: WeatherInfo = { days };
    await cacheSet(cacheKey, info, TTL.WEATHER);
    return info;
  } catch {
    return null;
  }
}
