type Entry = { at: number; data: unknown };

const store = new Map<string, Entry>();
const DEFAULT_TTL_MS = 5 * 60_000;

export function cacheGet<T>(key: string, ttlMs = DEFAULT_TTL_MS): T | null {
  const hit = store.get(key);
  if (!hit) return null;
  if (Date.now() - hit.at > ttlMs) {
    store.delete(key);
    return null;
  }
  return hit.data as T;
}

export function cacheSet(key: string, data: unknown) {
  store.set(key, { at: Date.now(), data });
}

export function cacheKey(parts: (string | null | undefined)[]) {
  return parts.filter(Boolean).join(":");
}
