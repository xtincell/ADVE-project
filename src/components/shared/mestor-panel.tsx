"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { useRef, useEffect, useCallback, useState } from "react";
import { Send, Bot, User, Sparkles, Minimize2, Maximize2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { AiBadge } from "@/components/shared/ai-badge";

interface MestorPanelProps {
  context: "cockpit" | "creator" | "console" | "intake";
  strategyId?: string;
  className?: string;
}

const CONTEXT_LABELS = {
  cockpit: "Assistant Brand OS",
  creator: "Assistant Mission & Guidelines",
  console: "Assistant Ecosysteme",
  intake: "Guide diagnostic ADVE",
};

const CONTEXT_SUGGESTIONS: Record<string, string[]> = {
  cockpit: [
    "Quel est l'etat de sante de ma marque ?",
    "Quels piliers dois-je ameliorer en priorite ?",
    "Propose un plan d'action pour le prochain trimestre",
  ],
  creator: [
    "Quelles sont les guidelines pour cette mission ?",
    "Comment aligner mon contenu avec les piliers ADVE ?",
    "Quels sont les points cles du brief ?",
  ],
  console: [
    "Quel client necessite une attention immediate ?",
    "Quels sont les upsells potentiels ?",
    "Resume les alertes SLA actives",
  ],
  intake: [
    "Aide-moi a comprendre mon score",
    "Quels sont mes points forts ?",
    "Comment ameliorer mon pilier le plus faible ?",
  ],
};

function messageText(msg: UIMessage): string {
  if (!Array.isArray(msg.parts)) return "";
  return msg.parts
    .filter((p): p is { type: "text"; text: string } => p.type === "text")
    .map((p) => p.text)
    .join("");
}

export function MestorPanel({ context, strategyId, className }: MestorPanelProps) {
  const [isMinimized, setIsMinimized] = useState(false);
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { messages, sendMessage, setMessages, status } = useChat({
    transport: new DefaultChatTransport({
      api: "/api/chat",
      body: { context, strategyId },
    }),
  });

  const isLoading = status === "submitted" || status === "streaming";

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const handleSuggestion = (suggestion: string) => {
    sendMessage({ text: suggestion });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if (!text) return;
    sendMessage({ text });
    setInput("");
  };

  if (isMinimized) {
    return (
      <button
        onClick={() => setIsMinimized(false)}
        className={cn(
          "flex items-center gap-2 rounded-xl border border-border bg-background/80 px-4 py-3 transition-colors hover:border-border-strong",
          className,
        )}
      >
        <Sparkles className="h-4 w-4 text-accent" />
        <span className="text-sm font-medium text-white">Mestor AI</span>
        <AiBadge />
        <Maximize2 className="h-3.5 w-3.5 text-foreground-muted" />
      </button>
    );
  }

  return (
    <div
      className={cn(
        "flex flex-col rounded-xl border border-border bg-background/80",
        className,
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent/10">
            <Sparkles className="h-4 w-4 text-accent" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">Mestor AI</h3>
            <p className="text-[10px] text-foreground-muted">{CONTEXT_LABELS[context]}</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setIsMinimized(true)}
            className="rounded p-1 text-foreground-muted hover:bg-background hover:text-white"
          >
            <Minimize2 className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => setMessages([])}
            className="rounded p-1 text-foreground-muted hover:bg-background hover:text-white"
            title="Nouvelle conversation"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4" style={{ minHeight: 200, maxHeight: 400 }}>
        {messages.length === 0 && (
          <div className="space-y-3">
            <p className="text-sm text-foreground-secondary">
              Bonjour ! Je suis Mestor, votre assistant ADVE-RTIS. Comment puis-je vous aider ?
            </p>
            <div className="space-y-1.5">
              {(CONTEXT_SUGGESTIONS[context] ?? []).map((suggestion) => (
                <button
                  key={suggestion}
                  onClick={() => handleSuggestion(suggestion)}
                  className="block w-full rounded-lg border border-border px-3 py-2 text-left text-xs text-foreground-secondary transition-colors hover:border-border-strong hover:text-foreground"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg) => (
          <div
            key={msg.id}
            className={cn("flex gap-2.5", msg.role === "user" ? "flex-row-reverse" : "")}
          >
            <div
              className={cn(
                "flex h-6 w-6 shrink-0 items-center justify-center rounded-full",
                msg.role === "user" ? "bg-surface-raised" : "bg-accent/20",
              )}
            >
              {msg.role === "user" ? (
                <User className="h-3.5 w-3.5 text-foreground-secondary" />
              ) : (
                <Bot className="h-3.5 w-3.5 text-accent" />
              )}
            </div>
            <div
              className={cn(
                "max-w-[85%] rounded-lg px-3 py-2 text-sm",
                msg.role === "user"
                  ? "bg-surface-raised text-white"
                  : "bg-background/50 text-foreground-secondary",
              )}
            >
              <p className="whitespace-pre-wrap">{messageText(msg)}</p>
            </div>
          </div>
        ))}

        {/* Loading indicator */}
        {isLoading && messages[messages.length - 1]?.role === "user" && (
          <div className="flex gap-2.5">
            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent/20">
              <Bot className="h-3.5 w-3.5 text-accent" />
            </div>
            <div className="rounded-lg bg-background/50 px-3 py-2">
              <div className="flex gap-1">
                <span className="h-2 w-2 animate-bounce rounded-full bg-zinc-500" style={{ animationDelay: "0ms" }} />
                <span className="h-2 w-2 animate-bounce rounded-full bg-zinc-500" style={{ animationDelay: "150ms" }} />
                <span className="h-2 w-2 animate-bounce rounded-full bg-zinc-500" style={{ animationDelay: "300ms" }} />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="border-t border-border p-3">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Demandez a Mestor..."
            disabled={isLoading}
            className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm text-white placeholder-zinc-500 outline-none transition-colors focus:border-accent focus:ring-1 focus:ring-violet-500 disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="flex items-center justify-center rounded-lg bg-accent px-3 py-2 text-white transition-colors hover:bg-accent disabled:opacity-50"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </form>
    </div>
  );
}
