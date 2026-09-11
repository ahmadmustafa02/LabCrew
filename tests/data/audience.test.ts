import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { MilestoneAudience } from "@prisma/client";
import { studentCanSeeMilestone } from "../../src/server/assignments/audience";

describe("assignment audience", () => {
  it("everyone can see ALL", () => {
    assert.equal(
      studentCanSeeMilestone({
        audience: MilestoneAudience.ALL,
        assigneeIds: [],
        memberId: "s1",
      }),
      true,
    );
  });

  it("only listed students see SELECTED", () => {
    assert.equal(
      studentCanSeeMilestone({
        audience: MilestoneAudience.SELECTED,
        assigneeIds: ["s1"],
        memberId: "s1",
      }),
      true,
    );
    assert.equal(
      studentCanSeeMilestone({
        audience: MilestoneAudience.SELECTED,
        assigneeIds: ["s1"],
        memberId: "s2",
      }),
      false,
    );
  });
});
