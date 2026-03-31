import { describe, it, expect } from "vitest";
import { getSuggestedFirstTool } from "@/server/services/driver-engine/glory-tool-selector";

describe("Glory Tool Selector", () => {
  it("returns GT-SOCIAL-GRID for Instagram", () => {
    expect(getSuggestedFirstTool("INSTAGRAM")).toBe("GT-SOCIAL-GRID");
  });

  it("returns GT-VIDEO-SCRIPT for TikTok", () => {
    expect(getSuggestedFirstTool("TIKTOK")).toBe("GT-VIDEO-SCRIPT");
  });

  it("returns GT-PRESS-RELEASE for PR", () => {
    expect(getSuggestedFirstTool("PR")).toBe("GT-PRESS-RELEASE");
  });

  it("returns GT-BRAND-AUDIT for unknown channels", () => {
    expect(getSuggestedFirstTool("UNKNOWN_CHANNEL")).toBe("GT-BRAND-AUDIT");
  });

  it("returns a tool for every standard channel", () => {
    const channels = ["INSTAGRAM", "FACEBOOK", "TIKTOK", "LINKEDIN", "WEBSITE", "PACKAGING", "EVENT", "PR", "PRINT", "VIDEO", "RADIO", "TV", "OOH", "CUSTOM"];
    for (const channel of channels) {
      const tool = getSuggestedFirstTool(channel);
      expect(tool).toBeDefined();
      expect(tool.startsWith("GT-")).toBe(true);
    }
  });
});
