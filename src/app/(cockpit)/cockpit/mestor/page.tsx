"use client";

import { useState, useRef, useEffect } from "react";
import { trpc } from "@/lib/trpc/client";
import { PageHeader } from "@/components/shared/page-header";
import { AiBadge } from "@/components/shared/ai-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { useCurrentStrategyId } from "@/components/cockpit/strategy-context";
import { CouncilDeliberationPanel } from "@/components/cockpit/council-deliberation-panel";
import {
  Bot,
  Send,
  Sparkles,
  User,
  RotateCcw,
  Copy,
  Check,
  Lightbulb,
  Target,
  BarChart3,
  BookOpen,
  CloudOff,
} from "lucide-react";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

function getQuickPrompts(brandName?: string) {
  const name = brandName || "ma marque";
  return [
    {
      icon: Target,
      label: "Diagnostic rapide",
      prompt: `Fais un diagnostic rapide de ${name} et identifie les 3 priorités principales.`,
    },
    {
      icon: BarChart3,
      label: "Analyse SWOT",
      prompt: `Analyse SWOT de ${name} : forces, faiblesses, opportunités et menaces.`,
    },
    {
      icon: BookOpen,
      label: "Recommandations",
      prompt: `Quelles sont tes recommandations pour améliorer l'indice d'attachement de ${name} ?`,
    },
    {
      icon: Lightbulb,
      label: "Idées de campagne",
      prompt: `Propose-moi 3 idées de campagne alignées avec la stratégie de ${name}.`,
    },
  ];
}

/** Erreurs pré-flux renvoyées par la route en JSON (statut ≠ 200). */
function errorMessageFor(status: number): string {
  if (status === 503)
    return "Le service intelligent est momentanément indisponible. Vos données sont intactes — réessayez dans quelques minutes.";
  if (status === 429)
    return "Vous avez envoyé beaucoup de messages en peu de temps. Patientez quelques minutes avant de réessayer.";
  return "Désolé, une erreur est survenue lors de la génération de la réponse.";
}

export default function MestorPage() {
  const strategyId = useCurrentStrategyId();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [streamError, setStreamError] = useState<{ failedContent: string } | null>(null);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const strategyQuery = trpc.strategy.getWithScore.useQuery(
    { id: strategyId! },
    { enabled: !!strategyId },
  );

  // Historique persisté (ADR-0181) — chargé au montage, une seule fois.
  const historyQuery = trpc.mestor.assistantHistory.useQuery(
    { strategyId: strategyId! },
    { enabled: !!strategyId, refetchOnWindowFocus: false },
  );
  const clearMutation = trpc.mestor.assistantClear.useMutation();

  useEffect(() => {
    if (historyLoaded || !historyQuery.data) return;
    setMessages(
      historyQuery.data.messages.map((m) => ({
        id: m.id,
        role: m.role as "user" | "assistant",
        content: m.content,
        timestamp: new Date(m.createdAt),
      })),
    );
    setHistoryLoaded(true);
  }, [historyQuery.data, historyLoaded]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  if (!strategyId) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Assistant"
          description="Votre assistant de marque intelligent."
          badge={<AiBadge />}
          breadcrumbs={[{ label: "Cockpit", href: "/cockpit" }, { label: "Assistant" }]}
        />
        <EmptyState
          icon={CloudOff}
          title="Aucune marque sélectionnée"
          description="Sélectionnez une marque pour dialoguer avec votre assistant."
        />
      </div>
    );
  }

  const strategy = strategyQuery.data;
  const strategyName = strategy?.name ?? "votre marque";

  const handleSend = async (text?: string) => {
    const content = (text ?? input).trim();
    if (!content || isLoading) return;

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);
    setStreamError(null);

    try {
      // L'historique vit CÔTÉ SERVEUR (ADR-0181) — on n'envoie que le message.
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: content, strategyId }),
      });

      if (!response.ok) {
        setStreamError({ failedContent: content });
        setMessages((prev) => [
          ...prev,
          {
            id: `error-${Date.now()}`,
            role: "assistant",
            content: errorMessageFor(response.status),
            timestamp: new Date(),
          },
        ]);
        return;
      }

      // Flux TEXTE BRUT (ADR-0179) — chaque chunk décodé est du contenu, on
      // l'ajoute tel quel. Zéro parsing de préfixe.
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let assistantContent = "";
      const assistantId = `assistant-${Date.now()}`;

      setMessages((prev) => [
        ...prev,
        { id: assistantId, role: "assistant", content: "", timestamp: new Date() },
      ]);

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          assistantContent += decoder.decode(value, { stream: true });
          const current = assistantContent;
          setMessages((prev) =>
            prev.map((m) => (m.id === assistantId ? { ...m, content: current } : m)),
          );
        }
        assistantContent += decoder.decode();
      }

      // Filet : flux terminé sans aucun contenu (ne devrait plus arriver — la
      // route ne répond 200 qu'après le premier fragment reçu).
      if (!assistantContent) {
        setStreamError({ failedContent: content });
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? { ...m, content: "Je n'ai pas pu générer de réponse. Veuillez réessayer." }
              : m,
          ),
        );
      }
    } catch {
      setStreamError({ failedContent: content });
      setMessages((prev) => [
        ...prev,
        {
          id: `error-${Date.now()}`,
          role: "assistant",
          content: "Désolé, une erreur est survenue lors de la génération de la réponse.",
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleCopy = (id: string, content: string) => {
    navigator.clipboard.writeText(content);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Le sujet soumis au conseil = la dernière réponse de l'assistant, celle que
  // les experts vont attaquer.
  const lastAssistantMessage = [...messages].reverse().find((m) => m.role === "assistant") ?? null;

  const handleReset = () => {
    setMessages([]);
    setInput("");
    setStreamError(null);
    // Efface aussi le fil persisté — « Nouvelle conversation » = vraie remise à zéro.
    clearMutation.mutate({ strategyId });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Assistant"
        description="Votre assistant de marque intelligent."
        badge={<AiBadge />}
        breadcrumbs={[
          { label: "Cockpit", href: "/cockpit" },
          { label: "Assistant" },
        ]}
      >
        {messages.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            {/* Convoque les quatre experts contradictoires sur le dernier
                échange. Sans ce bouton, ils existaient sans être atteignables
                par un fondateur — et le coordinateur niait leur existence
                quand on l'interrogeait. */}
            {lastAssistantMessage && (
              <CouncilDeliberationPanel
                key={lastAssistantMessage.id}
                strategyId={strategyId}
                topic={lastAssistantMessage.content.slice(0, 2_000)}
              />
            )}
            <button
              onClick={handleReset}
              className="flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground-secondary hover:bg-surface-raised"
            >
              <RotateCcw className="h-4 w-4" />
              Nouvelle conversation
            </button>
          </div>
        )}
      </PageHeader>

      <div
        className="flex flex-col overflow-hidden rounded-xl border border-border"
        style={{ height: "calc(100vh - 220px)", minHeight: 500 }}
      >
        {/* Chat area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-background/30">
          {messages.length === 0 ? (
            /* Welcome screen */
            <div className="flex flex-col items-center justify-center h-full">
              <div className="rounded-2xl bg-gradient-to-br from-accent/20 to-accent/20 p-4">
                <Sparkles className="h-10 w-10 text-accent" />
              </div>
              <h3 className="mt-4 text-lg font-semibold text-foreground">
                Bienvenue sur votre assistant
              </h3>
              <p className="mt-1 max-w-sm text-center text-sm text-foreground-secondary">
                Je suis votre assistant de marque. Je connais votre dossier complet — posez-moi vos
                questions sur{strategyName ? ` ${strategyName},` : ""} votre stratégie, ou demandez un
                diagnostic.
              </p>

              {/* Quick prompts */}
              <div className="mt-6 grid grid-cols-1 gap-2 sm:grid-cols-2">
                {getQuickPrompts(strategy?.name).map((qp) => (
                  <button
                    key={qp.label}
                    onClick={() => handleSend(qp.prompt)}
                    className="flex items-center gap-3 rounded-xl border border-border bg-background/80 px-4 py-3 text-left transition-colors hover:border-border hover:bg-background/80"
                  >
                    <qp.icon className="h-5 w-5 shrink-0 text-accent" />
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        {qp.label}
                      </p>
                      <p className="mt-0.5 text-xs text-foreground-muted line-clamp-1">
                        {qp.prompt}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            /* Messages */
            <>
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex gap-3 ${
                    msg.role === "user" ? "justify-end" : "justify-start"
                  }`}
                >
                  {msg.role === "assistant" && (
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent/20">
                      <Bot className="h-4 w-4 text-accent" />
                    </div>
                  )}

                  <div
                    className={`group relative max-w-[75%] rounded-2xl px-4 py-3 ${
                      msg.role === "user"
                        ? "bg-accent text-white"
                        : "bg-background text-foreground"
                    }`}
                  >
                    <div className="whitespace-pre-wrap text-sm leading-relaxed">
                      {msg.content}
                    </div>
                    <div className="mt-1 flex items-center justify-between gap-2">
                      <span
                        className={`text-2xs ${
                          msg.role === "user" ? "text-accent" : "text-foreground-muted"
                        }`}
                      >
                        {msg.timestamp.toLocaleTimeString("fr-FR", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                      {msg.role === "assistant" && (
                        <button
                          onClick={() => handleCopy(msg.id, msg.content)}
                          className="opacity-0 transition-opacity group-hover:opacity-100"
                        >
                          {copiedId === msg.id ? (
                            <Check className="h-3 w-3 text-success" />
                          ) : (
                            <Copy className="h-3 w-3 text-foreground-muted hover:text-foreground-secondary" />
                          )}
                        </button>
                      )}
                    </div>
                  </div>

                  {msg.role === "user" && (
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-background">
                      <User className="h-4 w-4 text-foreground-secondary" />
                    </div>
                  )}
                </div>
              ))}

              {/* Loading indicator */}
              {isLoading && (
                <div className="flex gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent/20">
                    <Bot className="h-4 w-4 text-accent" />
                  </div>
                  <div className="rounded-2xl bg-background px-4 py-3">
                    <div className="flex gap-1">
                      <span className="h-2 w-2 animate-bounce rounded-full bg-foreground-muted" style={{ animationDelay: "0ms" }} />
                      <span className="h-2 w-2 animate-bounce rounded-full bg-foreground-muted" style={{ animationDelay: "150ms" }} />
                      <span className="h-2 w-2 animate-bounce rounded-full bg-foreground-muted" style={{ animationDelay: "300ms" }} />
                    </div>
                  </div>
                </div>
              )}

              {/* Retry button on stream error */}
              {streamError && !isLoading && (
                <div className="flex justify-center">
                  <button
                    onClick={() => {
                      // Remove the error message and retry
                      setMessages((prev) => prev.filter((m) => !m.id.startsWith("error-")));
                      handleSend(streamError.failedContent);
                    }}
                    className="flex items-center gap-2 rounded-lg border border-error/30 bg-error/20 px-4 py-2 text-sm text-error transition-colors hover:bg-error/40"
                  >
                    <RotateCcw className="h-4 w-4" />
                    Réessayer
                  </button>
                </div>
              )}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        {/* Context indicator */}
        {strategy && (
          <div className="border-t border-border/50 bg-background/40 px-4 py-1.5">
            <p className="text-2xs text-foreground-muted">
              Contexte : {strategy.name} - Score {(strategy.composite ?? 0).toFixed(0)}/200
            </p>
          </div>
        )}

        {/* Input area */}
        <div className="border-t border-border bg-background/60 p-3">
          <div className="flex items-end gap-2">
            <div className="relative flex-1">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Posez une question à l'assistant..."
                rows={1}
                className="w-full resize-none rounded-xl border border-border bg-background px-4 py-2.5 text-sm text-foreground placeholder-foreground-muted outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/30"
                style={{ minHeight: 40, maxHeight: 120 }}
              />
            </div>
            <button
              onClick={() => handleSend()}
              disabled={!input.trim() || isLoading}
              className="shrink-0 rounded-xl bg-accent p-2.5 text-white transition-colors hover:bg-accent disabled:opacity-30 disabled:hover:bg-accent"
            >
              <Send className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
