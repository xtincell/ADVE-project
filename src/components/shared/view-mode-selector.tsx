"use client";

import { useState, useEffect, useCallback, createContext, useContext } from "react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ViewMode = "EXECUTIVE" | "MARKETING" | "FOUNDER" | "MINIMAL";

interface ViewModeOption {
  value: ViewMode;
  label: string;
  description: string;
  icon: string;
}

const VIEW_MODES: ViewModeOption[] = [
  {
    value: "EXECUTIVE",
    label: "Vue Ex\u00e9cutive",
    description: "Synth\u00e8se strat\u00e9gique pour dirigeants",
    icon: "\u{1F3AF}",
  },
  {
    value: "MARKETING",
    label: "Vue Marketing",
    description: "Focus campagnes, drivers et m\u00e9triques",
    icon: "\u{1F4CA}",
  },
  {
    value: "FOUNDER",
    label: "Vue Fondateur",
    description: "Vision compl\u00e8te avec tous les d\u00e9tails",
    icon: "\u{1F9E0}",
  },
  {
    value: "MINIMAL",
    label: "Vue Minimale",
    description: "Essentiel uniquement, sans distraction",
    icon: "\u26A1",
  },
];

const STORAGE_KEY = "cockpit-view-mode";

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

interface ViewModeContextValue {
  mode: ViewMode;
  setMode: (mode: ViewMode) => void;
}

const ViewModeContext = createContext<ViewModeContextValue | null>(null);

export function ViewModeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<ViewMode>("EXECUTIVE");

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY) as ViewMode | null;
    if (stored && VIEW_MODES.some((m) => m.value === stored)) {
      setModeState(stored);
    }
  }, []);

  const setMode = useCallback((next: ViewMode) => {
    setModeState(next);
    localStorage.setItem(STORAGE_KEY, next);
  }, []);

  return (
    <ViewModeContext.Provider value={{ mode, setMode }}>
      {children}
    </ViewModeContext.Provider>
  );
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useViewMode(): ViewModeContextValue {
  const ctx = useContext(ViewModeContext);
  if (!ctx) {
    // Fallback for usage outside provider: standalone localStorage-based state
    const [mode, setModeState] = useState<ViewMode>(() => {
      if (typeof window === "undefined") return "EXECUTIVE";
      const stored = localStorage.getItem(STORAGE_KEY) as ViewMode | null;
      return stored && VIEW_MODES.some((m) => m.value === stored)
        ? stored
        : "EXECUTIVE";
    });
    const setMode = useCallback((next: ViewMode) => {
      setModeState(next);
      localStorage.setItem(STORAGE_KEY, next);
    }, []);
    return { mode, setMode };
  }
  return ctx;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function ViewModeSelector() {
  const { mode, setMode } = useViewMode();
  const [open, setOpen] = useState(false);

  const current = VIEW_MODES.find((m) => m.value === mode) ?? VIEW_MODES[0]!;

  return (
    <div className="relative inline-block text-left">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="flex items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-200 hover:border-zinc-500 hover:bg-zinc-800 transition-colors"
      >
        <span>{current!.icon}</span>
        <span className="font-medium">{current!.label}</span>
        <svg
          className={`h-4 w-4 text-zinc-400 transition-transform ${open ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-72 origin-top-right rounded-lg border border-zinc-700 bg-zinc-900 shadow-xl">
          <div className="p-1">
            {VIEW_MODES.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  setMode(option.value);
                  setOpen(false);
                }}
                className={`flex w-full items-start gap-3 rounded-md px-3 py-2.5 text-left transition-colors ${
                  mode === option.value
                    ? "bg-zinc-800 text-white"
                    : "text-zinc-300 hover:bg-zinc-800/60 hover:text-white"
                }`}
              >
                <span className="mt-0.5 text-lg">{option.icon}</span>
                <div>
                  <div className="text-sm font-medium">{option.label}</div>
                  <div className="text-xs text-zinc-500">{option.description}</div>
                </div>
                {mode === option.value && (
                  <svg
                    className="ml-auto mt-1 h-4 w-4 text-emerald-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
