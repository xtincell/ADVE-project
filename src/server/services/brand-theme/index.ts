/**
 * brand-theme/index.ts — Résolveur de thème de rendu PAR MARQUE (Phase 1 « La
 * Fusée compile », ADR-0169).
 *
 * Les générateurs de livrables serveur (Brand Bible PDF, Oracle PDF) rendaient
 * dans la palette UPgraders EN DUR. Ce module dérive un thème **des couleurs de
 * la marque** — depuis son coffre (`CHROMATIC_STRATEGY` / `TYPOGRAPHY_SYSTEM` /
 * `LOGO_*`) et, en second, le pilier D `directionArtistique` — pour que le
 * livrable sorte à l'identité du client (SPAWT en noir/or, Motion19 en bleu),
 * pas au gabarit générique.
 *
 * Doctrine :
 *   - **Zéro LLM, déterministe.** Pure dérivation depuis la donnée du coffre.
 *   - **Zéro fabrication.** Pas de palette déclarée → fallback UPgraders DS
 *     IDENTIQUE au comportement actuel (honnête, réversible — comme ADR-0130).
 *   - **Tolérant de forme** (même leçon qu'ADR-0168) : le contenu
 *     `CHROMATIC_STRATEGY`/`TYPOGRAPHY_SYSTEM` varie d'une marque à l'autre
 *     (SPAWT `{accent,primary,full,…}` + fichiers de police ; Motion19
 *     `{primary,accent,anthracite,roles}` sans fichiers). On récolte tout hex
 *     valide où qu'il soit, on tombe en fallback sur ce qui manque.
 *   - **Toujours lisible.** Chaque couleur de texte est garantie contrastée sur
 *     son fond (ratio WCAG) — un accent illisible ne casse jamais le rendu.
 *
 * Le rendu réel des FICHIERS de police (jsPDF `addFont`) est un lot ultérieur —
 * ce module expose les familles typographiques déclarées ; les PDF gardent
 * helvetica en attendant l'embarquement (résidu tracé).
 */

import { db as defaultDb } from "@/lib/db";
import type { PrismaClient } from "@prisma/client";

export type RGB = readonly [number, number, number];

/** Thème de rendu résolu — chaque rôle encode son contexte de fond. */
export interface BrandTheme {
  coverBg: RGB; // fond de couverture (sombre)
  coverText: RGB; // titre sur la couverture (lisible sur coverBg)
  coverEyebrow: RGB; // sur-titre secondaire sur la couverture
  coverBrand: RGB; // nom de marque sur la couverture (accent, lisible)
  sectionBg: RGB; // fond des slides de section (clair)
  band: RGB; // bandeau d'en-tête (accent)
  bandText: RGB; // texte sur le bandeau (lisible sur band)
  accentOnLight: RGB; // accent utilisable comme TEXTE sur sectionBg (lisible garanti)
  ink: RGB; // texte sombre sur sectionBg
  muted: RGB; // texte secondaire
  accentBar: RGB; // petites barres d'accent
  frameBg: RGB; // fond de cadre placeholder (clair)
  logoUrl: string | null; // logo actif du coffre (dessiné sur la couverture)
  displayFontFamily: string | null; // famille titrage déclarée (rendu police = lot ultérieur)
  bodyFontFamily: string | null; // famille texte déclarée
  brandLabel: string; // sur-titre couverture (nom de marque, MAJ)
  isFallback: boolean; // true = aucune palette de marque → UPgraders DS
}

// ── Palette UPgraders DS (RGB) — canon ADR-0097, le fallback ─────────────────
const UP = {
  panda: [26, 26, 26] as RGB,
  bone: [245, 240, 232] as RGB,
  corail: [229, 100, 88] as RGB,
  or: [250, 204, 21] as RGB,
  ink: [38, 38, 38] as RGB,
  muted: [120, 113, 108] as RGB,
  white: [255, 255, 255] as RGB,
};

/** Fallback = comportement UPgraders actuel, inchangé (pas de palette marque). */
export const UPGRADERS_THEME: BrandTheme = {
  coverBg: UP.panda,
  coverText: UP.white,
  coverEyebrow: UP.or,
  coverBrand: UP.corail,
  sectionBg: UP.bone,
  band: UP.corail,
  bandText: UP.white,
  accentOnLight: UP.corail,
  ink: UP.ink,
  muted: UP.muted,
  accentBar: UP.or,
  frameBg: UP.white,
  logoUrl: null,
  displayFontFamily: null,
  bodyFontFamily: null,
  brandLabel: "UPGRADERS · LA FUSÉE",
  isFallback: true,
};

// ── Utilitaires couleur (déterministes) ──────────────────────────────────────

const HEX = /^#[0-9a-fA-F]{6}$/;

export function hexToRgb(hex: string): RGB | null {
  if (!HEX.test(hex)) return null;
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff];
}

/** Luminance relative WCAG (0 = noir, 1 = blanc). */
export function relLuminance([r, g, b]: RGB): number {
  const lin = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

/** Ratio de contraste WCAG entre deux couleurs (1..21). */
export function contrastRatio(a: RGB, b: RGB): number {
  const la = relLuminance(a);
  const lb = relLuminance(b);
  const [hi, lo] = la >= lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}

const NEAR_BLACK: RGB = [20, 20, 20];
const NEAR_WHITE: RGB = [255, 255, 255];

/**
 * Couleur de texte sur `bg` : blanc par défaut (norme design — blanc sur les
 * couleurs de marque), SAUF si le blanc y est illisible (fond clair type or /
 * crème) où l'on bascule sur noir-quasi. Seuil AA grand-texte (≥ 3). Garantit
 * la lisibilité dans les deux cas (le noir sur fond clair est toujours ≥ 3).
 */
export function readableTextOn(bg: RGB): RGB {
  return contrastRatio(NEAR_WHITE, bg) >= 3 ? NEAR_WHITE : NEAR_BLACK;
}

/** `fg` s'il est lisible sur `bg` (ratio ≥ 3, seuil texte large/UI), sinon `fallback`. */
function ensureReadable(fg: RGB, bg: RGB, fallback: RGB): RGB {
  return contrastRatio(fg, bg) >= 3 ? fg : fallback;
}

/** « Vivacité » approximative (distance chroma) — pour trier les candidats accent. */
function vividness([r, g, b]: RGB): number {
  return Math.max(r, g, b) - Math.min(r, g, b);
}

/**
 * Récolte tolérante de tous les hex d'un contenu CHROMATIC_STRATEGY, quelle que
 * soit sa forme. `accent`/`primary` explicites priorisés ; le reste = tout hex
 * trouvé (valeurs ET clés — Motion19 indexe `roles` PAR hex), profondeur ≤ 4.
 */
export function collectHexes(content: unknown): { accent: string | null; primary: string | null; all: string[] } {
  const all = new Set<string>();
  const rec = content && typeof content === "object" ? (content as Record<string, unknown>) : {};
  const accent = typeof rec.accent === "string" && HEX.test(rec.accent) ? rec.accent : null;
  const primary = typeof rec.primary === "string" && HEX.test(rec.primary) ? rec.primary : null;

  const walk = (v: unknown, depth: number) => {
    if (depth > 4 || v == null) return;
    if (typeof v === "string") {
      if (HEX.test(v)) all.add(v);
      return;
    }
    if (Array.isArray(v)) {
      for (const x of v.slice(0, 32)) walk(x, depth + 1);
      return;
    }
    if (typeof v === "object") {
      for (const [k, val] of Object.entries(v as Record<string, unknown>)) {
        if (HEX.test(k)) all.add(k); // Motion19 : roles[hex] = description
        walk(val, depth + 1);
      }
    }
  };
  walk(content, 0);
  if (accent) all.add(accent);
  if (primary) all.add(primary);
  return { accent, primary, all: [...all] };
}

/** Extrait les familles typographiques (tolérant SPAWT `primary/secondary` vs Motion19 `display/text`). */
export function extractFontFamilies(content: unknown): { display: string | null; body: string | null } {
  const c = content && typeof content === "object" ? (content as Record<string, unknown>) : {};
  const fam = (v: unknown): string | null => {
    if (typeof v === "string" && v.trim()) return v.trim();
    if (v && typeof v === "object") {
      const f = (v as Record<string, unknown>).family;
      if (typeof f === "string" && f.trim()) return f.trim();
    }
    return null;
  };
  return {
    display: fam(c.primary) ?? fam(c.display) ?? fam(c.titrage) ?? null,
    body: fam(c.secondary) ?? fam(c.text) ?? fam(c.body) ?? null,
  };
}

// ── Construction pure du thème ───────────────────────────────────────────────

/**
 * Dérive un `BrandTheme` depuis les contenus de coffre (pur, testable sans DB).
 * Fallback UPgraders sur tout rôle non dérivable ; contraste garanti.
 */
export function buildBrandTheme(input: {
  chromatic: unknown;
  typography?: unknown;
  logoUrl?: string | null;
  brandName: string;
}): BrandTheme {
  const { accent: accentHex, primary: primaryHex, all } = collectHexes(input.chromatic);
  const rgbs = all.map(hexToRgb).filter((x): x is RGB => x != null);
  const fonts = extractFontFamilies(input.typography);

  // Aucune couleur exploitable → fallback UPgraders (mais on garde logo + fontes).
  // L'identité de marque passe par les COULEURS + le LOGO + le nom, pas par le
  // sur-titre producteur (`brandLabel` reste la signature de l'OS — honnête).
  if (rgbs.length === 0) {
    return {
      ...UPGRADERS_THEME,
      logoUrl: input.logoUrl ?? null,
      displayFontFamily: fonts.display,
      bodyFontFamily: fonts.body,
      isFallback: true,
    };
  }

  const byLum = [...rgbs].sort((a, b) => relLuminance(a) - relLuminance(b));
  const darkest = byLum[0]!;
  const lightest = byLum[byLum.length - 1]!;
  const byVivid = [...rgbs].sort((a, b) => vividness(b) - vividness(a));

  // accent = champ explicite si valide, sinon la couleur la plus vive.
  const accent = (accentHex && hexToRgb(accentHex)) || byVivid[0]!;
  // secondary = primary explicite (≠ accent) sinon 2ᵉ plus vive sinon or UPgraders.
  const primaryRgb = primaryHex ? hexToRgb(primaryHex) : null;
  const secondary =
    (primaryRgb && contrastRatio(primaryRgb, accent) > 1.1 ? primaryRgb : null) ??
    byVivid.find((c) => contrastRatio(c, accent) > 1.1) ??
    UP.or;

  // coverBg = plus sombre si assez sombre, sinon panda ; sectionBg = plus clair si assez clair, sinon bone.
  const coverBg = relLuminance(darkest) < 0.2 ? darkest : UP.panda;
  const sectionBg = relLuminance(lightest) > 0.82 ? lightest : UP.bone;
  const ink = relLuminance(darkest) < 0.12 ? darkest : UP.ink;

  const coverText = readableTextOn(coverBg);

  return {
    coverBg,
    coverText,
    // sur-titre + nom de marque sur la couverture : accent/secondary s'ils sont
    // lisibles sur le fond sombre, sinon on retombe sur le texte de couverture.
    coverEyebrow: ensureReadable(secondary, coverBg, coverText),
    coverBrand: ensureReadable(accent, coverBg, coverText),
    sectionBg,
    band: accent,
    bandText: readableTextOn(accent), // ← corrige « blanc sur or illisible »
    // accent comme TEXTE sur le fond clair : lisible garanti (un accent trop
    // clair — or sur crème — retombe sur l'encre plutôt que de disparaître).
    accentOnLight: ensureReadable(accent, sectionBg, ink),
    ink,
    muted: UP.muted,
    accentBar: secondary,
    frameBg: UP.white,
    logoUrl: input.logoUrl ?? null,
    displayFontFamily: fonts.display,
    bodyFontFamily: fonts.body,
    brandLabel: UPGRADERS_THEME.brandLabel,
    isFallback: false,
  };
}

// ── Résolution async (lecture coffre) ────────────────────────────────────────

/**
 * Résout le thème de rendu d'une marque depuis son coffre. Lecture SEULE, zéro
 * LLM. `CHROMATIC_STRATEGY`/`TYPOGRAPHY_SYSTEM` ACTIVE en priorité, puis récent ;
 * logo `LOGO_FINAL` ACTIVE > récent > `LOGO_IDEA`. Rien → thème UPgraders.
 */
export async function resolveBrandTheme(strategyId: string, client?: PrismaClient): Promise<BrandTheme> {
  const db = client ?? defaultDb;
  const [strategy, chromatics, typographies, logos] = await Promise.all([
    db.strategy.findUnique({ where: { id: strategyId }, select: { name: true } }),
    db.brandAsset.findMany({
      where: { strategyId, kind: "CHROMATIC_STRATEGY", state: { notIn: ["ARCHIVED", "REJECTED"] } },
      orderBy: { createdAt: "desc" },
      take: 4,
      select: { content: true, state: true },
    }),
    db.brandAsset.findMany({
      where: { strategyId, kind: "TYPOGRAPHY_SYSTEM", state: { notIn: ["ARCHIVED", "REJECTED"] } },
      orderBy: { createdAt: "desc" },
      take: 4,
      select: { content: true, state: true },
    }),
    db.brandAsset.findMany({
      where: {
        strategyId,
        kind: { in: ["LOGO_FINAL", "LOGO_IDEA"] },
        fileUrl: { not: null },
        state: { notIn: ["ARCHIVED", "REJECTED"] },
      },
      orderBy: { createdAt: "desc" },
      take: 12,
      select: { kind: true, fileUrl: true, state: true },
    }),
  ]);

  const chromatic = (chromatics.find((c) => c.state === "ACTIVE") ?? chromatics[0])?.content ?? null;
  const typography = (typographies.find((t) => t.state === "ACTIVE") ?? typographies[0])?.content ?? null;
  const finals = logos.filter((l) => l.kind === "LOGO_FINAL");
  const logoUrl =
    (finals.find((l) => l.state === "ACTIVE") ?? finals[0] ?? logos[0])?.fileUrl ?? null;

  return buildBrandTheme({
    chromatic,
    typography,
    logoUrl,
    brandName: strategy?.name ?? "",
  });
}
