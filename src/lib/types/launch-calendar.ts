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

export interface LaunchTimeline {
  brand: string;
  weeks: LaunchTimelineWeek[];
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

export interface ContentCalendar {
  brand: string;
  cadenceParCanal: Record<string, ContentCadenceChannel>;
  themesParPhaseOverton: ContentCalendarPhase[];
  hashtags: { signature: string[]; local: string[] };
  doNot: string[];
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
  return { brand: str(raw.brand) || "Marque", weeks };
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

  return { brand: str(raw.brand) || "Marque", cadenceParCanal, themesParPhaseOverton, hashtags, doNot };
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
