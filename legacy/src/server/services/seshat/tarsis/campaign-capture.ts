/**
 * Seshat Tarsis — Campaign capture sessions API (Phase 19, ADR-0052 Cluster D support).
 *
 * Câblage pour la promotion `culture.tarsisBridge` STUB → MVP du module campaign-tracker.
 *
 * 2 APIs minimales :
 *   - `openCampaignCaptureSession` — ouvre une session Tarsis liée à une CampaignFieldOp
 *     ou Campaign. Ingest continu de signaux faibles pendant LIVE.
 *   - `closeCampaignCaptureSession` — ferme la session à POST_CAMPAIGN, agrège payload final.
 *
 * Persistence : modèle léger `TarsisCaptureSession` (ADR-0052 Cluster D Vague 2).
 *
 * MVP : la collecte de signaux réelle (`signalsCount`, `payload`) est laissée à
 * PRODUCTION où Tarsis weak-signal-analyzer + signal-collector seront connectés.
 * Pour l'instant, on persiste juste la session avec status ACTIVE/CLOSED — le
 * caller (campaign-tracker) peut référencer `TarsisCaptureSession.id` dans
 * `CampaignFieldOp.tarsisCaptureSessionId`.
 */

import { db } from "@/lib/db";

export interface OpenCaptureSessionInput {
  readonly strategyId: string;
  readonly campaignId?: string;
  readonly campaignFieldOpId?: string;
}

export interface OpenCaptureSessionResult {
  readonly sessionId: string;
  readonly capturedAt: string;
}

/**
 * Ouvre une nouvelle TarsisCaptureSession. Idempotent si une session ACTIVE
 * existe déjà pour le même (strategyId, campaignId, campaignFieldOpId) tuple.
 */
export async function openCampaignCaptureSession(
  input: OpenCaptureSessionInput,
): Promise<OpenCaptureSessionResult> {
  // Cherche une session ACTIVE existante (idempotent).
  const existing = await db.tarsisCaptureSession
    .findFirst({
      where: {
        strategyId: input.strategyId,
        campaignId: input.campaignId ?? null,
        campaignFieldOpId: input.campaignFieldOpId ?? null,
        status: "ACTIVE",
      },
      select: { id: true, capturedAt: true },
      orderBy: { capturedAt: "desc" as const },
    })
    .catch(() => null);

  if (existing) {
    return {
      sessionId: existing.id,
      capturedAt: existing.capturedAt.toISOString(),
    };
  }

  const created = await db.tarsisCaptureSession.create({
    data: {
      strategyId: input.strategyId,
      campaignId: input.campaignId ?? null,
      campaignFieldOpId: input.campaignFieldOpId ?? null,
      status: "ACTIVE",
      signalsCount: 0,
      payload: {} as object,
    },
    select: { id: true, capturedAt: true },
  });

  return {
    sessionId: created.id,
    capturedAt: created.capturedAt.toISOString(),
  };
}

export interface CloseCaptureSessionInput {
  readonly sessionId: string;
  /** Payload final agrégé (mèmes, hashtags, communautés, dark sentiment). */
  readonly finalPayload?: Record<string, unknown>;
  /** Compteur final des signaux ingérés pendant la session. */
  readonly finalSignalsCount?: number;
}

export interface CloseCaptureSessionResult {
  readonly sessionId: string;
  readonly closedAt: string;
  readonly signalsCount: number;
  readonly durationMs: number;
}

/**
 * Ferme une TarsisCaptureSession. Idempotent — si déjà CLOSED, retourne les
 * valeurs existantes sans réécrire.
 *
 * MVP : pas de signal aggregation réelle ici — la collecte est laissée à
 * Tarsis signal-collector qui peut update `signalsCount` + `payload` au fil
 * de l'eau via une autre API (à câbler PRODUCTION).
 */
export async function closeCampaignCaptureSession(
  input: CloseCaptureSessionInput,
): Promise<CloseCaptureSessionResult> {
  const session = await db.tarsisCaptureSession.findUnique({
    where: { id: input.sessionId },
    select: {
      id: true,
      capturedAt: true,
      signalsCount: true,
      payload: true,
      status: true,
      closedAt: true,
    },
  });
  if (!session) {
    throw new Error(`TarsisCaptureSession ${input.sessionId} not found`);
  }

  if (session.status === "CLOSED" && session.closedAt) {
    const existingDurationMs = session.closedAt.getTime() - session.capturedAt.getTime();
    return {
      sessionId: session.id,
      closedAt: session.closedAt.toISOString(),
      signalsCount: session.signalsCount,
      durationMs: existingDurationMs,
    };
  }

  const closedAt = new Date();
  const merged: Record<string, unknown> = {
    ...((session.payload as Record<string, unknown> | null) ?? {}),
    ...(input.finalPayload ?? {}),
  };

  await db.tarsisCaptureSession.update({
    where: { id: input.sessionId },
    data: {
      status: "CLOSED",
      closedAt,
      signalsCount: input.finalSignalsCount ?? session.signalsCount,
      payload: merged as object,
    },
  });

  return {
    sessionId: session.id,
    closedAt: closedAt.toISOString(),
    signalsCount: input.finalSignalsCount ?? session.signalsCount,
    durationMs: closedAt.getTime() - session.capturedAt.getTime(),
  };
}
