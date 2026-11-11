/**
 * DataCollector receipt, schema `datacollector/observation-receipt` v1 (DC3 Shinkiro).
 *
 * The local collector exports a self-proving JSON receipt: named, versioned
 * schema, collection identity, target, tool and version, one row per measure
 * (source, state, value or absence, observation time) and a SHA-256 fingerprint
 * of its RFC 8785 canonical content. Deposited without any deployed collector
 * service, it is verified here, then mapped to the EXISTING ADR-0146 admission
 * contract (`INGEST_EXTERNAL_METRIC`, provenance-only cells). No score, no
 * pillar, no interpretation: an absent value stays an unobserved measure.
 */
import { createHash, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { IngestSchema, type IngestPayload, type UnobservedMetric } from "./external-metric";

export const DATACOLLECTOR_RECEIPT_SCHEMA = { name: "datacollector/observation-receipt", version: 1 } as const;
export const DATACOLLECTOR_SOURCES = ["web_performance", "community_sentiment", "search_visibility", "competitor_social_spy"] as const;

/** RFC 8785 canonical JSON: sorted keys (UTF-16 units), ECMAScript numbers, no whitespace. */
export function canonicalJson(value: unknown): string {
  if (value === null) return "null";
  switch (typeof value) {
    case "boolean":
    case "string":
      return JSON.stringify(value);
    case "number":
      if (!Number.isFinite(value)) throw new TypeError("Nombre non fini : aucune forme JSON.");
      return JSON.stringify(value);
    case "object": {
      if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
      const record = value as Record<string, unknown>;
      return `{${Object.keys(record).sort().map((key) => `${JSON.stringify(key)}:${canonicalJson(record[key])}`).join(",")}}`;
    }
    default:
      throw new TypeError(`Valeur sans forme JSON : ${typeof value}.`);
  }
}

/** SHA-256 of the receipt without its `fingerprint` key, as the collector seals it. */
export function datacollectorReceiptFingerprint(receipt: Record<string, unknown>): string {
  const { fingerprint: _sealed, ...content } = receipt;
  return createHash("sha256").update(canonicalJson(content), "utf8").digest("hex");
}

const ObservationTime = z.iso.datetime({ offset: true });
const Text = (max: number) => z.string().trim().min(1).max(max);
const NullableText = (max: number) => z.string().max(max).nullable();

const MeasureSchema = z.object({
  source: z.enum(DATACOLLECTOR_SOURCES),
  metric: z.string().regex(/^[a-z][a-z0-9_]{0,63}$/),
  // The collector bounds texts to 500 code points; UTF-16 can count up to twice that.
  subject: Text(1000).nullable(),
  state: z.enum(["received", "failed", "not_requested"]),
  value: z.number().finite().nullable(),
  unit: z.enum(["score_0_100", "count", "rank"]),
  observed_at: ObservationTime.nullable(),
  error_code: z.string().regex(/^[A-Z][A-Z0-9_]{0,63}$/).nullable(),
  detail: Text(1000).nullable(),
}).strict().superRefine((m, ctx) => {
  if (m.state !== "received" && (m.value !== null || m.observed_at !== null)) {
    ctx.addIssue({ code: "custom", message: "Une mesure non reçue ne porte ni valeur ni date d'observation." });
  }
  if (m.state !== "failed" && m.error_code !== null) {
    ctx.addIssue({ code: "custom", message: "Seule une mesure en échec porte un code d'erreur." });
  }
});
type Measure = z.infer<typeof MeasureSchema>;

const ScopeSchema = z.object({
  target_url: Text(2048),
  subreddit: NullableText(500).optional(),
  keyword: NullableText(500).optional(),
  competitor_url: NullableText(2048).optional(),
  my_domain: NullableText(500).optional(),
  requested_sources: z.array(z.enum(DATACOLLECTOR_SOURCES)).min(1).max(DATACOLLECTOR_SOURCES.length),
}).strict();

const ReceiptV1 = z.object({
  schema: z.object({ name: z.literal(DATACOLLECTOR_RECEIPT_SCHEMA.name), version: z.literal(DATACOLLECTOR_RECEIPT_SCHEMA.version) }).strict(),
  batch_id: z.string().regex(/^\d{8}_[0-9a-f]{32}$/),
  timestamp: ObservationTime,
  target_entity: Text(200),
  target: z.object({ entity: Text(200), url: z.url().max(2048).refine((v) => ["http:", "https:"].includes(new URL(v).protocol)) }).strict(),
  tool: z.object({ name: z.literal("datacollector"), version: z.string().regex(/^\d+\.\d+\.\d+$/) }).strict(),
  collector_version: z.string().regex(/^\d+\.\d+\.\d+$/),
  scope: ScopeSchema,
  collection_summary: z.object({
    received: z.number().int().nonnegative(), expected: z.number().int().nonnegative(),
    state: z.enum(["COMPLETE", "PARTIAL", "FAILED"]),
  }).strict(),
  measures: z.array(MeasureSchema).min(1).max(100),
  /** Raw collector answers: covered by the fingerprint, never admitted as such. */
  data: z.record(z.string(), z.unknown()),
  fingerprint: z.object({
    algorithm: z.literal("sha256"), canonicalization: z.literal("RFC8785"),
    value: z.string().regex(/^[a-f0-9]{64}$/),
  }).strict(),
}).strict();
export type DatacollectorReceipt = z.infer<typeof ReceiptV1>;

export type ReceiptRefusalCode =
  | "RECEIPT_NOT_OBJECT"
  | "RECEIPT_LEGACY_UNVERIFIABLE"
  | "RECEIPT_SCHEMA_UNSUPPORTED"
  | "RECEIPT_INVALID"
  | "RECEIPT_NOT_CANONICAL"
  | "RECEIPT_FINGERPRINT_MISMATCH"
  | "RECEIPT_INCONSISTENT";
export type ReceiptReading =
  | { ok: true; receipt: DatacollectorReceipt }
  | { ok: false; code: ReceiptRefusalCode; detail: string; issues?: Array<{ path: PropertyKey[]; message: string }> };

function refuse(code: ReceiptRefusalCode, detail: string, issues?: Array<{ path: PropertyKey[]; message: string }>): ReceiptReading {
  return { ok: false, code, detail, ...(issues ? { issues } : {}) };
}

/** Internal coherence that a re-sealed hand edit could otherwise break silently. */
function inconsistency(r: DatacollectorReceipt): string | null {
  if (r.target.entity !== r.target_entity) return "target.entity diffère de target_entity.";
  if (r.tool.version !== r.collector_version) return "tool.version diffère de collector_version.";
  if (r.target.url !== r.scope.target_url) return "target.url diffère de scope.target_url.";
  if (new Set(r.scope.requested_sources).size !== r.scope.requested_sources.length) return "Source demandée en double.";
  const seen = new Set<string>();
  const requested = new Set<string>(r.scope.requested_sources);
  const receivedSources = new Set<string>();
  const receiptTime = new Date(r.timestamp).getTime();
  for (const m of r.measures) {
    const key = `${m.source}.${m.metric}`;
    if (seen.has(key)) return `Mesure en double : ${key}.`;
    seen.add(key);
    if (!requested.has(m.source) && m.state !== "not_requested") return `${key} : source non demandée mais état ${m.state}.`;
    if (m.state === "received") receivedSources.add(m.source);
    if (m.observed_at && new Date(m.observed_at).getTime() > receiptTime) return `${key} : observation postérieure au reçu.`;
  }
  const { received, expected, state } = r.collection_summary;
  if (expected !== requested.size) return "collection_summary.expected diffère des sources demandées.";
  if (received !== receivedSources.size) return "collection_summary.received diffère des sources reçues.";
  const derived = expected > 0 && received === expected ? "COMPLETE" : received > 0 ? "PARTIAL" : "FAILED";
  if (state !== derived) return `collection_summary.state ${state} au lieu de ${derived}.`;
  return null;
}

/** Strict reading: schema, envelope, fingerprint, coherence. Never throws. */
export function readDatacollectorReceipt(raw: unknown): ReceiptReading {
  if (raw === null || typeof raw !== "object" || Array.isArray(raw)) return refuse("RECEIPT_NOT_OBJECT", "Le reçu doit être un objet JSON.");
  const record = raw as Record<string, unknown>;
  if (!("schema" in record)) {
    return "batch_id" in record && "data" in record
      ? refuse("RECEIPT_LEGACY_UNVERIFIABLE", "Reçu DataCollector 1.0.x : sans empreinte ni mesures. Relancer la collecte avec DataCollector 1.1.0 ou plus.")
      : refuse("RECEIPT_SCHEMA_UNSUPPORTED", "Aucun schéma déclaré.");
  }
  const schema = record.schema as Record<string, unknown> | null;
  if (!schema || schema.name !== DATACOLLECTOR_RECEIPT_SCHEMA.name || schema.version !== DATACOLLECTOR_RECEIPT_SCHEMA.version) {
    return refuse("RECEIPT_SCHEMA_UNSUPPORTED", `Schéma attendu : ${DATACOLLECTOR_RECEIPT_SCHEMA.name} version ${DATACOLLECTOR_RECEIPT_SCHEMA.version}.`);
  }
  const parsed = ReceiptV1.safeParse(raw);
  if (!parsed.success) {
    return refuse("RECEIPT_INVALID", "Enveloppe hors du schéma 1.", parsed.error.issues.map((i) => ({ path: i.path, message: i.message })));
  }
  let expected: string;
  try { expected = datacollectorReceiptFingerprint(record); } catch (error) {
    return refuse("RECEIPT_NOT_CANONICAL", error instanceof Error ? error.message : "Contenu sans forme canonique.");
  }
  const declared = parsed.data.fingerprint.value;
  if (!timingSafeEqual(Buffer.from(expected, "hex"), Buffer.from(declared, "hex"))) {
    return refuse("RECEIPT_FINGERPRINT_MISMATCH", "Le contenu ne correspond plus à son empreinte.");
  }
  const incoherent = inconsistency(parsed.data);
  if (incoherent) return refuse("RECEIPT_INCONSISTENT", incoherent);
  return { ok: true, receipt: parsed.data };
}

function provenance(m: Measure) {
  return {
    source: m.source,
    ...(m.subject !== null ? { subject: m.subject } : {}),
    unit: m.unit,
    ...(m.observed_at !== null ? { observedAt: m.observed_at } : {}),
  };
}

/**
 * Verified receipt → existing ADR-0146 payload. Received values become
 * provenance-only cells (no stage, no KPI target); every other measure stays an
 * explicit absence. Identity is the collection id, the fingerprint is retained.
 */
export function datacollectorReceiptToIngest(strategyId: string, r: DatacollectorReceipt): IngestPayload {
  const metrics: IngestPayload["metrics"] = [];
  const unobserved: UnobservedMetric[] = [];
  for (const m of r.measures) {
    if (m.state === "received" && m.value !== null) {
      metrics.push({ metric: m.metric, value: m.value, ...provenance(m), ...(m.detail !== null ? { note: m.detail } : {}) });
    } else {
      unobserved.push({
        metric: m.metric,
        state: m.state === "received" ? "NOT_PUBLISHED" : m.state === "failed" ? "FAILED" : "NOT_REQUESTED",
        ...(m.error_code !== null ? { errorCode: m.error_code } : {}),
        ...provenance(m),
        ...(m.detail !== null ? { note: m.detail } : {}),
      });
    }
  }
  return IngestSchema.parse({
    strategyId,
    sourceType: "COLLECTOR",
    sourceLabel: `DataCollector ${r.tool.version} · ${r.target.entity}`.slice(0, 120),
    observationId: `datacollector:${r.batch_id}`,
    sourceVersion: `${r.tool.name}/${r.tool.version} · ${r.schema.name}@${r.schema.version}`,
    observedAt: r.timestamp,
    sourceDigest: r.fingerprint.value,
    metrics,
    ...(unobserved.length ? { unobserved } : {}),
  });
}


/** Deposit body accepted by the existing `/api/ingest/metrics` route. */
export const DatacollectorDepositSchema = z.object({
  strategyId: z.string().min(1).max(60),
  receipt: z.unknown(),
}).strict();
