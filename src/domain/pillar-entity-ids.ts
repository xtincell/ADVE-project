import { acquireEntityIds, type IdentifiedEntry } from "./entity-ids";

type Blob = Record<string, unknown>;
const record = (v: unknown): v is Blob => v !== null && typeof v === "object" && !Array.isArray(v);
const entries = (v: unknown): v is IdentifiedEntry[] => Array.isArray(v) && v.every(record);

/** Apply only to a collection already accepted by the writer's authority guard. */
export function acquirePillarEntityIds(key: string, content: Blob, previous: Blob, allocate: () => string): Blob {
  const next = { ...content };
  const collection = (value: unknown, old: unknown, label: string): unknown => {
    if (!entries(value) || JSON.stringify(value) === JSON.stringify(old)) return value;
    const acquired = acquireEntityIds(value, entries(old) ? old : [], label, allocate);
    const ids = acquired.map(v => v.id);
    if (new Set(ids).size !== ids.length) throw new Error("ENTITY_ID_CONFLICT: plusieurs entrées portent le même identifiant.");
    return acquired;
  };
  const flat: Record<string, Array<[string, string]>> = {
    d: [["personas", "name"]],
    r: [["probabilityImpactMatrix", "risk"], ["overtonBlockers", "risk"]],
    t: [["hypothesisValidation", "hypothesis"]],
  };
  for (const [field, label] of flat[key] ?? []) {
    if (Object.hasOwn(content, field)) next[field] = collection(content[field], previous[field], label);
  }
  if (key === "i") {
    for (const field of ["catalogueParCanal", "actionsByDevotionLevel"]) {
      if (!record(content[field])) continue;
      const old = record(previous[field]) ? previous[field] : {};
      next[field] = Object.fromEntries(Object.entries(content[field]).map(([channel, value]) =>
        [channel, collection(value, old[channel], "action")]));
    }
    if (entries(content.actionsByOvertonPhase)) {
      const old = entries(previous.actionsByOvertonPhase) ? previous.actionsByOvertonPhase : [];
      next.actionsByOvertonPhase = content.actionsByOvertonPhase.map(phase => {
        if (!Object.hasOwn(phase, "actions")) return phase;
        const matches = old.filter(v => v.phase === phase.phase && typeof phase.phase === "string");
        return { ...phase, actions: collection(phase.actions, matches.length === 1 ? matches[0]!.actions : undefined, "action") };
      });
    }
  }
  return next;
}
