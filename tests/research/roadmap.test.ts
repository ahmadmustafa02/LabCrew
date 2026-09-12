import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  clampWeeks,
  heuristicRoadmap,
  sanitizeRoadmap,
} from "../../src/server/research/roadmap";

describe("research roadmap", () => {
  it("clamps weeks", () => {
    assert.equal(clampWeeks(2), 4);
    assert.equal(clampWeeks(20), 8);
  });

  it("heuristic keeps the typed topic and marks later agents", () => {
    const plan = heuristicRoadmap("AI coding vulnerability in student repos", 6);
    assert.equal(plan.source, "heuristic");
    assert.ok(plan.steps.length >= 4);
    assert.ok(plan.steps.some((s) => /vulnerab/i.test(s.title)));
    assert.ok(plan.steps.some((s) => s.kind === "collect" && s.acceptData));
    assert.ok(plan.steps.some((s) => s.kind === "catalog"));
    assert.ok(plan.steps.some((s) => s.agentLater === "papers"));
    assert.ok(plan.steps.some((s) => s.agentLater === "datasets"));
    assert.match(plan.note, /are invented/i);
  });

  it("strips invented citations from a model draft", () => {
    const plan = sanitizeRoadmap({
      topic: "AI coding vulnerability",
      weeks: 6,
      source: "llm",
      steps: [
        {
          title: "Read Smith et al. 2021",
          kind: "writeup",
          week: 1,
          description: "Survey.",
          instructions: "Cite doi:10.1000/xyz. Then write. Stay on the topic.",
          checklist: ["doi:10.1/x"],
          nextHint: "We found 12 papers.",
        },
        { title: "Catalog check", kind: "catalog", week: 2 },
        { title: "Collect cases", kind: "collect", week: 3, acceptData: true },
        { title: "Close", kind: "writeup", week: 6 },
      ],
    });
    assert.doesNotMatch(plan.steps[0].instructions, /doi:/i);
    assert.doesNotMatch(plan.steps[0].nextHint, /12 papers/i);
    assert.doesNotMatch(plan.steps[0].title, /et al/i);
  });
});
