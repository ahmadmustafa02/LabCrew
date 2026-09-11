import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseMobileLoginBody } from "../../src/server/auth/mobile-login";

describe("parseMobileLoginBody", () => {
  it("requires email and password", () => {
    const empty = parseMobileLoginBody({});
    assert.ok("error" in empty);

    const noAt = parseMobileLoginBody({ email: "student", password: "x" });
    assert.ok("error" in noAt);
  });

  it("normalizes email and default device name", () => {
    const ok = parseMobileLoginBody({
      email: "  Ayesha.Rahman@Students.Northwater.Lab ",
      password: "labcrew",
    });
    assert.ok(!("error" in ok));
    assert.equal(ok.email, "ayesha.rahman@students.northwater.lab");
    assert.equal(ok.password, "labcrew");
    assert.equal(ok.deviceName, "LabCrew Field");
  });

  it("rejects a huge device name", () => {
    const bad = parseMobileLoginBody({
      email: "a@b.co",
      password: "x",
      deviceName: "x".repeat(81),
    });
    assert.ok("error" in bad);
  });
});
