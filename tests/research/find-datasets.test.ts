import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  filterRelevantDatasets,
  hubSearchQuery,
} from "../../src/server/research/find-datasets";

describe("hubSearchQuery", () => {
  it("shortens a research question to content words", () => {
    assert.equal(
      hubSearchQuery(
        "Speech emotion datasets — can we compare two public corpora on licence, clip count, and whether ratings are from humans?",
      ),
      "speech emotion",
    );
  });
});

describe("filterRelevantDatasets", () => {
  it("keeps hub ids that mention the topic", () => {
    const kept = filterRelevantDatasets("speech emotion", [
      {
        id: "crema-d",
        title: "CREMA-D speech emotion",
        url: "https://huggingface.co/datasets/crema-d",
        downloads: 1,
        licenceHint: null,
        source: "huggingface",
      },
      {
        id: "wiki-text",
        title: "Wiki text",
        url: "https://huggingface.co/datasets/wiki-text",
        downloads: 9,
        licenceHint: null,
        source: "huggingface",
      },
    ]);
    assert.equal(kept.length, 1);
    assert.equal(kept[0].id, "crema-d");
  });
});
