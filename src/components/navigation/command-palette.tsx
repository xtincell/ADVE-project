"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Search, ArrowRight, Clock, X, FileText } from "lucide-react";
import type { NavGroup } from "./types";

interface CommandItem {
  id: string;
  label: string;
  href: string;
  section: string;
  icon: React.ElementType;
  keywords?: string;
}

/**
 * Mots-clés d'appoint par href — pour que les pages « invisibles au nom » se
 * trouvent quand même (le Credentials Vault sous « api », « clés », « apify »…).
 * Le reste de l'index est DÉRIVÉ de la nav du portail courant (plus de liste
 * figée qui oublie des pages — mandat go-live : « je ne trouve même pas mes
 * clés avec le moteur de recherche »).
 */
const KEYWORD_HINTS: Record<string, string> = {
  "/console/anubis/credentials": "api clés cles secrets tokens connecteurs apify vault coffre credentials",
  "/console/anubis/api-billing": "api clé mcp facturation billing metering endpoint",
  "/console/socle/pricing": "clés paiement stripe providers env secrets abonnement",
  "/console/signal/prospect-scoring": "scorer prospect concurrent leaderboard force révélée",
  "/console/signal/brand-directory": "base de marques répertoire empreintes observées annuaire directory",
  "/console/signal/scoreur-canon": "canon scoreur jauge ancres items ratification étalons",
  "/console/socle/feedback": "bug retours testeurs remontées support",
  "/cockpit/settings/connections": "connexions réseaux oauth social shopify mcp clé api login",
  "/console/socle/manual-subscriptions": "abonnement manuel whatsapp paiement validation",
};

/** Aplati les nav-groups du portail courant en items de recherche. */
function itemsFromNavGroups(groups: NavGroup[], portalLabel: string): CommandItem[] {
  const out: CommandItem[] = [];
  const seen = new Set<string>();
  for (const g of groups) {
    for (const it of g.items) {
      if (seen.has(it.href)) continue;
      seen.add(it.href);
      const section = g.title ? `${portalLabel} › ${g.title}` : portalLabel;
      out.push({
        id: it.href,
        label: it.label,
        href: it.href,
        section,
        icon: it.icon ?? FileText,
        keywords: [it.sublabel, KEYWORD_HINTS[it.href]].filter(Boolean).join(" ") || undefined,
      });
    }
  }
  return out;
}

const PORTAL_LABELS: Record<string, string> = {
  cockpit: "Cockpit",
  creator: "Espace créateur",
  console: "Console",
  agency: "Agence",
};

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
  /** Nav-groups du portail courant — source de l'index (scoping + exhaustivité). */
  navGroups?: NavGroup[];
  portal?: string;
}

export function CommandPalette({ open, onClose, navGroups, portal }: CommandPaletteProps) {
  const PAGE_ITEMS = useMemo(
    () => itemsFromNavGroups(navGroups ?? [], PORTAL_LABELS[portal ?? ""] ?? "Menu"),
    [navGroups, portal],
  );
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [recentPaths, setRecentPaths] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  useEffect(() => {
    const stored = localStorage.getItem("lf-recent-pages");
    if (stored) {
      // round-14b : JSON.parse gardé (mêmes raisons que sidebar) — une valeur
      // corrompue ne doit pas jeter à l'ouverture de la palette.
      try {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) setRecentPaths(parsed);
      } catch {
        /* valeur corrompue — ignorer */
      }
    }
  }, [open]);

  useEffect(() => {
    if (open) {
      setQuery("");
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  const filteredItems = query.trim()
    ? PAGE_ITEMS.filter((item) => {
        const q = query.toLowerCase();
        return (
          item.label.toLowerCase().includes(q) ||
          item.section.toLowerCase().includes(q) ||
          item.keywords?.toLowerCase().includes(q)
        );
      })
    : [];

  const recentItems = !query.trim()
    ? PAGE_ITEMS.filter((item) => recentPaths.includes(item.href)).slice(0, 5)
    : [];

  const displayItems = query.trim() ? filteredItems : recentItems;

  const navigate = useCallback(
    (href: string) => {
      // Track recent
      const updated = [href, ...recentPaths.filter((p) => p !== href)].slice(0, 10);
      localStorage.setItem("lf-recent-pages", JSON.stringify(updated));
      router.push(href);
      onClose();
    },
    [router, onClose, recentPaths]
  );

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((i) => Math.min(i + 1, displayItems.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((i) => Math.max(i - 1, 0));
      } else if (e.key === "Enter" && displayItems[selectedIndex]) {
        navigate(displayItems[selectedIndex].href);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose, displayItems, selectedIndex, navigate]);

  if (!open) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-[var(--z-command)] bg-background/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="fixed left-1/2 top-[20%] z-[var(--z-command)] w-full max-w-[640px] -translate-x-1/2 px-4 animate-[scale-in_150ms_ease-out]">
        <div className="overflow-hidden rounded-xl border border-border bg-background-raised shadow-xl">
          {/* Search input */}
          <div className="flex items-center gap-3 border-b border-border-subtle px-4">
            <Search className="h-4 w-4 shrink-0 text-foreground-muted" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setSelectedIndex(0);
              }}
              placeholder="Rechercher une page, entite, action..."
              className="h-12 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-foreground-muted"
            />
            {query && (
              <button onClick={() => setQuery("")} className="text-foreground-muted hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Results */}
          <div className="max-h-80 overflow-y-auto p-2">
            {!query.trim() && recentItems.length === 0 && (
              <p className="px-3 py-6 text-center text-sm text-foreground-muted">
                Tapez pour rechercher dans votre espace
              </p>
            )}

            {!query.trim() && recentItems.length > 0 && (
              <p className="mb-1 px-3 text-2xs font-semibold uppercase tracking-[0.05em] text-foreground-muted">
                <Clock className="mr-1 inline h-3 w-3" />
                Recents
              </p>
            )}

            {query.trim() && filteredItems.length === 0 && (
              <p className="px-3 py-6 text-center text-sm text-foreground-muted">
                Aucun resultat pour &quot;{query}&quot;
              </p>
            )}

            {displayItems.map((item, i) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => navigate(item.href)}
                  onMouseEnter={() => setSelectedIndex(i)}
                  className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors ${
                    i === selectedIndex ? "bg-background-overlay" : "hover:bg-background-overlay/50"
                  }`}
                >
                  <Icon className="h-4 w-4 shrink-0 text-foreground-muted" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">{item.label}</p>
                    <p className="truncate text-xs text-foreground-muted">{item.section}</p>
                  </div>
                  <ArrowRight className="h-3 w-3 shrink-0 text-foreground-muted" />
                </button>
              );
            })}
          </div>

          {/* Footer */}
          <div className="flex items-center gap-4 border-t border-border-subtle px-4 py-2">
            <span className="text-2xs text-foreground-muted">
              <kbd className="rounded border border-border-subtle bg-background px-1 py-0.5 text-[9px]">↑↓</kbd> naviguer
            </span>
            <span className="text-2xs text-foreground-muted">
              <kbd className="rounded border border-border-subtle bg-background px-1 py-0.5 text-[9px]">⏎</kbd> ouvrir
            </span>
            <span className="text-2xs text-foreground-muted">
              <kbd className="rounded border border-border-subtle bg-background px-1 py-0.5 text-[9px]">esc</kbd> fermer
            </span>
          </div>
        </div>
      </div>
    </>
  );
}
