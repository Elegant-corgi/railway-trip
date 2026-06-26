import type { Request, Response, NextFunction } from "express";
import type { TrainWithPrice } from "../types";
import { fetchTickets, fetchPrice } from "../services/railway";

export async function handleTrains(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const from = req.query.from as string | undefined;
    const to = req.query.to as string | undefined;
    const date = req.query.date as string | undefined;

    if (!from || !to || !date) {
      res
        .status(400)
        .json({ error: "Missing required parameters: from, to, date" });
      return;
    }

    const nocache = req.query.nocache === '1';
    const trains = await fetchTickets(from, to, date, nocache);

    // Skip per-train price lookup for now (too slow with 3s throttle).
    // Price data from the ticket query is sufficient for MVP.
    res.json({
      from,
      to,
      date,
      trainCount: trains.length,
      trains,
    });
  } catch (err) {
    next(err);
  }
}
