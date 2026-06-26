import type { Train, TicketPrice, TrainStop } from "../types";
import { parseTicketResponse } from "../utils/parser";
import { cacheGet, cacheSet, TTL } from "../utils/cache";

const BASE_URL = "https://kyfw.12306.cn";
const HEADERS: Record<string, string> = {
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  Accept: "*/*",
  "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
  Referer: "https://kyfw.12306.cn/otn/leftTicket/init",
};

const REQUEST_INTERVAL_MS = 1500;
let lastRequestTime = 0;
let sessionCookie = "";
let cookieExpiry = 0;

/**
 * Acquire session cookie by visiting the 12306 init page.
 * Cookie is cached for 30 minutes.
 */
async function ensureCookie(): Promise<string> {
  if (sessionCookie && Date.now() < cookieExpiry) return sessionCookie;

  try {
    const resp = await fetch(`${BASE_URL}/otn/leftTicket/init`, {
      headers: HEADERS,
      redirect: "follow",
    });
    const headersWithCookies = resp.headers as Headers & {
      getSetCookie?: () => string[];
    };
    const setCookies =
      headersWithCookies.getSetCookie?.() ??
      (resp.headers.get("set-cookie") ? [resp.headers.get("set-cookie") as string] : []);
    sessionCookie = setCookies
      .map((c: string) => c.split(";")[0])
      .join("; ");
    cookieExpiry = Date.now() + 30 * 60 * 1000;
  } catch {
    sessionCookie = "";
  }
  return sessionCookie;
}

async function throttledFetch(
  url: string,
  init?: RequestInit
): Promise<Response> {
  const now = Date.now();
  const elapsed = now - lastRequestTime;
  if (elapsed < REQUEST_INTERVAL_MS) {
    await new Promise((r) => setTimeout(r, REQUEST_INTERVAL_MS - elapsed));
  }
  lastRequestTime = Date.now();

  const cookie = await ensureCookie();
  const headers: Record<string, string> = {
    ...HEADERS,
    ...(init?.headers as Record<string, string>),
  };
  if (cookie) headers["Cookie"] = cookie;

  return fetch(url, { ...init, headers });
}

/**
 * Fetch station name-to-code mapping from 12306.
 */
export async function fetchStationMap(): Promise<Map<string, string>> {
  const cacheKey = "station_map";
  const cached = await cacheGet<Map<string, string>>(cacheKey);
  if (cached) return cached;

  const url = `${BASE_URL}/otn/resources/js/framework/station_name.js`;
  const resp = await throttledFetch(url);
  const text = await resp.text();

  // Format: @abbr|name|code|pinyin|initial|index
  const map = new Map<string, string>();
  const entries = text.split("@").filter(Boolean);
  for (const entry of entries) {
    const parts = entry.split("|");
    if (parts.length >= 3) {
      // code -> name
      map.set(parts[2], parts[1]);
    }
  }

  await cacheSet(cacheKey, map, TTL.STATIONS);
  return map;
}

/**
 * Query available tickets with fallback endpoints.
 */
export async function fetchTickets(
  from: string,
  to: string,
  date: string,
  nocache = false,
): Promise<Train[]> {
  const cacheKey = `tickets:${from}:${to}:${date}`;
  if (!nocache) {
    const cached = await cacheGet<Train[]>(cacheKey);
    if (cached) return cached;
  }

  const stationMap = await fetchStationMap();
  const endpoints = ["queryZ", "query", "queryA"];
  const params = new URLSearchParams({
    "leftTicketDTO.train_date": date,
    "leftTicketDTO.from_station": from,
    "leftTicketDTO.to_station": to,
    purpose_codes: "ADULT",
  });

  for (const endpoint of endpoints) {
    try {
      const url = `${BASE_URL}/otn/leftTicket/${endpoint}?${params}`;
      const resp = await throttledFetch(url);
      if (!resp.ok) continue;

      const data = (await resp.json()) as {
        data?: { result?: string[] };
        httpstatus?: number;
      };
      const resultList = data?.data?.result;
      if (!resultList || resultList.length === 0) continue;

      const trains = parseTicketResponse(resultList, stationMap);
      if (trains.length > 0) {
        await cacheSet(cacheKey, trains, TTL.TICKETS);
      }
      return trains;
    } catch {
      // Try next endpoint
      continue;
    }
  }

  return [];
}

/**
 * Query ticket price for a specific train.
 */
export async function fetchPrice(
  trainNo: string,
  fromStationNo: string,
  toStationNo: string,
  seatTypes: string,
  date: string
): Promise<TicketPrice | null> {
  const cacheKey = `price:${trainNo}:${fromStationNo}:${toStationNo}:${date}`;
  const cached = await cacheGet<TicketPrice>(cacheKey);
  if (cached) return cached;

  const params = new URLSearchParams({
    train_no: trainNo,
    from_station_no: fromStationNo,
    to_station_no: toStationNo,
    seat_types: seatTypes,
    train_date: date,
  });

  try {
    const url = `${BASE_URL}/otn/leftTicket/queryTicketPrice?${params}`;
    const resp = await throttledFetch(url);
    if (!resp.ok) return null;

    const data = (await resp.json()) as {
      data?: Record<string, string>;
    };
    if (!data?.data) return null;

    const d = data.data;
    const price: TicketPrice = {};
    // A9 = business, M = first class, O = second class, WZ = no seat
    if (d["A9"]) price.business = d["A9"].replace("¥", "");
    if (d["M"]) price.firstClass = d["M"].replace("¥", "");
    if (d["O"]) price.secondClass = d["O"].replace("¥", "");
    if (d["WZ"]) price.noSeat = d["WZ"].replace("¥", "");

    await cacheSet(cacheKey, price, TTL.TICKETS);
    return price;
  } catch {
    return null;
  }
}

/**
 * Throttled delay utility for batch operations.
 */
export async function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * Query intermediate stops for a specific train.
 */
export async function fetchTrainStops(
  trainNo: string,
  fromCode: string,
  toCode: string,
  date: string
): Promise<TrainStop[]> {
  const cacheKey = `stops:${trainNo}:${fromCode}:${toCode}:${date}`;
  const cached = await cacheGet<TrainStop[]>(cacheKey);
  if (cached) return cached;

  const params = new URLSearchParams({
    train_no: trainNo,
    from_station_telecode: fromCode,
    to_station_telecode: toCode,
    depart_date: date,
  });

  try {
    const url = `${BASE_URL}/otn/czxx/queryByTrainNo?${params}`;
    const resp = await throttledFetch(url);
    if (!resp.ok) return [];

    const data = (await resp.json()) as {
      data?: { data?: Array<{
        station_name: string;
        arrive_time: string;
        start_time: string;
        stopover_time: string;
        station_no: string;
        isEnabled: boolean;
      }> };
    };

    const rawStops = data?.data?.data;
    if (!rawStops || rawStops.length === 0) return [];

    const stops: TrainStop[] = rawStops.map((s, i) => ({
      stationName: s.station_name,
      arriveTime: s.arrive_time,
      departTime: s.start_time,
      stopoverTime: s.stopover_time,
      stationNo: parseInt(s.station_no, 10),
      isStart: i === 0,
      isEnd: i === rawStops.length - 1,
    }));

    await cacheSet(cacheKey, stops, TTL.TICKETS);
    return stops;
  } catch {
    return [];
  }
}
