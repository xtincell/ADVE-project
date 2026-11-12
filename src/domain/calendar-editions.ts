/** The active planning is owned by Glory. Dated source editions remain consultable
 * without changing which calendar a launch or publication command uses. */
export const ACTIVE_CALENDAR_TOOL = "content-calendar-strategist";
export const HISTORICAL_CALENDAR_TOOL = "editorial-calendar-edition";
export const CALENDAR_TOOLS = [ACTIVE_CALENDAR_TOOL, HISTORICAL_CALENDAR_TOOL];

function object(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

/** match only stored, documented copy, never a projection or generated fallback */
export function exactEditorialPostKey(value: unknown) {
  const row = object(value);
  if (![row.date, row.platform, row.format, row.caption].every(v => typeof v === "string" && v.trim())) return null;
  return JSON.stringify([row.date, String(row.platform).trim().toLowerCase(), String(row.format).trim().toLowerCase(), row.caption]);
}

export function linkUniqueSourcePost(active: unknown[], index: number, source: unknown[]) {
  const key = exactEditorialPostKey(active[index]);
  if (!key || active.filter(row => exactEditorialPostKey(row) === key).length !== 1) return null;
  const matches = source.filter(row => exactEditorialPostKey(row) === key);
  return matches.length === 1 ? object(matches[0]) : null;
}

export function calendarPosts(output: unknown): unknown[] {
  const posts = object(output).posts;
  return Array.isArray(posts) ? posts : [];
}
