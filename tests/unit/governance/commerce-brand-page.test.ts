/**
 * Vague « le cockpit ramène tout, l'utilisateur autorise » (2026-07-12) —
 * verrous : boutique Shopify par marque + page publique de marque.
 */
import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { INTENT_KINDS } from "@/server/governance/intent-kinds";
import { INTENT_SLOS } from "@/server/governance/slos";
import { collaboratorZoneForKind } from "@/domain/collaborator-access";
import { isValidShopDomain } from "@/server/services/oauth-integrations";

const ROOT = process.cwd();
const read = (p: string) => readFileSync(join(ROOT, p), "utf8");

describe("Boutique de la marque (Shopify) + page publique", () => {
  it("(1) kinds commerce catalogués ANUBIS + SLOs", () => {
    for (const kind of ["ANUBIS_COMMERCE_CONNECT_SHOP", "ANUBIS_SYNC_COMMERCE"]) {
      const k = INTENT_KINDS.find((x) => x.kind === kind);
      expect(k, kind).toBeDefined();
      expect(k!.governor).toBe("ANUBIS");
      expect(INTENT_SLOS.some((s) => s.kind === kind), `SLO ${kind}`).toBe(true);
    }
  });

  it("(2) la boutique n'est PAS délégable (DENY par défaut ADR-0131)", () => {
    expect(collaboratorZoneForKind("ANUBIS_COMMERCE_CONNECT_SHOP")).toBeNull();
    expect(collaboratorZoneForKind("ANUBIS_SYNC_COMMERCE")).toBeNull();
  });

  it("(3) le domaine boutique est STRICTEMENT validé (*.myshopify.com)", () => {
    expect(isValidShopDomain("motion19.myshopify.com")).toBe(true);
    expect(isValidShopDomain("evil.com")).toBe(false);
    expect(isValidShopDomain("a.myshopify.com.evil.com")).toBe(false);
    expect(isValidShopDomain("motion19.myshopify.com/x")).toBe(false);
    expect(isValidShopDomain("MOTION19.MYSHOPIFY.COM")).toBe(false);
  });

  it("(4) le token boutique est chiffré AVANT l'émission (jamais en clair)", () => {
    const svc = read("src/server/services/anubis/commerce-connect.ts");
    expect(svc).toMatch(/encryptTokenPayload\([\s\S]{0,200}access_token/);
    expect(svc).toContain("encryptedToken");
    // Le payload Intent ne porte jamais accessToken en clair :
    const intents = read("src/server/services/mestor/intents.ts");
    expect(intents).toMatch(/ANUBIS_COMMERCE_CONNECT_SHOP[\s\S]{0,400}encryptedToken: string/);
    expect(intents).not.toMatch(/ANUBIS_COMMERCE_CONNECT_SHOP[\s\S]{0,400}accessToken/);
  });

  it("(5) proxy : sous-domaine de marque → /b/<slug>, hôtes techniques épargnés", () => {
    const proxy = read("src/proxy.ts");
    expect(proxy).toMatch(/powerupgraders\\.com/);
    expect(proxy).toContain('["www", "lafuseev6"]');
    expect(proxy).toMatch(/\/b\/\$\{brandSub\}/);
  });

  it("(6) publicSlug unique + page publique sans donnée privée", () => {
    const schema = read("prisma/schema.prisma");
    expect(schema).toMatch(/publicSlug\s+String\?\s+@unique/);
    expect(existsSync(join(ROOT, "src/app/(public-brand)/b/[slug]/page.tsx"))).toBe(true);
    const page = read("src/app/(public-brand)/b/[slug]/page.tsx");
    // Jamais de contact privé ni de token sur la page publique.
    expect(page).not.toMatch(/contactEmail|contactPhone|accessToken|credentials/);
  });

  it("(7) le cron couvre aussi les marques boutique-seule", () => {
    const cron = read("src/app/api/cron/social-sync/route.ts");
    expect(cron).toContain("mediaPlatformConnection.groupBy");
    expect(cron).toContain("syncStrategyShopifyOrders");
  });
});
