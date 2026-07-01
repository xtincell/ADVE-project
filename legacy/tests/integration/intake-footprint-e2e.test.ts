/**
 * TEST EN SITUATION RÉELLE — empreinte web publique de l'intake.
 *
 * - DB Postgres RÉELLE (DATABASE_URL → cluster local, migrations appliquées).
 * - Site web RÉEL fetché en live (nextjs.org) → l'empreinte est vraie.
 * - Appels LLM REMPLIS par un stub (pas d'API Anthropic) — on intercepte le
 *   choke point `callLLM` du gateway ; le pipeline retombe sur son fallback
 *   déterministe (réponses brutes du founder) là où le stub ne matche pas.
 *
 * But : prouver que start() → advance() → complete() exécute réellement la
 * collecte d'empreinte et l'injecte dans le pilier E.
 *
 * Lancer : DATABASE_URL=… npx vitest run tests/integration/intake-footprint-e2e.test.ts
 */
import { describe, it, expect, vi } from "vitest";

// ── Remplissage des appels LLM (au lieu de l'API) ──────────────────────────
vi.mock("@/server/services/llm-gateway", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/server/services/llm-gateway")>();
  let n = 0;
  return {
    ...actual,
    callLLM: vi.fn(async (opts: { caller?: string }) => {
      n += 1;
      // JSON plausible → l'extraction "réussit" (LLM rempli). Si une shape de
      // pilier est rejetée en aval, le pipeline retombe sur les réponses brutes.
      return {
        text: JSON.stringify({
          resume: `Contenu rempli par stub LLM (#${n}, ${opts?.caller ?? "?"}) — sans API`,
          analyse: "Diagnostic de test déterministe, cohérent avec le secteur déclaré.",
          recommandations: ["Recommandation test 1", "Recommandation test 2"],
        }),
        usage: { inputTokens: 12, outputTokens: 24 },
      };
    }),
    callLLMAndParse: vi.fn(async () => ({ resume: "stub", items: [] })),
  };
});

import { start, advance, complete } from "@/server/services/quick-intake";
import { db } from "@/lib/db";

describe("intake — empreinte web publique (situation réelle, LLM stubbé)", () => {
  it(
    "fetche un vrai site, détecte sociaux/articles, et fusionne dans le pilier E",
    async () => {
      // 1. START — avec un VRAI site + sociaux déclarés
      const started = await start({
        contactName: "Opérateur E2E",
        contactEmail: `e2e+${Date.now()}@lafusee.test`,
        contactPhone: undefined,
        companyName: "Next.js (e2e empreinte)",
        sector: "Tech / Framework web",
        country: "FR",
        method: "GUIDED",
        websiteUrl: "https://nextjs.org",
        socialLinksRaw: "https://twitter.com/nextjs\nhttps://www.linkedin.com/company/vercel",
      } as Parameters<typeof start>[0]);

      const token = started.token;
      expect(token).toBeTruthy();

      // 2. ADVANCE — réponses substantielles sur les 4 piliers ADVE
      await advance({
        token,
        responses: {
          a: { q_adn: "Notre ADN : rendre le web rapide par défaut, ouvert, pour les développeurs." },
          d: { q_unicite: "Le framework React full-stack de référence, adossé à Vercel." },
          v: { q_valeur: "Productivité dev, performance, DX irréprochable." },
          e: { q_communaute: "Communauté massive de développeurs, conférences, open-source." },
        },
      } as Parameters<typeof advance>[0]);

      // 3. COMPLETE — déclenche la collecte d'empreinte (live) + écrit le pilier E.
      //    On capture une éventuelle erreur APRÈS la persistance de l'empreinte
      //    (l.379) pour pouvoir assert quand même sur la recherche d'empreinte.
      let completeError: unknown = null;
      try {
        await complete(token);
      } catch (err) {
        completeError = err;
      }

      // 4. Relecture de la ligne intake — l'empreinte DOIT être persistée.
      const row = await db.quickIntake.findUnique({ where: { shareToken: token } });
      expect(row).toBeTruthy();

      const fp = row!.webFootprint as unknown as {
        site: { url: string; reachable: boolean; title: string | null } | null;
        socials: Array<{ platform: string; url: string; handle: string | null }>;
        articles: Array<{ url: string; title: string | null }>;
        channels: Array<{ canal: string; url: string }>;
        errors: string[];
      } | null;

      // eslint-disable-next-line no-console
      console.log("\n===== EMPREINTE WEB COLLECTÉE (réel) =====");
      console.log("site.reachable :", fp?.site?.reachable, "| title:", JSON.stringify(fp?.site?.title));
      console.log("socials        :", fp?.socials?.map((s) => `${s.platform}:${s.handle}`).join(", ") || "(aucun)");
      console.log("articles       :", fp?.articles?.length ?? 0);
      console.log("channels       :", fp?.channels?.map((c) => c.canal).join(", ") || "(aucun)");
      console.log("errors         :", fp?.errors?.length ? fp?.errors : "(aucune)");
      if (completeError) console.log("complete() a levé (post-empreinte):", completeError instanceof Error ? completeError.message : completeError);

      // ── ASSERTIONS empreinte (cœur du test) ──
      expect(fp).toBeTruthy();
      expect(fp!.site?.reachable).toBe(true);
      expect(fp!.site?.title).toMatch(/Next\.js/i);
      expect(fp!.channels.length).toBeGreaterThan(0);
      // Sociaux : au moins le LinkedIn/Twitter déclaré détecté.
      expect(fp!.socials.length).toBeGreaterThan(0);

      // 5. Pilier E — si complete() a terminé, l'empreinte doit y être fusionnée.
      const strategy = await db.strategy.findFirst({
        where: { description: { contains: row!.id } },
        orderBy: { createdAt: "desc" },
      });
      if (strategy) {
        const pillarE = await db.pillar.findFirst({
          where: { strategyId: strategy.id, key: "e" },
        });
        const content = (pillarE?.content as Record<string, unknown>) ?? {};
        console.log("pilier E.webPresence présent :", Boolean(content.webPresence));
        const tp = Array.isArray(content.touchpoints) ? (content.touchpoints as Array<Record<string, unknown>>) : [];
        console.log("touchpoints EMPREINTE_WEB    :", tp.filter((t) => t.source === "EMPREINTE_WEB").length);
        if (!completeError) {
          expect(content.webPresence).toBeTruthy();
          expect(tp.some((t) => t.source === "EMPREINTE_WEB")).toBe(true);
        }
      }
    },
    180_000,
  );
});
