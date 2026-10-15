"use client";

import { useState, useRef, useEffect } from "react";
import { trpc } from "@/lib/trpc/client";
import { PageHeader } from "@/components/shared/page-header";
import { AiBadge } from "@/components/shared/ai-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { useStrategy } from "@/components/cockpit/strategy-context";
import { SkeletonList } from "@/components/shared/loading-skeleton";
import { FriendlyError } from "@/components/shared/friendly-error";
import { CouncilDeliberationPanel } from "@/components/cockpit/council-deliberation-panel";
import { MarkdownContent } from "@/components/shared/markdown-content";
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
  /**
   * Message d'ÉCHEC affiché à la place d'une réponse (service indisponible,
   * flux vide, exception). Il porte le rôle « assistant » pour s'afficher au
   * bon endroit, mais ce n'est pas une position de la marque : sans ce
   * drapeau, « Analyse approfondie » soumettait « Le service intelligent est
   * momentanément indisponible » aux quatre experts — 5 appels LLM dépensés à
   * critiquer un message d'erreur, affiché ensuite sous « Position soumise »
   * comme la position stratégique de la marque.
   */
  isError?: boolean;
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

function AssistantPageHeader({ children }: { children?: React.ReactNode }) {
  return <PageHeader title="Assistant" description="Votre assistant de marque intelligent."
    badge={<AiBadge />} breadcrumbs={[{ label: "Cockpit", href: "/cockpit" }, { label: "Assistant" }]}>
    {children}
  </PageHeader>;
}

function AssistantReadState({ loading, error }: { loading: string; error?: string }) {
  return <div className="space-y-6">
    <AssistantPageHeader />
    {error ? <FriendlyError error={new Error(error)} /> : <div role="status" aria-label={loading}>
      <p className="mb-3 text-sm text-foreground-secondary">{loading}</p>
      <SkeletonList items={3} />
    </div>}
  </div>;
}

export default function MestorPage() {
  const { strategyId, isLoading, isError } = useStrategy();
  if (isLoading || isError) return <AssistantReadState loading="Chargement de vos marques…"
    error={isError ? "Impossible de charger les marques disponibles. Actualisez la page pour réessayer." : undefined} />;
  // A conversation's state (history, draft, errors, expert panel) belongs to
  // one strategy. Switching context remounts it; stored threads are untouched.
  return <MestorConversation key={strategyId ?? "unselected"} strategyId={strategyId} />;
}

function MestorConversation({ strategyId }: { strategyId: string | null }) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [copyFailed, setCopyFailed] = useState(false);
  const [streamError, setStreamError] = useState<{ failedContent: string } | null>(null);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const strategyQuery = trpc.strategy.getWithScore.useQuery(
    { id: strategyId! },
    { enabled: !!strategyId },
  );

  // Historique persisté (ADR-0181) — une hydratation par marque sélectionnée.
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
        <AssistantPageHeader />
        <EmptyState
          icon={CloudOff}
          title="Aucune marque sélectionnée"
          description="Sélectionnez une marque pour dialoguer avec votre assistant."
        />
      </div>
    );
  }

  if (historyQuery.isLoading || historyQuery.error) return <AssistantReadState
    loading="Chargement de votre conversation…"
    error={historyQuery.error ? "Impossible de lire votre conversation. Actualisez la page pour réessayer." : undefined} />;

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
            isError: true,
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
              ? { ...m, content: "Je n'ai pas pu générer de réponse. Veuillez réessayer.", isError: true }
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
          isError: true,
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

  const handleCopy = async (id: string, content: string) => {
    setCopyFailed(false);
    setCopiedId(null);
    try {
      await navigator.clipboard.writeText(content);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      setCopyFailed(true);
    }
  };

  // La réponse que les quatre experts vont réellement contester (passée en
  // `draft` par le panneau — cf. son en-tête).
  // Un message d'échec n'est pas une position soumissible au conseil.
  const lastAssistantMessage =
    [...messages].reverse().find((m) => m.role === "assistant" && !m.isError && m.content.trim()) ??
    null;
  const councilQuestion = lastAssistantMessage
    ? messages.slice(0, messages.indexOf(lastAssistantMessage)).reverse()
      .find((m) => m.role === "user")?.content
    : undefined;

  const handleReset = () => {
    setMessages([]);
    setInput("");
    setStreamError(null);
    setCopyFailed(false);
    setCopiedId(null);
    // Efface aussi le fil persisté — « Nouvelle conversation » = vraie remise à zéro.
    clearMutation.mutate({ strategyId });
  };

  return (
    <div className="space-y-6">
      <AssistantPageHeader>
        {messages.length > 0 && (
          <button
            onClick={handleReset}
            className="flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground-secondary hover:bg-surface-raised"
          >
            <RotateCcw className="h-4 w-4" />
            Nouvelle conversation
          </button>
        )}
      </AssistantPageHeader>

      {copyFailed && <p role="alert" className="text-sm text-error">
        La réponse n’a pas pu être copiée. Sélectionnez le texte pour la copier.
      </p>}

      {/* Analyse approfondie — convoque les quatre experts contradictoires sur
          la dernière réponse. Placée dans le CORPS de page et non dans le slot
          d'actions de l'en-tête : celui-ci est un `flex shrink-0` prévu pour des
          boutons, une carte de délibération y déborderait. */}
      {lastAssistantMessage && (
        <CouncilDeliberationPanel
          key={lastAssistantMessage.id}
          strategyId={strategyId}
          answer={lastAssistantMessage.content}
          question={councilQuestion}
        />
      )}

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
                Je suis votre assistant de marque. Je m’appuie sur les informations disponibles du dossier — posez-moi vos
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
                    className={`group relative min-w-0 max-w-[75%] rounded-2xl px-4 py-3 ${
                      msg.role === "user"
                        ? "bg-accent text-white"
                        : "bg-background text-foreground"
                    }`}
                  >
                    {msg.role === "assistant" && !msg.isError
                      ? <MarkdownContent>{msg.content}</MarkdownContent>
                      : <div className="whitespace-pre-wrap break-words text-sm leading-relaxed">{msg.content}</div>}
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
                          aria-label={copiedId === msg.id ? "Réponse copiée" : "Copier la réponse"}
                          className="opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
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
              Contexte : {strategy.name}
              {typeof strategy.composite === "number"
                ? ` - Score ${strategy.composite.toFixed(0)}/200`
                : " - marque pas encore évaluée"}
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
