/**
 * Launch kit — pure types + defensive parsers for the four launch/social Glory
 * deliverables stored in `GloryOutput.output` (jsonb):
 *   - `launch-timeline-planner`     → retroplanning (weeks J-anchored, GTM)
 *   - `content-calendar-strategist` → editorial cadence per channel + hashtags
 *   - `naming-generator`            → recommended social handles + domain
 *   - `social-copy-engine`          → per-platform bios / display names / copy
 *
 * The cockpit launch-calendar surface + the deliverables hub read these via
 * `trpc.glory.launchCalendar` instead of leaving them as dormant JSON in the
 * vault. Parsers are pure and tolerant — a missing/legacy shape yields `null`,
 * never a throw.
 */

export interface LaunchTimelineWeek {
  semaine: string;
  dates: string;
  phase: string;
  theme: string;
  kpi: string;
  canaux: string[];
  actions: string[];
  opsDigitales: string[];
}

export interface LaunchCheckpoint {
  at: string;
  gate: string;
}

export interface LaunchTimeline {
  brand: string;
  weeks: LaunchTimelineWeek[];
  /** ISO date of J1 (re-anchorable). Lets the editorial calendar align dated posts. */
  anchorJ1: string | null;
  anchorNote: string | null;
  budgetGtm: string | null;
  warRoom: string | null;
  checkpoints: LaunchCheckpoint[];
}

export interface ContentCadenceChannel {
  rythme: string | null;
  piliers: string[];
  formats: string[];
  format: string | null;
}

export interface ContentCalendarPhase {
  phase: string;
  contenus: string[];
}

/** A single dated publication — the consultable post-by-post editorial calendar. */
export interface ContentPost {
  /** ISO date (YYYY-MM-DD). */
  date: string;
  /** Localised weekday label (lundi, mardi, …). */
  weekday: string;
  /** Launch week label (S1, S2, …) when anchored, else null. */
  week: string | null;
  platform: string;
  format: string | null;
  theme: string | null;
  angle: string | null;
  hashtags: string[];
  status: string;
  /** Caption draft (copy à publier). Dérivée des champs éditoriaux si absente. */
  caption: string | null;
  /** Brief illustration (direction visuelle du post). Dérivé si absent. */
  illustration: string | null;
}

export interface ContentCalendar {
  brand: string;
  cadenceParCanal: Record<string, ContentCadenceChannel>;
  themesParPhaseOverton: ContentCalendarPhase[];
  hashtags: { signature: string[]; local: string[] };
  doNot: string[];
  /** Dated post-by-post calendar. Stored by the deterministic composer, or derived read-side. */
  posts: ContentPost[];
}

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);
const str = (v: unknown): string => (typeof v === "string" ? v : "");
const strOrNull = (v: unknown): string | null => (typeof v === "string" && v.length > 0 ? v : null);
const strArr = (v: unknown): string[] =>
  Array.isArray(v) ? v.filter((x): x is string => typeof x === "string" && x.length > 0) : [];

/** Parse the `launch-timeline-planner` output. Returns null if no weeks. */
export function parseLaunchTimeline(raw: unknown): LaunchTimeline | null {
  if (!isRecord(raw)) return null;
  const weeksRaw = Array.isArray(raw.weeks) ? raw.weeks : [];
  const weeks: LaunchTimelineWeek[] = weeksRaw.filter(isRecord).map((w) => ({
    semaine: str(w.semaine),
    dates: str(w.dates),
    phase: str(w.phase),
    theme: str(w.theme),
    kpi: str(w.kpi),
    canaux: strArr(w.canaux),
    actions: strArr(w.actions),
    opsDigitales: strArr(w.opsDigitales),
  }));
  if (weeks.length === 0) return null;
  const anchor = isRecord(raw.anchor) ? raw.anchor : {};
  const checkpointsRaw = Array.isArray(raw.checkpoints) ? raw.checkpoints : [];
  const checkpoints: LaunchCheckpoint[] = checkpointsRaw
    .filter(isRecord)
    .map((c) => ({ at: str(c.at), gate: str(c.gate) }))
    .filter((c) => c.at || c.gate);
  return {
    brand: str(raw.brand) || "Marque",
    weeks,
    anchorJ1: strOrNull(anchor.j1) ?? strOrNull(anchor.J1) ?? strOrNull(anchor.date),
    anchorNote: strOrNull(anchor.note),
    budgetGtm: strOrNull(anchor.budgetGtm) ?? strOrNull(raw.budgetGtm),
    warRoom: strOrNull(raw.warRoom),
    checkpoints,
  };
}

/**
 * Gabarit + replis de la dérivation déterministe de copy. Source unique —
 * aucun littéral dispersé dans les fonctions (anti-hardcode NEFER), même
 * convention que `WEEKDAYS_FR` / `WEEKDAY_SPREAD` ci-dessus.
 */
const POST_COPY = {
  fallbackHook: "Publication",
  fallbackSubject: "le sujet",
  fallbackFormat: "format natif",
  angleLabel: "Angle",
  toneLabel: "Ton",
  /** Direction visuelle par défaut, appliquée à tout brief illustration. */
  visualDirective: "Cadrage épuré, peu de texte à l'image, focal sur",
} as const;

/**
 * Contexte de marque (pilier D · ADVE) injecté dans la dérivation de copy pour
 * que caption + brief illustration **remontent à l'ADVE** plutôt que de rester
 * un gabarit libre (cf. PROPAGATION-MAP.md, trou H1). Optionnel : la voie
 * read-side legacy (posts stockés sans contexte) retombe sur le gabarit nu.
 */
export interface PostBrandVoice {
  /** Personnalité de la voix de marque — pilier D · `tonDeVoix.personnalite`. */
  voice?: string | null;
  /** Lexique de marque — pilier D · `assetsLinguistiques.lexique`. */
  lexique?: string[];
}

/** Caption draft déterministe depuis les champs éditoriaux d'un post. Pure. */
export function derivePostCaption(
  p: Pick<ContentPost, "platform" | "theme" | "angle" | "hashtags">,
  brand: PostBrandVoice = {},
): string {
  const hook = p.theme ?? p.angle ?? POST_COPY.fallbackHook;
  const angle = p.angle && p.angle !== p.theme ? p.angle : null;
  const head = angle ? `${hook} — ${angle}` : hook;
  // Accent lexical de marque (pilier D) → la caption remonte à l'ADVE(d).
  const lex = brand.lexique?.[0];
  const accent = lex ? ` ${lex}.` : "";
  const tags = p.hashtags.length > 0 ? `\n\n${p.hashtags.join(" ")}` : "";
  return `${head}.${accent}${tags}`;
}

/** Brief illustration déterministe depuis les champs éditoriaux d'un post. Pure. */
export function derivePostIllustration(
  p: Pick<ContentPost, "platform" | "theme" | "angle" | "format">,
  brand: PostBrandVoice = {},
): string {
  const subject = p.theme ?? p.angle ?? POST_COPY.fallbackSubject;
  const fmt = p.format ?? POST_COPY.fallbackFormat;
  const angle = p.angle && p.angle !== p.theme ? ` ${POST_COPY.angleLabel} : ${p.angle}.` : "";
  // Ton de la voix de marque (pilier D) → le brief remonte à l'ADVE(d).
  const tone = brand.voice ? ` ${POST_COPY.toneLabel} : ${brand.voice}.` : "";
  return `Visuel ${fmt} pour ${p.platform} — ${subject}.${angle} ${POST_COPY.visualDirective} ${subject}.${tone}`;
}

/** Parse the `content-calendar-strategist` output. Returns null if no content. */
export function parseContentCalendar(raw: unknown): ContentCalendar | null {
  if (!isRecord(raw)) return null;

  const cadenceRaw = isRecord(raw.cadenceParCanal) ? raw.cadenceParCanal : {};
  const cadenceParCanal: Record<string, ContentCadenceChannel> = {};
  for (const [canal, v] of Object.entries(cadenceRaw)) {
    if (!isRecord(v)) continue;
    cadenceParCanal[canal] = {
      rythme: strOrNull(v.rythme),
      piliers: strArr(v.piliers),
      formats: strArr(v.formats),
      format: strOrNull(v.format),
    };
  }

  const themesRaw = Array.isArray(raw.themesParPhaseOverton) ? raw.themesParPhaseOverton : [];
  const themesParPhaseOverton: ContentCalendarPhase[] = themesRaw
    .filter(isRecord)
    .map((t) => ({ phase: str(t.phase), contenus: strArr(t.contenus) }));

  const hashtagsRaw = isRecord(raw.hashtags) ? raw.hashtags : {};
  const hashtags = { signature: strArr(hashtagsRaw.signature), local: strArr(hashtagsRaw.local) };
  const doNot = strArr(raw.doNot);

  const hasAny =
    Object.keys(cadenceParCanal).length > 0 ||
    themesParPhaseOverton.length > 0 ||
    hashtags.signature.length > 0 ||
    hashtags.local.length > 0 ||
    doNot.length > 0;
  if (!hasAny) return null;

  const postsRaw = Array.isArray(raw.posts) ? raw.posts : [];
  const posts: ContentPost[] = postsRaw.filter(isRecord).map((p) => {
    const base = {
      date: str(p.date),
      weekday: str(p.weekday),
      week: strOrNull(p.week),
      platform: str(p.platform) || "Plateforme",
      format: strOrNull(p.format),
      theme: strOrNull(p.theme),
      angle: strOrNull(p.angle),
      hashtags: strArr(p.hashtags),
      status: str(p.status) || "PLANIFIE",
    };
    // Caption + illustration : valeur stockée si présente, sinon dérivée
    // déterministe (rend les posts stockés sans copy consultables read-side).
    return {
      ...base,
      caption: strOrNull(p.caption) ?? derivePostCaption(base),
      illustration: strOrNull(p.illustration) ?? derivePostIllustration(base),
    };
  }).filter((p) => p.date);

  return { brand: str(raw.brand) || "Marque", cadenceParCanal, themesParPhaseOverton, hashtags, doNot, posts };
}

// ─── Dated posts derivation (pure, deterministic) ────────────────────────────

const WEEKDAYS_FR = ["dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"];
// Weekday offsets (0=Mon..6=Sun) for N posts/week — spreads posts sensibly.
const WEEKDAY_SPREAD: Record<number, number[]> = {
  1: [3],
  2: [1, 4],
  3: [0, 2, 4],
  4: [0, 1, 3, 4],
  5: [0, 1, 2, 3, 4],
  6: [0, 1, 2, 3, 4, 5],
  7: [0, 1, 2, 3, 4, 5, 6],
};

/** Extract a posts-per-week integer from a free-text cadence ("4-5 posts/sem" → 4). */
export function parsePerWeek(rythme: string | null): number {
  if (!rythme) return 0;
  const m = rythme.match(/\d+/);
  if (!m) return 0;
  const n = parseInt(m[0], 10);
  return Number.isFinite(n) ? Math.max(0, Math.min(7, n)) : 0;
}

function toISODate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Monday on/after the given date (week anchor). */
function mondayOnAfter(d: Date): Date {
  const r = new Date(d.getTime());
  const day = r.getUTCDay(); // 0=Sun..6=Sat
  const delta = day === 0 ? 1 : day === 1 ? 0 : 8 - day;
  r.setUTCDate(r.getUTCDate() + delta);
  return r;
}

/**
 * Derive a dated, post-by-post editorial calendar from the channel cadence.
 * Pure + deterministic for a given `(calendar, anchorISO, weeks, brand)`. Used
 * by the deterministic composer (stored, with `brand` voice from pillar D) and
 * read-side as a fallback when an output predates the posts[] field (no brand
 * context → bare derivation).
 */
export function deriveDatedPosts(
  calendar: Pick<ContentCalendar, "cadenceParCanal" | "themesParPhaseOverton" | "hashtags">,
  anchorISO: string | null,
  weeks = 4,
  brand: PostBrandVoice = {},
): ContentPost[] {
  const base = anchorISO ? new Date(`${anchorISO}T00:00:00Z`) : new Date();
  const anchor = mondayOnAfter(Number.isNaN(base.getTime()) ? new Date() : base);

  const themes: string[] = calendar.themesParPhaseOverton.flatMap((p) => p.contenus);
  const sig = calendar.hashtags.signature;
  const posts: ContentPost[] = [];

  for (const [platform, cadence] of Object.entries(calendar.cadenceParCanal)) {
    const n = parsePerWeek(cadence.rythme);
    if (n === 0) continue;
    const offsets = WEEKDAY_SPREAD[n] ?? WEEKDAY_SPREAD[4]!;
    const angles = [...cadence.piliers, ...cadence.formats];
    let seq = 0;
    for (let w = 0; w < weeks; w++) {
      for (const off of offsets) {
        const d = new Date(anchor.getTime());
        d.setUTCDate(d.getUTCDate() + w * 7 + off);
        const theme = themes.length ? themes[seq % themes.length]! : null;
        const angle = angles.length ? angles[seq % angles.length]! : cadence.format;
        const base = {
          date: toISODate(d),
          weekday: WEEKDAYS_FR[d.getUTCDay()]!,
          week: `S${w + 1}`,
          platform,
          format: cadence.format ?? (cadence.formats[0] ?? null),
          theme,
          angle: angle ?? null,
          hashtags: sig.slice(0, 3),
          status: "PLANIFIE",
        };
        posts.push({
          ...base,
          caption: derivePostCaption(base, brand),
          illustration: derivePostIllustration(base, brand),
        });
        seq++;
      }
    }
  }

  // Chronological order, platform-stable within a day.
  posts.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : a.platform.localeCompare(b.platform)));
  return posts;
}

// ─── Social naming (naming-generator) ────────────────────────────────────────

export interface SocialHandle {
  /** Humanised platform label (Instagram, TikTok, Domaine, X, …). */
  platform: string;
  /** Raw key as stored (instagram, tiktok, domain, …) — stable for ordering. */
  key: string;
  value: string;
  fallbacks: string[];
}

export interface SocialNaming {
  brandName: string | null;
  tagline: string | null;
  mascot: string | null;
  handleStrategy: string | null;
  rationale: string | null;
  handles: SocialHandle[];
  doNotName: string[];
  availabilityToVerify: string[];
}

const HANDLE_LABELS: Record<string, string> = {
  instagram: "Instagram",
  tiktok: "TikTok",
  facebook: "Facebook",
  x: "X (Twitter)",
  twitter: "X (Twitter)",
  whatsappCommunity: "WhatsApp Community",
  whatsapp: "WhatsApp",
  youtube: "YouTube",
  linkedin: "LinkedIn",
  domain: "Domaine",
  googlePlayTitle: "Google Play",
  appStoreTitle: "App Store",
};

const humanisePlatform = (key: string): string =>
  HANDLE_LABELS[key] ?? key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, " $1");

/** Parse the `naming-generator` output. Returns null if no handles + no name. */
export function parseSocialNaming(raw: unknown): SocialNaming | null {
  if (!isRecord(raw)) return null;

  const handlesRaw = isRecord(raw.handles) ? raw.handles : {};
  const fallbacksRaw = isRecord(raw.fallbacks) ? raw.fallbacks : {};
  const handles: SocialHandle[] = [];
  for (const [key, v] of Object.entries(handlesRaw)) {
    const value = str(v);
    if (!value) continue;
    handles.push({
      platform: humanisePlatform(key),
      key,
      value,
      fallbacks: strArr((fallbacksRaw as Record<string, unknown>)[key]),
    });
  }

  const brandName = strOrNull(raw.brandName);
  const tagline = strOrNull(raw.tagline);
  if (handles.length === 0 && !brandName && !tagline) return null;

  return {
    brandName,
    tagline,
    mascot: strOrNull(raw.mascot),
    handleStrategy: strOrNull(raw.handleStrategy) ?? strOrNull(raw.handleBaseline),
    rationale: strOrNull(raw.rationale),
    handles,
    doNotName: strArr(raw.doNotName),
    availabilityToVerify: strArr(raw.availabilityToVerify),
  };
}

// ─── Social copy (social-copy-engine) ────────────────────────────────────────

export interface SocialProfile {
  platform: string;
  handle: string | null;
  displayName: string | null;
  bio: string | null;
  about: string | null;
  category: string | null;
  link: string | null;
  pinned: string | null;
  contentAngle: string | null;
  priority: string | null;
  highlights: string[];
  channels: string[];
  keywords: string[];
  shortDescription: string | null;
  fullDescription: string | null;
}

export interface SocialCopy {
  brand: string | null;
  voice: string | null;
  market: string | null;
  handleBaseline: string | null;
  profiles: SocialProfile[];
  linkInBio: { recommendation: string | null; avoid: string | null } | null;
  doNot: string[];
}

/** Parse the `social-copy-engine` output. Returns null if no profiles + no voice. */
export function parseSocialCopy(raw: unknown): SocialCopy | null {
  if (!isRecord(raw)) return null;

  const profilesRaw = Array.isArray(raw.profiles) ? raw.profiles : [];
  const profiles: SocialProfile[] = profilesRaw.filter(isRecord).map((p) => ({
    platform: str(p.platform) || "Plateforme",
    handle: strOrNull(p.handle),
    displayName: strOrNull(p.displayName),
    bio: strOrNull(p.bio),
    about: strOrNull(p.about),
    category: strOrNull(p.category),
    link: strOrNull(p.link),
    pinned: strOrNull(p.pinned),
    contentAngle: strOrNull(p.contentAngle),
    priority: strOrNull(p.priority),
    highlights: strArr(p.highlights),
    channels: strArr(p.channels),
    keywords: strArr(p.keywords),
    shortDescription: strOrNull(p.shortDescription),
    fullDescription: strOrNull(p.fullDescription),
  }));

  const voice = strOrNull(raw.voice);
  if (profiles.length === 0 && !voice) return null;

  const linkInBioRaw = isRecord(raw.linkInBio) ? raw.linkInBio : null;
  const linkInBio = linkInBioRaw
    ? { recommendation: strOrNull(linkInBioRaw.recommendation), avoid: strOrNull(linkInBioRaw.avoid) }
    : null;

  return {
    brand: strOrNull(raw.brand),
    voice,
    market: strOrNull(raw.market),
    handleBaseline: strOrNull(raw.handleBaseline),
    profiles,
    linkInBio,
    doNot: strArr(raw.doNot),
  };
}
