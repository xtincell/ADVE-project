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

  // ── Collecte élargie (mandat « la fusée devrait tout récupérer ») ────────
  it("(6) posts riches : permalink + visuel + type de média, 25 par sync, colonnes en schéma", () => {
    const svc = read("src/server/services/anubis/social-connect.ts");
    // FB : permalink, image pleine, type d'attachement
    expect(svc).toContain("permalink_url");
    expect(svc).toContain("full_picture");
    expect(svc).toContain("attachments{media_type}");
    // IG : média riches (URL, miniature, permalink)
    expect(svc).toMatch(/media_type,media_url,thumbnail_url,permalink/);
    // YT : lien watch + miniature
    expect(svc).toContain("youtube.com/watch?v=");
    expect(svc).toMatch(/const POSTS_PER_SYNC = 25/);
    const schema = read("prisma/schema.prisma");
    const socialPost = schema.slice(schema.indexOf("model SocialPost"), schema.indexOf("model MediaPlatformConnection"));
    for (const col of ["mediaType", "permalinkUrl", "mediaUrl"]) {
      expect(socialPost).toContain(col);
    }
  });

  it("(7) profil public de la marque collecté et persisté (metadata.profile + followingCount)", () => {
    const svc = read("src/server/services/anubis/social-connect.ts");
    // FB Page : about/catégorie/site/localisation · IG : bio/volumes
    expect(svc).toMatch(/about,category,website/);
    expect(svc).toContain("biography");
    expect(svc).toContain("follows_count");
    // Persistance : profil dans metadata (connect + refresh au sync)
    expect(svc).toMatch(/profile: account\.profile/);
    expect(svc).toMatch(/nextMeta\.profile = result\.profile/);
    // Le suivi (following) rempli dans FollowerSnapshot quand fourni
    expect(svc).toMatch(/followingCount: (account|result)\.followingCount/);
    // Et le pilier E le reçoit (empreinte publique, provenance réelle)
    const enrich = read("src/server/services/quick-intake/public-enrichment.ts");
    expect(enrich).toContain("connectedProfiles");
    expect(enrich).toMatch(/followerSource = real\.source/);
  });

  it("(8) frontière PII : jamais le contenu/l'identité des tiers, jamais un scope non accordé", () => {
    const svc = read("src/server/services/anubis/social-connect.ts");
    // Pas de lecture du texte des commentaires ni des listes d'abonnés :
    // uniquement des compteurs agrégés (summary/total_count).
    expect(svc).not.toMatch(/\/comments\?fields=/);
    expect(svc).not.toMatch(/fields=message/);
    expect(svc).not.toMatch(/\/(followers|friends|conversations|subscribers)\b/);
    // Pas d'appel Insights (read_insights / instagram_manage_insights non
    // accordés — les demander viendrait APRÈS l'App Review de base).
    expect(svc).not.toMatch(/\/insights/);
    // La doctrine est écrite dans le module (registre du service).
    expect(svc).toMatch(/JAMAIS le contenu ni l'identité des tiers/);
  });
});
