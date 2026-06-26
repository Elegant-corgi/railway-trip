import type { Train } from "../types";

const FIELD_INDEX = {
  trainNo: 2,
  trainCode: 3,
  fromStationCode: 6,
  toStationCode: 7,
  departTime: 8,
  arriveTime: 9,
  duration: 10,
  fromStationNo: 16,
  toStationNo: 17,
  firstClassSeats: 31,
  secondClassSeats: 30,
  businessSeats: 32,
  noSeatTickets: 26,
  seatTypeCodes: 35,
} as const;

/**
 * Parse a single 12306 ticket result row (pipe-separated) into a Train object.
 */
export function parseTrainRow(
  raw: string,
  stationMap: Map<string, string>
): Train | null {
  const fields = raw.split("|");
  if (fields.length < 36) return null;

  const fromCode = fields[FIELD_INDEX.fromStationCode];
  const toCode = fields[FIELD_INDEX.toStationCode];

  return {
    trainNo: fields[FIELD_INDEX.trainNo],
    trainCode: fields[FIELD_INDEX.trainCode],
    fromStationCode: fromCode,
    toStationCode: toCode,
    fromStation: stationMap.get(fromCode) ?? fromCode,
    toStation: stationMap.get(toCode) ?? toCode,
    departTime: fields[FIELD_INDEX.departTime],
    arriveTime: fields[FIELD_INDEX.arriveTime],
    duration: fields[FIELD_INDEX.duration],
    fromStationNo: fields[FIELD_INDEX.fromStationNo],
    toStationNo: fields[FIELD_INDEX.toStationNo],
    firstClassSeats: fields[FIELD_INDEX.firstClassSeats] || "--",
    secondClassSeats: fields[FIELD_INDEX.secondClassSeats] || "--",
    businessSeats: fields[FIELD_INDEX.businessSeats] || "--",
    noSeatTickets: fields[FIELD_INDEX.noSeatTickets] || "--",
    seatTypeCodes: fields[FIELD_INDEX.seatTypeCodes] || "",
  };
}

/**
 * Parse the full 12306 ticket query response into an array of Train objects.
 */
export function parseTicketResponse(
  resultList: string[],
  stationMap: Map<string, string>
): Train[] {
  const trains: Train[] = [];
  for (const row of resultList) {
    const train = parseTrainRow(row, stationMap);
    if (train) trains.push(train);
  }
  return trains;
}

/**
 * Parse seat type code string into human-readable mapping.
 * M = first class, O = second class, A9/9 = business, WZ = no seat
 */
export function parseSeatTypes(codes: string): Record<string, string> {
  const map: Record<string, string> = {};
  if (codes.includes("M")) map["M"] = "firstClass";
  if (codes.includes("O")) map["O"] = "secondClass";
  if (codes.includes("9")) map["9"] = "business";
  return map;
}

/**
 * Parse duration string (HH:MM) to minutes for comparison.
 */
export function durationToMinutes(duration: string): number {
  const parts = duration.split(":");
  if (parts.length !== 2) return Infinity;
  return parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
}
