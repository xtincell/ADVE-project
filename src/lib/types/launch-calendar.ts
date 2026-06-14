/**
 * Launch calendar — pure types + defensive parsers for the two launch Glory
 * deliverables stored in `GloryOutput.output` (jsonb):
 *   - `launch-timeline-planner`     → retroplanning (weeks J-anchored)
 *   - `content-calendar-strategist` → editorial cadence per channel
 *
 * The cockpit launch-calendar surface reads these via `trpc.glory.launchCalendar`
 * instead of leaving them as dormant JSON in the vault. Parsers are pure and
 * tolerant — a missing/legacy shape yields `null`, never a throw.
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
