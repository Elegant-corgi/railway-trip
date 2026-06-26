import type { Request, Response, NextFunction } from "express";
import { fetchTickets } from "../services/railway";

/**
 * Batch ticket query: accepts multiple from/to pairs, streams results
 * as newline-delimited JSON (NDJSON) so frontend gets each city's data
 * as soon as it's ready instead of waiting for all.
 *
 * POST /api/trains/batch
 * Body: { queries: [{ from, to, date, key }] }
 * Response: NDJSON stream, each line: { key, trainCount, trains }
 */
export async function handleTrainsBatch(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { queries } = req.body as {
      queries: { from: string; to: string; date: string; key: string }[];
    };

    if (!queries || !Array.isArray(queries) || queries.length === 0) {
      res.status(400).json({ error: "Missing queries array" });
      return;
    }

    // Cap at 40 queries per batch
    const capped = queries.slice(0, 40);

    res.setHeader("Content-Type", "application/x-ndjson");
    res.setHeader("Transfer-Encoding", "chunked");
    res.setHeader("Cache-Control", "no-cache");

    for (const q of capped) {
      if (res.writableEnded) break;
      try {
        const trains = await fetchTickets(q.from, q.to, q.date);
        res.write(
          JSON.stringify({ key: q.key, trainCount: trains.length, trains }) +
            "\n"
        );
      } catch {
        res.write(
          JSON.stringify({ key: q.key, trainCount: 0, trains: [], error: true }) +
            "\n"
        );
      }
    }

    res.end();
  } catch (err) {
    next(err);
  }
}
