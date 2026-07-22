/**
 * brand-book-ingestion/extractor-structured.ts — extracteur PUR déterministe
 * (parité manual-first ADR-0060, zéro LLM, zéro dépendance).
 *
 * Un brand book est majoritairement de la prose (mission, positionnement…) qui exige
 * un LLM. Mais une partie est **déterministiquement extractible** du texte : les
 * couleurs hex, les familles de police connues. Ce parseur fournit ce plancher sûr —
 * `null` sur absence, JAMAIS de valeur inventée. Le reste reste `null` (l'opérateur
 * complète, ou l'extracteur LLM propose, toujours revu avant écriture).
 *
 * Même contrat de sortie que `extractor-llm.ts` (`BrandBookExtraction`).
 */
import type { BrandBookExtraction } from "./schema";

/** Familles de police courantes (détection déterministe par nom). Étendable. */
const KNOWN_FONTS = [
  "Clash Display", "Satoshi", "JetBrains Mono", "Inter", "Roboto", "Montserrat",
  "Poppins", "Exo", "Exo 2", "Helvetica", "Helvetica Neue", "Arial", "Futura",
  "Gotham", "Gilroy", "Lato", "Open Sans", "Playfair Display", "Bebas Neue",
  "Oswald", "Raleway", "Nunito", "Work Sans", "DM Sans", "Space Grotesk",
  "Archivo", "Sora", "Manrope", "Rubik", "Barlow", "Karla", "Mulish",
  "Source Sans", "Source Serif", "Merriweather", "Libre Franklin", "Cabinet Grotesk",
  "Clash Grotesk", "General Sans", "Switzer", "Author", "Chillax", "Klinsman",
] as const;

/** Normalise un hex `#RGB`/`#RRGGBB` en `#RRGGBB` minuscule, ou null si invalide. */
function normHex(raw: string): string | null {
  const m = raw.match(/^#?([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/);
  if (!m?.[1]) return null;
  let h = m[1].toLowerCase();
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  return `#${h}`;
}

/** Couleurs hex uniques du texte (déterministe). Vide → null (pas de tableau vide). */
function extractColors(text: string): { hex: string; name: string | null; role: string | null }[] | null {
  const seen = new Set<string>();
  for (const m of text.matchAll(/#[0-9a-fA-F]{6}\b/g)) {
    const hex = normHex(m[0]);
    if (hex) seen.add(hex);
  }
  if (seen.size === 0) return null;
  return Array.from(seen).slice(0, 12).map((hex) => ({ hex, name: null, role: null }));
}

/** Familles de police connues présentes dans le texte (déterministe). */
function extractFonts(text: string): { family: string; role: string | null }[] | null {
  const found: { family: string; role: string | null }[] = [];
  const seen = new Set<string>();
  for (const font of KNOWN_FONTS) {
    // Frontière de mot pour éviter les faux positifs (« Arial » dans « Arialing »…).
    const re = new RegExp(`\\b${font.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i");
    if (re.test(text) && !seen.has(font.toLowerCase())) {
      seen.add(font.toLowerCase());
      found.push({ family: font, role: null });
    }
  }
  return found.length ? found.slice(0, 6) : null;
}

/**
 * Extraction déterministe d'un brand book depuis son texte. Ne remplit que les
 * champs sûrement dérivables (couleurs, polices) ; le reste reste `null`. Zéro LLM,
 * zéro fabrication.
 */
export function extractStructured(text: string): BrandBookExtraction {
  const colors = extractColors(text);
  const fonts = extractFonts(text);
  const visual = colors || fonts ? { colors: colors ?? null, fonts: fonts ?? null, logoDescription: null } : null;
  return {
    identity: null,      // prose → nécessite le LLM ou la saisie opérateur
    distinction: null,
    value: null,
    visual,
  };
}
