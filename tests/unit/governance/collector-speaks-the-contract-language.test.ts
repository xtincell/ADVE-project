/**
 * VERROU — ce que le collecteur ÉCRIT doit satisfaire ce que le contrat EXIGE.
 *
 * ── Le défaut, mesuré en production le 2026-07-31 ──
 *
 * 25 touchpoints issus du scan d'empreinte étaient en base. **Zéro** comptait
 * dans le score. Deux causes indépendantes, toutes deux muettes :
 *
 *   1. Le collecteur écrivait `stadeAarrr` là où le contrat de maturité exige
 *      `aarrStage`, et `type: "Présence détectée"` là où la taxonomie n'admet
 *      que PHYSIQUE|DIGITAL|HUMAIN.
 *
 *   2. Le bloc `webPresence` — site, réseaux, presse, domaine, performance,
 *      publicités, Wikipédia — n'était référencé par AUCUN contrat. Il pouvait
 *      peser 5 Ko de faits mesurés sans valoir un point, par construction.
 *
 * ── Pourquoi personne ne l'a vu ──
 *
 * `section-mappers` lit `pickStr(t, ["stadeAarrr", "aarrStage", "stade"])` :
 * l'AFFICHAGE tolère les deux orthographes, le SCORE n'en accepte qu'une.
 * L'écran montrait donc fidèlement une richesse que le score n'avait jamais
 * comptée. Aucun type ne peut attraper ça — tout transite en
 * `Record<string, unknown>` — et aucun test ne confrontait les deux moitiés.
 *
 * ── Ce que ce fichier verrouille ──
 *
 * La CLASSE, pas les deux instances : toute clé que le collecteur écrit doit
 * appartenir au vocabulaire canonique, et tout bloc qu'il pose doit être
 * réclamé par au moins une exigence. Renommer une clé d'un seul côté casse ce
 * test — c'est exactement ce qu'on veut.
 */

import { describe, it, expect } from "vitest";
import { mergeFootprintIntoPillarE, buildChannels, type WebFootprint } from "@/server/services/quick-intake/web-footprint";
import { getContract } from "@/server/services/pillar-maturity/contracts-loader";
import { buildFootprintFacts } from "@/server/services/quick-intake/footprint-facts";
import { AARRR_STAGES, CHANNELS, TOUCHPOINT_TYPES } from "@/lib/types/taxonomies";

/** Empreinte réaliste : un site joignable + deux réseaux + une retombée. */
const FOOTPRINT: WebFootprint = {
  site: { url: "https://irawotalents.com", reachable: true, title: "Irawo", description: null, ogImage: null, language: "fr" },
  socials: [
    { platform: "INSTAGRAM", url: "https://instagram.com/irawotalents", handle: "irawotalents", followersHint: null },
    { platform: "WHATSAPP", url: "https://wa.me/2250700000000", handle: null, followersHint: null },
  ],
  articles: [{ url: "https://example.com/a", title: "Irawo lance sa masterclass", source: "SITEMAP" }],
  channels: [],
  collectedAt: "2026-07-31T00:00:00.000Z",
  errors: [],
};

/**
 * Clés légales d'un touchpoint : celles du schema canonique (N2.08), plus les
 * deux clés de TRAÇABILITÉ que le collecteur ajoute délibérément. Toute autre
 * clé est un alias inventé — le cas `stadeAarrr`.
 */
const SCHEMA_KEYS = ["canal", "type", "channelRef", "role", "aarrStage", "devotionLevel", "priority", "frequency"];
const PROVENANCE_KEYS = ["url", "source"];

describe("Collecteur d'empreinte — il parle la langue du contrat", () => {
  // Chaîne réelle : le collecteur construit les canaux, puis les écrit dans le
  // pilier. Tester le seul merge laisserait la construction hors du verrou —
  // or c'est là que la référence de taxonomie se perdait.
  const scanned: WebFootprint = {
    ...FOOTPRINT,
    channels: buildChannels(FOOTPRINT),
    structured: {
      declaredProfiles: [{ url: "https://instagram.com/irawotalents", platform: "INSTAGRAM" }],
      feedUrl: "https://irawotalents.com/feed/",
      hasNewsletter: true,
      newsletterProvider: "MailerLite",
      schemaTypes: ["Organization"],
      events: [],
      courses: [],
      hasStructuredData: true,
    },
  };
  const merged = mergeFootprintIntoPillarE({}, scanned);
  const touchpoints = merged.touchpoints as Array<Record<string, unknown>>;

  it("n'écrit aucune clé de touchpoint hors du vocabulaire canonique", () => {
    const legal = new Set([...SCHEMA_KEYS, ...PROVENANCE_KEYS]);
    const intruses = [...new Set(touchpoints.flatMap((t) => Object.keys(t)))].filter((k) => !legal.has(k));
    expect(
      intruses,
      `clés inconnues du schema — le score les ignorera en silence : ${intruses.join(", ")}`,
    ).toEqual([]);
  });

  it("respecte les taxonomies sur les champs qu'il renseigne", () => {
    for (const t of touchpoints) {
      expect(TOUCHPOINT_TYPES as readonly string[]).toContain(String(t.type));
      // Ces deux-là sont facultatifs (non mesurables pour certains canaux),
      // mais s'ils sont écrits ils doivent être dans la nomenclature.
      if (t.channelRef !== undefined) expect(CHANNELS as readonly string[]).toContain(String(t.channelRef));
      if (t.aarrStage !== undefined) expect(AARRR_STAGES as readonly string[]).toContain(String(t.aarrStage));
    }
  });

  it("porte `channelRef` pour CHAQUE plateforme que le collecteur sait détecter", () => {
    const insta = touchpoints.find((t) => String(t.canal).includes("Instagram"));
    expect(insta?.channelRef, "Instagram EST dans la taxonomie — la mesure ne doit pas se perdre").toBe("INSTAGRAM");
    // WhatsApp est entré dans CHANNELS le 2026-07-31 (V1) — canal majeur du
    // marché cible, il restait sans référence de taxonomie. La branche
    // « omission plutôt que case voisine » (ADR-0046) reste dans le code pour
    // toute future plateforme hors nomenclature.
    const wa = touchpoints.find((t) => String(t.canal).includes("WhatsApp"));
    expect(wa?.channelRef).toBe("WHATSAPP");
  });

  it("n'invente NI `role` NI `devotionLevel` — ils ne se mesurent pas", () => {
    // Un canal simplement détecté n'a pas de rôle stratégique observable. Les
    // fabriquer gonflerait le score sur du vide ; leur absence est le résultat
    // correct, et le crédit de la présence réelle vient d'une exigence à part.
    for (const t of touchpoints.filter((x) => x.source === "EMPREINTE_WEB")) {
      expect(t.role).toBeUndefined();
      expect(t.devotionLevel).toBeUndefined();
    }
  });

  it("tout bloc de premier niveau qu'il écrit est réclamé par le contrat", () => {
    // Le piège inverse : de la donnée écrite que personne n'exige ne vaut rien.
    // `webPresence` a vécu ainsi jusqu'au 2026-07-31.
    const contract = getContract("e")!;
    const exigees = new Set(contract.stages.COMPLETE.map((r) => r.path.split(".")[0]!));
    const ecrits = Object.keys(merged);
    const orphelins = ecrits.filter((k) => !k.startsWith("_") && !exigees.has(k));
    expect(
      orphelins,
      `blocs écrits mais exigés par aucun contrat — ils ne compteront jamais : ${orphelins.join(", ")}`,
    ).toEqual([]);
  });

  it("les faits mesurés atteignent l'écran — collectés puis jetés, jamais", () => {
    // Le défaut du 2026-07-31 se rejouerait un cran plus bas si un nouveau
    // bloc entrait dans `webPresence` sans que la projection le porte. Ce que
    // le collecteur découvre doit être LISIBLE par le client.
    const facts = buildFootprintFacts({
      ...scanned,
      followerCounts: [], press: [], entityGate: undefined,
    } as unknown as Parameters<typeof buildFootprintFacts>[0]);
    expect(facts.declared, "les réseaux revendiqués par le site doivent être projetés").toBeTruthy();
    expect(facts.declared?.profiles.length).toBeGreaterThan(0);
    expect(facts.declared?.hasNewsletter).toBe(true);
  });

  it("distingue « site non lu » de « site sans données structurées »", () => {
    // `undefined` = pas de lecture · `null` = lu, rien de structuré. Confondre
    // les deux ferait dire « cette marque ne publie rien » à propos d'un site
    // qu'on n'a jamais ouvert — 3 des 4 sites mesurés n'exposent aucun JSON-LD.
    const jamaisLu = buildFootprintFacts({
      ...scanned, structured: undefined, feed: undefined,
      followerCounts: [], press: [], entityGate: undefined,
    } as unknown as Parameters<typeof buildFootprintFacts>[0]);
    expect(jamaisLu.declared).toBeUndefined();
    expect(jamaisLu.publishing).toBeUndefined();

    const luSansRien = buildFootprintFacts({
      ...scanned,
      structured: { declaredProfiles: [], feedUrl: null, hasNewsletter: false, newsletterProvider: null, schemaTypes: [], events: [], courses: [], hasStructuredData: false },
      feed: undefined, followerCounts: [], press: [], entityGate: undefined,
    } as unknown as Parameters<typeof buildFootprintFacts>[0]);
    expect(luSansRien.declared).toBeNull();
    expect(luSansRien.publishing).toBeNull();
  });

  it("les exigences de présence mesurée sont conditionnelles, jamais punitives", () => {
    // Sans scan, pas de `webPresence` : ces exigences doivent SORTIR du
    // dénominateur. Les y laisser reviendrait à compter une absence de mesure
    // comme un manque avéré.
    const contract = getContract("e")!;
    const mesurees = contract.stages.COMPLETE.filter((r) => r.path.startsWith("webPresence"));
    expect(mesurees.length, "le contrat E doit porter des exigences de présence mesurée").toBeGreaterThan(0);
    for (const r of mesurees) {
      expect(r.appliesWhen, `${r.path} doit être conditionnée à l'existence d'un scan`).toBe("webPresence");
      expect(r.derivable, `${r.path} ne se dérive pas — seul un scan la produit`).toBe(false);
    }
  });
});
