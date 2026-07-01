/**
 * Feedback Processor — Processes structured client feedback into pillar updates.
 * Receives monthly questionnaire responses and converts into Signals + pillar recalibration.
 */
import { db } from "@/lib/db";
import { processSignal } from "@/server/services/feedback-loop";

export async function processFeedback(strategyId: string, responses: Record<string, string>): Promise<{ signalsCreated: number }> {
  let signalsCreated = 0;

  for (const [question, answer] of Object.entries(responses)) {
    if (!answer || answer.trim().length < 10) continue;

    const signal = await db.signal.create({
      data: {
        strategyId,
        type: "FEEDBACK_RESPONSE",
        data: { question, answer, source: "monthly_feedback" },
      },
    });

    // Trigger feedback loop for each signal
    processSignal(signal.id).catch((err) => {
      console.warn("[feedback-processor] processSignal failed:", err instanceof Error ? err.message : err);
    });
    signalsCreated++;
  }

  return { signalsCreated };
}
