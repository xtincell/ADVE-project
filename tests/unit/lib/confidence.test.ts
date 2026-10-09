import { describe, expect, it } from "vitest";
import { formatConfidence } from "@/lib/operate-config";

describe("confidence display preserves unknown and real zero", () => {
  it.each([null, undefined, NaN, Infinity, -0.1, 1.1])("does not invent a percentage for %s", value => {
    expect(formatConfidence(value)).toMatchObject({ level: "unknown", pct: "—" });
  });
  it.each([[0, "0%", "low"], [0.22, "22%", "low"], [0.5, "50%", "medium"], [1, "100%", "high"]])(
    "shows the actual measurement %s", (value, pct, level) => {
      expect(formatConfidence(value as number)).toMatchObject({ pct, level });
    });
});
