import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  appendDataLineToBriefing,
  type BriefDataSummary,
} from "../../src/server/data/brief-data-summary";
import { briefToMarkdown } from "../../src/server/ops/brief-export";

describe("Monday Brief data summary (Phase D)", () => {
  it("appends data line to Clerk briefing when present", () => {
    const summary: BriefDataSummary = {
      milestoneId: "m1",
      milestoneTitle: "Growth assay",
      contributorCount: 4,
      cellCount: 12,
      flaggedCellCount: 1,
      columns: [
        {
          columnName: "od600",
          sampleSize: 12,
          mean: 0.45,
          median: 0.44,
          outlierCheck: {
            status: "checked_with_flags",
            minRequired: 4,
            flaggedCount: 1,
          },
        },
      ],
      line: "Data (Growth assay): 4 contributors · 12 cells · 1 flagged · od600 mean=0.450 (1 flagged)",
    };
    const out = appendDataLineToBriefing("3 on track.", summary);
    assert.match(out, /Data \(Growth assay\)/);
    assert.match(out, /3 on track/);
  });

  it("export markdown includes Cohort data section", () => {
    const md = briefToMarkdown({
      programName: "Lab",
      milestone: "Growth assay",
      students: 10,
      turnedIn: 4,
      submissionRate: 40,
      briefing: "Hello.",
      agenda: ["A"],
      dataSummary: {
        line: "Data (Growth assay): 4 contributors · 12 cells · 1 flagged",
        columns: [
          {
            columnName: "od600",
            sampleSize: 12,
            mean: 0.45,
            outlierCheck: {
              status: "checked_with_flags",
              minRequired: 4,
              flaggedCount: 1,
            },
          },
        ],
      },
      stats: { onTrack: 3, students: 10, exceptions: 1, draftNudges: 1 },
      exceptions: [],
      pendingApprovals: [],
      runFinishedAt: null,
    });
    assert.match(md, /## Cohort data/);
    assert.match(md, /od600/);
    assert.match(md, /1 flagged/);
  });
});
