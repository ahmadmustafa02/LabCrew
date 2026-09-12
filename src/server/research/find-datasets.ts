export type RetrievedDataset = {
  id: string;
  title: string;
  url: string;
  downloads: number | null;
  licenceHint: string | null;
  source: "huggingface";
};

const FETCH_MS = 12_000;

const STOP = new Set([
  "that",
  "this",
  "with",
  "from",
  "into",
  "about",
  "whether",
  "compare",
  "public",
  "corpora",
  "corpus",
  "licence",
  "license",
  "clip",
  "count",
  "ratings",
  "humans",
  "human",
  "can",
  "two",
  "and",
  "dataset",
  "datasets",
  "paper",
  "papers",
  "study",
  "research",
]);

function cleanQuery(raw: string) {
  return raw.replace(/\s+/g, " ").trim().slice(0, 160);
}

/** Hub search dies on a full research question. Keep the first content phrase. */
export function hubSearchQuery(topic: string): string {
  const cut = cleanQuery(topic).split(/[—–\-\?\.]/)[0] ?? "";
  const words = cut
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length >= 4 && !STOP.has(w));
  const phrase = words.slice(0, 2).join(" ");
  return phrase || words[0] || cleanQuery(topic).slice(0, 40);
}

function isHttpUrl(v: string) {
  try {
    const u = new URL(v);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

function tokens(query: string): string[] {
  return query
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length >= 4 && !/^\d+$/.test(t));
}

export function filterRelevantDatasets(
  query: string,
  rows: RetrievedDataset[],
): RetrievedDataset[] {
  const need = tokens(query);
  if (need.length === 0) return [];
  const min = Math.min(1, need.length);
  return rows.filter((row) => {
    const hay = `${row.id} ${row.title}`.toLowerCase();
    return need.filter((t) => hay.includes(t)).length >= min;
  });
}

export async function searchDatasetsForTopic(
  topic: string,
  limit = 8,
): Promise<{
  query: string;
  datasets: RetrievedDataset[];
  source: "huggingface" | "none";
  error?: string;
}> {
  const primary = hubSearchQuery(topic);
  const fallbacks = [...new Set([primary, primary.split(" ")[0]].filter((q) => q.length >= 3))];

  try {
    let lastQuery = primary;
    let lastError: string | undefined;
    for (const query of fallbacks) {
      lastQuery = query;
      const url = new URL("https://huggingface.co/api/datasets");
      url.searchParams.set("search", query);
      url.searchParams.set("limit", String(Math.min(20, limit * 2)));

      const res = await fetch(url, {
        headers: { Accept: "application/json" },
        signal: AbortSignal.timeout(FETCH_MS),
      });
      if (!res.ok) {
        lastError = `Hugging Face HTTP ${res.status}`;
        continue;
      }

      const json = (await res.json()) as unknown;
      const rows = Array.isArray(json) ? json : [];
      const raw: RetrievedDataset[] = [];
      for (const row of rows) {
        const rec = row as {
          id?: string;
          downloads?: number;
          cardData?: { license?: string | string[]; pretty_name?: string };
        };
        const id = (rec.id ?? "").trim();
        if (!id) continue;
        const page = `https://huggingface.co/datasets/${id}`;
        if (!isHttpUrl(page)) continue;
        const licence = rec.cardData?.license;
        const licenceHint = Array.isArray(licence)
          ? licence[0] ?? null
          : typeof licence === "string"
            ? licence
            : null;
        raw.push({
          id,
          title: rec.cardData?.pretty_name?.trim() || id,
          url: page,
          downloads: typeof rec.downloads === "number" ? rec.downloads : null,
          licenceHint,
          source: "huggingface",
        });
      }

      const datasets = filterRelevantDatasets(query, raw).slice(0, limit);
      if (datasets.length > 0) {
        return { query, datasets, source: "huggingface" };
      }
      lastError = "No hub datasets matched this topic";
    }

    return {
      query: lastQuery,
      datasets: [],
      source: "none",
      error: lastError,
    };
  } catch (error) {
    return {
      query: primary,
      datasets: [],
      source: "none",
      error: error instanceof Error ? error.message : "Hugging Face failed",
    };
  }
}
