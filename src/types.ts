export interface Station {
  name: string;
  city: string;
  code: string;
  lat: number;
  lng: number;
}

export interface Train {
  trainNo: string;
  trainCode: string;
  fromStation: string;
  toStation: string;
  fromStationCode: string;
  toStationCode: string;
  departTime: string;
  arriveTime: string;
  duration: string;
  fromStationNo: string;
  toStationNo: string;
  firstClassSeats: string;
  secondClassSeats: string;
  businessSeats: string;
  noSeatTickets: string;
  seatTypeCodes: string;
}

export interface TrainWithPrice extends Train {
  prices?: TicketPrice;
}

export interface TicketPrice {
  business?: string;
  firstClass?: string;
  secondClass?: string;
  noSeat?: string;
}

export type TicketStatus = "abundant" | "limited" | "soldout";

export interface CityResult {
  city: string;
  stationCode: string;
  stationName: string;
  minPrice: number | null;
  minDuration: string | null;
  trainCount: number;
  ticketStatus: TicketStatus;
  sampleTrainCode: string | null;
}

export interface TrainStop {
  stationName: string;
  arriveTime: string;
  departTime: string;
  stopoverTime: string;
  stationNo: number;
  isStart: boolean;
  isEnd: boolean;
}

export interface Env {
  // KV namespace placeholder for future use
}
