/** Shared identity acquisition for existing JSON collections. No fuzzy or positional matching. */
export interface IdentifiedEntry { id?: unknown; [key: string]: unknown }

const identity = (entry: IdentifiedEntry): string | undefined =>
  typeof entry.id === "string" && entry.id.trim() ? entry.id : undefined;

export function acquireEntityIds<T extends IdentifiedEntry>(
  entries: readonly T[], previous: readonly IdentifiedEntry[], labelField: string,
  allocate: (entry: T, attempt: number) => string,
): T[] {
  const claimed = new Set(entries.flatMap(entry => identity(entry) ? [identity(entry)!] : []));
  const recovered = entries.map(entry => {
    if (identity(entry)) return entry;
    const label = entry[labelField];
    if (typeof label !== "string" || !label.trim()) return entry;
    const matches = previous.filter(old => old[labelField] === label);
    const oldId = matches.length === 1 ? identity(matches[0]!) : undefined;
    if (!oldId || claimed.has(oldId) || entries.filter(next => next[labelField] === label).length !== 1) return entry;
    claimed.add(oldId);
    return { ...entry, id: oldId };
  });
  // A retired identity never becomes the identity of a new homonym.
  const used = new Set([...previous, ...recovered].flatMap(entry => identity(entry) ? [identity(entry)!] : []));
  return recovered.map(entry => {
    if (identity(entry)) return entry;
    let attempt = 0, id: string;
    const tried = new Set<string>();
    do {
      id = allocate(entry, attempt++);
      if (!id.trim() || tried.has(id)) throw new Error("ENTITY_ID_ALLOCATION_FAILED");
      tried.add(id);
    } while (used.has(id));
    used.add(id);
    return { ...entry, id };
  });
}
