import { anthropic } from "@ai-sdk/anthropic";
import { streamText } from "ai";
import { getSystemPrompt, type MestorContext } from "@/server/services/mestor";
import { db } from "@/lib/db";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface ChatRequestBody {
  messages: ChatMessage[];
  context: MestorContext;
  strategyId?: string;
}

async function loadStrategyContext(strategyId: string): Promise<string> {
  try {
    const strategy = await db.strategy.findUnique({
      where: { id: strategyId },
      include: {
        pillars: true,
        campaigns: { where: { status: { in: ["ACTIVE", "IN_PROGRESS"] } }, take: 5 },
        drivers: { where: { deletedAt: null, status: "ACTIVE" }, take: 10 },
      },
    });

    if (!strategy) return "";

    const vec = strategy.advertis_vector as Record<string, number> | null;
    const composite = vec
      ? ["a", "d", "v", "e", "r", "t", "i", "s"].reduce((sum, k) => sum + (vec[k] ?? 0), 0)
      : 0;

    const lines = [
      "--- CONTEXTE CLIENT ---",
      `Nom: ${strategy.name}`,
      `Description: ${strategy.description ?? ""}`,
      `Statut: ${strategy.status}`,
      `Score ADVE composite: ${composite.toFixed(0)}/200`,
    ];

    if (vec) {
      lines.push(
        `Piliers: A=${(vec.a ?? 0).toFixed(1)}, D=${(vec.d ?? 0).toFixed(1)}, V=${(vec.v ?? 0).toFixed(1)}, E=${(vec.e ?? 0).toFixed(1)}, R=${(vec.r ?? 0).toFixed(1)}, T=${(vec.t ?? 0).toFixed(1)}, I=${(vec.i ?? 0).toFixed(1)}, S=${(vec.s ?? 0).toFixed(1)}`,
      );
    }

    if (strategy.campaigns.length > 0) {
      lines.push(`Campagnes actives: ${strategy.campaigns.map((c) => c.name).join(", ")}`);
    }

    if (strategy.drivers.length > 0) {
      lines.push(`Drivers actifs: ${strategy.drivers.map((d) => `${d.name} (${d.channel})`).join(", ")}`);
    }

    // Load recent signals
    const signals = await db.signal.findMany({
      where: { strategyId },
      orderBy: { createdAt: "desc" },
      take: 5,
    });

    if (signals.length > 0) {
      lines.push(`Derniers signaux: ${signals.map((s) => s.type).join(", ")}`);
    }

    // Business context
    const bizCtx = strategy.businessContext as Record<string, unknown> | null;
    if (bizCtx) {
      lines.push(`Modele d'affaires: ${bizCtx.businessModel ?? "non defini"}`);
      lines.push(`Positionnement: ${bizCtx.positioningArchetype ?? "non defini"}`);
    }

    lines.push("--- FIN CONTEXTE CLIENT ---");
    return lines.join("\n");
  } catch {
    return "";
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as ChatRequestBody;
    const { messages, context, strategyId } = body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return new Response(JSON.stringify({ error: "Messages array is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Build system prompt
    let systemPrompt = getSystemPrompt(context ?? "console");

    // Load strategy context if available
    if (strategyId) {
      const strategyContext = await loadStrategyContext(strategyId);
      if (strategyContext) {
        systemPrompt += "\n\n" + strategyContext;
      }
    }

    const result = streamText({
      model: anthropic("claude-sonnet-4-20250514"),
      system: systemPrompt,
      messages: messages.map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })),
      maxOutputTokens: 2048,
    });

    return result.toTextStreamResponse();
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
