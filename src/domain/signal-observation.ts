/**
 * Observation factuelle partagée par la Gazette et son analyse explicitement demandée.
 * Une variation du score calculé ne démontre pas un résultat commercial.
 */
import { PILLAR_STORAGE_KEYS } from "./pillars";
import { metricObservationTime } from "./external-metric";
export function signalObservation(signal: { type: string; data: unknown }): { title: string; observation: string } {
  const data = record(signal.data);
  const text = (value: unknown) => typeof value === "string" ? value.trim() : "";
  const title = text(data.title) || text(data.thesis);
  const observation = [data.content, data.thesis, data.brandImpact, data.recommendedAction]
    .map(text).filter(Boolean).join("\n\n");
  if (signal.type === "EXTERNAL_METRIC") {
    // Cell provenance (source, observed object, own date) is shown when the producer sent it.
    const cellOrigin = (cell: Record<string, unknown>) => {
      const parts = [text(cell.source), text(cell.subject), text(cell.observedAt) ? `observée le ${text(cell.observedAt)}` : ""].filter(Boolean);
      return parts.length ? ` — ${parts.join(" · ")}` : "";
    };
    const note = (cell: Record<string, unknown>) => text(cell.note) ? ` ${text(cell.note)}` : "";
    const cells = (Array.isArray(data.metrics) ? data.metrics : []).map(record)
      .filter((cell) => typeof cell.metric === "string" && typeof cell.value === "number" && Number.isFinite(cell.value))
      .map((cell) => `${cell.metric} : ${cell.value}${typeof cell.target === "number" && Number.isFinite(cell.target) ? ` (objectif : ${cell.target})` : ""}${cellOrigin(cell)}.${note(cell)}`);
    const ABSENCE: Record<string, string> = { NOT_PUBLISHED: "valeur non publiée", FAILED: "échec de la source", NOT_REQUESTED: "non demandée" };
    // A declared measure without a value is rendered as such, never as zero.
    const absences = (Array.isArray(data.unobserved) ? data.unobserved : []).map(record)
      .filter((cell) => typeof cell.metric === "string" && typeof cell.state === "string" && cell.state in ABSENCE)
      .map((cell) => `${cell.metric} : ${ABSENCE[cell.state as string]}${text(cell.errorCode) ? ` (${text(cell.errorCode)})` : ""}${cellOrigin(cell)}.${note(cell)}`);
    const date = metricObservationTime(data);
    const origin = text(data.sourceLabel) || text(data.sourceType) || "Source inconnue";
    const receipt = [
      `Source : ${origin}.`,
      text(data.sourceVersion) ? `Version : ${text(data.sourceVersion)}.` : "Version de source inconnue.",
      date ? `Observation : ${date.toISOString()}.` : "Date d'observation inconnue.",
      text(data.observationId) ? `Référence : ${text(data.observationId)}.` : "Référence de source inconnue.",
      ...(text(data.sourceDigest) ? [`Empreinte du reçu (SHA-256) : ${text(data.sourceDigest)}.`] : []),
      ...cells,
      ...absences,
    ];
    return { title: title || `Mesures reçues · ${origin}`, observation: [observation, ...receipt].filter(Boolean).join("\n") };
  }
  if (signal.type !== "SCORE_DECLINE" && signal.type !== "SCORE_IMPROVEMENT") {
    return { title: title || `Signal ${signal.type}`, observation: [text(data.title), observation].filter(Boolean).join("\n\n") };
  }

  const lines: string[] = [];
  for (const raw of Array.isArray(data.changedPillars) ? data.changedPillars : []) {
    const item = record(raw);
    if (typeof item.key !== "string" || !PILLAR_STORAGE_KEYS.some((key) => key === item.key)) continue;
    if (!score(item.prev, 25) || !score(item.curr, 25)) continue;
    lines.push(`${item.key.toUpperCase()} : ${item.prev}/25 → ${item.curr}/25.`);
  }
  const composite = record(data.compositeDelta);
  if (score(composite.previous, 200) && score(composite.current, 200)) {
    lines.push(`Total calculé : ${composite.previous}/200 → ${composite.current}/200.`);
  }
  const subject = data.scoredType === "campaign" ? "la campagne"
    : data.scoredType === "mission" ? "la mission" : "la marque";
  const observed = lines.length
    ? `Variation du score calculé de ${subject}. Ce constat ne démontre ni une cause ni un résultat commercial.\n${lines.join("\n")}`
    : "";
  return {
    title: title || (signal.type === "SCORE_DECLINE" ? "Baisse du score calculé" : "Progression du score calculé"),
    observation: [observation, observed].filter(Boolean).join("\n\n"),
  };
}

function record(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}
function score(value: unknown, maximum: number): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= maximum;
}
