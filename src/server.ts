import "dotenv/config";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import express from "express";
import cors from "cors";
import { handleHealth } from "./routes/health";
import { handleCities } from "./routes/cities";
import { handleTrains } from "./routes/trains";
import { handleTrainsBatch } from "./routes/trainsBatch";
import { handleTrainStops } from "./routes/trainStops";
import { handleWeather } from "./routes/weather";
import { handleLocate } from "./routes/locate";

const app = express();
const PORT = Number(process.env.PORT) || 3001;

app.use(cors());
app.use(express.json());

// API routes
app.get("/api/health", handleHealth);
app.get("/api/cities", handleCities);
app.get("/api/trains", handleTrains);
app.post("/api/trains/batch", handleTrainsBatch);
app.get("/api/train-stops", handleTrainStops);
app.get("/api/weather", handleWeather);
app.get("/api/locate", handleLocate);

// Serve frontend static files
// Resolve __dirname for both ESM and CJS contexts
const __filename2 = typeof __filename !== "undefined" ? __filename : fileURLToPath(import.meta.url);
const __dirname2 = path.dirname(__filename2);
const publicDir = path.resolve(__dirname2, "../public");
const indexPath = path.join(publicDir, "index.html");

function renderIndexHtml(): string {
  const html = fs.readFileSync(indexPath, "utf8");
  const runtimeConfig = [
    `window.__RT_AMAP_KEY=${JSON.stringify(process.env.VITE_AMAP_KEY ?? "")};`,
    `window.__RT_API_BASE_URL=${JSON.stringify(process.env.VITE_API_BASE_URL ?? "")};`,
  ].join("");
  return html.replace("</head>", `<script>${runtimeConfig}</script></head>`);
}

app.get("/", (_req, res) => {
  res.type("html").send(renderIndexHtml());
});

app.use(express.static(publicDir, { index: false }));

// SPA fallback: non-API routes serve index.html
app.get("/{*path}", (_req, res, next) => {
  if (_req.path.startsWith("/api")) return next();
  res.type("html").send(renderIndexHtml());
});

app.use(
  (
    err: Error,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction
  ) => {
    console.error(err);
    res.status(500).json({ error: err.message || "Internal server error" });
  }
);

app.listen(PORT, "0.0.0.0", () => {
  console.log(`API server listening on http://0.0.0.0:${PORT}`);
});
