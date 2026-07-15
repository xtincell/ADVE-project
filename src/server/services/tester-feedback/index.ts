/**
 * ADR-0155 — Canal feedback / bug des testeurs. Single-writer du modèle
 * `Feedback`. Un testeur connecté remonte un bug/idée/retour ; l'opérateur trie
 * dans l'inbox console. Zéro LLM. Distinct de `feedback-loop`/`feedback-processor`
 * (boucle stratégie mensuelle — aucun rapport).
 */

import { db } from "@/lib/db";

export type FeedbackKind = "BUG" | "IDEA" | "OTHER";
export type FeedbackStatus = "NEW" | "TRIAGED" | "RESOLVED";

export interface SubmitFeedbackInput {
  userId?: string | null;
  operatorId?: string | null;
  email?: string | null;
  kind: FeedbackKind;
  message: string;
  pageUrl?: string | null;
  userAgent?: string | null;
}

/** Écrit UNE remontée (statut NEW) + notifie les admins (best-effort). */
export async function submitFeedback(input: SubmitFeedbackInput) {
  const fb = await db.feedback.create({
    data: {
      userId: input.userId ?? null,
      operatorId: input.operatorId ?? null,
      email: input.email?.trim() || null,
      kind: input.kind,
      message: input.message.trim(),
      pageUrl: input.pageUrl?.trim()?.slice(0, 500) || null,
      userAgent: input.userAgent?.trim()?.slice(0, 500) || null,
      status: "NEW",
    },
  });

  // Alerte admins — best-effort, jamais bloquant.
  try {
    const { pushNotification } = await import("@/server/services/anubis/notifications");
    const admins = await db.user.findMany({ where: { role: "ADMIN" }, select: { id: true } });
    const label = input.kind === "BUG" ? "🐞 Bug remonté" : input.kind === "IDEA" ? "💡 Idée" : "📨 Retour";
    for (const a of admins) {
      await pushNotification({
        userId: a.id,
        type: "FEEDBACK",
        priority: input.kind === "BUG" ? "HIGH" : "NORMAL",
        title: label,
        body: input.message.slice(0, 240),
        link: "/console/socle/feedback",
        entityType: "Feedback",
        entityId: fb.id,
        channels: ["IN_APP"],
      }).catch(() => {});
    }
  } catch {
    /* notif best-effort */
  }

  return fb;
}

export interface TriageFeedbackInput {
  id: string;
  status: FeedbackStatus;
  reviewedBy: string;
}

/** Change le statut d'une remontée (tri opérateur). */
export async function triageFeedback(input: TriageFeedbackInput) {
  const resolving = input.status === "RESOLVED";
  return db.feedback.update({
    where: { id: input.id },
    data: {
      status: input.status,
      ...(resolving ? { resolvedBy: input.reviewedBy, resolvedAt: new Date() } : {}),
    },
  });
}

export async function listFeedback(args: { status?: FeedbackStatus; limit?: number }) {
  return db.feedback.findMany({
    where: args.status ? { status: args.status } : {},
    orderBy: { createdAt: "desc" },
    take: args.limit ?? 200,
  });
}

/** Nombre de remontées non traitées (badge inbox). */
export async function unresolvedFeedbackCount(): Promise<number> {
  return db.feedback.count({ where: { status: "NEW" } });
}
