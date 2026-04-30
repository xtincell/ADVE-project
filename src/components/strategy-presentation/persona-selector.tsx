"use client";

import { Users, Briefcase, Palette } from "lucide-react";
import type { PresentationPersona } from "@/server/services/strategy-presentation/types";

const PERSONAS: { key: PresentationPersona; label: string; icon: typeof Users; description: string }[] = [
  { key: "consultant", label: "Consultant", icon: Briefcase, description: "Vue complete (13 sections)" },
  { key: "client", label: "Client", icon: Users, description: "Presentation commerciale" },
  { key: "creative", label: "Creative", icon: Palette, description: "Brief creatif & execution" },
];

interface PersonaSelectorProps {
  current: PresentationPersona;
  onChange: (persona: PresentationPersona) => void;
}

export function PersonaSelector({ current, onChange }: PersonaSelectorProps) {
  return (
    <div className="flex gap-1 rounded-xl bg-background p-1">
      {PERSONAS.map(({ key, label, icon: Icon, description }) => {
        const active = current === key;
        return (
          <button
            key={key}
            onClick={() => onChange(key)}
            title={description}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all ${
              active
                ? "bg-background text-orange-400 shadow-sm"
                : "text-foreground-muted hover:text-foreground-secondary"
            }`}
          >
            <Icon className="h-4 w-4" />
            <span className="hidden sm:inline">{label}</span>
          </button>
        );
      })}
    </div>
  );
}
