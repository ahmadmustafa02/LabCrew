import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { pickNextStep } from "../../src/server/coach/recommend";

describe("pickNextStep", () => {
  it("prefers an empty collect over a writeup", () => {
    const next = pickNextStep({
      heldCatalog: 2,
      tasks: [
        {
          id: "w",
          title: "Week 4 writeup",
          dueAt: new Date("2026-08-20"),
          collect: false,
          onboard: false,
          submitted: false,
          draft: false,
          rowCount: 0,
        },
        {
          id: "c",
          title: "Stream temperature log",
          dueAt: new Date("2026-09-18"),
          collect: true,
          onboard: false,
          submitted: false,
          draft: false,
          rowCount: 0,
        },
      ],
    });
    assert.equal(next.kind, "collect");
    assert.equal(next.assignmentId, "c");
  });

  it("moves to writeup after collect is in", () => {
    const next = pickNextStep({
      heldCatalog: 0,
      tasks: [
        {
          id: "c",
          title: "Stream temperature log",
          dueAt: null,
          collect: true,
          onboard: false,
          submitted: true,
          draft: false,
          rowCount: 4,
        },
        {
          id: "w",
          title: "Week 4 writeup",
          dueAt: null,
          collect: false,
          onboard: false,
          submitted: false,
          draft: false,
          rowCount: 0,
        },
      ],
    });
    assert.equal(next.kind, "writeup");
    assert.equal(next.assignmentId, "w");
  });

  it("falls to catalog holds when the week is turned in", () => {
    const next = pickNextStep({
      heldCatalog: 3,
      tasks: [
        {
          id: "c",
          title: "Stream temperature log",
          dueAt: null,
          collect: true,
          onboard: false,
          submitted: true,
          draft: false,
          rowCount: 4,
        },
      ],
    });
    assert.equal(next.kind, "catalog");
    assert.equal(next.href, "/app/catalog");
  });

  it("prefers week 0 onboard over a later collect", () => {
    const next = pickNextStep({
      heldCatalog: 0,
      tasks: [
        {
          id: "c",
          title: "Stream temperature log",
          dueAt: null,
          collect: true,
          onboard: false,
          submitted: false,
          draft: false,
          rowCount: 0,
        },
        {
          id: "z",
          title: "Week 0 — Account works",
          dueAt: null,
          collect: false,
          onboard: true,
          submitted: false,
          draft: false,
          rowCount: 0,
        },
      ],
    });
    assert.equal(next.assignmentId, "z");
    assert.match(next.reason, /Week 0/i);
  });
});
