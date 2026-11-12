/**
 * Réception d'un bilan de campagne arrêté dans La Barre (ADR-0244, point LB4).
 *
 * Réceptacle existant : les sources de la marque (`BrandDataSource`) et leur
 * lignée documentaire (`_document`, ADR-0223). Chaque version transmise devient
 * une édition PROPOSED de type « Bilan de campagne » : une preuve à relire,
 * jamais une décision de marque. Aucun pilier n'est écrit, aucune analyse n'est
 * lancée (l'indexation et la préparation restent des gestes explicites).
 *
 * Identité : `origin = barre:<instance>:bilan:<identité>:v<version>`. Un rejeu
 * à la même empreinte rend le reçu existant ; une autre empreinte sous la même
 * version, une version plus ancienne que la dernière reçue ou une chaîne
 * d'empreintes rompue sont refusés, sans effet.
 */
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import type { Intent, IntentResult } from "@/server/services/mestor/intents";
import {
  BarreCampaignReviewSchema, barreCampaignReviewDigest, type BarreCampaignReview,
} from "@/domain/barre-campaign-review";
import { documentEdition, type DocumentEdition } from "@/domain/source-document";
import { canAccessStrategy, getOperatorContext } from "@/server/services/operator-isolation";
import { assertCollaboratorMayEmit, CollaboratorWriteVetoError } from "@/server/governance/collaborator-firewall";
import { registerDocumentEdition } from "./document-versions";
import { sourceFingerprint } from "./source-usage";
import { barreAttestationVerifier } from "@/server/services/brand-node/barre-attestation";

type ReviewIntent = Extract<Intent, { kind: "INGEST_BARRE_CAMPAIGN_REVIEW" }>;
type HandlerResult = Omit<IntentResult, "intentKind" | "strategyId" | "startedAt" | "completedAt">;

export const BARRE_REVIEW_RECEIPT_SCHEMA = "barre-campaign-review-receipt-v1";

export type BarreReviewIntakeRefusal =
  | "REVIEW_INVALID" | "REVIEW_DIGEST_INVALID" | "ACCESS_DENIED" | "STRATEGY_UNAVAILABLE"
  | "REVIEW_VERSION_CONFLICT" | "REVIEW_VERSION_STALE" | "REVIEW_CHAIN_MISMATCH"
  | "REVIEW_FAMILY_TAKEN" | "REVIEW_RECEIPT_UNREADABLE" | "REVIEW_LINEAGE_CHANGED" | "REVIEW_ATTESTATION_INVALID";

/** Message rendu tel quel à La Barre ; le code reste la clé stable. */
export const BARRE_REVIEW_INTAKE_REFUSALS: Record<BarreReviewIntakeRefusal, { status: number; message: string }> = {
  REVIEW_INVALID: { status: 422, message: "Cette version du bilan n’a pas la forme attendue." },
  REVIEW_DIGEST_INVALID: { status: 422, message: "Le bilan ne correspond plus à son empreinte." },
  ACCESS_DENIED: { status: 403, message: "Vous ne pouvez pas ajouter de document au dossier de cette marque." },
  STRATEGY_UNAVAILABLE: { status: 409, message: "Le dossier de cette marque est archivé ; le bilan n’y est pas rangé." },
  REVIEW_VERSION_CONFLICT: { status: 409, message: "Cette version du bilan a déjà été reçue avec un autre contenu. Arrêtez une nouvelle version dans La Barre." },
  REVIEW_VERSION_STALE: { status: 409, message: "Une version plus récente de ce bilan est déjà reçue ; celle-ci n’est pas rangée après elle." },
  REVIEW_CHAIN_MISMATCH: { status: 409, message: "Cette version ne prolonge pas la dernière version reçue : leurs empreintes ne se suivent pas." },
  REVIEW_FAMILY_TAKEN: { status: 409, message: "Une autre lignée de documents porte déjà le nom de ce bilan dans ce dossier. Renommez-la avant de transmettre." },
  REVIEW_RECEIPT_UNREADABLE: { status: 409, message: "Une réception antérieure de ce bilan est illisible ; elle reste conservée et doit être examinée avant d’en ajouter une autre." },
  REVIEW_LINEAGE_CHANGED: { status: 409, message: "Les documents de ce bilan ont changé pendant la réception. Transmettez de nouveau." },
  REVIEW_ATTESTATION_INVALID: { status: 422, message: "L’attestation de cette version n’a pas été posée par La Fusée sur ce contenu." },
};

class ReviewRefusal extends Error {
  constructor(public readonly code: BarreReviewIntakeRefusal) { super(code); this.name = "ReviewRefusal"; }
}

function refused(code: BarreReviewIntakeRefusal): HandlerResult {
  return { status: "VETOED", reason: code, summary: BARRE_REVIEW_INTAKE_REFUSALS[code].message };
}

const ReceiptSchema = {
  read(rawData: unknown): { version: number; empreinte: string; id: string } | null {
    const receipt = rawData && typeof rawData === "object" && !Array.isArray(rawData)
      ? (rawData as Record<string, unknown>)._barreReview : null;
    const review = receipt && typeof receipt === "object" ? (receipt as Record<string, unknown>).review : null;
    const parsed = BarreCampaignReviewSchema.safeParse(review);
    return parsed.success ? { version: parsed.data.version, empreinte: parsed.data.empreinte, id: parsed.data.id } : null;
  },
};

export function barreReviewOrigin(instance: string, reviewId: string, version?: number) {
  return `barre:${instance}:bilan:${reviewId}:v${version ?? ""}`;
}

function familyCandidates(review: BarreCampaignReview) {
  const name = (review.campagne.nom ?? "").trim() || review.campagne.id;
  return [`Bilan de campagne — ${name}`, `Bilan de campagne — ${name} · ${review.campagne.id}`]
    .map((family) => family.length > 180 ? family.slice(0, 179) + "…" : family);
}

export interface BarreReviewOutcome {
  sourceId: string;
  edition: number;
  version: number;
  family: string;
  alreadyReceived: boolean;
  receivedAt: string;
}

export async function ingestBarreCampaignReview(intent: ReviewIntent): Promise<HandlerResult> {
  // The bus may carry any payload: the version is validated and resealed here.
  const parsed = BarreCampaignReviewSchema.safeParse(intent.review);
  if (!parsed.success) return refused("REVIEW_INVALID");
  const review = parsed.data;
  if (barreCampaignReviewDigest(intent.review as unknown as Record<string, unknown>) !== review.empreinte) {
    return refused("REVIEW_DIGEST_INVALID");
  }
  // Une attestation présente est revérifiée ici aussi : le bus peut porter n'importe quoi.
  if (review.attestation && !barreAttestationVerifier(intent.instance)(intent.review as unknown as Record<string, unknown>)) {
    return refused("REVIEW_ATTESTATION_INVALID");
  }
  const strategyId = intent.strategyId;
  const prefix = barreReviewOrigin(intent.instance, review.id);
  const origin = barreReviewOrigin(intent.instance, review.id, review.version);
  try {
    const outcome = await db.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`barre-review:${strategyId}:${prefix}`}))`;
      const actor = await getOperatorContext(intent.operatorId, tx);
      if (!await canAccessStrategy(strategyId, actor, tx)) throw new ReviewRefusal("ACCESS_DENIED");
      try {
        await assertCollaboratorMayEmit({ userId: actor.userId, role: actor.role, strategyId, kind: intent.kind }, tx);
      } catch (error) {
        if (error instanceof CollaboratorWriteVetoError) throw new ReviewRefusal("ACCESS_DENIED");
        throw error;
      }
      const strategy = await tx.strategy.findUnique({ where: { id: strategyId }, select: { status: true, archivedAt: true } });
      if (!strategy || strategy.archivedAt || ["ARCHIVED", "DELETED"].includes(strategy.status)) throw new ReviewRefusal("STRATEGY_UNAVAILABLE");

      // LIKE treats `_` and `%` as wildcards, and another identity may extend this
      // one: only `<prefix><number>` belongs to this lineage.
      const received = (await tx.brandDataSource.findMany({
        where: { strategyId, origin: { startsWith: prefix } }, orderBy: { createdAt: "asc" },
      })).filter((row) => row.origin?.startsWith(prefix) && /^\d+$/.test(row.origin.slice(prefix.length)));
      const lineage = received.map((row) => ({ row, receipt: ReceiptSchema.read(row.rawData), document: documentEdition(row.rawData) }));
      if (lineage.some((x) => !x.receipt || x.receipt.id !== review.id || x.row.origin !== prefix + x.receipt.version || !x.document)) {
        throw new ReviewRefusal("REVIEW_RECEIPT_UNREADABLE");
      }
      const same = lineage.find((x) => x.row.origin === origin);
      if (same) {
        if (same.receipt!.empreinte !== review.empreinte) throw new ReviewRefusal("REVIEW_VERSION_CONFLICT");
        return { sourceId: same.row.id, edition: same.document!.edition, version: review.version, family: same.document!.family,
          alreadyReceived: true, receivedAt: same.row.createdAt.toISOString() } satisfies BarreReviewOutcome;
      }
      const last = lineage.reduce<(typeof lineage)[number] | null>((best, x) => !best || x.receipt!.version > best.receipt!.version ? x : best, null);
      if (last && last.receipt!.version > review.version) throw new ReviewRefusal("REVIEW_VERSION_STALE");
      if (last && last.receipt!.version === review.version - 1 && review.precedente !== last.receipt!.empreinte) {
        throw new ReviewRefusal("REVIEW_CHAIN_MISMATCH");
      }
      const families = new Set(lineage.map((x) => x.document!.family));
      if (families.size > 1) throw new ReviewRefusal("REVIEW_RECEIPT_UNREADABLE");
      let family = [...families][0];
      if (!family) {
        // A homonymous lineage from another source is never joined silently.
        for (const candidate of familyCandidates(review)) {
          const taken = await tx.brandDataSource.count({ where: { strategyId, rawData: { path: ["_document", "family"], equals: candidate } } });
          if (!taken) { family = candidate; break; }
        }
        if (!family) throw new ReviewRefusal("REVIEW_FAMILY_TAKEN");
      }
      const receivedAt = new Date();
      const source = await tx.brandDataSource.create({ data: {
        strategyId, sourceType: "MANUAL_INPUT", fileType: "TXT", origin, certainty: "DECLARED",
        fileName: `${family} — version ${review.version}`.slice(0, 250),
        rawContent: review.contenu, processingStatus: "EXTRACTED",
        extractedFields: { wordCount: review.contenu.trim().split(/\s+/).length } as Prisma.InputJsonValue,
        rawData: { _barreReview: {
          schema: BARRE_REVIEW_RECEIPT_SCHEMA, instance: intent.instance, sourceRevision: intent.sourceRevision,
          receivedAt: receivedAt.toISOString(), receivedBy: intent.operatorId, unlinkedBrands: intent.unlinkedBrands,
          review: intent.review,
        } } as Prisma.InputJsonValue,
      } });
      // The latest edition of the lineage, whatever its received version.
      const familyRows = (await tx.brandDataSource.findMany({ where: { strategyId, rawData: { path: ["_document", "family"], equals: family } } }))
        .flatMap((row) => { const doc = documentEdition(row.rawData); return doc && doc.family === family && !doc.beforeSourceId ? [{ row, doc }] : []; });
      if (familyRows.some((x) => !x.row.origin?.startsWith(prefix))) throw new ReviewRefusal("REVIEW_FAMILY_TAKEN");
      const latest = familyRows.sort((a, b) => b.doc.edition - a.doc.edition)[0];
      const changeSummary = review.note
        ?? `Version ${review.version} arrêtée dans La Barre le ${review.arrete_le.slice(0, 10)}.`;
      let updated;
      try {
        updated = await registerDocumentEdition(tx, { id: source.id, expectedSourceHash: sourceFingerprint(source), document: {
          family, kind: "CAMPAIGN_REVIEW", label: `Bilan de campagne · version ${review.version}`, status: "PROPOSED",
          changeSummary: changeSummary.slice(0, 4000),
          sourceRevision: `la-barre:${intent.instance}:${review.id}:v${review.version}:${review.empreinte}`.slice(0, 300),
          ...(latest ? { previous: { sourceId: latest.row.id, contentHash: sourceFingerprint(latest.row) } } : {}),
        } });
      } catch (error) {
        if (error instanceof Error && error.message.startsWith("SOURCE_CHANGED")) throw new ReviewRefusal("REVIEW_LINEAGE_CHANGED");
        throw error;
      }
      const edition = documentEdition(updated.rawData) as DocumentEdition;
      return { sourceId: source.id, edition: edition.edition, version: review.version, family,
        alreadyReceived: false, receivedAt: receivedAt.toISOString() } satisfies BarreReviewOutcome;
    }, { timeout: 30_000 });
    return {
      status: "OK",
      summary: outcome.alreadyReceived
        ? `Bilan déjà reçu : ${review.id} version ${review.version}`
        : `Bilan reçu : ${review.id} version ${review.version} (édition ${outcome.edition})`,
      output: outcome,
    };
  } catch (error) {
    if (error instanceof ReviewRefusal) return refused(error.code);
    throw error;
  }
}
