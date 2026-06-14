/**
 * src/lib/types/guild-mission-brief.ts — La Guilde, brief mission canonique (ADR-0093).
 *
 * Layer `lib` (zod only — aucun import server). Source de vérité du « brief
 * complet » qu'une marque remplit sur le portail public /LaGuilde, et de la
 * projection publique exposée sur le mur (sans données de contact — la mise en
 * relation passe TOUJOURS par la plateforme, jamais en direct).
 *
 * Stockage : les champs structurels de Mission (title, budget, slaDeadline,
 * mode, status) restent des colonnes Prisma ; sector/location/category sont
 * dénormalisés en colonnes indexées (filtres du mur) ; tout le reste du brief
 * vit dans Mission.briefData, validé par `guildMissionBriefSchema`.
 *
 * Cf. catalogue MISSION_TEMPLATES (src/server/services/mission-templates) dont
 * les catégories sont reprises ici 1:1 + AUTRE.
 */

import { z } from "zod";

// ─── Catégories de mission (alignées sur MISSION_TEMPLATES.category + AUTRE) ───

export const GUILD_MISSION_CATEGORIES = [
  "BRANDING",
  "CAMPAIGN",
  "CONTENT",
  "PRODUCTION",
  "OPERATIONS",
  "ANALYTICS",
  "AUTRE",
] as const;

export type GuildMissionCategory = (typeof GUILD_MISSION_CATEGORIES)[number];

export const GUILD_MISSION_CATEGORY_LABELS: Record<GuildMissionCategory, string> = {
  BRANDING: "Branding & Identité",
  CAMPAIGN: "Campagne",
  CONTENT: "Contenu & Social",
  PRODUCTION: "Production (vidéo, audio, KV)",
  OPERATIONS: "Opérations & Devis",
  ANALYTICS: "Audit & Analyse",
  AUTRE: "Autre",
};

export function guildMissionCategoryLabel(c: string | null | undefined): string {
  if (!c) return "Mission";
  return GUILD_MISSION_CATEGORY_LABELS[c as GuildMissionCategory] ?? c;
}

// ─── Canaux (miroir de DriverChannel — laissé libre côté saisie) ───────────────

export const GUILD_MISSION_CHANNELS = [
  "INSTAGRAM",
  "FACEBOOK",
  "TIKTOK",
  "LINKEDIN",
  "YOUTUBE",
  "WEBSITE",
  "PACKAGING",
  "EVENT",
  "PR",
  "PRINT",
  "VIDEO",
  "RADIO",
  "TV",
  "OOH",
  "AUTRE",
] as const;

// ─── Mode (miroir de l'enum Prisma MissionMode) ────────────────────────────────

export const GUILD_MISSION_MODES = ["DISPATCH", "COLLABORATIF"] as const;
export type GuildMissionMode = (typeof GUILD_MISSION_MODES)[number];

// ─── Devises (FCFA-first, doctrine capture-then-grow Afrique francophone) ───────

export const GUILD_MISSION_CURRENCIES = ["XAF", "XOF", "EUR", "USD"] as const;

// ─── Brief complet (= Mission.briefData) ───────────────────────────────────────

const deliverableSchema = z.object({
  title: z.string().min(1).max(160),
  description: z.string().max(2000).optional(),
});

const referenceSchema = z.object({
  label: z.string().min(1).max(160),
  url: z.string().url().max(2000),
});

/**
 * Bloc stocké dans Mission.briefData. Tout ce qui n'est pas une colonne Prisma
 * structurelle. `_kind: "GUILD_MISSION_BRIEF"` marque l'origine portail public.
 */
export const guildMissionBriefSchema = z.object({
  _kind: z.literal("GUILD_MISSION_BRIEF").default("GUILD_MISSION_BRIEF"),

  // Identité de la marque demandeuse (affichée publiquement — attractivité).
  brandName: z.string().min(1).max(160),
  brandWebsite: z.string().url().max(2000).optional().or(z.literal("")),

  // Le cœur du brief.
  summary: z.string().min(20).max(400), // accroche / objectif en une phrase
  context: z.string().min(20).max(5000), // contexte marque & enjeu
  targetAudience: z.string().min(3).max(2000), // cible / client final
  deliverables: z.array(deliverableSchema).min(1).max(20),
  channels: z.array(z.string().max(40)).max(20).default([]),
  skillsRequired: z.array(z.string().min(1).max(60)).max(30).default([]),
  remoteOk: z.boolean().default(true),
  constraints: z.string().max(3000).optional(),
  qualityCriteria: z.array(z.string().min(1).max(280)).max(20).default([]),
  references: z.array(referenceSchema).max(10).default([]),

  // Contact — JAMAIS exposé publiquement (mise en relation via la plateforme).
  contactName: z.string().max(160).optional(),
  contactEmail: z.string().email().max(320).optional(),
});

export type GuildMissionBrief = z.infer<typeof guildMissionBriefSchema>;

// ─── Input de dépôt (router laguilde.postMission) ──────────────────────────────
// Combine colonnes structurelles + brief. Le handler éclate vers Mission + briefData.

export const postGuildMissionInputSchema = z.object({
  title: z.string().min(4).max(160),
  category: z.enum(GUILD_MISSION_CATEGORIES),
  sector: z.string().min(2).max(120),
  location: z.string().min(2).max(160),
  mode: z.enum(GUILD_MISSION_MODES).default("DISPATCH"),
  budgetAmount: z.number().positive().max(1_000_000_000).optional(),
  budgetCurrency: z.enum(GUILD_MISSION_CURRENCIES).default("XAF"),
  deadline: z.string().datetime().optional(), // ISO 8601

  // Brief (sans _kind — ajouté par défaut à la validation).
  brandName: z.string().min(1).max(160),
  brandWebsite: z.string().url().max(2000).optional().or(z.literal("")),
  summary: z.string().min(20).max(400),
  context: z.string().min(20).max(5000),
  targetAudience: z.string().min(3).max(2000),
  deliverables: z.array(deliverableSchema).min(1).max(20),
  channels: z.array(z.string().max(40)).max(20).default([]),
  skillsRequired: z.array(z.string().min(1).max(60)).max(30).default([]),
  remoteOk: z.boolean().default(true),
  constraints: z.string().max(3000).optional(),
  qualityCriteria: z.array(z.string().min(1).max(280)).max(20).default([]),
  references: z.array(referenceSchema).max(10).default([]),
  contactName: z.string().max(160).optional(),
  contactEmail: z.string().email().max(320).optional(),
});

export type PostGuildMissionInput = z.infer<typeof postGuildMissionInputSchema>;

// ─── Assist LLM (pré-remplissage) — ADR-0093 addendum ──────────────────────────
// Sortie attendue du helper LLM `draftMissionFromText`. TOUS les champs sont
// optionnels : l'IA remplit ce qu'elle infère, le dirigeant corrige le reste
// avant de soumettre via le chemin déterministe `postMission` (manual-first
// parity, ADR-0060). Validation tolérante (le LLM peut omettre / approximer).

export const guildMissionDraftSchema = z.object({
  title: z.string().max(160).optional(),
  category: z.enum(GUILD_MISSION_CATEGORIES).optional(),
  sector: z.string().max(120).optional(),
  location: z.string().max(160).optional(),
  mode: z.enum(GUILD_MISSION_MODES).optional(),
  budgetAmount: z.number().nonnegative().optional(),
  budgetCurrency: z.enum(GUILD_MISSION_CURRENCIES).optional(),
  brandName: z.string().max(160).optional(),
  brandWebsite: z.string().max(2000).optional(),
  summary: z.string().max(400).optional(),
  context: z.string().max(5000).optional(),
  targetAudience: z.string().max(2000).optional(),
  deliverables: z
    .array(z.object({ title: z.string().max(160), description: z.string().max(2000).optional() }))
    .max(20)
    .optional(),
  channels: z.array(z.string().max(40)).max(20).optional(),
  skillsRequired: z.array(z.string().max(60)).max(30).optional(),
  remoteOk: z.boolean().optional(),
  constraints: z.string().max(3000).optional(),
  qualityCriteria: z.array(z.string().max(280)).max(20).optional(),
});

export type GuildMissionDraft = z.infer<typeof guildMissionDraftSchema>;

/** Extrait le sous-objet briefData (briefData) depuis l'input de dépôt validé. */
export function extractBriefData(input: PostGuildMissionInput): GuildMissionBrief {
  return guildMissionBriefSchema.parse({
    _kind: "GUILD_MISSION_BRIEF",
    brandName: input.brandName,
    brandWebsite: input.brandWebsite || undefined,
    summary: input.summary,
    context: input.context,
    targetAudience: input.targetAudience,
    deliverables: input.deliverables,
    channels: input.channels,
    skillsRequired: input.skillsRequired,
    remoteOk: input.remoteOk,
    constraints: input.constraints,
    qualityCriteria: input.qualityCriteria,
    references: input.references,
    contactName: input.contactName,
    contactEmail: input.contactEmail,
  });
}

// ─── Projection publique (mur + détail) — AUCUNE donnée de contact ─────────────

export interface PublicGuildMission {
  id: string;
  slug: string | null;
  title: string;
  category: string | null;
  categoryLabel: string;
  sector: string | null;
  location: string | null;
  mode: GuildMissionMode | null;
  budget: number | null;
  budgetCurrency: string;
  deadline: string | null; // ISO
  publishedAt: string | null; // ISO
  // Champs dérivés du brief (sans contact).
  brandName: string;
  brandWebsite: string | null;
  summary: string;
  context: string;
  targetAudience: string;
  deliverables: Array<{ title: string; description?: string }>;
  channels: string[];
  skillsRequired: string[];
  remoteOk: boolean;
  qualityCriteria: string[];
  references: Array<{ label: string; url: string }>;
}

/**
 * Construit la projection publique depuis une ligne Mission + son briefData.
 * Tolérant : un briefData legacy/partiel ne fait jamais throw (best-effort coerce).
 */
export function toPublicGuildMission(m: {
  id: string;
  publicSlug: string | null;
  title: string;
  category: string | null;
  sector: string | null;
  location: string | null;
  mode: GuildMissionMode | string | null;
  budget: number | null;
  slaDeadline: Date | null;
  guildPublishedAt: Date | null;
  briefData: unknown;
}): PublicGuildMission {
  const brief = coerceBrief(m.briefData);
  return {
    id: m.id,
    slug: m.publicSlug,
    title: m.title,
    category: m.category,
    categoryLabel: guildMissionCategoryLabel(m.category),
    sector: m.sector,
    location: m.location,
    mode: (m.mode as GuildMissionMode) ?? null,
    budget: m.budget ?? null,
    budgetCurrency: brief.budgetCurrency ?? "XAF",
    deadline: (m.slaDeadline ?? null)?.toISOString() ?? null,
    publishedAt: m.guildPublishedAt?.toISOString() ?? null,
    brandName: brief.brandName ?? "Marque confidentielle",
    brandWebsite: brief.brandWebsite ?? null,
    summary: brief.summary ?? "",
    context: brief.context ?? "",
    targetAudience: brief.targetAudience ?? "",
    deliverables: brief.deliverables ?? [],
    channels: brief.channels ?? [],
    skillsRequired: brief.skillsRequired ?? [],
    remoteOk: brief.remoteOk ?? true,
    qualityCriteria: brief.qualityCriteria ?? [],
    references: brief.references ?? [],
  };
}

interface CoercedBrief {
  brandName?: string;
  brandWebsite?: string;
  summary?: string;
  context?: string;
  targetAudience?: string;
  deliverables?: Array<{ title: string; description?: string }>;
  channels?: string[];
  skillsRequired?: string[];
  remoteOk?: boolean;
  qualityCriteria?: string[];
  references?: Array<{ label: string; url: string }>;
  budgetCurrency?: string;
}

function coerceBrief(raw: unknown): CoercedBrief {
  if (!raw || typeof raw !== "object") return {};
  const r = raw as Record<string, unknown>;
  const asStr = (v: unknown) => (typeof v === "string" ? v : undefined);
  const asBool = (v: unknown) => (typeof v === "boolean" ? v : undefined);
  const asStrArr = (v: unknown) =>
    Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : undefined;
  const asDeliverables = (v: unknown) =>
    Array.isArray(v)
      ? v
          .filter((x): x is Record<string, unknown> => !!x && typeof x === "object")
          .map((x) => ({ title: String(x.title ?? ""), description: asStr(x.description) }))
          .filter((x) => x.title.length > 0)
      : undefined;
  const asReferences = (v: unknown) =>
    Array.isArray(v)
      ? v
          .filter((x): x is Record<string, unknown> => !!x && typeof x === "object")
          .map((x) => ({ label: String(x.label ?? ""), url: String(x.url ?? "") }))
          .filter((x) => x.label.length > 0 && x.url.length > 0)
      : undefined;
  return {
    brandName: asStr(r.brandName),
    brandWebsite: asStr(r.brandWebsite),
    summary: asStr(r.summary),
    context: asStr(r.context),
    targetAudience: asStr(r.targetAudience),
    deliverables: asDeliverables(r.deliverables),
    channels: asStrArr(r.channels),
    skillsRequired: asStrArr(r.skillsRequired),
    remoteOk: asBool(r.remoteOk),
    qualityCriteria: asStrArr(r.qualityCriteria),
    references: asReferences(r.references),
    budgetCurrency: asStr(r.budgetCurrency),
  };
}

// ─── Slug ──────────────────────────────────────────────────────────────────────

/** Slug URL-safe depuis un titre + suffixe court anti-collision. */
export function slugifyMissionTitle(title: string, suffix: string): string {
  const base = title
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // strip accents (combining diacritics)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  return `${base || "mission"}-${suffix}`;
}
