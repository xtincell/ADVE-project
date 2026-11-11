/**
 * SHK-0002 point 5 — le mur `/argos` et la fiche `/argos/[ref]` disent d'où
 * vient ce qu'ils affichent : bibliothèque canonique, ou dossiers publiés par
 * La Fusée avec la raison du repli. Lecture tRPC simulée.
 */
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({ list: undefined as unknown, read: undefined as unknown, isError: false }));
vi.mock("@/lib/trpc/client", () => ({
  trpc: {
    argos: {
      listPublic: { useQuery: () => ({ data: state.list, isLoading: false, isError: state.isError }) },
      getPublicByRef: { useQuery: () => ({ data: state.read, isLoading: false, isError: state.isError }) },
    },
  },
}));

import { ArgosWall } from "@/components/argos/argos-wall";
import { ArgosDossierView } from "@/components/argos/argos-dossier-view";

const studioDossier = {
  ref: "studio-fixture-campagne-2026",
  brand: "Studio Fixture",
  campaign: "Campagne studio",
  sector: "Télécoms",
  market: "SN",
  summary: "Résumé canonique de la bibliothèque.",
  dna: {},
  editorial: { sections: [{ title: "Résumé", body: "Résumé canonique de la bibliothèque." }] },
  sources: [{ title: "Communiqué", url: "https://press.example.test/1" }],
  publishedAt: null,
  updatedAt: "2026-11-09T12:00:00.000Z",
  libraryUrl: "https://studio.example.test/work/studio-fixture-campagne-2026",
};
const journalDossier = {
  ref: "fixture--lancement",
  brand: "Fixture",
  campaign: "Lancement",
  sector: "food",
  market: "CI",
  summary: null,
  dna: { voice: "Voix du journal", keyPhrases: ["k1"] },
  editorial: { sections: [{ title: "Lecture", body: "Corps du journal" }] },
  sources: [],
  publishedAt: "2026-11-02T12:00:00.000Z",
  updatedAt: "2026-11-03T12:00:00.000Z",
  libraryUrl: null,
};
const STUDIO_SOURCE = { origin: "STUDIO", observedAt: "2026-11-11T12:00:00.000Z" };
const journal = (reason: string) => ({
  origin: "JOURNAL",
  reason,
  observedAt: "2026-11-11T12:00:00.000Z",
  latestPublishedAt: "2026-11-02T12:00:00.000Z",
});

beforeEach(() => {
  vi.stubGlobal("React", React);
  state.list = undefined;
  state.read = undefined;
  state.isError = false;
});
afterEach(() => vi.unstubAllGlobals());

describe("mur public /argos", () => {
  it("bibliothèque canonique : la source est nommée avec l'heure de consultation", () => {
    state.list = { dossiers: [studioDossier], source: STUDIO_SOURCE };
    const html = renderToStaticMarkup(React.createElement(ArgosWall));
    expect(html).toContain('data-argos-source="STUDIO"');
    expect(html).toContain("Source : bibliothèque Argos, consultée le 11 novembre 2026");
    expect(html).toContain("Résumé canonique de la bibliothèque.");
    expect(html).toContain('href="/argos/studio-fixture-campagne-2026"');
    expect(html).not.toContain("dossiers publiés par La Fusée");
  });

  it("bibliothèque non raccordée : dossiers de La Fusée, dernière publication datée", () => {
    state.list = { dossiers: [journalDossier], source: journal("NOT_CONFIGURED") };
    const html = renderToStaticMarkup(React.createElement(ArgosWall));
    expect(html).toContain('data-argos-source="JOURNAL"');
    expect(html).toContain("La bibliothèque Argos n&#x27;est pas raccordée à ce site");
    expect(html).toContain("dernière publication le 2 novembre 2026");
    expect(html).not.toContain("consultée le");
  });

  it.each([
    ["TIMEOUT", "n&#x27;a pas répondu à temps"],
    ["UNREACHABLE", "est injoignable pour le moment"],
    ["INVALID_RESPONSE", "une réponse que ce site ne sait pas lire"],
    ["MISCONFIGURED", "mal configuré"],
  ])("repli %s : la cause est dite et l'écart avec la bibliothèque signalé", (reason, cause) => {
    state.list = { dossiers: [journalDossier], source: journal(reason) };
    const html = renderToStaticMarkup(React.createElement(ArgosWall));
    expect(html).toContain("Bibliothèque Argos indisponible");
    expect(html).toContain(cause);
    expect(html).toContain("qui peuvent différer de la bibliothèque");
    expect(html).toContain("Fixture");
  });

  it("une lecture en erreur n'est pas présentée comme un mur vide", () => {
    state.isError = true;
    const html = renderToStaticMarkup(React.createElement(ArgosWall));
    expect(html).not.toContain("Aucun dossier publié");
    expect(html).toContain("ne peuvent pas être affichés pour le moment");
  });
});

describe("fiche publique /argos/[ref]", () => {
  it("fiche de la bibliothèque : source, mise à jour et lien vers la fiche complète", () => {
    state.read = { dossier: studioDossier, source: STUDIO_SOURCE };
    const html = renderToStaticMarkup(React.createElement(ArgosDossierView, { refId: studioDossier.ref }));
    expect(html).toContain("Source : bibliothèque Argos");
    expect(html).toContain("Fiche mise à jour le 9 novembre 2026");
    expect(html).toContain('href="https://studio.example.test/work/studio-fixture-campagne-2026"');
  });

  it("dossier de La Fusée en repli : date de publication du dossier, pas de lien bibliothèque", () => {
    state.read = { dossier: journalDossier, source: journal("TIMEOUT") };
    const html = renderToStaticMarkup(React.createElement(ArgosDossierView, { refId: journalDossier.ref }));
    expect(html).toContain("n&#x27;a pas répondu à temps");
    expect(html).toContain("dossier publié le 2 novembre 2026");
    expect(html).not.toContain("fiche complète dans la bibliothèque");
    expect(html).toContain("Corps du journal");
  });

  it("introuvable dans la bibliothèque : la source de la réponse reste affichée", () => {
    state.read = { dossier: null, source: STUDIO_SOURCE };
    const html = renderToStaticMarkup(React.createElement(ArgosDossierView, { refId: "absente" }));
    expect(html).toContain("Dossier introuvable ou non publié.");
    expect(html).toContain("Source : bibliothèque Argos");
  });

  it("introuvable dans les dossiers de La Fusée : le repli dit que ce dossier n'y figure pas", () => {
    state.read = { dossier: null, source: { ...journal("UNREACHABLE"), latestPublishedAt: null } };
    const html = renderToStaticMarkup(React.createElement(ArgosDossierView, { refId: "absente" }));
    expect(html).toContain("est injoignable pour le moment");
    expect(html).toContain("ce dossier n&#x27;y figure pas");
    expect(html).toContain("Dossier introuvable ou non publié.");
  });
});
