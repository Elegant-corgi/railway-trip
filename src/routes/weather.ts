import type { Request, Response, NextFunction } from "express";
import { fetchWeather } from "../services/weather";

export async function handleWeather(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const lat = parseFloat(req.query.lat as string);
    const lng = parseFloat(req.query.lng as string);

    if (isNaN(lat) || isNaN(lng)) {
      res.status(400).json({ error: "Missing or invalid lat/lng parameters" });
      return;
    }

    const weather = await fetchWeather(lat, lng);
    if (!weather) {
      res.status(503).json({ error: "Weather service unavailable" });
      return;
    }

    res.json(weather);
  } catch (err) {
    next(err);
  }
}
