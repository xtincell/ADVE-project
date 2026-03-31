"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Search, ArrowRight, Clock, FileText, Target, Users, BarChart3, Megaphone, Building, Layers, X } from "lucide-react";

interface CommandItem {
  id: string;
  label: string;
  href: string;
  section: string;
  icon: React.ElementType;
  keywords?: string;
}

const PAGE_ITEMS: CommandItem[] = [
  // Cockpit
  { id: "c-dash", label: "Tableau de bord", href: "/cockpit", section: "Brand OS", icon: BarChart3, keywords: "dashboard cockpit" },
  { id: "c-missions", label: "Missions", href: "/cockpit/operate/missions", section: "Brand OS > Operations", icon: Target },
  { id: "c-campaigns", label: "Campagnes", href: "/cockpit/operate/campaigns", section: "Brand OS > Operations", icon: Megaphone },
  { id: "c-briefs", label: "Briefs", href: "/cockpit/operate/briefs", section: "Brand OS > Operations", icon: FileText },
  { id: "c-identity", label: "Identite ADVE", href: "/cockpit/brand/identity", section: "Brand OS > Marque", icon: FileText, keywords: "profil marque pilier" },
  { id: "c-guidelines", label: "Guidelines", href: "/cockpit/brand/guidelines", section: "Brand OS > Marque", icon: FileText },
  { id: "c-assets", label: "Brand Vault", href: "/cockpit/brand/assets", section: "Brand OS > Marque", icon: FileText },
  { id: "c-reports", label: "Value Reports", href: "/cockpit/insights/reports", section: "Brand OS > Insights", icon: BarChart3 },
  { id: "c-diag", label: "Diagnostics", href: "/cockpit/insights/diagnostics", section: "Brand OS > Insights", icon: BarChart3, keywords: "artemis radar pilier" },
  { id: "c-bench", label: "Benchmarks", href: "/cockpit/insights/benchmarks", section: "Brand OS > Insights", icon: BarChart3 },
  // Creator
  { id: "cr-dash", label: "Tableau de bord", href: "/creator", section: "Guild OS", icon: BarChart3, keywords: "dashboard creator" },
  { id: "cr-avail", label: "Missions disponibles", href: "/creator/missions/available", section: "Guild OS > Missions", icon: Target },
  { id: "cr-active", label: "Missions en cours", href: "/creator/missions/active", section: "Guild OS > Missions", icon: Target },
  { id: "cr-collab", label: "Missions collaboratives", href: "/creator/missions/collab", section: "Guild OS > Missions", icon: Users },
  { id: "cr-metrics", label: "Metriques", href: "/creator/progress/metrics", section: "Guild OS > Progression", icon: BarChart3 },
  { id: "cr-path", label: "Parcours", href: "/creator/progress/path", section: "Guild OS > Progression", icon: BarChart3, keywords: "tier apprenti compagnon" },
  { id: "cr-earn", label: "Gains missions", href: "/creator/earnings/missions", section: "Guild OS > Gains", icon: BarChart3, keywords: "revenue facture" },
  { id: "cr-learn", label: "Apprendre ADVE", href: "/creator/learn/adve", section: "Guild OS > Apprendre", icon: FileText },
  // Console
  { id: "co-dash", label: "Ecosysteme", href: "/console", section: "Console", icon: BarChart3, keywords: "dashboard fixer" },
  { id: "co-clients", label: "Clients", href: "/console/oracle/clients", section: "Console > L'Oracle", icon: Building },
  { id: "co-intake", label: "Pipeline Intake", href: "/console/oracle/intake", section: "Console > L'Oracle", icon: Target, keywords: "prospect conversion" },
  { id: "co-boot", label: "Boot Sequence", href: "/console/oracle/boot", section: "Console > L'Oracle", icon: Target, keywords: "onboarding" },
  { id: "co-intel", label: "Intelligence", href: "/console/signal/intelligence", section: "Console > Le Signal", icon: BarChart3 },
  { id: "co-signals", label: "Signaux", href: "/console/signal/signals", section: "Console > Le Signal", icon: BarChart3 },
  { id: "co-kg", label: "Knowledge Graph", href: "/console/signal/knowledge", section: "Console > Le Signal", icon: Layers },
  { id: "co-guild", label: "Guilde", href: "/console/arene/guild", section: "Console > L'Arene", icon: Users, keywords: "creatif freelance" },
  { id: "co-match", label: "Matching", href: "/console/arene/matching", section: "Console > L'Arene", icon: Users },
  { id: "co-miss", label: "Missions", href: "/console/fusee/missions", section: "Console > La Fusee", icon: Target },
  { id: "co-camp", label: "Campagnes", href: "/console/fusee/campaigns", section: "Console > La Fusee", icon: Megaphone },
  { id: "co-rev", label: "Revenus", href: "/console/socle/revenue", section: "Console > Le Socle", icon: BarChart3, keywords: "finance argent" },
  { id: "co-comm", label: "Commissions", href: "/console/socle/commissions", section: "Console > Le Socle", icon: BarChart3 },
];

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
}

export function CommandPalette({ open, onClose }: CommandPaletteProps) {
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [recentPaths, setRecentPaths] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  useEffect(() => {
    const stored = localStorage.getItem("lf-recent-pages");
    if (stored) setRecentPaths(JSON.parse(stored));
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
                Tapez pour rechercher dans LaFusee
              </p>
            )}

            {!query.trim() && recentItems.length > 0 && (
              <p className="mb-1 px-3 text-[10px] font-semibold uppercase tracking-[0.05em] text-foreground-muted">
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
            <span className="text-[10px] text-foreground-muted">
              <kbd className="rounded border border-border-subtle bg-background px-1 py-0.5 text-[9px]">↑↓</kbd> naviguer
            </span>
            <span className="text-[10px] text-foreground-muted">
              <kbd className="rounded border border-border-subtle bg-background px-1 py-0.5 text-[9px]">⏎</kbd> ouvrir
            </span>
            <span className="text-[10px] text-foreground-muted">
              <kbd className="rounded border border-border-subtle bg-background px-1 py-0.5 text-[9px]">esc</kbd> fermer
            </span>
          </div>
        </div>
      </div>
    </>
  );
}
