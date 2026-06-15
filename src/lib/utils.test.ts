import { describe, expect, it } from "vitest";
import { clampRiskScore, riskLevel } from "./utils";

describe("risk score helpers", () => {
  it("normalizes risk scores to a 0-100 scale", () => {
    expect(clampRiskScore(-10)).toBe(0);
    expect(clampRiskScore(42.4)).toBe(42);
    expect(clampRiskScore(130)).toBe(100);
  });

  it("maps normalized risk scores to severity bands", () => {
    expect(riskLevel(10)).toBe("low");
    expect(riskLevel(45)).toBe("medium");
    expect(riskLevel(90)).toBe("high");
  });
});
