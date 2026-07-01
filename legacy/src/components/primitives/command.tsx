"use client";

/**
 * Command palette (Cmd+K) — minimaliste, sans dep externe.
 * Pour features avancées (cmdk lib), upgrade en PR ultérieure.
 */

import * as React from "react";
import { cn } from "@/lib/utils";
import { Dialog } from "./dialog";

export interface CommandItem {
  id: string;
  label: string;
  hint?: string;
  onSelect: () => void;
}

export interface CommandProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: CommandItem[];
  placeholder?: string;
}

export function Command({ open, onOpenChange, items, placeholder = "Rechercher…" }: CommandProps) {
  const [query, setQuery] = React.useState("");
  const [activeIndex, setActiveIndex] = React.useState(0);
  const filtered = React.useMemo(
    () => items.filter((i) => i.label.toLowerCase().includes(query.toLowerCase())),
    [items, query],
  );

  React.useEffect(() => { setActiveIndex(0); }, [query]);

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setActiveIndex((i) => Math.min(i + 1, filtered.length - 1)); }
    if (e.key === "ArrowUp") { e.preventDefault(); setActiveIndex((i) => Math.max(i - 1, 0)); }
    if (e.key === "Enter" && filtered[activeIndex]) { filtered[activeIndex]!.onSelect(); onOpenChange(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange} size="md" className="!p-0 z-[var(--z-command)]">
      <div className="flex flex-col">
        <input
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKey}
          placeholder={placeholder}
          aria-label="Recherche commande"
          aria-autocomplete="list"
          aria-controls="command-list"
          aria-activedescendant={filtered[activeIndex]?.id}
          className="bg-transparent px-4 py-3 border-b border-[var(--color-border)] text-[var(--color-foreground)] placeholder:text-[var(--color-foreground-muted)] outline-none text-sm"
        />
        <ul id="command-list" role="listbox" className="max-h-80 overflow-y-auto py-1">
          {filtered.length === 0 ? (
            <li className="px-4 py-3 text-sm text-[var(--color-foreground-muted)]">Aucun résultat</li>
          ) : (
            filtered.map((item, i) => (
              <li
                key={item.id}
                id={item.id}
                role="option"
                aria-selected={i === activeIndex}
                onClick={() => { item.onSelect(); onOpenChange(false); }}
                onMouseEnter={() => setActiveIndex(i)}
                className={cn(
                  "px-4 py-2 cursor-pointer flex items-center justify-between text-sm",
                  i === activeIndex ? "bg-[var(--color-accent-subtle)] text-[var(--color-foreground)]" : "text-[var(--color-foreground-secondary)]",
                )}
              >
                <span>{item.label}</span>
                {item.hint && <span className="text-xs text-[var(--color-foreground-muted)] font-mono">{item.hint}</span>}
              </li>
            ))
          )}
        </ul>
      </div>
    </Dialog>
  );
}
