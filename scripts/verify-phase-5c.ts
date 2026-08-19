/**
 * Adaptive Coach Phase C — retrieval-grounded resources (no fabrication).
 * Run: npx tsx scripts/verify-phase-5c.ts
 *
 * Hits live Semantic Scholar / arXiv — needs network.
 */
import { searchPapersForTopic } from "../src/server/coach/resource-search";
import {
  formatResourceApprovalBody,
  parseResourceApprovalBody,
} from "../src/server/coach/resource-suggest";

async function main() {
  console.log("=== Phase 5C resource retrieval verification ===\n");

  const real = await searchPapersForTopic(
    "CRISPR gene editing bacterial immunity",
    8,
  );
  console.log("Real topic:", {
    query: real.query,
    source: real.primarySource,
    count: real.papers.length,
    first: real.papers[0]
      ? { title: real.papers[0].title, url: real.papers[0].url }
      : null,
  });

  if (real.papers.length === 0) {
    console.error("FAIL expected papers for a real scientific topic");
    process.exit(1);
  }
  for (const p of real.papers) {
    if (!/^https?:\/\//i.test(p.url)) {
      console.error("FAIL bad url", p);
      process.exit(1);
    }
    if (!p.title.trim()) {
      console.error("FAIL empty title");
      process.exit(1);
    }
  }
  console.log("PASS real topic → clickable search hits\n");

  const nonsense = await searchPapersForTopic(
    "zzzxqyvblarg nonexistentsupercalifragilistic paper topic 99999xyz",
    5,
  );
  console.log("Nonsense topic:", {
    query: nonsense.query,
    source: nonsense.primarySource,
    count: nonsense.papers.length,
  });

  const emptyPayload = {
    milestoneId: "m1",
    query: nonsense.query,
    status: "empty" as const,
    primarySource: nonsense.primarySource,
    items: [] as [],
    note: "Nothing relevant found for this topic. Coach will not invent citations.",
  };

  if (nonsense.papers.length > 0) {
    console.error(
      "FAIL nonsense topic should yield zero relevant papers, got",
      nonsense.papers.length,
    );
    process.exit(1);
  }
  const body = formatResourceApprovalBody(emptyPayload);
  const parsed = parseResourceApprovalBody(body);
  if (!parsed || parsed.status !== "empty" || parsed.items.length !== 0) {
    console.error("FAIL empty payload");
    process.exit(1);
  }
  if (!/nothing relevant found/i.test(parsed.note)) {
    console.error("FAIL empty note must be honest");
    process.exit(1);
  }
  console.log("PASS nonsense → honest empty state\n");

  const foundPayload = {
    milestoneId: "m1",
    query: real.query,
    status: "found" as const,
    primarySource: real.primarySource,
    items: real.papers.slice(0, 3).map((p) => ({
      ...p,
      rationale: "From search.",
    })),
    note: "Selected 3 search hits.",
  };
  const foundBody = formatResourceApprovalBody(foundPayload);
  const foundParsed = parseResourceApprovalBody(foundBody);
  const searchIds = new Set(real.papers.map((p) => p.paperId));
  for (const item of foundParsed?.items ?? []) {
    if (!searchIds.has(item.paperId)) {
      console.error("FAIL invented paperId not in search set", item.paperId);
      process.exit(1);
    }
  }
  console.log("PASS approval items ⊆ search results (no fabrication)\n");
  console.log("All Phase 5C checks passed.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
