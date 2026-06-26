const memStore = new Map<string, { value: unknown; exp: number }>();

const TTL = {
  TICKETS: 5 * 60 * 1000,
  WEATHER: 2 * 60 * 60 * 1000,
  STATIONS: 24 * 60 * 60 * 1000,
} as const;

export async function cacheGet<T>(key: string): Promise<T | null> {
  const e = memStore.get(key);
  if (!e || Date.now() > e.exp) { memStore.delete(key); return null; }
  return e.value as T;
}

export async function cacheSet<T>(key: string, value: T, ttlMs: number = TTL.TICKETS): Promise<void> {
  memStore.set(key, { value, exp: Date.now() + ttlMs });
}

export { TTL };
