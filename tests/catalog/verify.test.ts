import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { heuristicExtract } from "../../src/server/catalog/extract";
import { verifyDraftField } from "../../src/server/catalog/verify";

const PAPER = `CREMA-D: Crowd-sourced Emotional Multimodal Actors Dataset
We collected 7,442 audiovisual clips of actors portraying emotions.
Clips were rated by humans using categorical emotion labels.
The dataset is released under a CC-BY-4.0 licence for research reuse.`;

describe("catalog verifier", () => {
  it("holds a value whose quote is not in the paper", () => {
    const out = verifyDraftField(
      {
        key: "licence",
        label: "Licence",
        value: "MIT",
        quote: "This sentence does not appear in the paper at all.",
      },
      PAPER,
    );
    assert.equal(out.trust, "held");
  });

  it("trusts a value supported by a real sentence", () => {
    const out = verifyDraftField(
      {
        key: "instanceCount",
        label: "How many items",
        value: "7442",
        quote: "We collected 7,442 audiovisual clips of actors portraying emotions.",
      },
      PAPER,
    );
    assert.equal(out.trust, "trusted");
  });

  it("heuristic extract finds count and licence", () => {
    const fields = heuristicExtract(PAPER);
    const n = fields.find((f) => f.key === "instanceCount");
    const lic = fields.find((f) => f.key === "licence");
    assert.ok(n?.value.includes("7442") || n?.value.includes("7,442"));
    assert.ok(lic?.value.toUpperCase().includes("CC-BY"));
  });
});
