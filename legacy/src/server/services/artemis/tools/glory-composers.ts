/**
 * GLORY composers déterministes — launch/social (0 LLM, depuis ADVERTIS).
 *
 * Mandat opérateur (galileo) : « dépendre au minimum des LLMs ». Les 4 outils
 * de prélancement (naming-generator, social-copy-engine, content-calendar-
 * strategist, launch-timeline-planner) produisent leur livrable en COMPOSANT
 * les DONNÉES RÉELLES des piliers (A/D/V/E/I/S) dans la shape exacte que les
 * surfaces cockpit consomment — au lieu de passer par un LLM dont la sortie
 * n'était pas garantie (cause racine : le script échouait à passer par les
 * Glory depuis l'ADVERTIS, d'où des outputs écrits à la main).
 *
 * Doctrine (Blueprint §3.5, ADR-0091) : COMPOSE = assemblage déterministe,
 * reproductible, zéro hasard. Aucune invention : un champ pilier absent produit
 * une lacune (chaîne vide / liste vide), jamais un contenu halluciné.
 *
 * Branché dans `executeTool` (engine.ts) AVANT le chemin LLM : si un composer
 * existe pour le slug → on compose, on valide contre `outputSchema`, on persiste
 * avec provenance `DETERMINISTIC_COMPOSE`. Reproductible pour TOUTE marque.
 */

import { db } from "@/lib/db";
import { deriveDatedPosts, type ContentCalendar } from "@/lib/types/launch-calendar";
import { LAUNCH_SOCIAL_SCHEMAS } from "./launch-social-schemas";

type Blob = Record<string, unknown>;

export interface GloryComposerContext {
  strategy: { id: string; name: string; countryCode: string | null; businessContext: Blob | null };
  pillars: Partial<Record<string, Blob>>;
}

// ── Helpers purs ────────────────────────────────────────────────────────────

function str(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t.length === 0 ? null : t;
}
function arr(v: unknown): unknown[] {
  return Array.isArray(v) ? v : [];
}
function strArr(v: unknown): string[] {
  return arr(v).filter((x): x is string => typeof x === "string" && x.trim().length > 0).map((x) => x.trim());
}
function pick(obj: Blob | undefined | null, key: string): unknown {
  return obj && typeof obj === "object" ? (obj as Blob)[key] : undefined;
}
function names(items: unknown[], keys = ["nom", "name", "titre", "title", "action", "valeur", "phase"]): string[] {
  return items
    .map((it) => {
      if (typeof it === "string") return it.trim();
      if (it && typeof it === "object") {
        for (const k of keys) {
          const v = (it as Blob)[k];
          if (typeof v === "string" && v.trim()) return v.trim();
        }
      }
      return null;
    })
    .filter((s): s is string => Boolean(s));
}

/** Brand display name — first token before a dash/colon separator. "SPAWT — La carte" → "SPAWT". */
function cleanBrandName(name: string): string {
  const head = name.split(/\s[—–-]\s|:/)[0]?.trim() || name.trim();
  return head;
}

/** URL/handle-safe slug: lowercase, de-accented, alphanumeric, first word only. */
function slugify(name: string): string {
  const base = cleanBrandName(name)
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .split(/\s+/)[0];
  return base || "brand";
}

/** "Mon Slogan" → "#MonSlogan" (PascalCase, de-accented, ≤ ~24 chars). */
function toHashtag(text: string): string {
  const words = text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9\s]/g, " ")
    .trim()
    .split(/\s+/)
    .slice(0, 3)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1));
  return "#" + words.join("");
}

const PLATFORMS: Array<{ key: string; label: string }> = [
  { key: "instagram", label: "Instagram" },
  { key: "tiktok", label: "TikTok" },
  { key: "facebook", label: "Facebook" },
  { key: "whatsappCommunity", label: "WhatsApp Community" },
  { key: "x", label: "X (Twitter)" },
];

// ── Context loader (1 requête) ───────────────────────────────────────────────

export async function loadGloryComposerContext(strategyId: string): Promise<GloryComposerContext | null> {
  const strategy = await db.strategy.findUnique({
    where: { id: strategyId },
    select: {
      id: true,
      name: true,
      countryCode: true,
      businessContext: true,
      pillars: { select: { key: true, content: true } },
    },
  });
  if (!strategy) return null;
  const pillars: Partial<Record<string, Blob>> = {};
  for (const p of strategy.pillars) pillars[p.key.toLowerCase()] = (p.content ?? {}) as Blob;
  return {
    strategy: {
      id: strategy.id,
      name: strategy.name,
      countryCode: strategy.countryCode ?? null,
      businessContext: (strategy.businessContext ?? null) as Blob | null,
    },
    pillars,
  };
}

// ── Handle helpers (shared naming/social) ────────────────────────────────────

function buildHandles(ctx: GloryComposerContext) {
  const slug = slugify(ctx.strategy.name);
  const cc = (ctx.strategy.countryCode ?? "").toLowerCase().replace(/[^a-z]/g, "");
  const baseline = cc ? `@${slug}.${cc}` : `@${slug}`;
  const xHandle = cc ? `@${slug}_${cc}` : `@${slug}`;
  const domain = cc ? `${slug}.${cc}` : `${slug}.com`;
  return { slug, cc, baseline, xHandle, domain };
}

// ── Composer : naming-generator ──────────────────────────────────────────────

export function composeNaming(ctx: GloryComposerContext): Blob {
  const brandName = cleanBrandName(ctx.strategy.name);
  const d = ctx.pillars.d ?? {};
  const ling = (pick(d, "assetsLinguistiques") ?? {}) as Blob;
  const tagline = str(pick(ling, "slogan")) ?? str(pick(d, "promesseMaitre")) ?? str(pick(ling, "tagline"));
  const { slug, cc, baseline, xHandle, domain } = buildHandles(ctx);

  const handles: Record<string, string> = {
    instagram: baseline,
    tiktok: baseline,
    facebook: baseline,
    x: xHandle,
    whatsappCommunity: `La communauté ${brandName}`,
    domain,
    googlePlayTitle: tagline ? `${brandName} — ${tagline}` : brandName,
  };
  const fallbacks: Record<string, string[]> = {
    instagram: cc ? [`@${slug}${cc}`, `@${slug}.app`] : [`@${slug}app`],
    tiktok: cc ? [`@${slug}${cc}`] : [],
    domain: [`${slug}.app`, `get${slug}.com`],
  };

  return {
    brandName,
    tagline,
    mascot: str(pick(d, "mascotte")) ?? null,
    handleStrategy: `Un seul handle partout pour l'ancrage de marque. Baseline ${baseline}${cc ? ` (le point sépare la marque « ${slug} » du marché « ${cc} », capture-then-grow)` : ""} ; repli @${slug}${cc} (sans point) ; ${xHandle} sur X.`,
    rationale: `${baseline} ancre la marque${cc ? ` sur ${cc.toUpperCase()}` : ""}, reste court, lisible et identique cross-plateforme pour un rappel maximal.`,
    handles,
    fallbacks,
    doNotName: ["pas de chiffres dans le handle", "pas de tirets", "pas de variations par plateforme (dilue la marque)"],
    availabilityToVerify: [
      `instagram.com/${slug}${cc ? "." + cc : ""}`,
      `tiktok.com/@${slug}${cc ? "." + cc : ""}`,
      `facebook.com/${slug}${cc ? "." + cc : ""}`,
      `whois ${domain}`,
    ],
  };
}

// ── Composer : social-copy-engine ────────────────────────────────────────────

export function composeSocialCopy(ctx: GloryComposerContext): Blob {
  const brandName = cleanBrandName(ctx.strategy.name);
  const d = ctx.pillars.d ?? {};
  const e = ctx.pillars.e ?? {};
  const a = ctx.pillars.a ?? {};
  const ton = (pick(d, "tonDeVoix") ?? {}) as Blob;
  const ling = (pick(d, "assetsLinguistiques") ?? {}) as Blob;
  const personnalite = strArr(pick(ton, "personnalite"));
  const onNeDitPas = strArr(pick(ton, "onNeDitPas"));
  const slogan = str(pick(ling, "slogan"));
  const lexique = strArr(pick(ling, "lexique"));
  const promesse = str(pick(d, "promesseMaitre")) ?? str(pick(d, "positionnement"));
  const elevator = str(pick(a, "originMythElevator")) ?? str(pick(a, "noyauIdentitaire"));
  const rituels = names(arr(pick(e, "rituels")));
  const sector = str(pick(ctx.strategy.businessContext, "sector"));
  const country = str(pick(ctx.strategy.businessContext, "country")) ?? (ctx.strategy.countryCode ?? null);
  const { baseline, xHandle, domain } = buildHandles(ctx);
  const link = `https://${domain}`;

  const voice = personnalite.length ? `${personnalite.join(", ")}.` : null;
  const highlights = (lexique.length ? lexique : rituels).slice(0, 5);
  const displayName = slogan ? `${brandName} · ${slogan}` : brandName;
  const bioBase = [slogan, promesse].filter(Boolean).join(" — ");

  const profiles: Blob[] = [
    {
      platform: "Instagram",
      handle: baseline,
      displayName,
      bio: [slogan, promesse, "👇 Découvre-nous"].filter(Boolean).join("\n"),
      link,
      pinned: "Reel manifeste → CTA principal",
      category: sector ? `Application — ${sector}` : "Marque",
      highlights,
    },
    {
      platform: "TikTok",
      handle: baseline,
      displayName: brandName,
      bio: bioBase || promesse || slogan,
      link,
      contentAngle: "UGC natif + voix de marque, jamais studio",
    },
    {
      platform: "WhatsApp Community",
      handle: "lien d'invitation",
      displayName: `La communauté ${brandName}`,
      bio: promesse ? `${promesse} — chaque semaine, l'essentiel partagé par la communauté.` : `La communauté ${brandName}.`,
      channels: ["📣 Annonces", "🍽️ Partages de la communauté"],
    },
    {
      platform: "Facebook",
      handle: baseline,
      displayName,
      bio: promesse || bioBase,
      about: elevator,
      category: "Page",
    },
    {
      platform: "X (Twitter)",
      handle: xHandle,
      displayName: brandName,
      bio: [slogan, promesse].filter(Boolean).join(". "),
      priority: "secondaire",
    },
  ];

  return {
    brand: ctx.strategy.name,
    voice,
    market: [country, sector].filter(Boolean).join(" · ") || null,
    handleBaseline: baseline,
    profiles,
    linkInBio: {
      recommendation: `un seul lien = la landing principale (${domain}) qui capte le lead`,
      avoid: "linktree générique qui dilue le CTA",
    },
    doNot: onNeDitPas.map((x) => `ne pas dire « ${x} »`),
  };
}

// ── Composer : content-calendar-strategist ───────────────────────────────────

function launchAnchorISO(ctx: GloryComposerContext): string | null {
  const s = ctx.pillars.s ?? {};
  const bc = ctx.strategy.businessContext ?? {};
  return (
    str(pick(bc, "launchDate")) ??
    str(pick(s, "launchDate")) ??
    str(pick((pick(s, "computed") ?? {}) as Blob, "launchDate")) ??
    null
  );
}

export function composeContentCalendar(ctx: GloryComposerContext): Blob {
  const brandName = cleanBrandName(ctx.strategy.name);
  const d = ctx.pillars.d ?? {};
  const e = ctx.pillars.e ?? {};
  const i = ctx.pillars.i ?? {};
  const ling = (pick(d, "assetsLinguistiques") ?? {}) as Blob;
  const ton = (pick(d, "tonDeVoix") ?? {}) as Blob;
  const slogan = str(pick(ling, "slogan"));
  const lexique = strArr(pick(ling, "lexique"));
  const formats = strArr(pick(i, "formatsDisponibles"));
  const rituels = names(arr(pick(e, "rituels")));
  const assets = names(arr(pick(i, "assetsProduisibles")), ["asset", "name", "nom"]);
  const sector = str(pick(ctx.strategy.businessContext, "sector"));
  const country = str(pick(ctx.strategy.businessContext, "country")) ?? (ctx.strategy.countryCode ?? null);

  const piliers = (rituels.length ? rituels : lexique).slice(0, 4);
  // Le `rythme` par canal est un modèle sectoriel par défaut (best-practice), PAS
  // dérivé des piliers de la marque comme `piliers`/`formats` le sont → flag
  // `rythmeSource: "DEFAULT_TEMPLATE"` pour que l'UI le signale honnêtement (trou H2).
  const cadenceParCanal: ContentCalendar["cadenceParCanal"] = {
    Instagram: { rythme: "4-5 posts/sem + stories quotidiennes", rythmeSource: "DEFAULT_TEMPLATE", piliers, formats, format: null },
    TikTok: { rythme: "3-4 vidéos/sem", rythmeSource: "DEFAULT_TEMPLATE", piliers: [], formats: formats.length ? formats : ["UGC natif", "format court"], format: null },
    Facebook: { rythme: "2 posts/sem", rythmeSource: "DEFAULT_TEMPLATE", piliers: [], formats: [], format: "reprise IG + communauté locale" },
    "WhatsApp Community": { rythme: "1 digest / semaine", rythmeSource: "DEFAULT_TEMPLATE", piliers: [], formats: [], format: "digest hebdomadaire (jamais un classement)" },
  };

  // Overton phases canon (Révéler → Prouver → Normaliser) garnies de données réelles.
  const themesParPhaseOverton = [
    { phase: "Révéler", contenus: [slogan, rituels[0], assets[0]].filter((x): x is string => Boolean(x)) },
    { phase: "Prouver", contenus: [...rituels.slice(1, 3), ...assets.slice(1, 2)].filter(Boolean) },
    { phase: "Normaliser", contenus: [...assets.slice(2), ...formats.slice(0, 2)].filter(Boolean) },
  ].filter((p) => p.contenus.length > 0);

  const signature = [
    slogan ? toHashtag(slogan) : null,
    toHashtag(brandName),
    ...lexique.slice(0, 1).map(toHashtag),
  ].filter((x): x is string => Boolean(x));
  const local = [
    country ? `#${country.replace(/\s+/g, "")}` : null,
    sector && country ? `#${sector.replace(/\s+/g, "")}${country.replace(/\s+/g, "")}` : null,
  ].filter((x): x is string => Boolean(x));

  // Voix de marque (pilier D · ADVE) injectée dans caption + brief illustration
  // → les posts remontent à l'ADVE(d), pas à un gabarit libre (PROPAGATION-MAP H1).
  const personnalite = strArr(pick(ton, "personnalite"));
  const brandVoice = { voice: personnalite.length ? personnalite.join(", ") : null, lexique };
  const calForPosts = { cadenceParCanal, themesParPhaseOverton, hashtags: { signature, local } };
  const posts = deriveDatedPosts(calForPosts, launchAnchorISO(ctx), 4, brandVoice);

  return {
    brand: ctx.strategy.name,
    cadenceParCanal,
    themesParPhaseOverton,
    hashtags: { signature, local },
    doNot: strArr(pick(ton, "onNeDitPas")),
    posts,
  };
}

// ── Composer : launch-timeline-planner ───────────────────────────────────────

export function composeLaunchTimeline(ctx: GloryComposerContext): Blob {
  const s = ctx.pillars.s ?? {};
  const i = ctx.pillars.i ?? {};
  const roadmap = arr(pick(s, "roadmap")).filter((x): x is Blob => typeof x === "object" && x !== null);
  const catalogue = (pick(i, "catalogueParCanal") ?? {}) as Blob;
  const canaux = Object.keys(catalogue);

  const weeks = roadmap.map((ph, idx) => ({
    semaine: `S${idx + 1}`,
    dates: str(pick(ph, "duree")) ?? `Phase ${idx + 1}`,
    phase: str(pick(ph, "phase")) ?? `Phase ${idx + 1}`,
    theme: str(pick(ph, "objectifDevotion")) ?? str(pick(ph, "objectif")) ?? "",
    kpi: str(pick(ph, "objectif")) ?? "",
    canaux,
    actions: strArr(pick(ph, "actions")),
    opsDigitales: [],
  }));

  const checkpoints = roadmap
    .map((ph) => ({ at: str(pick(ph, "duree")) ?? "", gate: str(pick(ph, "objectif")) ?? "" }))
    .filter((c) => c.at || c.gate);

  return {
    brand: ctx.strategy.name,
    weeks,
    anchor: {
      j1: launchAnchorISO(ctx),
      note: "Calendrier relatif — re-ancrable. Si la date de départ bouge, décale tout le bloc.",
      budgetGtm: str(pick(s, "globalBudget")),
    },
    warRoom: "Revue hebdomadaire des indicateurs clés du lancement.",
    checkpoints,
  };
}

// ── Composer async, adossé à la connaissance Seshat ──────────────────────────
// `benchmark-reference-finder` se DÉCLARE « interroge le Knowledge Graph Seshat »
// mais, faute de composer, retombait sur le LLM avec un simple template — il ne
// lisait jamais le corpus réel. Drift corrigé : on COMPOSE le rapport de benchmark
// depuis les dossiers de référence RÉELS récoltés par Hunter (verdict PASS,
// secteur/marché de la marque). 0 LLM, 0 internet — DB pure, reproductible.
// C'est exactement la doctrine « DB d'abord » : la matière vient de Seshat, le LLM
// n'est jamais sur le chemin critique de ce tool.

function dnaField(dna: unknown, key: string): string[] {
  const obj = dna && typeof dna === "object" ? (dna as Blob) : {};
  return strArr(obj[key]);
}

export async function composeBenchmarkReferenceFinder(strategyId: string): Promise<Blob> {
  const { retrieveReferenceDossiers } = await import("@/server/services/seshat/reference-context");
  const dossiers = await retrieveReferenceDossiers(strategyId, { limit: 8 });

  if (dossiers.length === 0) {
    return {
      references: [],
      count: 0,
      _provenance: "DETERMINISTIC_COMPOSE",
      _gap: "Corpus de référence Seshat vide pour ce secteur. Lance une récolte Hunter (Argos) pour alimenter la base — aucune référence inventée.",
    };
  }

  const references = dossiers.map((d) => {
    const voice = (() => {
      const obj = d.dna && typeof d.dna === "object" ? (d.dna as Blob) : {};
      return str(obj.voice);
    })();
    const axes = dnaField(d.dna, "axes");
    const keyPhrases = dnaField(d.dna, "keyPhrases");
    const visualCodes = dnaField(d.dna, "visualCodes");
    const editorial = str(d.editorial);
    return {
      brand: d.brand,
      campaign: d.campaign,
      sector: d.sector,
      market: d.market,
      whatWorks: [voice ? `Voix : ${voice}` : null, ...axes.map((a) => `Axe : ${a}`)].filter(Boolean),
      keyPhrases,
      visualCodes,
      editorial,
      // Applicabilité = laissée à l'opérateur/au tool aval : on ne PRÉTEND pas
      // déduire la transposabilité sans LLM. On fournit la matière brute, sourcée.
      source: "Seshat / Hunter (CampaignReferenceDossier, verdict PASS)",
    };
  });

  return {
    references,
    count: references.length,
    _provenance: "DETERMINISTIC_COMPOSE",
    _note: "Références réelles récoltées par Hunter. À croiser avec l'ADVE pour en déduire du distinctif (étage LLM aval, découplé).",
  };
}

const ASYNC_GLORY_COMPOSERS: Record<string, (strategyId: string) => Promise<Blob>> = {
  "benchmark-reference-finder": composeBenchmarkReferenceFinder,
};

// ── Registry + dispatch ──────────────────────────────────────────────────────

const GLORY_COMPOSERS: Record<string, (ctx: GloryComposerContext) => Blob> = {
  "naming-generator": composeNaming,
  "social-copy-engine": composeSocialCopy,
  "content-calendar-strategist": composeContentCalendar,
  "launch-timeline-planner": composeLaunchTimeline,
};

/** True si un composer déterministe existe pour ce slug (sync ou async Seshat). */
export function hasGloryComposer(slug: string): boolean {
  return slug in GLORY_COMPOSERS || slug in ASYNC_GLORY_COMPOSERS;
}

export interface DeterministicGloryResult {
  output: Blob;
  /** false si la stratégie est introuvable — caller décide du fallback. */
  ok: boolean;
}

/**
 * Compose le livrable déterministe d'un Glory tool depuis l'ADVERTIS.
 * Valide contre `outputSchema` (safe — on retourne la sortie composer même si
 * la validation signale un écart, mais on logge). 0 LLM, 0 réseau hors DB.
 */
export async function composeGloryDeterministic(
  slug: string,
  strategyId: string,
): Promise<DeterministicGloryResult> {
  // Composer async adossé à Seshat (lit le corpus DB, pas l'ADVERTIS seul).
  const asyncComposer = ASYNC_GLORY_COMPOSERS[slug];
  if (asyncComposer) {
    const output = await asyncComposer(strategyId);
    return { output, ok: true };
  }

  const composer = GLORY_COMPOSERS[slug];
  if (!composer) return { output: {}, ok: false };

  const ctx = await loadGloryComposerContext(strategyId);
  if (!ctx) return { output: {}, ok: false };

  const raw = composer(ctx);

  const schema = LAUNCH_SOCIAL_SCHEMAS[slug as keyof typeof LAUNCH_SOCIAL_SCHEMAS];
  if (schema) {
    const parsed = schema.safeParse(raw);
    if (!parsed.success) {
      console.warn(`[glory-composers] ${slug}: composer output failed schema —`, parsed.error.issues.slice(0, 3));
    } else {
      return { output: parsed.data as Blob, ok: true };
    }
  }
  return { output: raw, ok: true };
}
