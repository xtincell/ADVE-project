/**
 * P1 (plan social validé, post-ADR-0128) — verrous de la collecte des
 * publications :
 *   (1) le kind ANUBIS_SYNC_SOCIAL_POSTS est catalogué (governor ANUBIS) + SLO ;
 *   (2) il est délégable zone "social" (un SOCIAL_MANAGER peut le lancer,
 *       DENY par défaut ailleurs — ADR-0131) ;
 *   (3) le cron quotidien existe et est protégé par CRON_SECRET ;
 *   (4) le service déclare honnêtement UNSUPPORTED pour X/TikTok/LinkedIn
 *       (pas de zéro silencieux) et upsert par (connectionId, externalPostId).
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { INTENT_KINDS } from "@/server/governance/intent-kinds";
import { INTENT_SLOS } from "@/server/governance/slos";
import { collaboratorZoneForKind } from "@/domain/collaborator-access";

const ROOT = process.cwd();
const read = (p: string) => readFileSync(join(ROOT, p), "utf8");

describe("P1 — sync des publications (SocialPost premier écrivain)", () => {
  it("(1) kind catalogué ANUBIS + SLO", () => {
    const kind = INTENT_KINDS.find((k) => k.kind === "ANUBIS_SYNC_SOCIAL_POSTS");
    expect(kind).toBeDefined();
    expect(kind!.governor).toBe("ANUBIS");
    expect(INTENT_SLOS.some((s) => s.kind === "ANUBIS_SYNC_SOCIAL_POSTS")).toBe(true);
  });

  it("(2) délégable zone social (ADR-0131)", () => {
    expect(collaboratorZoneForKind("ANUBIS_SYNC_SOCIAL_POSTS")).toBe("social");
  });

  it("(3) cron quotidien protégé par CRON_SECRET", () => {
    const route = read("src/app/api/cron/social-sync/route.ts");
    expect(route).toContain("verifyCronSecret");
    expect(route).toContain("syncStrategySocialPosts");
    expect(route).toContain("syncStrategySocialFollowers");
  });

  it("(4) plateformes non couvertes = UNSUPPORTED honnête + upsert par clé unique", () => {
    const svc = read("src/server/services/anubis/social-connect.ts");
    expect(svc).toMatch(/UNSUPPORTED/);
    expect(svc).toContain("connectionId_externalPostId");
    // X payant / TikTok scope / LinkedIn produit : documentés dans le code.
    expect(svc).toMatch(/payant|PPU/i);
  });

  it("(5) le tRPC syncPosts est gouverné et gardé par-marque", () => {
    const router = read("src/server/trpc/routers/social.ts");
    expect(router).toMatch(/syncPosts: governedProcedure\(\{\s*kind: "ANUBIS_SYNC_SOCIAL_POSTS"/);
    expect(router).toMatch(/syncPosts[\s\S]{0,400}assertStrategyAccess/);
  });
});
