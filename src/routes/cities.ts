import type { Request, Response, NextFunction } from "express";
import type { Station, CityResult, TicketStatus } from "../types";
import { fetchTickets } from "../services/railway";
import { durationToMinutes } from "../utils/parser";
import stationsData from "../../data/stations.json";
import destinationsData from "../../data/destinations.json";

const stations: Station[] = stationsData as Station[];

const MAX_DURATION_MINUTES = 360; // 6 hours

/**
 * Find the primary station code for a city name.
 * Prefers the main station (shortest name) over sub-stations.
 */
function getPrimaryStationCode(city: string): string | null {
  const cityStations = stations.filter((s) => s.city === city);
  if (cityStations.length === 0) return null;

  const preferredStationByCity: Record<string, string> = {
    "\u5317\u4eac": "\u5317\u4eac\u5357",
    "\u4e0a\u6d77": "\u4e0a\u6d77\u8679\u6865",
    "\u676d\u5dde": "\u676d\u5dde\u4e1c",
    "\u5357\u4eac": "\u5357\u4eac\u5357",
    "\u5e7f\u5dde": "\u5e7f\u5dde\u5357",
    "\u6df1\u5733": "\u6df1\u5733\u5317",
    "\u6210\u90fd": "\u6210\u90fd\u4e1c",
    "\u91cd\u5e86": "\u91cd\u5e86\u5317",
    "\u897f\u5b89": "\u897f\u5b89\u5317",
    "\u90d1\u5dde": "\u90d1\u5dde\u4e1c",
    "\u957f\u6c99": "\u957f\u6c99\u5357",
    "\u6d4e\u5357": "\u6d4e\u5357\u897f",
    "\u592a\u539f": "\u592a\u539f\u5357",
    "\u6c88\u9633": "\u6c88\u9633\u5317",
    "\u54c8\u5c14\u6ee8": "\u54c8\u5c14\u6ee8\u897f",
    "\u957f\u6625": "\u957f\u6625\u897f",
    "\u798f\u5dde": "\u798f\u5dde\u5357",
    "\u6606\u660e": "\u6606\u660e\u5357",
    "\u8d35\u9633": "\u8d35\u9633\u5317",
    "\u5357\u5b81": "\u5357\u5b81\u4e1c",
    "\u5170\u5dde": "\u5170\u5dde\u897f",
  };

  const preferred = preferredStationByCity[city];
  if (preferred) {
    const station = cityStations.find((s) => s.name === preferred);
    if (station) return station.code;
  }

  cityStations.sort((a, b) => a.name.length - b.name.length);
  return cityStations[0].code;
}

function deriveTicketStatus(seats: string): TicketStatus {
  if (seats === "--" || seats === "" || seats === "\u65e0") return "soldout";
  if (seats === "\u6709") return "abundant";
  const n = parseInt(seats, 10);
  if (isNaN(n) || n <= 0) return "soldout";
  if (n < 10) return "limited";
  return "abundant";
}

export async function handleCities(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const from = req.query.from as string | undefined;
    const date = req.query.date as string | undefined;

    if (!from || !date) {
      res.status(400).json({ error: "Missing required parameters: from, date" });
      return;
    }

  // Determine the departure city to exclude from destinations
  const fromStation = stations.find((s) => s.code === from);
  const fromCity = fromStation?.city;

  // Filter destinations: exclude departure city
  const destCities = (destinationsData.cities as string[]).filter(
    (c) => c !== fromCity
  );

  const results: CityResult[] = [];

  for (const city of destCities) {
    const toCode = getPrimaryStationCode(city);
    if (!toCode) continue;

    try {
      const trains = await fetchTickets(from, toCode, date);

      // Filter to trains within 6h
      const reachable = trains.filter(
        (t) => durationToMinutes(t.duration) <= MAX_DURATION_MINUTES
      );

      if (reachable.length === 0) {
        results.push({
          city,
          stationCode: toCode,
          stationName:
            stations.find((s) => s.code === toCode)?.name ?? city,
          minPrice: null,
          minDuration: null,
          trainCount: 0,
          ticketStatus: "soldout",
          sampleTrainCode: null,
        });
        continue;
      }

      // Find min duration
      let minDurMinutes = Infinity;
      let minDurStr = reachable[0].duration;
      for (const t of reachable) {
        const m = durationToMinutes(t.duration);
        if (m < minDurMinutes) {
          minDurMinutes = m;
          minDurStr = t.duration;
        }
      }

      // Aggregate ticket status across all trains
      let bestStatus: TicketStatus = "soldout";
      for (const t of reachable) {
        for (const seats of [
          t.secondClassSeats,
          t.firstClassSeats,
          t.businessSeats,
        ]) {
          const s = deriveTicketStatus(seats);
          if (s === "abundant") {
            bestStatus = "abundant";
            break;
          }
          if (s === "limited") bestStatus = "limited";
        }
        if (bestStatus === "abundant") break;
      }

      results.push({
        city,
        stationCode: toCode,
        stationName:
          stations.find((s) => s.code === toCode)?.name ?? city,
        minPrice: null, // Price query skipped for list view (too slow)
        minDuration: minDurStr,
        trainCount: reachable.length,
        ticketStatus: bestStatus,
        sampleTrainCode: reachable[0].trainCode,
      });
    } catch {
      // Silently skip failed queries
      results.push({
        city,
        stationCode: toCode,
        stationName:
          stations.find((s) => s.code === toCode)?.name ?? city,
        minPrice: null,
        minDuration: null,
        trainCount: 0,
        ticketStatus: "soldout",
        sampleTrainCode: null,
      });
    }
  }

    res.json({
      from,
      date,
      cities: results.filter((r) => r.trainCount > 0),
    });
  } catch (err) {
    next(err);
  }
}
