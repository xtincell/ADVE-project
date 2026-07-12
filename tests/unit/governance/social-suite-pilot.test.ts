/**
 * ADR-0133 — Suite sociale pilotable v1 : verrous structurels.
 *
 *   (1) les 3 kinds (inbox / réponse / publication) sont catalogués ANUBIS + SLO ;
 *   (2) délégables zone "social" (SOCIAL_MANAGER opère — ADR-0131) ;
 *   (3) l'Inbox vit dans SON service (social-inbox) — la boucle passive
 *       (social-connect) reste sans PII de tiers (test 8 sœur intact) ;
 *   (4) la publication est honnête : UNSUPPORTED explicite (X payant,
 *       TikTok audit), IG exige un visuel, SCOPE_MISSING → reconnexion ;
 *   (5) la planification passe par le calendrier unique (BrandAction,
 *       pas de 2ᵉ file) et le cron ré-émet via mestor.emitIntent ;
 *   (6) la promesse légale est alignée : CGU mandat de gestion, privacy
 *       interactions adressées à la marque, data-deletion périmètre inbox ;
 *   (7) notifications branchées sur le fan-out canonique (pushNotification).
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { INTENT_KINDS } from "@/server/governance/intent-kinds";
import { INTENT_SLOS } from "@/server/governance/slos";
import { collaboratorZoneForKind } from "@/domain/collaborator-access";

const ROOT = process.cwd();
const read = (p: string) => readFileSync(join(ROOT, p), "utf8");

const SUITE_KINDS = ["ANUBIS_SYNC_INBOX", "ANUBIS_REPLY_COMMENT", "ANUBIS_PUBLISH_SOCIAL_POST"] as const;

describe("ADR-0133 — suite sociale pilotable", () => {
  it("(1) kinds catalogués ANUBIS + SLOs", () => {
    for (const k of SUITE_KINDS) {
      const kind = INTENT_KINDS.find((x) => x.kind === k);
      expect(kind, k).toBeDefined();
      expect(kind!.governor).toBe("ANUBIS");
      expect(INTENT_SLOS.some((s) => s.kind === k), `SLO ${k}`).toBe(true);
    }
  });

  it("(2) délégables zone social", () => {
    for (const k of SUITE_KINDS) {
      expect(collaboratorZoneForKind(k), k).toBe("social");
    }
  });

  it("(3) l'Inbox est un service distinct — la PII de tiers n'entre jamais dans social-connect", () => {
    const inbox = read("src/server/services/anubis/social-inbox.ts");
    expect(inbox).toContain("socialInboxItem");
    expect(inbox).toMatch(/rôle processor/);
    // Réponse : scope contrôlé AVANT tout appel, erreur explicite sinon.
    expect(inbox).toContain("SCOPE_MISSING");
    expect(inbox).toMatch(/pages_manage_engagement/);
    expect(inbox).toMatch(/instagram_manage_comments/);
    // La boucle passive, elle, ne touche toujours pas aux commentaires.
    const passive = read("src/server/services/anubis/social-connect.ts");
    expect(passive).not.toMatch(/\/comments\?fields=/);
    expect(passive).not.toContain("socialInboxItem");
  });

  it("(4) publication honnête : UNSUPPORTED motivés, IG exige un visuel, scope contrôlé", () => {
    const pub = read("src/server/services/anubis/social-publish.ts");
    expect(pub).toMatch(/UNSUPPORTED/);
    expect(pub).toMatch(/payant/i);
    expect(pub).toMatch(/audit/i);
    expect(pub).toMatch(/Instagram exige un visuel/);
    expect(pub).toContain("SCOPE_MISSING");
    expect(pub).toMatch(/pages_manage_posts/);
    expect(pub).toMatch(/instagram_content_publish/);
    expect(pub).toMatch(/w_member_social/);
  });

  it("(5) planification = calendrier unique (BrandAction) + ré-émission gouvernée par le cron", () => {
    const pub = read("src/server/services/anubis/social-publish.ts");
    expect(pub).toContain("db.brandAction.create");
    expect(pub).not.toMatch(/model\s+SocialPublishJob/);
    const cron = read("src/app/api/cron/social-sync/route.ts");
    expect(cron).toContain("listDueScheduledPublications");
    expect(cron).toMatch(/emitIntentTyped/);
    expect(cron).toMatch(/ANUBIS_PUBLISH_SOCIAL_POST/);
    expect(cron).toContain("verifyCronSecret");
  });

  it("(6) promesse légale alignée (CGU / privacy / data-deletion)", () => {
    const cgu = read("src/app/(public)/cgu/page.tsx");
    expect(cgu).toMatch(/Réseaux sociaux connectés — mandat de gestion/);
    expect(cgu).toMatch(/responsable de traitement et UPgraders sous-traitant/);
    const privacy = read("src/app/(public)/privacy/page.tsx");
    expect(privacy).toMatch(/interactions\s+publiques adressées à la marque/i);
    const deletion = read("src/app/(public)/data-deletion/page.tsx");
    expect(deletion).toMatch(/commentaires publics adressés à votre marque/i);
    expect(deletion).toMatch(/boîte de réception/i);
  });

  it("(7) notifications branchées sur le fan-out canonique", () => {
    const inbox = read("src/server/services/anubis/social-inbox.ts");
    const pub = read("src/server/services/anubis/social-publish.ts");
    expect(inbox).toMatch(/pushNotification/);
    expect(pub).toMatch(/pushNotification/);
    // In-app + push + préférences : on réutilise le fan-out ADR-0025, pas
    // un canal parallèle.
    expect(inbox).toContain('from "./notifications"');
    expect(pub).toContain('from "./notifications"');
  });

  it("(8) surfaces cockpit posées + nav + i18n ×3", () => {
    for (const p of [
      "src/app/(cockpit)/cockpit/operate/inbox/page.tsx",
      "src/app/(cockpit)/cockpit/operate/publish/page.tsx",
      "src/app/(cockpit)/cockpit/intelligence/social/page.tsx",
    ]) {
      expect(() => read(p), p).not.toThrow();
    }
    const nav = read("src/components/navigation/portal-configs.ts");
    expect(nav).toContain("/cockpit/operate/inbox");
    expect(nav).toContain("/cockpit/operate/publish");
    expect(nav).toContain("/cockpit/intelligence/social");
    for (const lang of ["fr", "en", "zh"]) {
      const i18n = read(`src/lib/i18n/${lang}.ts`);
      for (const key of ["nav.inbox", "nav.publier", "nav.social-perf"]) {
        expect(i18n, `${lang}:${key}`).toContain(`"${key}"`);
      }
    }
  });
});
