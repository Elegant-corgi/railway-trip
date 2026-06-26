import type { Request, Response } from "express";

export function handleHealth(_req: Request, res: Response): void {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
}
