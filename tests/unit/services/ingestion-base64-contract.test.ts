/**
 * Le contenu d'un document déposé doit être LISIBLE, pas du base64.
 *
 * `extractAuto` a deux familles d'appelants et le contrat n'avait jamais été
 * tranché : `ingestFile` passe du base64 (ce que l'upload transmet), les
 * chemins de ré-extraction passent `source.rawContent`, du texte déjà extrait.
 * La branche texte ne distinguait pas — donc tout `.txt`/`.md` déposé était
 * stocké **en base64 verbatim**, puis indexé, puis servi au moteur comme
 * « documentation de la marque ».
 *
 * Constaté en prod le 2026-07-28 en déposant les documents SPAWT : 92 746
 * caractères envoyés, 126 152 stockés — soit exactement le gonflement 4/3 du
 * base64. Du charabia présenté comme une source, ce qui est pire que rien :
 * depuis l'ancrage documentaire, ce charabia compterait comme un document.
 */

import { describe, expect, it } from "vitest";
import { decodeIfBase64, extractAuto } from "@/server/services/ingestion-pipeline/extractors";

const TEXTE = "SPAWT — Le Palais organise la découverte culinaire en cinq axes.\nStephanie Bidje, Fondatrice & Cheffe produit.";
const B64 = Buffer.from(TEXTE, "utf8").toString("base64");

describe("décodage : on vérifie, on ne suppose pas", () => {
  it("décode ce qui est réellement du base64", () => {
    expect(decodeIfBase64(B64)).toBe(TEXTE);
  });

  it("rend le texte ordinaire tel quel", () => {
    expect(decodeIfBase64(TEXTE)).toBe(TEXTE);
  });

  it("ne se laisse pas piéger par un texte qui a l'air base64", () => {
    // Jeu de caractères compatible, mais l'aller-retour ne redonne pas l'entrée.
    const piege = "ABCDEFGHIJKLMNOPQRSTUVWXY";
    expect(decodeIfBase64(piege)).toBe(piege);
  });

  it("laisse passer une chaîne trop courte pour trancher", () => {
    expect(decodeIfBase64("abc")).toBe("abc");
  });

  it("est idempotent — décoder deux fois ne recasse pas le texte", () => {
    expect(decodeIfBase64(decodeIfBase64(B64))).toBe(TEXTE);
  });
});

describe("extractAuto — le chemin upload rend du lisible", () => {
  it("TXT déposé en base64 ressort en texte, pas en base64", async () => {
    const r = await extractAuto("TXT", B64, "s1");
    expect(r.text).toBe(TEXTE);
    expect(r.text).not.toContain("U1BBV1Qg");
  });

  it("MD déposé en base64 ressort en texte", async () => {
    const r = await extractAuto("MD", B64, "s1");
    expect(r.text).toBe(TEXTE);
  });

  it("CSV déposé en base64 ressort en texte", async () => {
    const csv = "nom,role\nStephanie,Fondatrice\nKidam,Data\n";
    const r = await extractAuto("CSV", Buffer.from(csv, "utf8").toString("base64"), "s1");
    expect(r.text).toBe(csv);
  });

  it("le chemin RÉ-extraction (texte déjà extrait) n'est pas abîmé", async () => {
    const r = await extractAuto("TXT", TEXTE, "s1");
    expect(r.text).toBe(TEXTE);
  });
});
