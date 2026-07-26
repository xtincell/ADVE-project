export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * Chat Assistant de marque (cockpit) — ADR-0179/0180/0181.
 *
 * Réécriture complète du chemin cassé (diagnostic 2026-07-26) :
 *   1. le client parsait le format stream AI SDK v3/v4 (`0:"…"`) alors que la
 *      route renvoyait du texte brut → « Je n'ai pas pu générer de réponse »
 *      sur CHAQUE message. Protocole désormais : TEXTE BRUT STREAMÉ, zéro
 *      préfixe, un seul consommateur maison ;
 *   2. l'appel provider direct (`@ai-sdk/anthropic`, Sonnet 5 thinking non
 *      désactivé + cap 2048) est remplacé par la surface streaming du Gateway
 *      (`streamChatText` via le conseil) — cascade providers, parité Sonnet 5,
 *      budget Thot, coût, circuit breaker ;
 *   3. pre-flight `isTextLLMAvailable()` AVANT tout header (pattern intake
 *      PR #447) — plus jamais un 200 au flux vide ;
 *   4. le contexte injecté est enfin le DOSSIER RÉEL de la marque (piliers
 *      verbatim + recherche sémantique + communauté mesurée) via le conseil
 *      de marque (`askCouncilStream`), chaque bloc wrapUntrusted ;
 *   5. l'historique est PERSISTÉ (AssistantThread/AssistantMessage, ADR-0181)
 *      et chargé CÔTÉ SERVEUR — le client n'envoie plus jamais l'historique
 *      (anti-forgeage) ;
 *   6. rate-limit par utilisateur (store partagé ADR-0161).
 *
 * Auth OBLIGATOIRE (audit adversarial 2026-07-22, conservé) : session +
 * ownership de la marque avant de charger le moindre contexte — cette route
 * exfiltrait le contexte client complet via un strategyId deviné.
 * Équivalent non-tRPC du chokepoint ADR-0166 (`canAccessStrategy`).
 */

import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { canAccessStrategy, getOperatorContext } from "@/server/services/operator-isolation";
import { isTextLLMAvailable } from "@/server/services/llm-gateway";
import { askCouncilStream } from "@/server/services/mestor/council";
import { consumeAssistantBudget } from "@/server/services/mestor/council/rate-limit";
import type { StreamChatMessage } from "@/server/services/llm-gateway/streaming";

interface ChatRequestBody {
  /** Le message courant UNIQUEMENT — l'historique vit côté serveur. */
  message: string;
  strategyId: string;
}

const HISTORY_LIMIT = 40;

function jsonError(status: number, error: string): Response {
  return new Response(JSON.stringify({ error }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

async function ensureThread(strategyId: string, userId: string): Promise<string> {
  const existing = await db.assistantThread.findFirst({
    where: { strategyId, userId },
    select: { id: true },
  });
  if (existing) return existing.id;
  const created = await db.assistantThread.create({
    data: { strategyId, userId },
    select: { id: true },
  });
  return created.id;
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user) return jsonError(401, "Unauthorized");
    const userId = session.user.id;

    const body = (await request.json().catch(() => null)) as ChatRequestBody | null;
    const message = typeof body?.message === "string" ? body.message.trim() : "";
    const strategyId = typeof body?.strategyId === "string" ? body.strategyId : "";
    if (!message || !strategyId) return jsonError(400, "message et strategyId requis");
    if (message.length > 4_000) return jsonError(400, "message trop long");

    const opCtx = await getOperatorContext(userId);
    if (!(await canAccessStrategy(strategyId, opCtx))) return jsonError(403, "Forbidden");

    // ── Pre-flight honnête AVANT tout header de stream ──────────────────
    if (!isTextLLMAvailable()) return jsonError(503, "LLM_UNAVAILABLE");
    if (!(await consumeAssistantBudget(userId))) return jsonError(429, "RATE_LIMITED");

    // ── Historique côté serveur (source de vérité, anti-forgeage) ───────
    const threadId = await ensureThread(strategyId, userId);
    const rows = await db.assistantMessage.findMany({
      where: { threadId },
      orderBy: { createdAt: "desc" },
      take: HISTORY_LIMIT,
      select: { role: true, content: true },
    });
    const history: StreamChatMessage[] = rows
      .reverse()
      .filter((r) => r.role === "user" || r.role === "assistant")
      .map((r) => ({ role: r.role as "user" | "assistant", content: r.content }));

    // ── Conseil de marque — coordinateur streamé, dossier complet ───────
    // `askCouncilStream` ne retourne qu'APRÈS le premier delta obtenu (la
    // cascade providers a déjà réussi) → plus de 200-puis-flux-vide possible.
    const result = await askCouncilStream({ strategyId, question: message, history });

    // ── Persistance best-effort à la fin du flux (jamais bloquante) ─────
    result.finished
      .then(async ({ text }) => {
        if (!text.trim()) return;
        await db.assistantMessage.createMany({
          data: [
            { threadId, role: "user", content: message },
            { threadId, role: "assistant", content: text },
          ],
        });
        await db.assistantThread.update({
          where: { id: threadId },
          data: { updatedAt: new Date() },
        });
      })
      .catch((err) => {
        console.warn(
          "[api/chat] persistance du fil échouée (non-bloquant):",
          err instanceof Error ? err.message : err,
        );
      });

    return new Response(result.textStream.pipeThrough(new TextEncoderStream()), {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-store",
        // Désactive le buffering des reverse-proxies (Traefik/Coolify) — les
        // deltas doivent partir au fil de l'eau.
        "X-Accel-Buffering": "no",
      },
    });
  } catch (error) {
    // Tous les échecs arrivent AVANT le premier octet (contrat streamChatText)
    // → on peut encore répondre un statut honnête. Budget Thot dépassé et
    // cascade épuisée se présentent pareil au client : service indisponible.
    const message = error instanceof Error ? error.message : "Internal server error";
    const status = /budget exceeded/i.test(message) || /providers failed/i.test(message) ? 503 : 500;
    return jsonError(status, status === 503 ? "LLM_UNAVAILABLE" : message);
  }
}
