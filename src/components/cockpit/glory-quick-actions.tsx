"use client";

import { trpc } from "@/lib/trpc/client";
import {
  Rocket,
  Video,
  Image,
  Radio,
  Users,
  Share2,
  FileText,
  Search,
  RefreshCw,
  Type,
  Package,
  Award,
  Calendar,
  TrendingUp,
  Globe,
  Flag,
  type LucideIcon,
} from "lucide-react";

const ICON_MAP: Record<string, LucideIcon> = {
  rocket: Rocket,
  video: Video,
  image: Image,
  radio: Radio,
  users: Users,
  "share-2": Share2,
  "file-text": FileText,
  search: Search,
  "refresh-cw": RefreshCw,
  type: Type,
  package: Package,
  award: Award,
  calendar: Calendar,
  "trending-up": TrendingUp,
  globe: Globe,
  flag: Flag,
};

const CATEGORY_COLORS: Record<string, string> = {
  BRANDING: "border-amber-500/30 hover:border-amber-500/60",
  CAMPAIGN: "border-blue-500/30 hover:border-blue-500/60",
  CONTENT: "border-emerald-500/30 hover:border-emerald-500/60",
  PRODUCTION: "border-purple-500/30 hover:border-purple-500/60",
  OPERATIONS: "border-border-strong/30 hover:border-border-strong/60",
  ANALYTICS: "border-rose-500/30 hover:border-rose-500/60",
};

interface Props {
  strategyId: string;
  /** Show only auto-executable templates */
  autoOnly?: boolean;
  /** Max templates to show */
  limit?: number;
}

/**
 * Quick action cards for launching GLORY sequences from the cockpit.
 * Each card represents a MissionTemplate backed by one or more GLORY sequences.
 *
 * Usage:
 *   <GloryQuickActions strategyId={strategyId} />
 *   <GloryQuickActions strategyId={strategyId} autoOnly limit={4} />
 */
export function GloryQuickActions({ strategyId, autoOnly, limit }: Props) {
  // Static templates — imported at build time, no trpc needed
  // Will be replaced with trpc.missionTemplates.list when endpoint exists
  const templates = getClientTemplates(autoOnly, limit);

  const executeMutation = trpc.glory.executeSequence.useMutation();

  const handleLaunch = async (templateId: string, sequenceKeys: string[]) => {
    for (const key of sequenceKeys) {
      await executeMutation.mutateAsync({ strategyId, sequenceKey: key });
    }
  };

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-foreground-secondary uppercase tracking-wider">
        Actions rapides
      </h3>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {templates.map((tpl) => {
          const Icon = ICON_MAP[tpl.icon] ?? FileText;
          const borderColor = CATEGORY_COLORS[tpl.category] ?? CATEGORY_COLORS.OPERATIONS;

          return (
            <button
              key={tpl.id}
              onClick={() => handleLaunch(tpl.id, tpl.sequenceKeys)}
              disabled={executeMutation.isPending}
              className={`group flex items-start gap-3 rounded-xl border ${borderColor} bg-background/80 p-4 text-left transition-all hover:bg-background/80 disabled:opacity-50`}
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-background group-hover:bg-surface-raised">
                <Icon className="h-4 w-4 text-foreground-secondary group-hover:text-white" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-white truncate">{tpl.name}</p>
                <p className="text-[11px] text-foreground-muted line-clamp-2 mt-0.5">{tpl.description}</p>
                <div className="mt-1.5 flex items-center gap-2">
                  <span className="text-[10px] text-foreground-muted">{tpl.estimatedDays}j</span>
                  {tpl.autoExecutable && (
                    <span className="inline-flex rounded-full bg-emerald-400/10 px-1.5 py-0.5 text-[9px] font-semibold text-emerald-400">
                      AUTO
                    </span>
                  )}
                  <span className="text-[10px] text-foreground-muted">
                    {tpl.sequenceKeys.length} seq.
                  </span>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Client-side template data (mirrors mission-templates/index.ts) ──────────

function getClientTemplates(autoOnly?: boolean, limit?: number) {
  let tpls = [
    { id: "tpl-kv-campagne", name: "Key Visual", description: "Concept → prompt AI image → validation", sequenceKeys: ["KV"], category: "PRODUCTION", estimatedDays: 5, autoExecutable: true, icon: "image" },
    { id: "tpl-spot-video", name: "Spot Video", description: "Script, storyboard, casting, son", sequenceKeys: ["SPOT-VIDEO"], category: "PRODUCTION", estimatedDays: 14, autoExecutable: false, icon: "video" },
    { id: "tpl-collab-influenceur", name: "Collab Influenceur", description: "Brief, copy, calendrier, UGC", sequenceKeys: ["INFLUENCE"], category: "CONTENT", estimatedDays: 5, autoExecutable: true, icon: "users" },
    { id: "tpl-pack-social", name: "Pack Social", description: "1 mois de contenu + story arc", sequenceKeys: ["SOCIAL-POST", "STORY-ARC"], category: "CONTENT", estimatedDays: 7, autoExecutable: true, icon: "share-2" },
    { id: "tpl-campagne-lancement", name: "Lancement", description: "Plan complet J-90 → J+30", sequenceKeys: ["LAUNCH"], category: "CAMPAIGN", estimatedDays: 30, autoExecutable: false, icon: "rocket" },
    { id: "tpl-campagne-360", name: "Campagne 360", description: "Brief → simulation → coherence", sequenceKeys: ["CAMPAIGN-360"], category: "CAMPAIGN", estimatedDays: 14, autoExecutable: false, icon: "globe" },
    { id: "tpl-pitch", name: "Pitch", description: "Benchmark → pitch → credentials", sequenceKeys: ["PITCH"], category: "CAMPAIGN", estimatedDays: 10, autoExecutable: false, icon: "award" },
    { id: "tpl-naming", name: "Naming", description: "Exploration → generation → legal", sequenceKeys: ["NAMING"], category: "BRANDING", estimatedDays: 7, autoExecutable: true, icon: "type" },
    { id: "tpl-rebranding", name: "Rebranding", description: "Audit → pipeline BRAND → migration", sequenceKeys: ["REBRAND"], category: "BRANDING", estimatedDays: 21, autoExecutable: false, icon: "refresh-cw" },
    { id: "tpl-devis", name: "Devis", description: "Budget, devis, vendor, approval", sequenceKeys: ["OPS"], category: "OPERATIONS", estimatedDays: 2, autoExecutable: true, icon: "file-text" },
    { id: "tpl-audit-marque", name: "Audit Marque", description: "Diagnostic R + etude T", sequenceKeys: ["AUDIT-R", "ETUDE-T"], category: "ANALYTICS", estimatedDays: 10, autoExecutable: false, icon: "search" },
    { id: "tpl-rentabilite", name: "Rentabilite", description: "P&L, marge, utilisation", sequenceKeys: ["PROFITABILITY"], category: "ANALYTICS", estimatedDays: 1, autoExecutable: true, icon: "trending-up" },
    { id: "tpl-planning-annuel", name: "Planning Annuel", description: "Calendrier 12 mois + mix + budget", sequenceKeys: ["ANNUAL-PLAN"], category: "CONTENT", estimatedDays: 5, autoExecutable: true, icon: "calendar" },
    { id: "tpl-strategie-one-shot", name: "Strategie One-Shot", description: "Manifeste + offre rapide", sequenceKeys: ["MANIFESTE-A", "OFFRE-V"], category: "BRANDING", estimatedDays: 5, autoExecutable: false, icon: "flag" },
  ];

  if (autoOnly) tpls = tpls.filter((t) => t.autoExecutable);
  if (limit) tpls = tpls.slice(0, limit);
  return tpls;
}
