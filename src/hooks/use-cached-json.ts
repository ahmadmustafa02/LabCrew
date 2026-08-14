"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { cacheGet, cacheSet } from "@/lib/client-cache";

/**
 * Instant paint from cache on revisit; silent background refresh.
 * `loading` is true only when there is no cached value yet.
 */
export function useCachedJson<T>(
  key: string | null,
  fetcher: () => Promise<T>,
  opts?: { enabled?: boolean },
) {
  const enabled = opts?.enabled !== false && Boolean(key);
  const cached = key ? cacheGet<T>(key) : null;
  const [data, setData] = useState<T | null>(cached);
  const [loading, setLoading] = useState(!cached && enabled);
  const [error, setError] = useState<string | null>(null);
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  const reload = useCallback(async () => {
    if (!key || !enabled) return null;
    const had = cacheGet<T>(key) != null || data != null;
    if (!had) setLoading(true);
    try {
      const next = await fetcherRef.current();
      cacheSet(key, next);
      setData(next);
      setError(null);
      return next;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Load failed");
      return null;
    } finally {
      setLoading(false);
    }
  }, [key, enabled, data]);

  useEffect(() => {
    if (!enabled || !key) return;
    const hit = cacheGet<T>(key);
    if (hit) {
      setData(hit);
      setLoading(false);
    }
    void reload();
    // intentionally only when key/enabled change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, enabled]);

  const setCachedData = useCallback(
    (updater: T | ((prev: T | null) => T)) => {
      setData((prev) => {
        const next =
          typeof updater === "function"
            ? (updater as (p: T | null) => T)(prev)
            : updater;
        if (key) cacheSet(key, next);
        return next;
      });
    },
    [key],
  );

  return { data, setData: setCachedData, loading, error, setError, reload };
}
