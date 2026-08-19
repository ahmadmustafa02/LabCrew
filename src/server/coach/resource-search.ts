/**
 * Adaptive Coach Phase C — retrieval only (no LLM invent).
 * Semantic Scholar primary; arXiv Atom API fallback.
 */

export type RetrievedPaper = {
  title: string;
  url: string;
  year: number | null;
  venue: string | null;
  source: "semanticscholar" | "arxiv";
  paperId: string;
};

const S2_FIELDS = "paperId,title,url,year,venue,externalIds";
const FETCH_MS = 12_000;

function cleanQuery(raw: string) {
  return raw.replace(/\s+/g, " ").trim().slice(0, 200);
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
  url.searchParams.set("query", query);
  url.searchParams.set("limit", String(limit));
  url.searchParams.set("fields", S2_FIELDS);

  const res = await fetch(url, {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(FETCH_MS),
  });
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
  const url = new URL("http://export.arxiv.org/api/query");
  url.searchParams.set("search_query", `all:${query}`);
  url.searchParams.set("start", "0");
  url.searchParams.set("max_results", String(limit));

  const res = await fetch(url, {
    headers: { Accept: "application/atom+xml" },
    signal: AbortSignal.timeout(FETCH_MS),
  });
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
 */
export async function searchPapersForTopic(
  topic: string,
  limit = 10,
): Promise<{
  query: string;
  papers: RetrievedPaper[];
  primarySource: "semanticscholar" | "arxiv" | "none";
  error?: string;
}> {
  const query = cleanQuery(topic);
  if (query.length < 2) {
    return { query, papers: [], primarySource: "none", error: "Query too short" };
  }

  async function finalize(
    papers: RetrievedPaper[],
    primarySource: "semanticscholar" | "arxiv",
    error?: string,
  ) {
    const filtered = filterRelevantPapers(query, papers).slice(0, limit);
    return {
      query,
      papers: filtered,
      primarySource: filtered.length ? primarySource : ("none" as const),
      error:
        filtered.length === 0
          ? error ?? "No relevant titles matched the query tokens"
          : undefined,
    };
  }

  try {
    const papers = await searchSemanticScholar(query, limit);
    if (papers.length > 0) {
      return finalize(papers, "semanticscholar");
    }
  } catch (err) {
    const s2Error = err instanceof Error ? err.message : "S2 failed";
    try {
      const papers = await searchArxiv(query, limit);
      return finalize(papers, "arxiv", s2Error);
    } catch (err2) {
      return {
        query,
        papers: [],
        primarySource: "none",
        error: `${s2Error}; ${err2 instanceof Error ? err2.message : "arXiv failed"}`,
      };
    }
  }

  try {
    const papers = await searchArxiv(query, limit);
    return finalize(papers, "arxiv");
  } catch (err) {
    return {
      query,
      papers: [],
      primarySource: "none",
      error: err instanceof Error ? err.message : "arXiv failed",
    };
  }
}
