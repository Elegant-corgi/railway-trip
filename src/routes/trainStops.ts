import type { Request, Response, NextFunction } from "express";
import { fetchTrainStops } from "../services/railway";

export async function handleTrainStops(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const trainNo = req.query.trainNo as string | undefined;
    const from = req.query.from as string | undefined;
    const to = req.query.to as string | undefined;
    const date = req.query.date as string | undefined;

    if (!trainNo || !from || !to || !date) {
      res
        .status(400)
        .json({ error: "Missing required parameters: trainNo, from, to, date" });
      return;
    }

    const stops = await fetchTrainStops(trainNo, from, to, date);
    res.json({ trainNo, stops });
  } catch (err) {
    next(err);
  }
}
