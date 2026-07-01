/**
 * Phase 14 + 15 — Imhotep & Anubis full activation (ADRs 0019/0020/0021).
 *
 * Supersedes `oracle-imhotep-anubis-stubs-phase13.test.ts` (supprimé) qui verrouillait
 * le scope partial Oracle-only Phase 13. Ce test verrouille le scope full :
 *
 * 1. `imhotep/manifest.ts` exporte la capability `matchTalentToMission` (et autres)
 * 2. `anubis/manifest.ts` exporte la capability `broadcastMessage` (et autres)
 * 3. Les 7 nouveaux Intent kinds Imhotep + 10 nouveaux Anubis sont enregistrés
 * 4. Tous les nouveaux kinds ont un SLO déclaré
 * 5. Glory tools `crew-matcher`, `talent-evaluator`, `formation-recommender`,
 *    `qc-evaluator` (Imhotep) et `ad-copy-generator`, `audience-targeter`,
 *    `broadcast-scheduler` (Anubis) sont présents dans le registry
 * 6. Provider façades retournent DEFERRED_AWAITING_CREDENTIALS quand pas de creds
 * 7. ExternalConnector est utilisé par le credential-vault (anti-doublon NEFER §3)
 * 8. ADR-0017 + ADR-0018 sont marqués Superseded
 * 9. Routers `imhotep` et `anubis` enregistrés dans appRouter
 * 10. Pages `/console/imhotep` + `/console/anubis` + `/console/anubis/credentials` existent
 *
 * Si ce test échoue → drift Phase 14/15 ou régression vers les stubs.
 */

import { describe, expect, it } from "vitest";
import { promises as fs } from "node:fs";
import { join } from "node:path";
import { manifest as imhotepManifest } from "@/server/services/imhotep/manifest";
import { manifest as anubisManifest } from "@/server/services/anubis/manifest";
import { INTENT_KINDS } from "@/server/governance/intent-kinds";
import { INTENT_SLOS } from "@/server/governance/slos";
import { ALL_GLORY_TOOLS } from "@/server/services/artemis/tools/registry";

const IMHOTEP_NEW_KINDS = [
  "IMHOTEP_MATCH_TALENT_TO_MISSION",
  "IMHOTEP_ASSEMBLE_CREW",
  "IMHOTEP_EVALUATE_TIER",
  "IMHOTEP_ENROLL_FORMATION",
  "IMHOTEP_CERTIFY_TALENT",
  "IMHOTEP_QC_DELIVERABLE",
  "IMHOTEP_RECOMMEND_FORMATION",
] as const;

const ANUBIS_NEW_KINDS = [
  "ANUBIS_BROADCAST_MESSAGE",
  "ANUBIS_BUY_AD_INVENTORY",
  "ANUBIS_SEGMENT_AUDIENCE",
  "ANUBIS_TRACK_DELIVERY",
  "ANUBIS_REGISTER_CREDENTIAL",
  "ANUBIS_REVOKE_CREDENTIAL",
  "ANUBIS_TEST_CHANNEL",
  "ANUBIS_SCHEDULE_BROADCAST",
  "ANUBIS_CANCEL_BROADCAST",
  "ANUBIS_FETCH_DELIVERY_REPORT",
] as const;

describe("Phase 14 + 15 Imhotep & Anubis full activation (ADRs 0019/0020/0021)", () => {
  describe("Imhotep manifest (ADR-0019)", () => {
    it("declares matchTalentToMission capability", () => {
      const cap = imhotepManifest.capabilities.find((c) => c.name === "matchTalentToMission");
      expect(cap, "matchTalentToMission capability missing in imhotep manifest").toBeTruthy();
    });

    it("declares all 8 Imhotep capabilities", () => {
      const expected = [
        "draftCrewProgram",
        "matchTalentToMission",
        "assembleCrew",
        "evaluateTier",
        "enrollFormation",
        "certifyTalent",
        "qcDeliverable",
        "recommendFormation",
      ];
      for (const name of expected) {
        const cap = imhotepManifest.capabilities.find((c) => c.name === name);
        expect(cap, `${name} capability missing`).toBeTruthy();
      }
    });

    it("governor is IMHOTEP (Phase 13 pattern)", () => {
      expect(imhotepManifest.governor).toBe("IMHOTEP");
    });

    it("dependencies include 5 satellites (matching/talent/team/tier/qc + financial-brain)", () => {
      const expected = ["matching-engine", "talent-engine", "team-allocator", "tier-evaluator", "qc-router"];
      for (const dep of expected) {
        expect(imhotepManifest.dependencies, `dependency ${dep} missing`).toContain(dep);
      }
    });
  });

  describe("Anubis manifest (ADR-0020)", () => {
    it("declares broadcastMessage capability", () => {
      const cap = anubisManifest.capabilities.find((c) => c.name === "broadcastMessage");
      expect(cap, "broadcastMessage capability missing in anubis manifest").toBeTruthy();
    });

    it("declares all 11 Anubis capabilities", () => {
      const expected = [
        "draftCommsPlan",
        "broadcastMessage",
        "buyAdInventory",
        "segmentAudience",
        "trackDelivery",
        "registerCredential",
        "revokeCredential",
        "testChannel",
        "scheduleBroadcast",
        "cancelBroadcast",
        "fetchDeliveryReport",
      ];
      for (const name of expected) {
        const cap = anubisManifest.capabilities.find((c) => c.name === name);
        expect(cap, `${name} capability missing`).toBeTruthy();
      }
    });

    it("governor is ANUBIS", () => {
      expect(anubisManifest.governor).toBe("ANUBIS");
    });
  });

  describe("Intent kinds registered (Phase 14 + 15)", () => {
    it("all 7 new Imhotep kinds present in INTENT_KINDS", () => {
      for (const kind of IMHOTEP_NEW_KINDS) {
        const found = INTENT_KINDS.find((k) => k.kind === kind);
        expect(found, `${kind} not in INTENT_KINDS`).toBeTruthy();
        expect(found?.governor, `${kind} governor must be IMHOTEP`).toBe("IMHOTEP");
        expect(found?.handler, `${kind} handler must be imhotep`).toBe("imhotep");
      }
    });

    it("all 10 new Anubis kinds present in INTENT_KINDS", () => {
      for (const kind of ANUBIS_NEW_KINDS) {
        const found = INTENT_KINDS.find((k) => k.kind === kind);
        expect(found, `${kind} not in INTENT_KINDS`).toBeTruthy();
        expect(found?.governor, `${kind} governor must be ANUBIS`).toBe("ANUBIS");
        expect(found?.handler, `${kind} handler must be anubis`).toBe("anubis");
      }
    });

    it("IMHOTEP_DRAFT_CREW_PROGRAM description updated for Phase 14 (no longer 'stub')", () => {
      const found = INTENT_KINDS.find((k) => k.kind === "IMHOTEP_DRAFT_CREW_PROGRAM");
      expect(found?.description).not.toMatch(/Stub Oracle-only/);
      expect(found?.description).toMatch(/ADR-0019/);
    });

    it("ANUBIS_DRAFT_COMMS_PLAN description updated for Phase 15 (no longer 'stub')", () => {
      const found = INTENT_KINDS.find((k) => k.kind === "ANUBIS_DRAFT_COMMS_PLAN");
      expect(found?.description).not.toMatch(/Stub Oracle-only/);
      expect(found?.description).toMatch(/ADR-0020/);
    });
  });

  describe("SLOs declared for all new kinds", () => {
    it("each new Imhotep kind has SLO", () => {
      for (const kind of IMHOTEP_NEW_KINDS) {
        const slo = INTENT_SLOS.find((s) => s.kind === kind);
        expect(slo, `SLO missing for ${kind}`).toBeTruthy();
      }
    });

    it("each new Anubis kind has SLO", () => {
      for (const kind of ANUBIS_NEW_KINDS) {
        const slo = INTENT_SLOS.find((s) => s.kind === kind);
        expect(slo, `SLO missing for ${kind}`).toBeTruthy();
      }
    });
  });

  describe("Glory tools registered", () => {
    it("Imhotep tools (4) present in registry", () => {
      const expected = ["crew-matcher", "talent-evaluator", "formation-recommender", "qc-evaluator"];
      for (const slug of expected) {
        const tool = ALL_GLORY_TOOLS.find((t) => t.slug === slug);
        expect(tool, `Glory tool ${slug} missing in registry`).toBeTruthy();
        expect(tool?.status).toBe("ACTIVE");
      }
    });

    it("Anubis tools (3) present in registry", () => {
      const expected = ["ad-copy-generator", "audience-targeter", "broadcast-scheduler"];
      for (const slug of expected) {
        const tool = ALL_GLORY_TOOLS.find((t) => t.slug === slug);
        expect(tool, `Glory tool ${slug} missing in registry`).toBeTruthy();
        expect(tool?.status).toBe("ACTIVE");
      }
    });
  });

  describe("Anubis providers façades (ADR-0021)", () => {
    it("getProvider resolves all 7 known connector types", async () => {
      const { getProvider } = await import("@/server/services/anubis/providers");
      const types = ["meta-ads", "google-ads", "x-ads", "tiktok-ads", "mailgun", "twilio", "email-fallback"];
      for (const t of types) {
        expect(getProvider(t), `provider ${t} missing`).toBeTruthy();
      }
    });

    it("getProvider returns null for unknown type", async () => {
      const { getProvider } = await import("@/server/services/anubis/providers");
      expect(getProvider("unknown-provider")).toBeNull();
    });

    it("deferredCredentials returns standard shape with configureUrl", async () => {
      const { deferredCredentials } = await import("@/server/services/anubis/credential-vault");
      const r = deferredCredentials("meta-ads");
      expect(r.status).toBe("DEFERRED_AWAITING_CREDENTIALS");
      expect(r.connectorType).toBe("meta-ads");
      expect(r.configureUrl).toContain("/console/anubis/credentials");
      expect(r.configureUrl).toContain("type=meta-ads");
    });
  });

  describe("ADR supersession (Phase 8 NEFER auto-correction)", () => {
    it("ADR-0017 marked as Superseded by ADR-0019", async () => {
      const adr = await fs.readFile(
        join(process.cwd(), "docs/governance/adr/0017-imhotep-partial-pre-reserve-oracle-only.md"),
        "utf8",
      );
      expect(adr).toMatch(/Superseded by.*ADR-0019/);
    });

    it("ADR-0018 marked as Superseded by ADR-0020", async () => {
      const adr = await fs.readFile(
        join(process.cwd(), "docs/governance/adr/0018-anubis-partial-pre-reserve-oracle-only.md"),
        "utf8",
      );
      expect(adr).toMatch(/Superseded by.*ADR-0020/);
    });

    it("ADR-0021 (Credentials Vault) exists", async () => {
      const adr = await fs.readFile(
        join(process.cwd(), "docs/governance/adr/0021-external-credentials-vault.md"),
        "utf8",
      );
      expect(adr).toMatch(/External Credentials Vault/);
      expect(adr).toMatch(/DEFERRED_AWAITING_CREDENTIALS/);
    });
  });

  describe("Pages UI Console", () => {
    it("/console/imhotep/page.tsx exists", async () => {
      const stat = await fs.stat(join(process.cwd(), "src/app/(console)/console/imhotep/page.tsx"));
      expect(stat.isFile()).toBe(true);
    });

    it("/console/anubis/page.tsx exists", async () => {
      const stat = await fs.stat(join(process.cwd(), "src/app/(console)/console/anubis/page.tsx"));
      expect(stat.isFile()).toBe(true);
    });

    it("/console/anubis/credentials/page.tsx exists (Credentials Center)", async () => {
      const stat = await fs.stat(join(process.cwd(), "src/app/(console)/console/anubis/credentials/page.tsx"));
      expect(stat.isFile()).toBe(true);
    });
  });

  describe("tRPC routers wired", () => {
    it("imhotepRouter and anubisRouter imported in appRouter", async () => {
      const router = await fs.readFile(join(process.cwd(), "src/server/trpc/router.ts"), "utf8");
      expect(router).toMatch(/imhotepRouter/);
      expect(router).toMatch(/anubisRouter/);
      expect(router).toMatch(/imhotep:\s*imhotepRouter/);
      expect(router).toMatch(/anubis:\s*anubisRouter/);
    });
  });

  describe("Anti-doublon NEFER §3 — Anubis Prisma extension", () => {
    it("schema.prisma defines new models CommsPlan, BroadcastJob, EmailTemplate, SmsTemplate", async () => {
      const schema = await fs.readFile(join(process.cwd(), "prisma/schema.prisma"), "utf8");
      expect(schema).toMatch(/^model CommsPlan\s+\{/m);
      expect(schema).toMatch(/^model BroadcastJob\s+\{/m);
      expect(schema).toMatch(/^model EmailTemplate\s+\{/m);
      expect(schema).toMatch(/^model SmsTemplate\s+\{/m);
    });

    it("schema.prisma still does NOT redefine TalentProfile/Course/Notification (anti-doublon)", async () => {
      const schema = await fs.readFile(join(process.cwd(), "prisma/schema.prisma"), "utf8");
      // count model declarations — each must appear exactly once
      const count = (re: RegExp) => (schema.match(re) ?? []).length;
      expect(count(/^model TalentProfile\s+\{/gm)).toBe(1);
      expect(count(/^model Course\s+\{/gm)).toBe(1);
      expect(count(/^model Notification\s+\{/gm)).toBe(1);
      expect(count(/^model ExternalConnector\s+\{/gm)).toBe(1);
    });
  });
});
