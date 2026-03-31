"use client";

import { useChat, type Message } from "ai/react";
import { useRef, useEffect, useCallback } from "react";
import { Send, Bot, User, Sparkles, Minimize2, Maximize2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";

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

export function MestorPanel({ context, strategyId, className }: MestorPanelProps) {
  const [isMinimized, setIsMinimized] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { messages, input, handleInputChange, handleSubmit, isLoading, setMessages, append } = useChat({
    api: "/api/chat",
    body: { context, strategyId },
  });

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const handleSuggestion = (suggestion: string) => {
    append({ role: "user", content: suggestion });
  };

  if (isMinimized) {
    return (
      <button
        onClick={() => setIsMinimized(false)}
        className={cn(
          "flex items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900/80 px-4 py-3 transition-colors hover:border-zinc-600",
          className,
        )}
      >
        <Sparkles className="h-4 w-4 text-violet-400" />
        <span className="text-sm font-medium text-white">Mestor AI</span>
        <Maximize2 className="h-3.5 w-3.5 text-zinc-500" />
      </button>
    );
  }

  return (
    <div
      className={cn(
        "flex flex-col rounded-xl border border-zinc-800 bg-zinc-900/80",
        className,
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-violet-400/10">
            <Sparkles className="h-4 w-4 text-violet-400" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">Mestor AI</h3>
            <p className="text-[10px] text-zinc-500">{CONTEXT_LABELS[context]}</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setIsMinimized(true)}
            className="rounded p-1 text-zinc-500 hover:bg-zinc-800 hover:text-white"
          >
            <Minimize2 className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => setMessages([])}
            className="rounded p-1 text-zinc-500 hover:bg-zinc-800 hover:text-white"
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
            <p className="text-sm text-zinc-400">
              Bonjour ! Je suis Mestor, votre assistant ADVE-RTIS. Comment puis-je vous aider ?
            </p>
            <div className="space-y-1.5">
              {(CONTEXT_SUGGESTIONS[context] ?? []).map((suggestion) => (
                <button
                  key={suggestion}
                  onClick={() => handleSuggestion(suggestion)}
                  className="block w-full rounded-lg border border-zinc-800 px-3 py-2 text-left text-xs text-zinc-400 transition-colors hover:border-zinc-600 hover:text-zinc-200"
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
                msg.role === "user" ? "bg-zinc-700" : "bg-violet-400/20",
              )}
            >
              {msg.role === "user" ? (
                <User className="h-3.5 w-3.5 text-zinc-300" />
              ) : (
                <Bot className="h-3.5 w-3.5 text-violet-400" />
              )}
            </div>
            <div
              className={cn(
                "max-w-[85%] rounded-lg px-3 py-2 text-sm",
                msg.role === "user"
                  ? "bg-zinc-700 text-white"
                  : "bg-zinc-800/50 text-zinc-300",
              )}
            >
              <p className="whitespace-pre-wrap">{msg.content}</p>
            </div>
          </div>
        ))}

        {/* Loading indicator */}
        {isLoading && messages[messages.length - 1]?.role === "user" && (
          <div className="flex gap-2.5">
            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-violet-400/20">
              <Bot className="h-3.5 w-3.5 text-violet-400" />
            </div>
            <div className="rounded-lg bg-zinc-800/50 px-3 py-2">
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
      <form onSubmit={handleSubmit} className="border-t border-zinc-800 p-3">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={handleInputChange}
            placeholder="Demandez a Mestor..."
            disabled={isLoading}
            className="flex-1 rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-white placeholder-zinc-500 outline-none transition-colors focus:border-violet-500 focus:ring-1 focus:ring-violet-500 disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="flex items-center justify-center rounded-lg bg-violet-500 px-3 py-2 text-white transition-colors hover:bg-violet-600 disabled:opacity-50"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </form>
    </div>
  );
}
