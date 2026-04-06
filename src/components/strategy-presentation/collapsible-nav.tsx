"use client";

import { SECTION_REGISTRY } from "@/server/services/strategy-presentation/types";
import type { PresentationPersona } from "@/server/services/strategy-presentation/types";

interface CollapsibleNavProps {
  persona: PresentationPersona;
  activeSection: string;
}

export function CollapsibleNav({ persona, activeSection }: CollapsibleNavProps) {
  const visibleSections = SECTION_REGISTRY.filter((s) => s.personas.includes(persona));

  return (
    <nav className="no-print space-y-1">
      {visibleSections.map((section) => {
        const active = activeSection === section.id;
        return (
          <a
            key={section.id}
            href={`#${section.id}`}
            className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
              active
                ? "bg-zinc-800 text-orange-400"
                : "text-zinc-500 hover:bg-zinc-900 hover:text-zinc-300"
            }`}
          >
            <span
              className={`text-xs font-bold tabular-nums ${
                active ? "text-orange-400" : "text-zinc-700"
              }`}
            >
              {section.number}
            </span>
            <span className="truncate">{section.title}</span>
          </a>
        );
      })}
    </nav>
  );
}
