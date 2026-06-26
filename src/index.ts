import type { Env } from "./types";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

function withCors(response: Response): Response {
  const headers = new Headers(response.headers);
  for (const [key, value] of Object.entries(CORS_HEADERS)) {
    headers.set(key, value);
  }
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

async function handleRequest(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const path = url.pathname;

  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  switch (path) {
    case "/api/health":
      return Response.json({
        status: "ok",
        runtime: "workers",
        timestamp: new Date().toISOString(),
      });
    default:
      return Response.json(
        { error: "Worker runtime only exposes /api/health. Use Docker for the train API." },
        { status: 404 }
      );
  }
}

export default {
  async fetch(
    request: Request,
    _env: Env,
    _ctx: ExecutionContext
  ): Promise<Response> {
    try {
      const response = await handleRequest(request);
      return withCors(response);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Internal server error";
      return withCors(
        Response.json({ error: message }, { status: 500 })
      );
    }
  },
};
