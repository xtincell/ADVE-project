"use client";

import { useState, useRef, useEffect } from "react";
import { Brain, X, Send, Sparkles, ArrowRight } from "lucide-react";
import { AiBadge } from "@/components/shared/ai-badge";

interface MestorMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

interface MestorSuggestion {
  id: string;
  text: string;
  action?: string;
  pillar?: string;
}

interface MestorPanelFloatProps {
  portalContext?: "cockpit" | "creator" | "console" | "intake";
  suggestions?: MestorSuggestion[];
  className?: string;
}

export function MestorPanelFloat({
  portalContext = "cockpit",
  suggestions = [],
  className,
}: MestorPanelFloatProps) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<MestorMessage[]>([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [open]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const contextLabels: Record<string, string> = {
    cockpit: "Strategie de marque",
    creator: "Missions & briefs",
    console: "Ecosysteme complet",
    intake: "Interview guidee",
  };

  const quickActions: Record<string, { label: string; prompt: string }[]> = {
    cockpit: [
      { label: "Analyser mon score", prompt: "Analyse mon score ADVE-RTIS actuel et identifie les piliers les plus faibles" },
      { label: "Generer prescription", prompt: "Genere une prescription pour ameliorer mon pilier le plus faible" },
    ],
    creator: [
      { label: "Comprendre le brief", prompt: "Explique-moi le brief de ma mission active" },
      { label: "Tips Driver", prompt: "Donne-moi des conseils pour le Driver de cette mission" },
    ],
    console: [
      { label: "Vue ecosysteme", prompt: "Donne-moi un resume de l'etat de l'ecosysteme" },
      { label: "Alertes prioritaires", prompt: "Quelles sont les alertes les plus urgentes ?" },
    ],
    intake: [
      { label: "Question suivante", prompt: "Passons a la question suivante du diagnostic" },
    ],
  };

  const handleSend = () => {
    if (!input.trim()) return;

    const userMessage: MestorMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: input,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsTyping(true);

    // Simulate AI response (replace with actual API call)
    setTimeout(() => {
      const assistantMessage: MestorMessage = {
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content: "Je suis Mestor, votre assistant IA contextuel. Cette fonctionnalite sera connectee a l'API Anthropic pour fournir des reponses intelligentes basees sur le contexte de votre portail.",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, assistantMessage]);
      setIsTyping(false);
    }, 1500);
  };

  const handleQuickAction = (prompt: string) => {
    setInput(prompt);
    setTimeout(() => handleSend(), 100);
  };

  return (
    <>
      {/* FAB Button */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className={`fixed bottom-6 right-6 z-[var(--z-mestor)] flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-all hover:scale-105 hover:shadow-glow-primary md:bottom-8 md:right-8 ${
            suggestions.length > 0 ? "animate-[pulse-glow_2s_ease-in-out_infinite]" : ""
          } ${className ?? ""}`}
          aria-label="Ouvrir Mestor AI"
          style={{ bottom: "calc(var(--mobile-tab-height) + 1.5rem)" }}
        >
          <Brain className="h-6 w-6" />
          {suggestions.length > 0 && (
            <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-warning px-1 text-[10px] font-bold text-warning-foreground">
              {suggestions.length}
            </span>
          )}
        </button>
      )}

      {/* Panel */}
      {open && (
        <div
          className="fixed bottom-6 right-6 z-[var(--z-mestor)] flex w-[min(400px,calc(100vw-2rem))] flex-col overflow-hidden rounded-2xl border border-border bg-background-raised shadow-xl md:bottom-8 md:right-8 animate-[scale-in_200ms_ease-spring]"
          style={{
            height: "min(600px, calc(100vh - 8rem))",
            bottom: "calc(var(--mobile-tab-height) + 1.5rem)",
          }}
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border-subtle px-4 py-3">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary-subtle">
                <Brain className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="flex items-center gap-1.5 text-sm font-semibold text-foreground">Mestor AI <AiBadge /></p>
                <p className="text-[10px] text-foreground-muted">{contextLabels[portalContext]}</p>
              </div>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="flex h-7 w-7 items-center justify-center rounded-md text-foreground-muted transition-colors hover:bg-background-overlay hover:text-foreground"
              aria-label="Fermer Mestor"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Chat area */}
          <div className="flex-1 overflow-y-auto p-4">
            {messages.length === 0 && (
              <div className="flex flex-col items-center py-8 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary-subtle">
                  <Sparkles className="h-6 w-6 text-primary" />
                </div>
                <p className="mt-3 text-sm font-medium text-foreground">Bonjour, je suis Mestor</p>
                <p className="mt-1 text-xs text-foreground-muted">
                  Votre assistant IA contextuel.
                  <br />
                  Posez-moi une question ou utilisez une action rapide.
                </p>
              </div>
            )}

            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`mb-3 flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[85%] rounded-xl px-3 py-2 text-sm ${
                    msg.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-background-overlay text-foreground"
                  }`}
                >
                  {msg.content}
                </div>
              </div>
            ))}

            {isTyping && (
              <div className="mb-3 flex justify-start">
                <div className="flex gap-1 rounded-xl bg-background-overlay px-4 py-3">
                  <span className="h-2 w-2 animate-bounce rounded-full bg-foreground-muted" style={{ animationDelay: "0ms" }} />
                  <span className="h-2 w-2 animate-bounce rounded-full bg-foreground-muted" style={{ animationDelay: "150ms" }} />
                  <span className="h-2 w-2 animate-bounce rounded-full bg-foreground-muted" style={{ animationDelay: "300ms" }} />
                </div>
              </div>
            )}

            <div ref={chatEndRef} />
          </div>

          {/* Quick actions */}
          {messages.length === 0 && (
            <div className="border-t border-border-subtle px-4 py-2">
              <div className="flex flex-wrap gap-1.5">
                {(quickActions[portalContext] ?? []).map((action) => (
                  <button
                    key={action.label}
                    onClick={() => handleQuickAction(action.prompt)}
                    className="flex items-center gap-1 rounded-full border border-border-subtle px-2.5 py-1 text-[11px] font-medium text-foreground-secondary transition-colors hover:border-primary hover:text-primary"
                  >
                    <Sparkles className="h-3 w-3" />
                    {action.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Input */}
          <div className="border-t border-border-subtle px-4 py-3">
            <div className="flex items-center gap-2">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSend()}
                placeholder="Posez une question..."
                className="flex-1 rounded-lg bg-background-overlay px-3 py-2 text-sm text-foreground outline-none placeholder:text-foreground-muted focus:ring-1 focus:ring-primary"
              />
              <button
                onClick={handleSend}
                disabled={!input.trim()}
                className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground transition-opacity disabled:opacity-30"
                aria-label="Envoyer"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/* ───── Contextual Suggestion Card (inline in pages) ───── */
interface MestorSuggestionCardProps {
  text: string;
  actions?: { label: string; onClick: () => void }[];
  onDismiss?: () => void;
}

export function MestorSuggestionCard({ text, actions, onDismiss }: MestorSuggestionCardProps) {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  return (
    <div className="flex items-start gap-3 rounded-xl border border-primary-subtle bg-primary-subtle/30 p-4 animate-[slide-up_250ms_ease-out]">
      <Brain className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
      <div className="flex-1">
        <p className="text-sm text-foreground-secondary">{text}</p>
        {actions && actions.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-2">
            {actions.map((action) => (
              <button
                key={action.label}
                onClick={action.onClick}
                className="flex items-center gap-1 rounded-md bg-primary px-2.5 py-1 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary-hover"
              >
                {action.label}
                <ArrowRight className="h-3 w-3" />
              </button>
            ))}
          </div>
        )}
      </div>
      <button
        onClick={() => {
          setDismissed(true);
          onDismiss?.();
        }}
        className="flex h-6 w-6 items-center justify-center rounded-md text-foreground-muted transition-colors hover:bg-background-overlay hover:text-foreground"
        aria-label="Ignorer la suggestion"
      >
        <X className="h-3 w-3" />
      </button>
    </div>
  );
}
