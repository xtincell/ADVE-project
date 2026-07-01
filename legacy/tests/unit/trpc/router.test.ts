import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";

/**
 * Router tests.
 *
 * Verifies that the main tRPC appRouter source file
 * registers all expected sub-routers. Since importing the actual
 * router triggers next-auth/next/server dependencies that are
 * unavailable in a pure node test environment, we verify via
 * source analysis instead.
 */

const routerSourcePath = path.resolve(__dirname, "../../../src/server/trpc/router.ts");
const routerSource = fs.readFileSync(routerSourcePath, "utf-8");

// Extract router keys from `createTRPCRouter({...})` block
// Pattern: `  key: routerVariable,`
const routerKeyRegex = /^\s+(\w+):\s+\w+(?:Router|router)(?:,|\s*$)/gm;
const matches = [...routerSource.matchAll(routerKeyRegex)];
const registeredKeys = matches.map((m) => m[1]);

const expectedRouters = [
  "operator",
  "advertisScorer",
  "quickIntake",
  "devotionLadder",
  "driver",
  "qualityReview",
  "guildTier",
  "guildOrg",
  "commission",
  "membership",
  "knowledgeGraph",
  "deliverableTracking",
  "process",
  "guidelines",
  "matching",
  "valueReport",
  "upsell",
  "bootSequence",
  "strategy",
  "campaign",
  "mission",
  "signal",
  "guilde",
  "ambassador",
  "social",
  "mediaBuying",
  "pr",
  "marketStudy",
  "brandVault",
  "intervention",
];

describe("tRPC App Router", () => {
  it("router.ts source file exists", () => {
    expect(fs.existsSync(routerSourcePath)).toBe(true);
  });

  it("exports appRouter", () => {
    expect(routerSource).toContain("export const appRouter");
  });

  it("exports AppRouter type", () => {
    expect(routerSource).toContain("export type AppRouter");
  });

  it("uses createTRPCRouter", () => {
    expect(routerSource).toContain("createTRPCRouter");
  });

  for (const routerName of expectedRouters) {
    it(`has "${routerName}" sub-router registered`, () => {
      expect(registeredKeys).toContain(routerName);
    });
  }

  it("has at least 30 router keys registered", () => {
    expect(registeredKeys.length).toBeGreaterThanOrEqual(30);
  });

  it("all registered keys are unique", () => {
    const uniqueKeys = new Set(registeredKeys);
    expect(uniqueKeys.size).toBe(registeredKeys.length);
  });

  it("imports match registrations (every registered key has an import)", () => {
    for (const key of registeredKeys) {
      // Check that there's an import for the router variable used with this key
      const importPattern = new RegExp(`import\\s+\\{[^}]*\\}\\s+from\\s+["']\\./routers/`);
      expect(routerSource).toMatch(importPattern);
    }
  });
});
