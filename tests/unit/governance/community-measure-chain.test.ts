/**
 * Anti-drift — chaîne de mesure communautaire quotidienne (ADR-0134 §B1/§B2).
 *
 * Invariants :
 *   1. le kind SESHAT_CAPTURE_COMMUNITY_SNAPSHOT est catalogué (kind + SLO +
 *      union Intent + case commandant) ;
 *   2. le cron social-sync émet la mesure VIA LE SPINE (emitIntentTyped,
 *      caller cron:social-sync:community) — jamais un appel service direct ;
 *   3. l'écriture CommunitySnapshot de production a UN SEUL fichier writer
 *      (community-snapshot-writer.ts) — pattern single-writer ADR-0126 ;
 *   4. le schéma porte les unités canoniques (taux nullables + source) ;
 *   5. le cult index n'agrège plus la cohésion sur tout l'historique et sort
 *      la dimension du dénominateur quand rien n'est mesuré ;
 *   6. §B2 — ugcGenerationRate reste EXCLU (décision négative explicite).
 */

import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = join(__dirname, "..", "..", "..");
const read = (rel: string) => readFileSync(join(ROOT, rel), "utf-8");

describe("ADR-0134 — chaîne de mesure communautaire", () => {
  it("kind catalogué : intent-kinds + SLO + union + case commandant", () => {
    expect(read("src/server/governance/intent-kinds.ts")).toContain(
      'kind: "SESHAT_CAPTURE_COMMUNITY_SNAPSHOT"',
    );
    expect(read("src/server/governance/slos.ts")).toContain(
      'kind: "SESHAT_CAPTURE_COMMUNITY_SNAPSHOT"',
    );
    expect(read("src/server/services/mestor/intents.ts")).toContain(
      'kind: "SESHAT_CAPTURE_COMMUNITY_SNAPSHOT"',
    );
    expect(read("src/server/services/artemis/commandant.ts")).toContain(
      'case "SESHAT_CAPTURE_COMMUNITY_SNAPSHOT"',
    );
  });

  it("le cron social-sync émet via le spine (pas d'appel service direct)", () => {
    const cron = read("src/app/api/cron/social-sync/route.ts");
    expect(cron).toContain('kind: "SESHAT_CAPTURE_COMMUNITY_SNAPSHOT"');
    expect(cron).toContain('caller: "cron:social-sync:community"');
    // Le cron ne doit PAS court-circuiter le spine en appelant le writer.
    expect(cron.includes("captureCommunitySnapshots")).toBe(false);
  });

  it("single-writer : communitySnapshot.create vit dans UN seul fichier src/", () => {
    const out = execSync(
      "grep -rln 'communitySnapshot\\.\\(create\\|createMany\\|upsert\\)' src/ --include='*.ts' --include='*.tsx' || true",
      { encoding: "utf8", cwd: ROOT },
    ).trim();
    const files = out ? out.split("\n") : [];
    expect(files).toEqual([
      "src/server/services/cult-index-engine/community-snapshot-writer.ts",
    ]);
  });

  it("schéma : taux nullables + provenance source (unités canon en ///)", () => {
    const schema = read("prisma/schema.prisma");
    const model = schema.slice(
      schema.indexOf("model CommunitySnapshot {"),
      schema.indexOf("model BrandVariable {"),
    );
    expect(model).toContain("health     Float?");
    expect(model).toContain("sentiment  Float?");
    expect(model).toContain("velocity   Float?");
    expect(model).toContain("activeRate Float?");
    expect(model).toContain("source     String?");
    expect(model).toContain("fraction 0-1");
  });

  it("cult index : fenêtre bornée + cohésion hors dénominateur sans mesure", () => {
    const cult = read("src/server/services/cult-index-engine/index.ts");
    // Plus de findMany all-time sur communitySnapshot (fenêtre bornée requise).
    expect(cult).toContain("take: 12");
    expect(cult).toMatch(/communitySnapshot\.findMany\(\{\s*\n\s*where: \{ strategyId, measuredAt/);
    // Renormalisation : la dimension sort du dénominateur quand rien n'est mesuré.
    expect(cult).toContain('"communityCohesion"]');
    expect(cult).toContain("hasMeasuredCohesion");
  });

  it("§B2 — ugcGenerationRate reste exclu du composite (décision ADR-0134)", () => {
    const cult = read("src/server/services/cult-index-engine/index.ts");
    expect(cult).toContain('unavailable: (keyof CultDimensions)[] = hasMeasuredCohesion');
    expect(cult).toContain('["ugcGenerationRate"]');
    expect(cult).toContain('["ugcGenerationRate", "communityCohesion"]');
  });
});
