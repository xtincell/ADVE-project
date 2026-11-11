/**
 * SHK-0002 point 5 — lecture publique de la bibliothèque canonique Argos-studio.
 *
 * Validation conservatrice du fil `GET /api/v1/references` et
 * `GET /api/v1/references/{slug}` (routes réellement exposées par le studio,
 * `app/src/app/api/v1/references/**`). Seuls les champs que La Fusée rend sont
 * lus ; tout le reste est retiré par Zod (contact du chercheur, métriques,
 * actifs, taxonomie complète — le studio reste l'autorité de sa fiche).
 * Une réponse hors de cette forme est refusée en bloc : la page retombe sur les
 * dossiers publiés par La Fusée et le dit, au lieu d'afficher un fonds tronqué.
 */
import { z } from "zod";

/** Ref publique : slug du studio (`brand-titre-année`) ou ref du journal
 * (`brandUid--campaignUid`). Jamais de `.`, `/` ni `%` — rien qui puisse
 * changer le chemin appelé sur le studio. */
export const ARGOS_PUBLIC_REF_RE = /^[a-z0-9-]{1,160}$/;

/** Lien rendu dans une page publique : http(s) uniquement, sans identifiants. */
export function isPublicHttpLink(value: string): boolean {
  try {
    const url = new URL(value);
    return (url.protocol === "https:" || url.protocol === "http:") && !url.username && !url.password;
  } catch {
    return false;
  }
}

const publicLink = z.string().max(2000).refine(isPublicHttpLink, "Lien http(s) public requis.");

export const studioReferenceSchema = z.object({
  slug: z.string().regex(ARGOS_PUBLIC_REF_RE),
  title: z.string().trim().min(1).max(500),
  brandEmitter: z.string().trim().min(1).max(500),
  sector: z.string().max(200),
  marketPrimary: z.string().max(200),
  emissionYear: z.number().int().min(1800).max(2200),
  summary: z.string().max(20000),
  patternObservation: z.string().max(20000).optional(),
  significance: z.string().max(20000).optional(),
  updatedAt: z.iso.datetime({ offset: true }).optional(),
  axes: z.array(z.object({ value: z.string().max(4000) })).max(60),
  researchSources: z.array(z.object({ url: publicLink, title: z.string().max(500) })).max(60).optional(),
});
export type StudioReference = z.infer<typeof studioReferenceSchema>;

/** `GET /api/v1/references` — `{ data, meta.pagination }`. */
export const studioReferenceListSchema = z.object({
  data: z.array(studioReferenceSchema).max(100),
  meta: z.object({ pagination: z.object({ total: z.number().int().nonnegative() }) }),
});

/** `GET /api/v1/references/{slug}` — `{ data }` en 200. */
export const studioReferenceDetailSchema = z.object({ data: studioReferenceSchema });

/** `GET /api/v1/references/{slug}` — corps exact du 404 du studio. Un 404 d'une
 * autre forme (mauvaise URL de base, autre service) n'est PAS « introuvable ». */
export const studioNotFoundSchema = z.object({ ok: z.literal(false), error: z.literal("NOT_FOUND") });

/** Pourquoi la lecture publique ne vient pas de la bibliothèque. */
export const ARGOS_LIBRARY_FALLBACK_REASONS = [
  /** `ARGOS_STUDIO_URL` absente : ce site n'est pas raccordé à la bibliothèque. */
  "NOT_CONFIGURED",
  /** URL présente mais refusée (non HTTPS, identifiants, paramètres). */
  "MISCONFIGURED",
  /** Pas de réponse complète dans le délai borné. */
  "TIMEOUT",
  /** Hôte introuvable, réseau, statut HTTP d'erreur. */
  "UNREACHABLE",
  /** Réponse reçue mais hors de la forme attendue (JSON invalide, schéma, taille). */
  "INVALID_RESPONSE",
] as const;
export type ArgosLibraryFallbackReason = (typeof ARGOS_LIBRARY_FALLBACK_REASONS)[number];

/**
 * Source d'une lecture publique Argos — toujours rendue avec la donnée.
 * `STUDIO` : bibliothèque canonique, lue à `observedAt`.
 * `JOURNAL` : dossiers publiés par La Fusée (journal de gouvernance), avec la
 * raison de l'écart et la date de la dernière publication connue.
 */
export type ArgosReadSource =
  | { origin: "STUDIO"; observedAt: string }
  | {
      origin: "JOURNAL";
      reason: ArgosLibraryFallbackReason;
      observedAt: string;
      latestPublishedAt: string | null;
    };
