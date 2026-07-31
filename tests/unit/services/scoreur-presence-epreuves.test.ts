/**
 * V3 « le tournoi a enfin lieu » — les faits collectés disputent des épreuves.
 *
 * Mandat opérateur (2026-07-31) : « le collecteur doit chercher aux bons
 * endroits ce que le standard de la ligue de la marque considère comme le
 * must-have du rang disputé — c'est déjà prévu mais non effectué. »
 *
 * Vérifié : exact. Le Scoreur (ADR-0149) avait ses ligues, ses planchers par
 * échelle (ADR-0126) et son catalogue de `MUST_HAVE_ITEMS` — mais son
 * compilateur ignorait la presse et les publications collectées à chaque scan.
 * La ligue existait, le tournoi n'avait jamais lieu.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

const findFirst = vi.fn();
vi.mock("@/lib/db", () => ({ db: { pillar: { findFirst: () => findFirst() } } }));
vi.mock("../../../src/server/services/seshat/overton-graph", () => ({ getOvertonSignalsForBrand: vi.fn() }));

import { compilePresenceEpreuves, ITEM_OPPONENTS } from "@/server/services/seshat/scoreur/compilateur";

const NOW = "2026-07-31T00:00:00.000Z";
const pillar = (webPresence: unknown) => ({ content: { webPresence }, updatedAt: new Date(NOW) });

describe("compilePresenceEpreuves — la collecte entre dans l'arène", () => {
  beforeEach(() => findFirst.mockReset());

  it("jamais scannée ⇒ AUCUNE épreuve (absence honnête, P22-2)", async () => {
    findFirst.mockResolvedValue({ content: {}, updatedAt: new Date(NOW) });
    expect(await compilePresenceEpreuves({ strategyId: "s", nowIso: NOW, thirdPartyFloor: 20 })).toEqual([]);
  });

  it("presse ≥ standard de la ligue ⇒ VICTOIRE en arène A", async () => {
    // Une marque de quartier (plancher 5) avec 6 retombées gagne son rang ;
    // les mêmes 6 retombées à l'échelle MONDE (plancher 40) perdent.
    findFirst.mockResolvedValue(pillar({ press: new Array(6).fill({ title: "x" }) }));
    const petit = await compilePresenceEpreuves({ strategyId: "s", nowIso: NOW, thirdPartyFloor: 5 });
    expect(petit[0]).toMatchObject({ arena: "A", result: "WIN", opponentRef: ITEM_OPPONENTS.aPressFloor });

    findFirst.mockResolvedValue(pillar({ press: new Array(6).fill({ title: "x" }) }));
    const monde = await compilePresenceEpreuves({ strategyId: "s", nowIso: NOW, thirdPartyFloor: 40 });
    expect(monde[0]).toMatchObject({ arena: "A", result: "LOSS" });
    // Même marque, même presse : c'est la LIGUE qui décide. C'est tout l'objet
    // du chantier — chaque marque jugée à son échelle.
  });

  it("publication fraîche + cadence tenue ⇒ VICTOIRE forte en arène E", async () => {
    findFirst.mockResolvedValue(
      pillar({ feed: { lastPublishedAt: "2026-07-20T00:00:00.000Z", medianDaysBetweenPosts: 14 } }),
    );
    const out = await compilePresenceEpreuves({ strategyId: "s", nowIso: NOW, thirdPartyFloor: 20 });
    const e = out.find((x) => x.arena === "E");
    expect(e).toMatchObject({ result: "WIN", opponentRef: ITEM_OPPONENTS.ePublishing, proofWeight: 1.0 });
  });

  it("parution isolée : victoire possible, mais preuve MOYENNE (pas un rythme)", async () => {
    findFirst.mockResolvedValue(pillar({ feed: { lastPublishedAt: "2026-07-20T00:00:00.000Z", medianDaysBetweenPosts: null } }));
    const e = (await compilePresenceEpreuves({ strategyId: "s", nowIso: NOW, thirdPartyFloor: 20 })).find((x) => x.arena === "E");
    expect(e).toMatchObject({ result: "WIN", proofWeight: 0.5 });
  });

  it("dernière parution trop ancienne ⇒ DÉFAITE (le silence se mesure)", async () => {
    findFirst.mockResolvedValue(pillar({ feed: { lastPublishedAt: "2025-01-01T00:00:00.000Z", medianDaysBetweenPosts: 200 } }));
    const e = (await compilePresenceEpreuves({ strategyId: "s", nowIso: NOW, thirdPartyFloor: 20 })).find((x) => x.arena === "E");
    expect(e?.result).toBe("LOSS");
  });

  it("aucun flux déclaré ⇒ pas d'épreuve E (on ne punit pas l'absence de canal)", async () => {
    findFirst.mockResolvedValue(pillar({ press: [{ title: "x" }] }));
    const out = await compilePresenceEpreuves({ strategyId: "s", nowIso: NOW, thirdPartyFloor: 5 });
    expect(out.some((x) => x.arena === "E")).toBe(false);
  });

  it("le cas Irawo mesuré : 3 presses + cadence 104 j en ligue NATION", async () => {
    findFirst.mockResolvedValue(
      pillar({
        press: new Array(3).fill({ title: "CANAL+" }),
        feed: { lastPublishedAt: "2026-07-13T00:00:00.000Z", medianDaysBetweenPosts: 104.6 },
      }),
    );
    const out = await compilePresenceEpreuves({ strategyId: "s", nowIso: NOW, thirdPartyFloor: 20 });
    // Presse en dessous du standard NATION (20) → défaite honnête.
    expect(out.find((x) => x.arena === "A")).toMatchObject({ result: "LOSS" });
    // Mais elle publie et l'a fait il y a 18 jours → victoire E, preuve moyenne
    // (cadence de 104 j : elle publie, sans rythme soutenu).
    expect(out.find((x) => x.arena === "E")).toMatchObject({ result: "WIN", proofWeight: 0.5 });
  });
});
