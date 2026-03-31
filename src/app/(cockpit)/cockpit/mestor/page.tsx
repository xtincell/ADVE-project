"use client";

import { useState, useRef, useEffect } from "react";
import { trpc } from "@/lib/trpc/client";
import { PageHeader } from "@/components/shared/page-header";
import { SkeletonPage } from "@/components/shared/loading-skeleton";
import { useCurrentStrategyId } from "@/components/cockpit/strategy-context";
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
      prompt: `Fais un diagnostic rapide de ${name} et identifie les 3 priorites principales.`,
    },
    {
      icon: BarChart3,
      label: "Analyse SWOT",
      prompt: `Analyse SWOT de ${name} : forces, faiblesses, opportunites et menaces.`,
    },
    {
      icon: BookOpen,
      label: "Recommandations",
      prompt: `Quelles sont tes recommandations pour ameliorer le Cult Index de ${name} ?`,
    },
    {
      icon: Lightbulb,
      label: "Idees de campagne",
      prompt: `Propose-moi 3 idees de campagne alignees avec la strategie de ${name}.`,
    },
  ];
}

export default function MestorPage() {
  const strategyId = useCurrentStrategyId();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [streamError, setStreamError] = useState<{ failedContent: string } | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const strategyQuery = trpc.strategy.getWithScore.useQuery(
    { id: strategyId! },
    { enabled: !!strategyId },
  );

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  if (!strategyId) {
    return <SkeletonPage />;
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

    const allMessages = [...messages, userMessage];
    setMessages(allMessages);
    setInput("");
    setIsLoading(true);
    setStreamError(null);

    try {
      // Real streaming call to Claude via /api/chat
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: allMessages.map((m) => ({ role: m.role, content: m.content })),
          context: "cockpit" as const,
          strategyId,
        }),
      });

      if (!response.ok) throw new Error("Erreur API Mestor");

      // Handle streaming response
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let assistantContent = "";
      const assistantId = `assistant-${Date.now()}`;

      // Add empty assistant message that we'll stream into
      setMessages((prev) => [
        ...prev,
        { id: assistantId, role: "assistant", content: "", timestamp: new Date() },
      ]);

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          // Parse SSE data chunks from AI SDK streaming format
          const lines = chunk.split("\n");
          for (const line of lines) {
            if (line.startsWith("0:")) {
              // AI SDK text chunk format: 0:"text content"
              try {
                const textContent = JSON.parse(line.slice(2));
                if (typeof textContent === "string") {
                  assistantContent += textContent;
                  setMessages((prev) =>
                    prev.map((m) =>
                      m.id === assistantId ? { ...m, content: assistantContent } : m
                    )
                  );
                }
              } catch {
                // Skip malformed chunks
              }
            }
          }
        }
      }

      // If streaming produced no content, set a fallback
      if (!assistantContent) {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? { ...m, content: "Je n'ai pas pu générer de réponse. Veuillez réessayer." }
              : m
          )
        );
      }
    } catch {
      // Track the failed content for retry
      setStreamError({ failedContent: content });
      setMessages((prev) => [
        ...prev,
        {
          id: `error-${Date.now()}`,
          role: "assistant",
          content: "Desole, une erreur est survenue lors de la generation de la reponse.",
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

  const handleReset = () => {
    setMessages([]);
    setInput("");
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Mestor AI"
        description="Votre assistant Brand OS intelligent."
        breadcrumbs={[
          { label: "Cockpit", href: "/cockpit" },
          { label: "Mestor" },
        ]}
      >
        {messages.length > 0 && (
          <button
            onClick={handleReset}
            className="flex items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-700"
          >
            <RotateCcw className="h-4 w-4" />
            Nouvelle conversation
          </button>
        )}
      </PageHeader>

      <div
        className="flex flex-col overflow-hidden rounded-xl border border-zinc-800"
        style={{ height: "calc(100vh - 220px)", minHeight: 500 }}
      >
        {/* Chat area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-zinc-950/30">
          {messages.length === 0 ? (
            /* Welcome screen */
            <div className="flex flex-col items-center justify-center h-full">
              <div className="rounded-2xl bg-gradient-to-br from-violet-500/20 to-purple-600/20 p-4">
                <Sparkles className="h-10 w-10 text-violet-400" />
              </div>
              <h3 className="mt-4 text-lg font-semibold text-white">
                Bienvenue sur Mestor AI
              </h3>
              <p className="mt-1 max-w-sm text-center text-sm text-zinc-400">
                Je suis votre assistant Brand OS. Posez-moi vos questions sur
                {strategyName ? ` ${strategyName},` : ""} vos guidelines, ou demandez un diagnostic.
              </p>

              {/* Quick prompts */}
              <div className="mt-6 grid grid-cols-1 gap-2 sm:grid-cols-2">
                {getQuickPrompts(strategy?.name).map((qp) => (
                  <button
                    key={qp.label}
                    onClick={() => handleSend(qp.prompt)}
                    className="flex items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-900/80 px-4 py-3 text-left transition-colors hover:border-zinc-700 hover:bg-zinc-800/80"
                  >
                    <qp.icon className="h-5 w-5 shrink-0 text-violet-400" />
                    <div>
                      <p className="text-sm font-medium text-white">
                        {qp.label}
                      </p>
                      <p className="mt-0.5 text-xs text-zinc-500 line-clamp-1">
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
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-violet-500/20">
                      <Bot className="h-4 w-4 text-violet-400" />
                    </div>
                  )}

                  <div
                    className={`group relative max-w-[75%] rounded-2xl px-4 py-3 ${
                      msg.role === "user"
                        ? "bg-violet-600 text-white"
                        : "bg-zinc-800 text-zinc-200"
                    }`}
                  >
                    <div className="whitespace-pre-wrap text-sm leading-relaxed">
                      {msg.content}
                    </div>
                    <div className="mt-1 flex items-center justify-between gap-2">
                      <span
                        className={`text-[10px] ${
                          msg.role === "user" ? "text-violet-300" : "text-zinc-600"
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
                            <Check className="h-3 w-3 text-emerald-400" />
                          ) : (
                            <Copy className="h-3 w-3 text-zinc-500 hover:text-zinc-300" />
                          )}
                        </button>
                      )}
                    </div>
                  </div>

                  {msg.role === "user" && (
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-zinc-800">
                      <User className="h-4 w-4 text-zinc-400" />
                    </div>
                  )}
                </div>
              ))}

              {/* Loading indicator */}
              {isLoading && (
                <div className="flex gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-violet-500/20">
                    <Bot className="h-4 w-4 text-violet-400" />
                  </div>
                  <div className="rounded-2xl bg-zinc-800 px-4 py-3">
                    <div className="flex gap-1">
                      <span className="h-2 w-2 animate-bounce rounded-full bg-zinc-500" style={{ animationDelay: "0ms" }} />
                      <span className="h-2 w-2 animate-bounce rounded-full bg-zinc-500" style={{ animationDelay: "150ms" }} />
                      <span className="h-2 w-2 animate-bounce rounded-full bg-zinc-500" style={{ animationDelay: "300ms" }} />
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
                    className="flex items-center gap-2 rounded-lg border border-red-800/30 bg-red-950/20 px-4 py-2 text-sm text-red-300 transition-colors hover:bg-red-950/40"
                  >
                    <RotateCcw className="h-4 w-4" />
                    Reessayer
                  </button>
                </div>
              )}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        {/* Context indicator */}
        {strategy && (
          <div className="border-t border-zinc-800/50 bg-zinc-900/40 px-4 py-1.5">
            <p className="text-[10px] text-zinc-600">
              Contexte : {strategy.name} - Score {(strategy.composite ?? 0).toFixed(0)}/200 ({strategy.classification})
            </p>
          </div>
        )}

        {/* Input area */}
        <div className="border-t border-zinc-800 bg-zinc-900/60 p-3">
          <div className="flex items-end gap-2">
            <div className="relative flex-1">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Posez une question a Mestor..."
                rows={1}
                className="w-full resize-none rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-2.5 text-sm text-white placeholder-zinc-500 outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/30"
                style={{ minHeight: 40, maxHeight: 120 }}
              />
            </div>
            <button
              onClick={() => handleSend()}
              disabled={!input.trim() || isLoading}
              className="shrink-0 rounded-xl bg-violet-600 p-2.5 text-white transition-colors hover:bg-violet-700 disabled:opacity-30 disabled:hover:bg-violet-600"
            >
              <Send className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
