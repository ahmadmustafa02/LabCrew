import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  appendDataLineToBriefing,
  formatBriefDataLine,
  type BriefDataSummary,
} from "../../src/server/data/brief-data-summary";
import { briefToMarkdown } from "../../src/server/ops/brief-export";
import { STUDENT_AGGREGATE_MIN_N } from "../../src/server/data/cohort-stats";

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
          aggregatesHidden: false,
        },
      ],
      line: "Data (Growth assay): 4 contributors · 12 cells · 1 flagged · od600 mean=0.450 (1 flagged)",
    };
    const out = appendDataLineToBriefing("3 on track.", summary);
    assert.match(out, /Data \(Growth assay\)/);
    assert.match(out, /3 on track/);
  });

  it("hides means in Brief line when contributorCount < privacy floor", () => {
    const line = formatBriefDataLine({
      milestoneTitle: "Week 6",
      contributorCount: 2,
      cellCount: 2,
      flaggedCellCount: 0,
      columns: [
        {
          columnName: "od600",
          sampleSize: 2,
          mean: 0.5,
          outlierCheck: {
            status: "insufficient_sample",
            minRequired: 4,
            flaggedCount: 0,
          },
        },
      ],
    });
    assert.doesNotMatch(line, /mean=/);
    assert.match(line, new RegExp(`2 of ${STUDENT_AGGREGATE_MIN_N}`));
    assert.match(line, /insufficient data/i);
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
