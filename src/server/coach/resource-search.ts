/**
 * Adaptive Coach Phase C — retrieval only (no LLM invent).
 * Semantic Scholar primary; arXiv then OpenAlex fallback. Never invent titles.
 */

export type PaperSource = "semanticscholar" | "arxiv" | "openalex";

export type RetrievedPaper = {
  title: string;
  url: string;
  year: number | null;
  venue: string | null;
  source: PaperSource;
  paperId: string;
};

const S2_FIELDS = "paperId,title,url,year,venue,externalIds";
const FETCH_MS = 12_000;
const SEARCH_CACHE_TTL_MS = 30 * 60 * 1000;
const USER_AGENT = "LabCrew/0.1 (research-lab-ops; +http://localhost:3000)";

function paperHeaders(extra?: Record<string, string>): Headers {
  const headers = new Headers(extra);
  headers.set("User-Agent", USER_AGENT);
  return headers;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchPolite(url: URL | string, init: RequestInit, retries = 1) {
  let last: Response | undefined;
  for (let attempt = 0; attempt <= retries; attempt++) {
    const headers = paperHeaders(
      init.headers instanceof Headers
        ? Object.fromEntries(init.headers.entries())
        : (init.headers as Record<string, string> | undefined),
    );
    const res = await fetch(url, {
      ...init,
      headers,
      signal: init.signal ?? AbortSignal.timeout(FETCH_MS),
    });
    if (res.status !== 429 && res.status !== 503) return res;
    last = res;
    const retryAfter = Number(res.headers.get("retry-after"));
    const waitMs =
      Number.isFinite(retryAfter) && retryAfter > 0
        ? Math.min(retryAfter * 1000, 8000)
        : 1200 * (attempt + 1);
    await sleep(waitMs);
  }
  return last!;
}

type CacheEntry = {
  expiresAt: number;
  value: {
    query: string;
    papers: RetrievedPaper[];
    primarySource: PaperSource | "none";
    error?: string;
  };
};

const searchCache = new Map<string, CacheEntry>();

function cleanQuery(raw: string) {
  return raw.replace(/\s+/g, " ").trim().slice(0, 200);
}

function compactQuery(query: string) {
  const tokens = significantTokens(query);
  return tokens.slice(0, 4).join(" ") || query;
}

function isHttpUrl(v: string) {
  try {
    const u = new URL(v);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

async function searchSemanticScholar(
  query: string,
  limit: number,
): Promise<RetrievedPaper[]> {
  const url = new URL("https://api.semanticscholar.org/graph/v1/paper/search");
  url.searchParams.set("query", compactQuery(query));
  url.searchParams.set("limit", String(limit));
  url.searchParams.set("fields", S2_FIELDS);

  const extra: Record<string, string> = { Accept: "application/json" };
  const apiKey = process.env.SEMANTIC_SCHOLAR_API_KEY?.trim();
  if (apiKey) extra["x-api-key"] = apiKey;

  const res = await fetchPolite(url, { headers: extra });
  if (!res.ok) {
    throw new Error(`Semantic Scholar HTTP ${res.status}`);
  }
  const json = (await res.json()) as {
    data?: Array<{
      paperId?: string;
      title?: string;
      url?: string | null;
      year?: number | null;
      venue?: string | null;
      externalIds?: { DOI?: string; ArXiv?: string };
    }>;
  };

  const out: RetrievedPaper[] = [];
  for (const row of json.data ?? []) {
    const title = (row.title ?? "").trim();
    if (!title || !row.paperId) continue;
    let link =
      (row.url && isHttpUrl(row.url) ? row.url : null) ||
      (row.externalIds?.DOI
        ? `https://doi.org/${row.externalIds.DOI}`
        : null) ||
      (row.externalIds?.ArXiv
        ? `https://arxiv.org/abs/${row.externalIds.ArXiv}`
        : null) ||
      `https://www.semanticscholar.org/paper/${row.paperId}`;
    if (!isHttpUrl(link)) continue;
    out.push({
      title,
      url: link,
      year: typeof row.year === "number" ? row.year : null,
      venue: row.venue?.trim() || null,
      source: "semanticscholar",
      paperId: row.paperId,
    });
  }
  return out;
}

function decodeXml(s: string) {
  return s
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

async function searchArxiv(query: string, limit: number): Promise<RetrievedPaper[]> {
  const url = new URL("https://export.arxiv.org/api/query");
  const tokens = significantTokens(query);
  const arxivQ =
    tokens.length >= 2
      ? `all:"${tokens.slice(0, 3).join(" ")}"`
      : `all:${compactQuery(query)}`;
  url.searchParams.set("search_query", arxivQ);
  url.searchParams.set("start", "0");
  url.searchParams.set("max_results", String(limit));

  const res = await fetchPolite(
    url,
    { headers: { Accept: "application/atom+xml" } },
    0,
  );
  if (!res.ok) throw new Error(`arXiv HTTP ${res.status}`);
  const xml = await res.text();

  const entries = xml.split("<entry>").slice(1);
  const out: RetrievedPaper[] = [];
  for (const entry of entries) {
    const idMatch = entry.match(/<id>([^<]+)<\/id>/);
    const titleMatch = entry.match(/<title>([\s\S]*?)<\/title>/);
    const published = entry.match(/<published>(\d{4})/);
    if (!idMatch || !titleMatch) continue;
    const absUrl = idMatch[1].trim().replace("http://", "https://");
    const title = decodeXml(titleMatch[1]).replace(/\s+/g, " ").trim();
    if (!title || !isHttpUrl(absUrl)) continue;
    const arxivId = absUrl.split("/abs/")[1] ?? absUrl;
    out.push({
      title,
      url: absUrl,
      year: published ? Number(published[1]) : null,
      venue: "arXiv",
      source: "arxiv",
      paperId: arxivId,
    });
    if (out.length >= limit) break;
  }
  return out;
}

async function searchOpenAlex(query: string, limit: number): Promise<RetrievedPaper[]> {
  const url = new URL("https://api.openalex.org/works");
  url.searchParams.set("search", compactQuery(query));
  url.searchParams.set("per_page", String(limit));

  const res = await fetchPolite(url, { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error(`OpenAlex HTTP ${res.status}`);
  const json = (await res.json()) as {
    results?: Array<{
      id?: string;
      title?: string;
      display_name?: string;
      publication_year?: number;
      doi?: string | null;
      primary_location?: {
        landing_page_url?: string | null;
        source?: { display_name?: string | null };
      };
    }>;
  };

  const out: RetrievedPaper[] = [];
  for (const row of json.results ?? []) {
    const title = (row.display_name ?? row.title ?? "").trim();
    const id = (row.id ?? "").replace("https://openalex.org/", "").trim();
    if (!title || !id) continue;
    const doi = row.doi && isHttpUrl(row.doi) ? row.doi : null;
    const landing =
      row.primary_location?.landing_page_url &&
      isHttpUrl(row.primary_location.landing_page_url)
        ? row.primary_location.landing_page_url
        : null;
    const link = landing || doi || `https://openalex.org/${id}`;
    if (!isHttpUrl(link)) continue;
    out.push({
      title,
      url: link,
      year: typeof row.publication_year === "number" ? row.publication_year : null,
      venue: row.primary_location?.source?.display_name?.trim() || "OpenAlex",
      source: "openalex",
      paperId: id,
    });
    if (out.length >= limit) break;
  }
  return out;
}

const STOP_TOKENS = new Set([
  "paper",
  "topic",
  "study",
  "research",
  "using",
  "based",
  "from",
  "with",
  "that",
  "this",
  "into",
  "about",
  "work",
  "review",
  "method",
  "methods",
  "result",
  "results",
  "analysis",
  "approach",
  "model",
  "models",
  "data",
  "system",
  "systems",
]);

function significantTokens(query: string): string[] {
  return query
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length >= 4 && !/^\d+$/.test(t) && !STOP_TOKENS.has(t));
}

/**
 * Drop fuzzy index noise. Require enough query-token overlap in the title.
 * Rare long tokens (≥8 chars) count double toward the threshold.
 */
export function filterRelevantPapers(
  query: string,
  papers: RetrievedPaper[],
): RetrievedPaper[] {
  const tokens = significantTokens(query);
  if (tokens.length === 0) return [];
  const need = Math.min(2, tokens.length);

  return papers.filter((p) => {
    const title = p.title.toLowerCase();
    let hits = 0;
    for (const t of tokens) {
      if (!title.includes(t)) continue;
      hits += t.length >= 8 ? 2 : 1;
    }
    return hits >= need;
  });
}

/**
 * Search papers for an assignment topic. Never invents results.
 * Returns empty array when nothing usable is found.
 * Results are cached in-process for 30 minutes per normalized query.
 */
export async function searchPapersForTopic(
  topic: string,
  limit = 10,
): Promise<{
  query: string;
  papers: RetrievedPaper[];
  primarySource: PaperSource | "none";
  error?: string;
  cacheHit?: boolean;
}> {
  const query = cleanQuery(topic);
  if (query.length < 2) {
    return { query, papers: [], primarySource: "none", error: "Query too short" };
  }

  const cacheKey = `${query.toLowerCase()}::${limit}`;
  const cached = searchCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return { ...cached.value, cacheHit: true };
  }

  function finalize(
    papers: RetrievedPaper[],
    primarySource: PaperSource,
    priorError?: string,
  ) {
    const filtered = filterRelevantPapers(query, papers).slice(0, limit);
    return {
      query,
      papers: filtered,
      primarySource: filtered.length ? primarySource : ("none" as const),
      error:
        filtered.length === 0
          ? priorError ?? "No relevant titles matched the query tokens"
          : undefined,
    };
  }

  const errors: string[] = [];
  async function trySource(
    name: PaperSource,
    run: () => Promise<RetrievedPaper[]>,
  ) {
    try {
      const papers = await run();
      const done = finalize(papers, name);
      if (done.papers.length > 0) return done;
      errors.push(`${name}: no title overlap`);
    } catch (err) {
      errors.push(err instanceof Error ? err.message : `${name} failed`);
    }
    return null;
  }

  const result =
    (await trySource("semanticscholar", () => searchSemanticScholar(query, limit))) ??
    (await trySource("arxiv", () => searchArxiv(query, limit))) ??
    (await trySource("openalex", () => searchOpenAlex(query, limit))) ?? {
      query,
      papers: [],
      primarySource: "none" as const,
      error: errors.join("; ") || "No matching titles",
    };

  const rateLimited = Boolean(result.error && /HTTP 429/.test(result.error));
  if (result.papers.length > 0 || !rateLimited) {
    searchCache.set(cacheKey, {
      expiresAt: Date.now() + SEARCH_CACHE_TTL_MS,
      value: result,
    });
  }
  return { ...result, cacheHit: false };
}
