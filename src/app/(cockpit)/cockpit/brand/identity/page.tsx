"use client";

import { useState, useCallback, useMemo } from "react";
import { trpc } from "@/lib/trpc/client";
import { AdvertisRadar } from "@/components/shared/advertis-radar";
import { PillarProgress } from "@/components/shared/pillar-progress";
import { ScoreBadge } from "@/components/shared/score-badge";
import { PageHeader } from "@/components/shared/page-header";
import { Tabs } from "@/components/shared/tabs";
import { SkeletonPage } from "@/components/shared/loading-skeleton";
import { PILLAR_NAMES, PILLAR_KEYS, type PillarKey } from "@/lib/types/advertis-vector";
import { PILLAR_TAG_BG } from "@/components/shared/pillar-content-card";
import { useCurrentStrategyId } from "@/components/cockpit/strategy-context";
import {
  Fingerprint, AlertTriangle, TrendingUp, Target, Lightbulb, Shield,
  Pencil, Save, X, Check, AlertCircle, ArrowRight, ChevronRight,
  Quote, Star, Users, ShoppingBag, Zap, BarChart3, FileText,
  Compass, Layers, Award, Clock, DollarSign, Heart, Brain,
  Eye, MessageSquare, Calendar, Activity, Gauge, Hash,
  Map, Swords, BookOpen, Crown, Flame, CircleDot, Milestone,
  Flag, User, Building2, Radio, Megaphone, PieChart, ListChecks,
  TrendingDown, ChevronDown, ChevronUp, Plus,
} from "lucide-react";

// ============================================================================
// TYPES
// ============================================================================

type AnyContent = Record<string, unknown>;
type AnyArray = Array<Record<string, unknown>>;

// ============================================================================
// CONSTANTS
// ============================================================================

const PILLAR_DESCRIPTIONS: Record<PillarKey, string> = {
  a: "Authenticite — Fidelite aux valeurs fondatrices, coherence et transparence.",
  d: "Distinction — Unicite et reconnaissance dans l'univers concurrentiel.",
  v: "Valeur — Proposition de valeur percue par les audiences.",
  e: "Engagement — Intensite et qualite des interactions marque/audiences.",
  r: "Risk — Gestion des risques reputationnels et resilience.",
  t: "Track — Mesure, analyse et optimisation des performances.",
  i: "Implementation — Qualite d'execution des strategies definies.",
  s: "Strategie — Clarte et pertinence de la vision strategique.",
};

const PILLAR_ACCENT: Record<PillarKey, string> = {
  a: "text-violet-400", d: "text-blue-400", v: "text-emerald-400", e: "text-amber-400",
  r: "text-red-400", t: "text-sky-400", i: "text-orange-400", s: "text-pink-400",
};

const PILLAR_BORDER: Record<PillarKey, string> = {
  a: "border-violet-800/40", d: "border-blue-800/40", v: "border-emerald-800/40", e: "border-amber-800/40",
  r: "border-red-800/40", t: "border-sky-800/40", i: "border-orange-800/40", s: "border-pink-800/40",
};

const AARRR_COLORS: Record<string, string> = {
  ACQUISITION: "bg-blue-500/15 text-blue-300 border-blue-500/30",
  ACTIVATION: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  RETENTION: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  REVENUE: "bg-purple-500/15 text-purple-300 border-purple-500/30",
  REFERRAL: "bg-pink-500/15 text-pink-300 border-pink-500/30",
};

const RISK_COLORS: Record<string, string> = {
  LOW: "bg-emerald-500/15 text-emerald-300",
  MEDIUM: "bg-amber-500/15 text-amber-300",
  HIGH: "bg-red-500/15 text-red-300",
};

const HYPOTHESIS_COLORS: Record<string, string> = {
  HYPOTHESIS: "bg-zinc-500/15 text-zinc-300",
  TESTING: "bg-amber-500/15 text-amber-300",
  VALIDATED: "bg-emerald-500/15 text-emerald-300",
  INVALIDATED: "bg-red-500/15 text-red-300",
};

// ============================================================================
// UTILITY HELPERS
// ============================================================================

function safe<T>(val: unknown): T | null {
  return (val ?? null) as T | null;
}

function safeArr(val: unknown): AnyArray {
  return Array.isArray(val) ? val as AnyArray : [];
}

function safeStr(val: unknown, fallback = ""): string {
  if (typeof val === "string") return val;
  if (typeof val === "number") return String(val);
  return fallback;
}

function safeNum(val: unknown, fallback = 0): number {
  if (typeof val === "number") return val;
  if (typeof val === "string") { const n = parseFloat(val); return isNaN(n) ? fallback : n; }
  return fallback;
}

function fmtCurrency(val: unknown): string {
  const n = safeNum(val);
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)} Mds`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)} M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)} K`;
  return n.toLocaleString("fr-FR");
}

function fmtPercent(val: unknown): string {
  return `${safeNum(val).toFixed(0)}%`;
}

// ============================================================================
// SHARED UI COMPONENTS
// ============================================================================

function Section({ title, icon: Icon, children, accent, empty }: {
  title: string;
  icon?: React.ElementType;
  children?: React.ReactNode;
  accent?: string;
  empty?: boolean;
}) {
  if (empty) {
    return (
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-5">
        <div className="flex items-center gap-2 mb-3">
          {Icon && <Icon className={`h-4 w-4 ${accent ?? "text-zinc-500"}`} />}
          <h4 className={`text-sm font-semibold uppercase tracking-wider ${accent ?? "text-zinc-400"}`}>{title}</h4>
        </div>
        <p className="text-sm text-zinc-600 italic">Non renseigne</p>
      </div>
    );
  }
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-5">
      <div className="flex items-center gap-2 mb-4">
        {Icon && <Icon className={`h-4 w-4 ${accent ?? "text-zinc-500"}`} />}
        <h4 className={`text-sm font-semibold uppercase tracking-wider ${accent ?? "text-zinc-400"}`}>{title}</h4>
      </div>
      {children}
    </div>
  );
}

function Badge({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${className ?? "bg-zinc-800 text-zinc-300"}`}>
      {children}
    </span>
  );
}

function KVLine({ label, value, className }: { label: string; value: React.ReactNode; className?: string }) {
  return (
    <div className={`flex items-start gap-2 ${className ?? ""}`}>
      <span className="text-[10px] font-medium uppercase tracking-wider text-zinc-500 w-36 shrink-0 pt-0.5">{label}</span>
      <span className="text-sm text-zinc-200">{value ?? <span className="text-zinc-600 italic">Non renseigne</span>}</span>
    </div>
  );
}

function EmptyField({ label }: { label?: string }) {
  return <span className="text-xs text-zinc-600 italic">{label ?? "Non renseigne"}</span>;
}

function GaugeDisplay({ value, max = 100, label, good }: { value: number; max?: number; label: string; good?: boolean }) {
  const pct = Math.min((value / max) * 100, 100);
  const color = good === undefined
    ? (pct >= 70 ? "bg-emerald-500" : pct >= 40 ? "bg-amber-500" : "bg-red-500")
    : (good ? "bg-emerald-500" : "bg-red-500");
  return (
    <div className="rounded-lg bg-zinc-950/50 p-4 border border-zinc-800">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-zinc-400">{label}</span>
        <span className="text-lg font-bold text-white">{value}{max === 100 ? "/100" : ""}</span>
      </div>
      <div className="h-2 rounded-full bg-zinc-800">
        <div className={`h-full rounded-full ${color} transition-all`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

// ============================================================================
// PILLAR A — AUTHENTICITE RENDERER
// ============================================================================

function RenderPillarA({ content }: { content: AnyContent }) {
  const archetype = safeStr(content.archetype);
  const archetypeSecondary = safeStr(content.archetypeSecondary);
  const citation = safeStr(content.citationFondatrice);
  const noyau = safeStr(content.noyauIdentitaire);
  const journey = safeArr(content.herosJourney);
  const ikigai = safe<AnyContent>(content.ikigai);
  const valeurs = safeArr(content.valeurs);
  const hierarchy = safeArr(content.hierarchieCommunautaire);
  const timeline = safe<AnyContent>(content.timelineNarrative);
  const prophecy = safe<AnyContent>(content.prophecy);
  const prophecyStr = typeof content.prophecy === "string" ? content.prophecy as string : null; // legacy
  const enemy = safe<AnyContent>(content.enemy);
  const doctrine = safe<AnyContent>(content.doctrine);
  const doctrineStr = typeof content.doctrine === "string" ? content.doctrine as string : null;
  const livingMythology = safe<AnyContent>(content.livingMythology);

  return (
    <div className="space-y-5">
      {/* Archetype */}
      <Section title="Archetype" icon={Crown} accent="text-violet-400">
        <div className="flex flex-wrap gap-2">
          {archetype ? <Badge className="bg-violet-500/15 text-violet-300 text-sm px-3 py-1">{archetype}</Badge> : <EmptyField />}
          {archetypeSecondary && <Badge className="bg-violet-500/10 text-violet-400/70 text-sm px-3 py-1">{archetypeSecondary} (secondaire)</Badge>}
        </div>
      </Section>

      {/* Citation Fondatrice */}
      {citation ? (
        <Section title="Citation Fondatrice" icon={Quote} accent="text-violet-400">
          <blockquote className="border-l-4 border-violet-500/50 pl-4 py-2 italic text-zinc-200 text-base leading-relaxed bg-violet-950/10 rounded-r-lg pr-4">
            &laquo; {citation} &raquo;
          </blockquote>
        </Section>
      ) : <Section title="Citation Fondatrice" icon={Quote} accent="text-violet-400" empty />}

      {/* Noyau Identitaire */}
      {noyau ? (
        <Section title="Noyau Identitaire" icon={Fingerprint} accent="text-violet-400">
          <p className="text-sm leading-relaxed text-zinc-300 border-l-2 border-violet-600/40 pl-4">{noyau}</p>
        </Section>
      ) : <Section title="Noyau Identitaire" icon={Fingerprint} accent="text-violet-400" empty />}

      {/* Hero's Journey */}
      {journey.length > 0 ? (
        <Section title="Hero's Journey" icon={Compass} accent="text-violet-400">
          <div className="relative">
            {/* Timeline line */}
            <div className="absolute left-5 top-4 bottom-4 w-0.5 bg-violet-800/40" />
            <div className="space-y-4">
              {journey.sort((a, b) => safeNum(a.actNumber) - safeNum(b.actNumber)).map((act, i) => (
                <div key={i} className="relative pl-12">
                  <div className="absolute left-2.5 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-violet-600 text-[10px] font-bold text-white z-10">
                    {safeNum(act.actNumber)}
                  </div>
                  <div className="rounded-lg border border-zinc-800 bg-zinc-950/50 p-4">
                    <h5 className="text-sm font-semibold text-white mb-1">{safeStr(act.title)}</h5>
                    <p className="text-xs text-zinc-400 mb-2 leading-relaxed">{safeStr(act.narrative)}</p>
                    <div className="flex flex-wrap gap-3 text-[10px]">
                      <span className="text-violet-300">Arc emotionnel : {safeStr(act.emotionalArc)}</span>
                      {safeStr(act.causalLink) && <span className="text-zinc-500">Lien : {safeStr(act.causalLink)}</span>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Section>
      ) : <Section title="Hero's Journey" icon={Compass} accent="text-violet-400" empty />}

      {/* Ikigai */}
      {ikigai ? (
        <Section title="Ikigai de Marque" icon={Heart} accent="text-violet-400">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              { key: "love", label: "Ce qu'on aime", icon: Heart, color: "border-pink-700/40" },
              { key: "competence", label: "Competence", icon: Brain, color: "border-blue-700/40" },
              { key: "worldNeed", label: "Besoin du monde", icon: Users, color: "border-emerald-700/40" },
              { key: "remuneration", label: "Remuneration", icon: DollarSign, color: "border-amber-700/40" },
            ].map(({ key, label, icon: IIcon, color }) => (
              <div key={key} className={`rounded-lg border ${color} bg-zinc-950/50 p-3`}>
                <div className="flex items-center gap-2 mb-2">
                  <IIcon className="h-3.5 w-3.5 text-zinc-400" />
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">{label}</span>
                </div>
                <p className="text-xs text-zinc-300 leading-relaxed">{safeStr((ikigai as AnyContent)[key]) || <EmptyField />}</p>
              </div>
            ))}
          </div>
        </Section>
      ) : <Section title="Ikigai de Marque" icon={Heart} accent="text-violet-400" empty />}

      {/* Valeurs Schwartz */}
      {valeurs.length > 0 ? (
        <Section title="Valeurs Schwartz" icon={Star} accent="text-violet-400">
          <div className="space-y-3">
            {valeurs.sort((a, b) => safeNum(a.rank) - safeNum(b.rank)).map((v, i) => (
              <div key={i} className="rounded-lg border border-zinc-800 bg-zinc-950/50 p-4">
                <div className="flex items-center gap-3 mb-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-violet-600/20 text-[10px] font-bold text-violet-300">
                    #{safeNum(v.rank)}
                  </span>
                  <span className="text-sm font-semibold text-white">{safeStr(v.customName)}</span>
                  <Badge className="bg-violet-500/10 text-violet-400 text-[10px]">{safeStr(v.value)}</Badge>
                </div>
                <p className="text-xs text-zinc-400 mb-2">{safeStr(v.justification)}</p>
                <div className="flex flex-wrap gap-3 text-[10px] text-zinc-500">
                  <span>Cout : {safeStr(v.costOfHolding)}</span>
                  {safeArr(v.tensionWith as unknown).length > 0 && (
                    <span>Tensions : {(v.tensionWith as string[]).join(", ")}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Section>
      ) : <Section title="Valeurs Schwartz" icon={Star} accent="text-violet-400" empty />}

      {/* Hierarchie Communautaire */}
      {hierarchy.length > 0 ? (
        <Section title="Hierarchie Communautaire" icon={Layers} accent="text-violet-400">
          <div className="space-y-2">
            {hierarchy.map((lvl, i) => (
              <div key={i} className="flex items-stretch gap-3">
                <div className="flex flex-col items-center w-8 shrink-0">
                  <div className={`flex h-8 w-8 items-center justify-center rounded-lg text-[10px] font-bold text-white ${
                    i === hierarchy.length - 1 ? "bg-violet-600" : i >= hierarchy.length - 2 ? "bg-violet-600/60" : "bg-zinc-700"
                  }`}>
                    {i + 1}
                  </div>
                  {i < hierarchy.length - 1 && <div className="flex-1 w-0.5 bg-zinc-800 my-1" />}
                </div>
                <div className="flex-1 rounded-lg border border-zinc-800 bg-zinc-950/50 p-3 mb-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge className="bg-violet-500/10 text-violet-300 text-[10px]">{safeStr(lvl.level)}</Badge>
                  </div>
                  <p className="text-xs text-zinc-300 mb-1">{safeStr(lvl.description)}</p>
                  <p className="text-[10px] text-zinc-500">Privileges : {safeStr(lvl.privileges)}</p>
                </div>
              </div>
            ))}
          </div>
        </Section>
      ) : <Section title="Hierarchie Communautaire" icon={Layers} accent="text-violet-400" empty />}

      {/* Timeline Narrative */}
      {timeline ? (
        <Section title="Timeline Narrative" icon={Clock} accent="text-violet-400">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            {[
              { key: "origine", label: "Origine", icon: Milestone },
              { key: "transformation", label: "Transformation", icon: Zap },
              { key: "present", label: "Present", icon: CircleDot },
              { key: "futur", label: "Futur", icon: Flag },
            ].map(({ key, label, icon: TIcon }) => {
              const val = safeStr((timeline as AnyContent)[key]);
              return (
                <div key={key} className="rounded-lg border border-zinc-800 bg-zinc-950/50 p-3">
                  <div className="flex items-center gap-1.5 mb-2">
                    <TIcon className="h-3 w-3 text-violet-400/60" />
                    <span className="text-[10px] font-semibold uppercase text-zinc-400">{label}</span>
                  </div>
                  <p className="text-xs text-zinc-300 leading-relaxed">{val || <EmptyField />}</p>
                </div>
              );
            })}
          </div>
        </Section>
      ) : <Section title="Timeline Narrative" icon={Clock} accent="text-violet-400" empty />}

      {/* Prophecy */}
      {(prophecy || prophecyStr) && (
        <Section title="Prophetie" icon={Flame} accent="text-violet-400">
          {prophecyStr ? (
            <blockquote className="border-l-4 border-violet-400/40 pl-4 py-3 text-sm text-zinc-200 italic bg-violet-950/10 rounded-r-lg pr-4 leading-relaxed">
              {prophecyStr}
            </blockquote>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                { key: "worldTransformed", label: "Le monde transforme" },
                { key: "pioneers", label: "Pionniers" },
                { key: "urgency", label: "Urgence" },
                { key: "horizon", label: "Horizon" },
              ].map(({ key, label }) => {
                const val = safeStr((prophecy as AnyContent)[key]);
                return val ? (
                  <div key={key} className="rounded-lg border border-violet-900/30 bg-violet-950/10 p-3">
                    <span className="text-[10px] font-semibold uppercase text-violet-400/70 block mb-1">{label}</span>
                    <p className="text-xs text-zinc-300 leading-relaxed">{val}</p>
                  </div>
                ) : null;
              })}
            </div>
          )}
        </Section>
      )}

      {/* Enemy — complet */}
      {enemy && safeStr(enemy.name) && (
        <Section title="Ennemi" icon={Swords} accent="text-red-400">
          <div className="space-y-3">
            {/* Core */}
            <div className="rounded-lg border border-red-900/30 bg-red-950/10 p-4">
              <h5 className="text-sm font-semibold text-red-300 mb-1">{safeStr(enemy.name)}</h5>
              {safeStr(enemy.manifesto) && <p className="text-xs text-zinc-400 mb-2 leading-relaxed">{safeStr(enemy.manifesto)}</p>}
              {safeStr(enemy.narrative) && <p className="text-xs text-zinc-400 leading-relaxed">{safeStr(enemy.narrative)}</p>}
              {safeArr(enemy.enemySchwartzValues as unknown).length > 0 && (
                <div className="flex gap-1.5 mt-2 flex-wrap">
                  {(enemy.enemySchwartzValues as string[]).map((v, i) => (
                    <Badge key={i} className="bg-red-500/10 text-red-400 text-[10px]">{v}</Badge>
                  ))}
                </div>
              )}
            </div>

            {/* Overton Map */}
            {!!enemy.overtonMap && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {[
                  { key: "ourPosition", label: "Notre position" },
                  { key: "enemyPosition", label: "Position ennemi" },
                  { key: "battleground", label: "Champ de bataille" },
                  { key: "shiftDirection", label: "Direction du shift" },
                ].map(({ key, label }) => {
                  const val = safeStr((enemy.overtonMap as AnyContent)[key]);
                  return val ? (
                    <div key={key} className="rounded-lg border border-zinc-800 bg-zinc-950/50 p-3">
                      <span className="text-[10px] font-semibold uppercase text-zinc-500 block mb-1">{label}</span>
                      <p className="text-xs text-zinc-300">{val}</p>
                    </div>
                  ) : null;
                })}
              </div>
            )}

            {/* Enemy Brands */}
            {safeArr(enemy.enemyBrands as unknown).length > 0 && (
              <div>
                <span className="text-[10px] font-semibold uppercase text-zinc-500 block mb-2">Marques incarnant l&apos;ennemi</span>
                <div className="space-y-1.5">
                  {(enemy.enemyBrands as AnyContent[]).map((b, i) => (
                    <div key={i} className="flex items-start gap-2 text-xs">
                      <span className="text-red-400 font-medium shrink-0">{safeStr(b.name)}</span>
                      <span className="text-zinc-500">{safeStr(b.howTheyFight)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Active / Passive Opposition */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {safeArr(enemy.activeOpposition as unknown).length > 0 && (
                <div className="rounded-lg border border-zinc-800 bg-zinc-950/50 p-3">
                  <span className="text-[10px] font-semibold uppercase text-red-400/70 block mb-2">Opposition active</span>
                  <ul className="space-y-1">
                    {(enemy.activeOpposition as string[]).map((a, i) => (
                      <li key={i} className="text-xs text-zinc-400 flex items-start gap-1.5">
                        <span className="text-red-500 mt-0.5 shrink-0">•</span>{a}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {safeArr(enemy.passiveOpposition as unknown).length > 0 && (
                <div className="rounded-lg border border-zinc-800 bg-zinc-950/50 p-3">
                  <span className="text-[10px] font-semibold uppercase text-amber-400/70 block mb-2">Resistance structurelle</span>
                  <ul className="space-y-1">
                    {(enemy.passiveOpposition as string[]).map((a, i) => (
                      <li key={i} className="text-xs text-zinc-400 flex items-start gap-1.5">
                        <span className="text-amber-500 mt-0.5 shrink-0">•</span>{a}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Counter Strategy */}
            {!!enemy.counterStrategy && (
              <div className="rounded-lg border border-emerald-900/30 bg-emerald-950/10 p-3">
                <span className="text-[10px] font-semibold uppercase text-emerald-400/70 block mb-2">Contre-strategie</span>
                {safeStr((enemy.counterStrategy as AnyContent)?.marketingCounter) && (
                  <p className="text-xs text-zinc-300 mb-2 leading-relaxed">{safeStr((enemy.counterStrategy as AnyContent).marketingCounter)}</p>
                )}
                {safeArr((enemy.counterStrategy as AnyContent)?.alliances as unknown).length > 0 && (
                  <div className="mt-2">
                    <span className="text-[10px] text-zinc-500 block mb-1">Alliances</span>
                    <ul className="space-y-1">
                      {((enemy.counterStrategy as AnyContent).alliances as string[]).map((a, i) => (
                        <li key={i} className="text-xs text-zinc-400 flex items-start gap-1.5">
                          <span className="text-emerald-500 mt-0.5 shrink-0">+</span>{a}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {/* Fraternity Fuel */}
            {!!enemy.fraternityFuel && (
              <div className="rounded-lg border border-zinc-800 bg-zinc-950/50 p-3">
                <span className="text-[10px] font-semibold uppercase text-orange-400/70 block mb-1">Carburant fraternel</span>
                <p className="text-xs text-zinc-300 mb-2">{safeStr((enemy.fraternityFuel as AnyContent).sharedHatred)}</p>
                {safeArr((enemy.fraternityFuel as AnyContent)?.bondingRituals as unknown).length > 0 && (
                  <ul className="space-y-1">
                    {((enemy.fraternityFuel as AnyContent).bondingRituals as string[]).map((r, i) => (
                      <li key={i} className="text-xs text-zinc-400 flex items-start gap-1.5">
                        <span className="text-orange-500 mt-0.5 shrink-0">🔥</span>{r}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
        </Section>
      )}

      {/* Doctrine */}
      {(doctrine || doctrineStr) && (
        <Section title="Doctrine" icon={BookOpen} accent="text-violet-400">
          {doctrineStr ? (
            <p className="text-sm text-zinc-300 leading-relaxed border-l-2 border-violet-600/40 pl-4">{doctrineStr}</p>
          ) : (
            <div className="space-y-3">
              {safeArr((doctrine as AnyContent).dogmas as unknown).length > 0 && (
                <div>
                  <span className="text-[10px] font-semibold uppercase text-violet-400/70 block mb-2">Dogmes</span>
                  <div className="space-y-2">
                    {((doctrine as AnyContent).dogmas as string[]).map((d, i) => (
                      <div key={i} className="rounded-lg border border-violet-900/20 bg-violet-950/10 p-3">
                        <p className="text-xs text-zinc-300 leading-relaxed">{d}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {safeArr((doctrine as AnyContent).principles as unknown).length > 0 && (
                <div>
                  <span className="text-[10px] font-semibold uppercase text-zinc-500 block mb-2">Principes</span>
                  <ul className="space-y-1">
                    {((doctrine as AnyContent).principles as string[]).map((p, i) => (
                      <li key={i} className="text-xs text-zinc-400 flex items-start gap-1.5">
                        <span className="text-violet-500 mt-0.5 shrink-0">→</span>{p}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {safeArr((doctrine as AnyContent).practices as unknown).length > 0 && (
                <div>
                  <span className="text-[10px] font-semibold uppercase text-zinc-500 block mb-2">Pratiques</span>
                  <ul className="space-y-1">
                    {((doctrine as AnyContent).practices as string[]).map((p, i) => (
                      <li key={i} className="text-xs text-zinc-400 flex items-start gap-1.5">
                        <span className="text-zinc-600 mt-0.5 shrink-0">•</span>{p}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </Section>
      )}

      {/* Living Mythology */}
      {livingMythology && (
        <Section title="Mythologie vivante" icon={BookOpen} accent="text-violet-400">
          <div className="space-y-3">
            {safeStr((livingMythology as AnyContent).canon) && (
              <div className="rounded-lg border border-violet-900/20 bg-violet-950/10 p-4">
                <span className="text-[10px] font-semibold uppercase text-violet-400/70 block mb-2">Canon</span>
                <p className="text-xs text-zinc-300 leading-relaxed">{safeStr((livingMythology as AnyContent).canon)}</p>
              </div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {safeStr((livingMythology as AnyContent).extensionRules) && (
                <div className="rounded-lg border border-zinc-800 bg-zinc-950/50 p-3">
                  <span className="text-[10px] font-semibold uppercase text-zinc-500 block mb-1">Regles d&apos;extension</span>
                  <p className="text-xs text-zinc-400">{safeStr((livingMythology as AnyContent).extensionRules)}</p>
                </div>
              )}
              {safeStr((livingMythology as AnyContent).captureSystem) && (
                <div className="rounded-lg border border-zinc-800 bg-zinc-950/50 p-3">
                  <span className="text-[10px] font-semibold uppercase text-zinc-500 block mb-1">Systeme de capture</span>
                  <p className="text-xs text-zinc-400">{safeStr((livingMythology as AnyContent).captureSystem)}</p>
                </div>
              )}
            </div>
          </div>
        </Section>
      )}
    </div>
  );
}

// ============================================================================
// PILLAR D — DISTINCTION RENDERER
// ============================================================================

function RenderPillarD({ content }: { content: AnyContent }) {
  const personas = safeArr(content.personas);
  const competitors = safeArr(content.paysageConcurrentiel);
  const promesse = safeStr(content.promesseMaitre);
  const sousPromesses = Array.isArray(content.sousPromesses) ? content.sousPromesses as string[] : [];
  const positionnement = safeStr(content.positionnement);
  const tonDeVoix = safe<AnyContent>(content.tonDeVoix);
  const assets = safe<AnyContent>(content.assetsLinguistiques);
  const dirArt = safe<AnyContent>(content.directionArtistique);
  const sacredObjects = safeArr(content.sacredObjects);
  const proofPoints = safeArr(content.proofPoints);
  const symboles = safeArr(content.symboles);

  return (
    <div className="space-y-5">
      {/* Personas */}
      {personas.length > 0 ? (
        <Section title={`Personas (${personas.length})`} icon={Users} accent="text-blue-400">
          <div className="space-y-4">
            {personas.sort((a, b) => safeNum(a.rank) - safeNum(b.rank)).map((p, i) => (
              <div key={i} className="rounded-lg border border-zinc-800 bg-zinc-950/50 p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-blue-400" />
                    <h5 className="text-sm font-semibold text-white">{safeStr(p.name)}</h5>
                    <Badge className="bg-blue-500/10 text-blue-300 text-[10px]">#{safeNum(p.rank)}</Badge>
                  </div>
                  {safeStr(p.devotionPotential) && <Badge className="bg-violet-500/10 text-violet-300 text-[10px]">{safeStr(p.devotionPotential)}</Badge>}
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3 text-[10px]">
                  {safeStr(p.age) && <span className="text-zinc-400"><strong className="text-zinc-300">{safeStr(p.age)}</strong> ans</span>}
                  {safeStr(p.csp) && <span className="text-zinc-400">{safeStr(p.csp)}</span>}
                  {safeStr(p.location) && <span className="text-zinc-400">{safeStr(p.location)}</span>}
                  {safeStr(p.income) && <span className="text-zinc-400">{safeStr(p.income)}</span>}
                </div>
                {/* Psychometrics */}
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {safeArr(p.schwartzValues as unknown).map((sv, j) => (
                    <Badge key={j} className="bg-violet-500/10 text-violet-300 text-[10px]">{safeStr(sv)}</Badge>
                  ))}
                  {safeArr(p.lf8Dominant as unknown).map((lf, j) => (
                    <Badge key={j} className="bg-amber-500/10 text-amber-300 text-[10px]">{safeStr(lf)}</Badge>
                  ))}
                </div>
                <div className="space-y-1.5 text-xs">
                  {safeStr(p.motivations) && <KVLine label="Motivations" value={safeStr(p.motivations)} />}
                  {safeStr(p.fears) && <KVLine label="Craintes" value={safeStr(p.fears)} />}
                  {safeStr(p.hiddenDesire) && <KVLine label="Desir cache" value={safeStr(p.hiddenDesire)} />}
                  {safeStr(p.whatTheyActuallyBuy) && <KVLine label="Ce qu'ils achetent" value={safeStr(p.whatTheyActuallyBuy)} />}
                  {safeArr(p.jobsToBeDone as unknown).length > 0 && (
                    <KVLine label="JTBD" value={(p.jobsToBeDone as string[]).join(" / ")} />
                  )}
                  {safeStr(p.lifestyle) && <KVLine label="Lifestyle" value={safeStr(p.lifestyle)} />}
                  {safeStr(p.mediaConsumption) && <KVLine label="Conso media" value={safeStr(p.mediaConsumption)} />}
                  {safeStr(p.brandRelationships) && <KVLine label="Relation marques" value={safeStr(p.brandRelationships)} />}
                  {safeStr(p.decisionProcess) && <KVLine label="Processus decision" value={safeStr(p.decisionProcess)} />}
                  {safeStr(p.familySituation) && <KVLine label="Situation familiale" value={safeStr(p.familySituation)} />}
                </div>
                {/* Tension Profile */}
                {!!p.tensionProfile && (
                  <div className="mt-2 flex flex-wrap gap-2 text-[10px]">
                    {safeStr((p.tensionProfile as AnyContent)?.segmentId) && <Badge className="bg-zinc-700 text-zinc-300">{safeStr((p.tensionProfile as AnyContent).segmentId)}</Badge>}
                    {safeStr((p.tensionProfile as AnyContent)?.category) && <Badge className="bg-violet-500/10 text-violet-300">{safeStr((p.tensionProfile as AnyContent).category)}</Badge>}
                    {safeStr((p.tensionProfile as AnyContent)?.position) && <span className="text-zinc-400">Position : {safeStr((p.tensionProfile as AnyContent).position)}</span>}
                  </div>
                )}
              </div>
            ))}
          </div>
        </Section>
      ) : <Section title="Personas" icon={Users} accent="text-blue-400" empty />}

      {/* Paysage Concurrentiel */}
      {competitors.length > 0 ? (
        <Section title="Paysage Concurrentiel" icon={Building2} accent="text-blue-400">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-zinc-800">
                  <th className="text-left py-2 px-3 text-zinc-500 font-medium">Concurrent</th>
                  <th className="text-right py-2 px-3 text-zinc-500 font-medium">Part marche</th>
                  <th className="text-left py-2 px-3 text-zinc-500 font-medium">Avantages</th>
                  <th className="text-left py-2 px-3 text-zinc-500 font-medium">Faiblesses</th>
                  <th className="text-left py-2 px-3 text-zinc-500 font-medium">Strategie</th>
                </tr>
              </thead>
              <tbody>
                {competitors.map((c, i) => (
                  <tr key={i} className="border-b border-zinc-800/50">
                    <td className="py-2.5 px-3 text-white font-medium">{safeStr(c.name)}</td>
                    <td className="py-2.5 px-3 text-right text-zinc-300">{safeNum(c.partDeMarcheEstimee) > 0 ? `${safeNum(c.partDeMarcheEstimee)}%` : "—"}</td>
                    <td className="py-2.5 px-3 text-zinc-400">{safeArr(c.avantagesCompetitifs as unknown).map((v: unknown) => safeStr(v)).join(". ").slice(0, 120)}</td>
                    <td className="py-2.5 px-3 text-zinc-500">{safeArr(c.faiblesses as unknown).map((v: unknown) => safeStr(v)).join(". ").slice(0, 120)}</td>
                    <td className="py-2.5 px-3 text-zinc-500">{safeStr(c.strategiePos).slice(0, 80) || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>
      ) : <Section title="Paysage Concurrentiel" icon={Building2} accent="text-blue-400" empty />}

      {/* Promesse Maitre */}
      {promesse ? (
        <Section title="Promesse Maitre" icon={Megaphone} accent="text-blue-400">
          <div className="rounded-lg border border-blue-800/30 bg-blue-950/10 p-4 mb-3">
            <p className="text-base font-semibold text-white">{promesse}</p>
          </div>
          {sousPromesses.length > 0 && (
            <div className="space-y-2">
              <span className="text-[10px] font-medium uppercase text-zinc-500">Sous-promesses</span>
              {sousPromesses.map((sp, i) => (
                <div key={i} className="flex items-start gap-2">
                  <ChevronRight className="h-3 w-3 text-blue-400/50 mt-0.5 shrink-0" />
                  <p className="text-xs text-zinc-300">{sp}</p>
                </div>
              ))}
            </div>
          )}
        </Section>
      ) : <Section title="Promesse Maitre" icon={Megaphone} accent="text-blue-400" empty />}

      {/* Positionnement */}
      {positionnement ? (
        <Section title="Positionnement" icon={Target} accent="text-blue-400">
          <div className="rounded-lg border border-zinc-800 bg-zinc-950/50 p-4">
            <p className="text-sm text-zinc-200 leading-relaxed">{positionnement}</p>
            <div className="mt-2 flex items-center gap-2">
              <div className={`h-1.5 flex-1 rounded-full ${positionnement.length <= 200 ? "bg-emerald-600" : "bg-amber-600"}`}
                style={{ width: `${Math.min((positionnement.length / 200) * 100, 100)}%`, maxWidth: "100%" }} />
              <span className={`text-[10px] ${positionnement.length <= 200 ? "text-emerald-400" : "text-amber-400"}`}>
                {positionnement.length}/200 car.
              </span>
            </div>
          </div>
        </Section>
      ) : <Section title="Positionnement" icon={Target} accent="text-blue-400" empty />}

      {/* Ton de Voix */}
      {tonDeVoix ? (
        <Section title="Ton de Voix" icon={MessageSquare} accent="text-blue-400">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="rounded-lg border border-zinc-800 bg-zinc-950/50 p-3">
              <span className="text-[10px] font-semibold uppercase text-zinc-500 block mb-2">Personnalite</span>
              <div className="flex flex-wrap gap-1.5">
                {safeArr(tonDeVoix.personnalite as unknown).map((t, i) => (
                  <Badge key={i} className="bg-blue-500/10 text-blue-300">{safeStr(t)}</Badge>
                ))}
              </div>
            </div>
            <div className="rounded-lg border border-emerald-800/30 bg-emerald-950/10 p-3">
              <span className="text-[10px] font-semibold uppercase text-emerald-500 block mb-2">On dit</span>
              <div className="space-y-1">
                {safeArr(tonDeVoix.onDit as unknown).map((t, i) => (
                  <p key={i} className="text-xs text-zinc-300">+ {safeStr(t)}</p>
                ))}
              </div>
            </div>
            <div className="rounded-lg border border-red-800/30 bg-red-950/10 p-3">
              <span className="text-[10px] font-semibold uppercase text-red-500 block mb-2">On ne dit pas</span>
              <div className="space-y-1">
                {safeArr(tonDeVoix.onNeditPas as unknown).map((t, i) => (
                  <p key={i} className="text-xs text-zinc-400">- {safeStr(t)}</p>
                ))}
              </div>
            </div>
          </div>
        </Section>
      ) : <Section title="Ton de Voix" icon={MessageSquare} accent="text-blue-400" empty />}

      {/* Assets Linguistiques */}
      {assets ? (
        <Section title="Assets Linguistiques" icon={BookOpen} accent="text-blue-400">
          <div className="space-y-3">
            {safeStr(assets.slogan) && (
              <div className="rounded-lg border border-blue-800/30 bg-blue-950/10 p-3">
                <span className="text-[10px] uppercase text-zinc-500 font-medium">Slogan</span>
                <p className="text-sm font-semibold text-white mt-1">{safeStr(assets.slogan)}</p>
              </div>
            )}
            {safeStr(assets.tagline) && (
              <div className="rounded-lg border border-zinc-800 bg-zinc-950/50 p-3">
                <span className="text-[10px] uppercase text-zinc-500 font-medium">Tagline</span>
                <p className="text-sm text-zinc-200 mt-1">{safeStr(assets.tagline)}</p>
              </div>
            )}
            {safeStr(assets.motto) && (
              <div className="rounded-lg border border-zinc-800 bg-zinc-950/50 p-3">
                <span className="text-[10px] uppercase text-zinc-500 font-medium">Motto</span>
                <p className="text-sm text-zinc-200 mt-1">{safeStr(assets.motto)}</p>
              </div>
            )}
            {safeArr(assets.mantras as unknown).length > 0 && (
              <div className="rounded-lg border border-zinc-800 bg-zinc-950/50 p-3">
                <span className="text-[10px] uppercase text-zinc-500 font-medium block mb-2">Mantras</span>
                <div className="space-y-1">
                  {(assets.mantras as string[]).map((m, i) => (
                    <p key={i} className="text-xs text-zinc-300 italic flex items-start gap-1.5">
                      <span className="text-blue-400/50 mt-0.5 shrink-0">✦</span>{m}
                    </p>
                  ))}
                </div>
              </div>
            )}
            {safeArr(assets.lexiquePropre as unknown).length > 0 && (
              <div className="rounded-lg border border-zinc-800 bg-zinc-950/50 p-3">
                <span className="text-[10px] uppercase text-zinc-500 font-medium block mb-2">Lexique propre</span>
                <div className="space-y-1.5">
                  {safeArr(assets.lexiquePropre as unknown).map((item, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <span className="text-xs font-semibold text-blue-300 w-24 shrink-0">{safeStr((item as AnyContent).word)}</span>
                      <span className="text-xs text-zinc-400">{safeStr((item as AnyContent).definition)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </Section>
      ) : <Section title="Assets Linguistiques" icon={BookOpen} accent="text-blue-400" empty />}

      {/* Direction Artistique */}
      {dirArt ? (
        <Section title="Direction Artistique" icon={Eye} accent="text-blue-400">
          <div className="space-y-3">
            {/* Core DA fields — structured rendering for objects, fallback to string */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {["chromaticStrategy", "typographySystem", "visualLandscape", "semioticAnalysis", "moodboard", "designTokens", "brandGuidelines", "motionIdentity", "logoTypeRecommendation", "logoValidation"].map((key) => {
                const raw = (dirArt as AnyContent)[key];
                if (!raw) return null;
                const labels: Record<string, string> = {
                  chromaticStrategy: "Strategie chromatique", typographySystem: "Typographie", visualLandscape: "Paysage visuel",
                  semioticAnalysis: "Analyse semiotique", moodboard: "Moodboard", designTokens: "Design Tokens",
                  brandGuidelines: "Brand Guidelines", motionIdentity: "Motion Identity", logoTypeRecommendation: "Logo/Type Reco", logoValidation: "Logo Validation",
                };
                // If the value is an object (not a string), render its key-value pairs
                if (typeof raw === "object" && !Array.isArray(raw) && raw !== null) {
                  const obj = raw as AnyContent;
                  const entries = Object.entries(obj).filter(([, v]) => v !== null && v !== undefined && v !== "");
                  if (entries.length === 0) return null;
                  return (
                    <div key={key} className="rounded-lg border border-zinc-800 bg-zinc-950/50 p-3">
                      <span className="text-[10px] font-semibold uppercase text-zinc-500 block mb-2">{labels[key] ?? key}</span>
                      <div className="space-y-1.5">
                        {entries.map(([subKey, subVal]) => {
                          if (typeof subVal === "object" && subVal !== null && !Array.isArray(subVal)) {
                            // Nested object: render its fields
                            const nested = Object.entries(subVal as AnyContent).filter(([, nv]) => nv !== null && nv !== undefined && nv !== "");
                            if (nested.length === 0) return null;
                            return (
                              <div key={subKey} className="border-l-2 border-blue-800/30 pl-2 mt-1">
                                <span className="text-[10px] font-medium text-blue-300/70 block mb-0.5">{subKey}</span>
                                {nested.map(([nk, nv]) => (
                                  <div key={nk} className="flex items-start gap-1.5">
                                    <span className="text-[10px] text-zinc-500 w-24 shrink-0">{nk}</span>
                                    <span className="text-[10px] text-zinc-300">{Array.isArray(nv) ? (nv as unknown[]).map((v) => safeStr(v)).join(", ") : safeStr(nv)}</span>
                                  </div>
                                ))}
                              </div>
                            );
                          }
                          if (Array.isArray(subVal)) {
                            return (
                              <div key={subKey} className="flex items-start gap-1.5">
                                <span className="text-[10px] text-zinc-500 w-24 shrink-0">{subKey}</span>
                                <span className="text-[10px] text-zinc-300">{(subVal as unknown[]).map((v) => safeStr(v)).join(", ")}</span>
                              </div>
                            );
                          }
                          return (
                            <div key={subKey} className="flex items-start gap-1.5">
                              <span className="text-[10px] text-zinc-500 w-24 shrink-0">{subKey}</span>
                              <span className="text-[10px] text-zinc-300">{safeStr(subVal)}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                }
                // Fallback: string display
                const val = safeStr(raw);
                if (!val) return null;
                return (
                  <div key={key} className="rounded-lg border border-zinc-800 bg-zinc-950/50 p-3">
                    <span className="text-[10px] font-semibold uppercase text-zinc-500 block mb-1">{labels[key] ?? key}</span>
                    <p className="text-xs text-zinc-300 leading-relaxed">{val.slice(0, 200)}{val.length > 200 ? "..." : ""}</p>
                  </div>
                );
              })}
            </div>
            {/* LSI Matrix */}
            {!!(dirArt as AnyContent).lsiMatrix && (() => {
              const lsi = (dirArt as AnyContent).lsiMatrix as AnyContent;
              const concepts = safeArr(lsi.concepts as unknown);
              const layers = safe<AnyContent>(lsi.layers);
              const rules = safeArr(lsi.sublimationRules as unknown);
              return (
                <div className="rounded-lg border border-violet-800/30 bg-violet-950/10 p-4">
                  <span className="text-[10px] font-semibold uppercase text-violet-400 block mb-3">Matrice LSI</span>
                  {concepts.length > 0 && (
                    <div className="mb-3">
                      <span className="text-[10px] text-zinc-500 block mb-1">Concepts</span>
                      <div className="flex flex-wrap gap-1.5">
                        {concepts.map((c, i) => <Badge key={i} className="bg-violet-500/10 text-violet-300 text-[10px]">{safeStr(c)}</Badge>)}
                      </div>
                    </div>
                  )}
                  {layers && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 mb-3">
                      {["visuel", "verbal", "comportemental", "emotionnel", "rituel"].map((layerKey) => {
                        const items = safeArr((layers as AnyContent)[layerKey] as unknown);
                        if (items.length === 0) return null;
                        return (
                          <div key={layerKey} className="rounded bg-zinc-900/50 p-2">
                            <span className="text-[10px] font-medium text-violet-300 capitalize block mb-1">{layerKey}</span>
                            <ul className="space-y-0.5">{items.map((it, j) => <li key={j} className="text-[10px] text-zinc-400">{safeStr(it)}</li>)}</ul>
                          </div>
                        );
                      })}
                    </div>
                  )}
                  {rules.length > 0 && (
                    <div>
                      <span className="text-[10px] text-zinc-500 block mb-1">Regles de sublimation</span>
                      <ul className="space-y-0.5">{rules.map((r, i) => <li key={i} className="text-[10px] text-zinc-400 flex items-start gap-1"><span className="text-violet-500">-</span>{safeStr(r)}</li>)}</ul>
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        </Section>
      ) : null}

      {/* Sacred Objects */}
      {sacredObjects.length > 0 && (
        <Section title={`Objets Sacres (${sacredObjects.length})`} icon={Crown} accent="text-blue-400">
          <div className="space-y-2">
            {sacredObjects.map((obj, i) => (
              <div key={i} className="rounded-lg border border-zinc-800 bg-zinc-950/50 p-3">
                <div className="flex items-center gap-2 mb-1">
                  <h5 className="text-xs font-semibold text-white">{safeStr(obj.name)}</h5>
                  {safeStr(obj.form) && <Badge className="bg-zinc-700 text-zinc-300 text-[10px]">{safeStr(obj.form)}</Badge>}
                  {safeStr(obj.stage) && <Badge className="bg-violet-500/10 text-violet-300 text-[10px]">{safeStr(obj.stage)}</Badge>}
                </div>
                {safeStr(obj.narrative) && <p className="text-[10px] text-zinc-400 leading-relaxed">{safeStr(obj.narrative)}</p>}
                {safeStr(obj.socialSignal) && <p className="text-[10px] text-zinc-500 mt-1">Signal social : {safeStr(obj.socialSignal)}</p>}
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Proof Points */}
      {proofPoints.length > 0 && (
        <Section title={`Proof Points (${proofPoints.length})`} icon={Check} accent="text-blue-400">
          <div className="space-y-2">
            {proofPoints.map((pp, i) => (
              <div key={i} className="rounded-lg border border-zinc-800 bg-zinc-950/50 p-3 flex items-start gap-3">
                <Badge className="bg-emerald-500/10 text-emerald-300 text-[10px] shrink-0">{safeStr(pp.type)}</Badge>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-white font-medium">{safeStr(pp.claim)}</p>
                  <p className="text-[10px] text-zinc-400 mt-0.5">{safeStr(pp.evidence)}</p>
                  {safeStr(pp.source) && <p className="text-[10px] text-zinc-500 mt-0.5">Source : {safeStr(pp.source)}</p>}
                </div>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Symboles */}
      {symboles.length > 0 && (
        <Section title={`Symboles (${symboles.length})`} icon={CircleDot} accent="text-blue-400">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {symboles.map((s, i) => (
              <div key={i} className="rounded-lg border border-zinc-800 bg-zinc-950/50 p-3">
                <h5 className="text-xs font-semibold text-white mb-1">{safeStr(s.symbol)}</h5>
                {safeArr(s.meanings as unknown).length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-1">
                    {(s.meanings as string[]).map((m, j) => <Badge key={j} className="bg-blue-500/10 text-blue-300 text-[10px]">{m}</Badge>)}
                  </div>
                )}
                {safeArr(s.usageContexts as unknown).length > 0 && (
                  <p className="text-[10px] text-zinc-500">Contextes : {(s.usageContexts as string[]).join(", ")}</p>
                )}
              </div>
            ))}
          </div>
        </Section>
      )}
    </div>
  );
}

// ============================================================================
// PILLAR V — VALEUR RENDERER
// ============================================================================

function RenderPillarV({ content }: { content: AnyContent }) {
  const produits = safeArr(content.produitsCatalogue);
  const ladder = safeArr(content.productLadder);
  const ue = safe<AnyContent>(content.unitEconomics);
  const promesseDeValeur = safeStr(content.promesseDeValeur);
  const quadrantKeys = [
    { key: "valeurMarqueTangible", label: "Valeur Marque Tangible", color: "text-emerald-300", bg: "bg-emerald-500/10" },
    { key: "valeurMarqueIntangible", label: "Valeur Marque Intangible", color: "text-emerald-200", bg: "bg-emerald-500/5" },
    { key: "valeurClientTangible", label: "Valeur Client Tangible", color: "text-sky-300", bg: "bg-sky-500/10" },
    { key: "valeurClientIntangible", label: "Valeur Client Intangible", color: "text-sky-200", bg: "bg-sky-500/5" },
    { key: "coutMarqueTangible", label: "Cout Marque Tangible", color: "text-red-300", bg: "bg-red-500/10" },
    { key: "coutMarqueIntangible", label: "Cout Marque Intangible", color: "text-red-200", bg: "bg-red-500/5" },
    { key: "coutClientTangible", label: "Cout Client Tangible", color: "text-amber-300", bg: "bg-amber-500/10" },
    { key: "coutClientIntangible", label: "Cout Client Intangible", color: "text-amber-200", bg: "bg-amber-500/5" },
  ] as const;
  const hasQuadrants = quadrantKeys.some(({ key }) => safeArr(content[key] as unknown).length > 0);

  return (
    <div className="space-y-5">
      {/* Produits Catalogue */}
      {produits.length > 0 ? (
        <Section title={`Catalogue Produits (${produits.length})`} icon={ShoppingBag} accent="text-emerald-400">
          <div className="space-y-4">
            {produits.map((p, i) => {
              const prix = safeNum(p.prix);
              const cout = safeNum(p.cout);
              const marge = prix > 0 && cout > 0 ? prix - cout : 0;
              return (
                <div key={i} className="rounded-lg border border-zinc-800 bg-zinc-950/50 p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <h5 className="text-sm font-semibold text-white">{safeStr(p.nom)}</h5>
                      <Badge className="bg-emerald-500/10 text-emerald-300 text-[10px]">{safeStr(p.categorie)}</Badge>
                      {safeStr(p.phaseLifecycle) && <Badge className="bg-zinc-700 text-zinc-300 text-[10px]">{safeStr(p.phaseLifecycle)}</Badge>}
                    </div>
                  </div>
                  {/* Prix grid */}
                  <div className="grid grid-cols-3 gap-2 mb-3">
                    <div className="rounded bg-zinc-900 p-2 text-center">
                      <span className="text-[10px] text-zinc-500 block">Prix</span>
                      <span className="text-sm font-bold text-white">{fmtCurrency(prix)} F</span>
                    </div>
                    <div className="rounded bg-zinc-900 p-2 text-center">
                      <span className="text-[10px] text-zinc-500 block">Cout</span>
                      <span className="text-sm font-bold text-zinc-300">{fmtCurrency(cout)} F</span>
                    </div>
                    <div className="rounded bg-zinc-900 p-2 text-center">
                      <span className="text-[10px] text-zinc-500 block">Marge</span>
                      <span className={`text-sm font-bold ${marge > 0 ? "text-emerald-400" : "text-red-400"}`}>{fmtCurrency(marge)} F</span>
                    </div>
                  </div>
                  {/* Matrice de valeur 2x2x2 complète */}
                  <div className="mb-3">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500 mb-2 flex items-center gap-1">
                      <PieChart className="h-3 w-3" /> Matrice de valeur (Client × Marque × Gain/Cout)
                    </p>
                    <div className="grid grid-cols-2 gap-px bg-zinc-800 rounded-lg overflow-hidden">
                      {/* Header row */}
                      <div className="bg-zinc-900/80 p-2 text-center">
                        <span className="text-[10px] font-bold text-zinc-400">CLIENT</span>
                      </div>
                      <div className="bg-zinc-900/80 p-2 text-center">
                        <span className="text-[10px] font-bold text-zinc-400">MARQUE</span>
                      </div>
                      {/* Gains row */}
                      <div className="bg-emerald-950/20 p-2.5">
                        <span className="text-[10px] font-medium text-emerald-400 block mb-1">Gain concret</span>
                        <p className="text-[11px] text-zinc-300 leading-relaxed">{safeStr(p.gainClientConcret) || <span className="text-zinc-600 italic">Non renseigne</span>}</p>
                      </div>
                      <div className="bg-emerald-950/20 p-2.5">
                        <span className="text-[10px] font-medium text-emerald-400 block mb-1">Gain concret</span>
                        <p className="text-[11px] text-zinc-300 leading-relaxed">{safeStr(p.gainMarqueConcret) || <span className="text-zinc-600 italic">Non renseigne</span>}</p>
                      </div>
                      <div className="bg-emerald-950/10 p-2.5">
                        <span className="text-[10px] font-medium text-emerald-300 block mb-1">Gain abstrait</span>
                        <p className="text-[11px] text-zinc-300 leading-relaxed">{safeStr(p.gainClientAbstrait) || <span className="text-zinc-600 italic">Non renseigne</span>}</p>
                      </div>
                      <div className="bg-emerald-950/10 p-2.5">
                        <span className="text-[10px] font-medium text-emerald-300 block mb-1">Gain abstrait</span>
                        <p className="text-[11px] text-zinc-300 leading-relaxed">{safeStr(p.gainMarqueAbstrait) || <span className="text-zinc-600 italic">Non renseigne</span>}</p>
                      </div>
                      {/* Couts row */}
                      <div className="bg-red-950/20 p-2.5">
                        <span className="text-[10px] font-medium text-red-400 block mb-1">Cout concret</span>
                        <p className="text-[11px] text-zinc-300 leading-relaxed">{safeStr(p.coutClientConcret) || <span className="text-zinc-600 italic">Non renseigne</span>}</p>
                      </div>
                      <div className="bg-red-950/20 p-2.5">
                        <span className="text-[10px] font-medium text-red-400 block mb-1">Cout concret</span>
                        <p className="text-[11px] text-zinc-300 leading-relaxed">{typeof p.coutMarqueConcret === "number" ? `${fmtCurrency(p.coutMarqueConcret)} F/sac` : safeStr(p.coutMarqueConcret) || <span className="text-zinc-600 italic">Non renseigne</span>}</p>
                      </div>
                      <div className="bg-red-950/10 p-2.5">
                        <span className="text-[10px] font-medium text-red-300 block mb-1">Cout abstrait</span>
                        <p className="text-[11px] text-zinc-300 leading-relaxed">{safeStr(p.coutClientAbstrait) || <span className="text-zinc-600 italic">Non renseigne</span>}</p>
                      </div>
                      <div className="bg-red-950/10 p-2.5">
                        <span className="text-[10px] font-medium text-red-300 block mb-1">Cout abstrait</span>
                        <p className="text-[11px] text-zinc-300 leading-relaxed">{safeStr(p.coutMarqueAbstrait) || <span className="text-zinc-600 italic">Non renseigne</span>}</p>
                      </div>
                    </div>
                  </div>
                  {/* Lien Promesse */}
                  {safeStr(p.lienPromesse) && (
                    <div className="rounded bg-violet-950/20 border border-violet-800/20 p-2.5 mb-3">
                      <span className="text-[10px] font-medium text-violet-400 block mb-0.5">Lien avec la promesse maitre</span>
                      <p className="text-[11px] text-zinc-300 leading-relaxed">{safeStr(p.lienPromesse)}</p>
                    </div>
                  )}
                  {/* Score emotionnel + leviers */}
                  {(safeNum(p.scoreEmotionnelADVE) > 0 || safeArr(p.leviersPsychologiques as unknown).length > 0) && (
                    <div className="flex items-center gap-3 mb-3 flex-wrap">
                      {safeNum(p.scoreEmotionnelADVE) > 0 && (
                        <div className="flex items-center gap-1.5">
                          <Heart className="h-3 w-3 text-pink-400" />
                          <span className="text-[10px] text-zinc-400">Score emotionnel :</span>
                          <span className={`text-xs font-bold ${safeNum(p.scoreEmotionnelADVE) >= 70 ? "text-pink-400" : safeNum(p.scoreEmotionnelADVE) >= 50 ? "text-amber-400" : "text-zinc-400"}`}>{safeNum(p.scoreEmotionnelADVE)}/100</span>
                        </div>
                      )}
                      {safeArr(p.leviersPsychologiques as unknown).map((lev, j) => (
                        <Badge key={j} className="bg-pink-500/10 text-pink-300 text-[10px]">{safeStr(lev)}</Badge>
                      ))}
                    </div>
                  )}
                  {/* Marge unitaire */}
                  {safeNum(p.margeUnitaire) > 0 && (
                    <div className="flex items-center gap-2 mb-3">
                      <DollarSign className="h-3 w-3 text-emerald-400" />
                      <span className="text-[10px] text-zinc-400">Marge unitaire :</span>
                      <span className="text-xs font-bold text-emerald-400">{fmtCurrency(p.margeUnitaire)} F</span>
                      <span className="text-[10px] text-zinc-500">({((safeNum(p.margeUnitaire) / Math.max(1, prix)) * 100).toFixed(1)}%)</span>
                    </div>
                  )}
                  {/* Meta */}
                  <div className="flex flex-wrap gap-2 text-[10px]">
                    {safeStr(p.segmentCible) && <span className="text-zinc-400">Cible : <strong className="text-zinc-200">{safeStr(p.segmentCible)}</strong></span>}
                    {safeArr(p.lf8Trigger as unknown).map((lf, j) => (
                      <Badge key={j} className="bg-amber-500/10 text-amber-300 text-[10px]">LF8: {safeStr(lf)}</Badge>
                    ))}
                    {safeStr(p.maslowMapping) && <Badge className="bg-sky-500/10 text-sky-300 text-[10px]">Maslow: {safeStr(p.maslowMapping)}</Badge>}
                    {safeStr(p.disponibilite) && <Badge className="bg-zinc-700 text-zinc-300 text-[10px]">{safeStr(p.disponibilite)}</Badge>}
                    {safeStr(p.skuRef) && <span className="text-zinc-500">SKU: {safeStr(p.skuRef)}</span>}
                    {safeArr(p.canalDistribution as unknown).map((ch, j) => (
                      <Badge key={j} className="bg-zinc-700 text-zinc-300 text-[10px]">{safeStr(ch)}</Badge>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </Section>
      ) : <Section title="Catalogue Produits" icon={ShoppingBag} accent="text-emerald-400" empty />}

      {/* Product Ladder */}
      {ladder.length > 0 ? (
        <Section title="Product Ladder" icon={Layers} accent="text-emerald-400">
          <div className="flex flex-col-reverse gap-2">
            {ladder.sort((a, b) => safeNum(a.position) - safeNum(b.position)).reverse().map((tier, i) => {
              const width = 60 + (i * 13);
              return (
                <div key={i} className="flex items-center justify-center">
                  <div className={`rounded-lg border border-emerald-800/30 bg-emerald-950/10 p-3 transition-all`}
                    style={{ width: `${Math.min(width, 100)}%` }}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-semibold text-emerald-300">{safeStr(tier.tier)}</span>
                      <span className="text-xs font-bold text-white">{fmtCurrency(tier.prix)} F</span>
                    </div>
                    <p className="text-[10px] text-zinc-400">{safeStr(tier.description).slice(0, 100)}</p>
                    <p className="text-[10px] text-zinc-500 mt-1">Cible : {safeStr(tier.cible)}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </Section>
      ) : <Section title="Product Ladder" icon={Layers} accent="text-emerald-400" empty />}

      {/* Unit Economics */}
      {ue ? (
        <Section title="Unit Economics" icon={BarChart3} accent="text-emerald-400">
          {(() => {
            const cac = safeNum(ue.cac);
            const ltv = safeNum(ue.ltv);
            const ratio = cac > 0 ? ltv / cac : 0;
            const ratioGood = ratio >= 3;
            return (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="rounded-lg border border-zinc-800 bg-zinc-950/50 p-3 text-center">
                  <span className="text-[10px] text-zinc-500 block">CAC</span>
                  <span className="text-lg font-bold text-white">{fmtCurrency(cac)} F</span>
                </div>
                <div className="rounded-lg border border-zinc-800 bg-zinc-950/50 p-3 text-center">
                  <span className="text-[10px] text-zinc-500 block">LTV</span>
                  <span className="text-lg font-bold text-white">{fmtCurrency(ltv)} F</span>
                </div>
                <div className={`rounded-lg border p-3 text-center ${ratioGood ? "border-emerald-800/30 bg-emerald-950/10" : "border-red-800/30 bg-red-950/10"}`}>
                  <span className="text-[10px] text-zinc-500 block">LTV/CAC</span>
                  <span className={`text-lg font-bold ${ratioGood ? "text-emerald-400" : "text-red-400"}`}>{ratio > 0 ? ratio.toFixed(0) + "x" : "—"}</span>
                </div>
                {safeStr(ue.pointMort) && (
                  <div className="rounded-lg border border-zinc-800 bg-zinc-950/50 p-3 text-center">
                    <span className="text-[10px] text-zinc-500 block">Point mort</span>
                    <span className="text-xs font-medium text-white">{safeStr(ue.pointMort)}</span>
                  </div>
                )}
                {safeNum(ue.budgetCom) > 0 && (
                  <div className="rounded-lg border border-zinc-800 bg-zinc-950/50 p-3 text-center">
                    <span className="text-[10px] text-zinc-500 block">Budget Com</span>
                    <span className="text-sm font-bold text-white">{fmtCurrency(ue.budgetCom)} F</span>
                  </div>
                )}
                {safeNum(ue.caVise) > 0 && (
                  <div className="rounded-lg border border-zinc-800 bg-zinc-950/50 p-3 text-center">
                    <span className="text-[10px] text-zinc-500 block">CA Vise</span>
                    <span className="text-sm font-bold text-white">{fmtCurrency(ue.caVise)} F</span>
                  </div>
                )}
              </div>
            );
          })()}
        </Section>
      ) : <Section title="Unit Economics" icon={BarChart3} accent="text-emerald-400" empty />}

      {/* Promesse de Valeur */}
      {promesseDeValeur ? (
        <Section title="Promesse de Valeur" icon={Award} accent="text-emerald-400">
          <div className="rounded-lg border border-emerald-800/30 bg-emerald-950/10 p-4">
            <p className="text-sm text-white leading-relaxed">{promesseDeValeur}</p>
          </div>
        </Section>
      ) : null}

      {/* 8 Quadrants Valeur/Cout */}
      {hasQuadrants && (
        <Section title="Quadrants Valeur / Cout" icon={PieChart} accent="text-emerald-400">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
            {quadrantKeys.map(({ key, label, color, bg }) => {
              const items = safeArr(content[key] as unknown);
              if (items.length === 0) return null;
              return (
                <div key={key} className={`rounded-lg border border-zinc-800 ${bg} p-3`}>
                  <span className={`text-[10px] font-semibold uppercase ${color} block mb-2`}>{label}</span>
                  <ul className="space-y-1">
                    {items.map((item, j) => (
                      <li key={j} className="text-[10px] text-zinc-300 flex items-start gap-1">
                        <span className="text-zinc-600 mt-0.5 shrink-0">-</span>{safeStr(item)}
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </Section>
      )}
    </div>
  );
}

// ============================================================================
// PILLAR E — ENGAGEMENT RENDERER
// ============================================================================

function RenderPillarE({ content }: { content: AnyContent }) {
  const touchpoints = safeArr(content.touchpoints);
  const rituels = safeArr(content.rituels);
  const aarrr = safe<AnyContent>(content.aarrr);
  const kpis = safeArr(content.kpis);
  const sacredCalendar = safeArr(content.sacredCalendar);
  const principes = safeArr(content.principesCommunautaires);
  const taboos = safeArr(content.taboos);
  const gamification = safe<AnyContent>(content.gamification);
  const commandments = safeArr(content.commandments);
  const ritesDePassage = safeArr(content.ritesDePassage);
  const sacraments = safeArr(content.sacraments);

  return (
    <div className="space-y-5">
      {/* Touchpoints */}
      {touchpoints.length > 0 ? (
        <Section title={`Touchpoints (${touchpoints.length})`} icon={Radio} accent="text-amber-400">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-zinc-800">
                  <th className="text-left py-2 px-2 text-zinc-500 font-medium">Canal</th>
                  <th className="text-left py-2 px-2 text-zinc-500 font-medium">Type</th>
                  <th className="text-left py-2 px-2 text-zinc-500 font-medium">AARRR</th>
                  <th className="text-left py-2 px-2 text-zinc-500 font-medium">Devotion</th>
                  <th className="text-right py-2 px-2 text-zinc-500 font-medium">Priorite</th>
                  <th className="text-left py-2 px-2 text-zinc-500 font-medium">Frequence</th>
                </tr>
              </thead>
              <tbody>
                {touchpoints.sort((a, b) => safeNum(a.priority) - safeNum(b.priority)).map((tp, i) => (
                  <tr key={i} className="border-b border-zinc-800/50">
                    <td className="py-2 px-2 text-white font-medium">{safeStr(tp.canal)}</td>
                    <td className="py-2 px-2">
                      <Badge className={`text-[10px] ${
                        safeStr(tp.type) === "PHYSIQUE" ? "bg-amber-500/10 text-amber-300" :
                        safeStr(tp.type) === "DIGITAL" ? "bg-sky-500/10 text-sky-300" :
                        "bg-violet-500/10 text-violet-300"
                      }`}>{safeStr(tp.type)}</Badge>
                    </td>
                    <td className="py-2 px-2"><Badge className={`text-[10px] ${AARRR_COLORS[safeStr(tp.aarrStage)] ?? "bg-zinc-800 text-zinc-300"}`}>{safeStr(tp.aarrStage)}</Badge></td>
                    <td className="py-2 px-2 text-zinc-400">{safeArr(tp.devotionLevel as unknown).map((v: unknown) => safeStr(v)).join(", ")}</td>
                    <td className="py-2 px-2 text-right text-zinc-300">{safeNum(tp.priority) > 0 ? `#${safeNum(tp.priority)}` : "—"}</td>
                    <td className="py-2 px-2 text-zinc-500">{safeStr(tp.frequency) || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>
      ) : <Section title="Touchpoints" icon={Radio} accent="text-amber-400" empty />}

      {/* Rituels */}
      {rituels.length > 0 ? (
        <Section title={`Rituels (${rituels.length})`} icon={Flame} accent="text-amber-400">
          <div className="space-y-3">
            {rituels.map((r, i) => (
              <div key={i} className="rounded-lg border border-zinc-800 bg-zinc-950/50 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <h5 className="text-sm font-semibold text-white">{safeStr(r.nom)}</h5>
                  <Badge className={`text-[10px] ${safeStr(r.type) === "ALWAYS_ON" ? "bg-emerald-500/10 text-emerald-300" : "bg-amber-500/10 text-amber-300"}`}>
                    {safeStr(r.type)}
                  </Badge>
                  {safeStr(r.frequency) && <Badge className="bg-zinc-700 text-zinc-300 text-[10px]">{safeStr(r.frequency)}</Badge>}
                  <Badge className={`text-[10px] ${AARRR_COLORS[safeStr(r.aarrPrimary)] ?? "bg-zinc-800 text-zinc-300"}`}>{safeStr(r.aarrPrimary)}</Badge>
                </div>
                <p className="text-xs text-zinc-400 mb-2">{safeStr(r.description)}</p>
                <div className="flex flex-wrap gap-2 text-[10px]">
                  <span className="text-zinc-500">Devotion : {safeArr(r.devotionLevels as unknown).map((v: unknown) => safeStr(v)).join(", ")}</span>
                  <span className="text-zinc-500">KPI : {safeStr(r.kpiMeasure)}</span>
                </div>
              </div>
            ))}
          </div>
        </Section>
      ) : <Section title="Rituels" icon={Flame} accent="text-amber-400" empty />}

      {/* AARRR Funnel */}
      {aarrr ? (
        <Section title="Funnel AARRR" icon={Activity} accent="text-amber-400">
          <div className="space-y-2">
            {["acquisition", "activation", "retention", "revenue", "referral"].map((stage, i) => {
              const width = 100 - (i * 12);
              const key = stage.toUpperCase();
              return (
                <div key={stage} className="flex items-center justify-center">
                  <div className={`rounded-lg border p-3 ${AARRR_COLORS[key] ?? "border-zinc-800 bg-zinc-950/50"}`}
                    style={{ width: `${width}%` }}>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-semibold uppercase">{stage}</span>
                    </div>
                    <p className="text-[10px] text-zinc-300/80 leading-relaxed">{safeStr((aarrr as AnyContent)[stage]).slice(0, 200)}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </Section>
      ) : <Section title="Funnel AARRR" icon={Activity} accent="text-amber-400" empty />}

      {/* KPIs */}
      {kpis.length > 0 ? (
        <Section title={`KPIs (${kpis.length})`} icon={Gauge} accent="text-amber-400">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-zinc-800">
                  <th className="text-left py-2 px-2 text-zinc-500 font-medium">Nom</th>
                  <th className="text-left py-2 px-2 text-zinc-500 font-medium">Type</th>
                  <th className="text-right py-2 px-2 text-zinc-500 font-medium">Objectif</th>
                  <th className="text-left py-2 px-2 text-zinc-500 font-medium">Frequence</th>
                </tr>
              </thead>
              <tbody>
                {kpis.map((kpi, i) => (
                  <tr key={i} className="border-b border-zinc-800/50">
                    <td className="py-2 px-2 text-white">{safeStr(kpi.name)}</td>
                    <td className="py-2 px-2"><Badge className="bg-zinc-700 text-zinc-300 text-[10px]">{safeStr(kpi.metricType)}</Badge></td>
                    <td className="py-2 px-2 text-right text-zinc-200 font-medium">{fmtCurrency(kpi.target)}</td>
                    <td className="py-2 px-2 text-zinc-500">{safeStr(kpi.frequency)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>
      ) : <Section title="KPIs" icon={Gauge} accent="text-amber-400" empty />}

      {/* Sacred Calendar */}
      {sacredCalendar.length > 0 && (
        <Section title="Calendrier Sacre" icon={Calendar} accent="text-amber-400">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {sacredCalendar.map((d, i) => (
              <div key={i} className="rounded-lg border border-zinc-800 bg-zinc-950/50 p-3">
                <span className="text-xs font-bold text-amber-300">{safeStr(d.date)}</span>
                <p className="text-xs text-white mt-0.5">{safeStr(d.name)}</p>
                <p className="text-[10px] text-zinc-500 mt-0.5">{safeStr(d.significance)}</p>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Commandements */}
      {commandments.length > 0 && (
        <Section title={`Commandements (${commandments.length})`} icon={ListChecks} accent="text-amber-400">
          <div className="space-y-2">
            {commandments.map((cmd, i) => (
              <div key={i} className="rounded-lg border border-zinc-800 bg-zinc-950/50 p-3 flex items-start gap-3">
                <span className="text-xs font-bold text-amber-400 shrink-0 w-6">{i + 1}.</span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-white font-medium">{safeStr(cmd.commandment)}</p>
                  {safeStr(cmd.justification) && <p className="text-[10px] text-zinc-500 mt-0.5">{safeStr(cmd.justification)}</p>}
                </div>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Principes Communautaires */}
      {principes.length > 0 && (
        <Section title={`Principes Communautaires (${principes.length})`} icon={Shield} accent="text-amber-400">
          <div className="space-y-2">
            {principes.map((pr, i) => (
              <div key={i} className="rounded-lg border border-zinc-800 bg-zinc-950/50 p-3">
                <p className="text-xs text-white">{safeStr(pr.principle)}</p>
                {safeStr(pr.enforcement) && <p className="text-[10px] text-zinc-500 mt-1">Application : {safeStr(pr.enforcement)}</p>}
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Taboos */}
      {taboos.length > 0 && (
        <Section title={`Tabous (${taboos.length})`} icon={AlertTriangle} accent="text-red-400">
          <div className="space-y-2">
            {taboos.map((t, i) => (
              <div key={i} className="rounded-lg border border-red-900/30 bg-red-950/10 p-3 flex items-start gap-3">
                <Swords className="h-3.5 w-3.5 text-red-400 shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-red-200 font-medium">{safeStr(t.taboo)}</p>
                  {safeStr(t.consequence) && <p className="text-[10px] text-zinc-500 mt-0.5">{safeStr(t.consequence)}</p>}
                </div>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Gamification */}
      {gamification ? (
        <Section title="Gamification" icon={Award} accent="text-amber-400">
          <div className="space-y-3">
            {/* Niveaux */}
            {safeArr((gamification as AnyContent).niveaux as unknown).length > 0 && (
              <div>
                <span className="text-[10px] font-semibold uppercase text-zinc-500 block mb-2">Niveaux de devotion</span>
                <div className="flex flex-col gap-1.5">
                  {safeArr((gamification as AnyContent).niveaux as unknown).map((niv, i) => {
                    const n = niv as AnyContent;
                    return (
                      <div key={i} className="rounded-lg border border-zinc-800 bg-zinc-950/50 p-3 flex items-center gap-3">
                        <Badge className="bg-amber-500/10 text-amber-300 text-[10px] shrink-0">{safeStr(n.niveau)}</Badge>
                        <span className="text-[10px] text-zinc-400 flex-1">{safeStr(n.condition)}</span>
                        {safeStr(n.reward) && <span className="text-[10px] text-emerald-400">{safeStr(n.reward)}</span>}
                        {safeStr(n.duration) && <span className="text-[10px] text-zinc-500">{safeStr(n.duration)}</span>}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            {/* Recompenses */}
            {safeArr((gamification as AnyContent).recompenses as unknown).length > 0 && (
              <div>
                <span className="text-[10px] font-semibold uppercase text-zinc-500 block mb-2">Recompenses</span>
                <div className="flex flex-wrap gap-1.5">
                  {((gamification as AnyContent).recompenses as string[]).map((r, i) => (
                    <Badge key={i} className="bg-amber-500/10 text-amber-300 text-[10px]">{r}</Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        </Section>
      ) : null}

      {/* Rites de Passage */}
      {ritesDePassage.length > 0 && (
        <Section title={`Rites de Passage (${ritesDePassage.length})`} icon={Milestone} accent="text-amber-400">
          <div className="space-y-2">
            {ritesDePassage.map((rp, i) => (
              <div key={i} className="rounded-lg border border-zinc-800 bg-zinc-950/50 p-3">
                <div className="flex items-center gap-2 mb-1">
                  <Badge className="bg-zinc-700 text-zinc-300 text-[10px]">{safeStr(rp.fromStage)}</Badge>
                  <ArrowRight className="h-3 w-3 text-amber-400" />
                  <Badge className="bg-amber-500/10 text-amber-300 text-[10px]">{safeStr(rp.toStage)}</Badge>
                </div>
                {safeStr(rp.rituelEntree) && <p className="text-[10px] text-zinc-400">{safeStr(rp.rituelEntree)}</p>}
                {safeArr(rp.symboles as unknown).length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {(rp.symboles as string[]).map((s, j) => <Badge key={j} className="bg-violet-500/10 text-violet-300 text-[10px]">{s}</Badge>)}
                  </div>
                )}
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Sacrements */}
      {sacraments.length > 0 && (
        <Section title={`Sacrements (${sacraments.length})`} icon={Star} accent="text-amber-400">
          <div className="space-y-2">
            {sacraments.map((sac, i) => (
              <div key={i} className="rounded-lg border border-amber-800/30 bg-amber-950/10 p-3">
                <div className="flex items-center gap-2 mb-1">
                  <h5 className="text-xs font-semibold text-amber-200">{safeStr(sac.nomSacre)}</h5>
                  {safeStr(sac.aarrStage) && <Badge className={`text-[10px] ${AARRR_COLORS[safeStr(sac.aarrStage)] ?? "bg-zinc-800 text-zinc-300"}`}>{safeStr(sac.aarrStage)}</Badge>}
                </div>
                <div className="grid grid-cols-2 gap-2 text-[10px]">
                  {safeStr(sac.trigger) && <span className="text-zinc-400"><strong className="text-zinc-300">Trigger :</strong> {safeStr(sac.trigger)}</span>}
                  {safeStr(sac.action) && <span className="text-zinc-400"><strong className="text-zinc-300">Action :</strong> {safeStr(sac.action)}</span>}
                  {safeStr(sac.reward) && <span className="text-zinc-400"><strong className="text-zinc-300">Reward :</strong> {safeStr(sac.reward)}</span>}
                  {safeStr(sac.kpi) && <span className="text-zinc-400"><strong className="text-zinc-300">KPI :</strong> {safeStr(sac.kpi)}</span>}
                </div>
              </div>
            ))}
          </div>
        </Section>
      )}
    </div>
  );
}

// ============================================================================
// PILLAR R — RISK RENDERER
// ============================================================================

function RenderPillarR({ content }: { content: AnyContent }) {
  const swot = safe<AnyContent>(content.globalSwot);
  const matrix = safeArr(content.probabilityImpactMatrix);
  const mitigations = safeArr(content.mitigationPriorities);
  const riskScore = safeNum(content.riskScore);

  return (
    <div className="space-y-5">
      {/* Risk Score */}
      {riskScore > 0 && (
        <GaugeDisplay value={riskScore} label="Score de Risque Global" good={riskScore < 50} />
      )}

      {/* SWOT */}
      {swot ? (
        <Section title="SWOT Global" icon={PieChart} accent="text-red-400">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              { key: "strengths", label: "Forces", color: "border-emerald-800/30 bg-emerald-950/10", textColor: "text-emerald-300" },
              { key: "weaknesses", label: "Faiblesses", color: "border-red-800/30 bg-red-950/10", textColor: "text-red-300" },
              { key: "opportunities", label: "Opportunites", color: "border-blue-800/30 bg-blue-950/10", textColor: "text-blue-300" },
              { key: "threats", label: "Menaces", color: "border-amber-800/30 bg-amber-950/10", textColor: "text-amber-300" },
            ].map(({ key, label, color, textColor }) => (
              <div key={key} className={`rounded-lg border ${color} p-3`}>
                <span className={`text-[10px] font-semibold uppercase ${textColor} block mb-2`}>{label}</span>
                <ul className="space-y-1">
                  {safeArr((swot as AnyContent)[key] as unknown).map((item, i) => (
                    <li key={i} className="text-xs text-zinc-300 flex items-start gap-1.5">
                      <span className="text-zinc-600 mt-0.5">-</span>
                      {safeStr(item)}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </Section>
      ) : <Section title="SWOT Global" icon={PieChart} accent="text-red-400" empty />}

      {/* Risk Matrix */}
      {matrix.length > 0 ? (
        <Section title={`Matrice Risques (${matrix.length})`} icon={AlertTriangle} accent="text-red-400">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-zinc-800">
                  <th className="text-left py-2 px-2 text-zinc-500 font-medium">Risque</th>
                  <th className="text-left py-2 px-2 text-zinc-500 font-medium">Probabilite</th>
                  <th className="text-left py-2 px-2 text-zinc-500 font-medium">Impact</th>
                  <th className="text-left py-2 px-2 text-zinc-500 font-medium">Mitigation</th>
                </tr>
              </thead>
              <tbody>
                {matrix.map((r, i) => (
                  <tr key={i} className="border-b border-zinc-800/50">
                    <td className="py-2 px-2 text-white">{safeStr(r.risk)}</td>
                    <td className="py-2 px-2"><Badge className={`text-[10px] ${RISK_COLORS[safeStr(r.probability)] ?? ""}`}>{safeStr(r.probability)}</Badge></td>
                    <td className="py-2 px-2"><Badge className={`text-[10px] ${RISK_COLORS[safeStr(r.impact)] ?? ""}`}>{safeStr(r.impact)}</Badge></td>
                    <td className="py-2 px-2 text-zinc-400 max-w-xs">{safeStr(r.mitigation).slice(0, 100)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>
      ) : <Section title="Matrice Risques" icon={AlertTriangle} accent="text-red-400" empty />}

      {/* Mitigations */}
      {mitigations.length > 0 ? (
        <Section title={`Plan de Mitigation (${mitigations.length})`} icon={Shield} accent="text-red-400">
          <div className="space-y-2">
            {mitigations.map((m, i) => (
              <div key={i} className="rounded-lg border border-zinc-800 bg-zinc-950/50 p-3 flex items-start gap-3">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-red-600/20 text-[10px] font-bold text-red-300 shrink-0">{i + 1}</span>
                <div className="flex-1">
                  <p className="text-xs text-zinc-200 mb-1">{safeStr(m.action)}</p>
                  <div className="flex flex-wrap gap-3 text-[10px] text-zinc-500">
                    {safeStr(m.owner) && <span>Resp. : {safeStr(m.owner)}</span>}
                    {safeStr(m.timeline) && <span>Echeance : {safeStr(m.timeline)}</span>}
                    {safeStr(m.investment) && <span>Invest. : {safeStr(m.investment)}</span>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Section>
      ) : <Section title="Plan de Mitigation" icon={Shield} accent="text-red-400" empty />}
    </div>
  );
}

// ============================================================================
// PILLAR T — TRACK RENDERER
// ============================================================================

function RenderPillarT({ content }: { content: AnyContent }) {
  const triangulation = safe<AnyContent>(content.triangulation);
  const hypotheses = safeArr(content.hypothesisValidation);
  const tamSamSom = safe<AnyContent>(content.tamSamSom);
  const bmfScore = safeNum(content.brandMarketFitScore);

  return (
    <div className="space-y-5">
      {/* BMF Score */}
      {bmfScore > 0 && <GaugeDisplay value={bmfScore} label="Brand-Market Fit Score" />}

      {/* Triangulation */}
      {triangulation ? (
        <Section title="Triangulation Marche" icon={Eye} accent="text-sky-400">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              { key: "customerInterviews", label: "Interviews Clients", icon: Users },
              { key: "competitiveAnalysis", label: "Analyse Concurrentielle", icon: Building2 },
              { key: "trendAnalysis", label: "Analyse des Tendances", icon: TrendingUp },
              { key: "financialBenchmarks", label: "Benchmarks Financiers", icon: BarChart3 },
            ].map(({ key, label, icon: TIcon }) => {
              const val = safeStr((triangulation as AnyContent)[key]);
              return (
                <div key={key} className="rounded-lg border border-zinc-800 bg-zinc-950/50 p-3">
                  <div className="flex items-center gap-1.5 mb-2">
                    <TIcon className="h-3 w-3 text-sky-400/60" />
                    <span className="text-[10px] font-semibold uppercase text-zinc-400">{label}</span>
                  </div>
                  <p className="text-xs text-zinc-300 leading-relaxed">{val || <EmptyField />}</p>
                </div>
              );
            })}
          </div>
        </Section>
      ) : <Section title="Triangulation Marche" icon={Eye} accent="text-sky-400" empty />}

      {/* Hypotheses */}
      {hypotheses.length > 0 ? (
        <Section title={`Hypotheses (${hypotheses.length})`} icon={Lightbulb} accent="text-sky-400">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-zinc-800">
                  <th className="text-left py-2 px-2 text-zinc-500 font-medium">Hypothese</th>
                  <th className="text-left py-2 px-2 text-zinc-500 font-medium">Methode</th>
                  <th className="text-left py-2 px-2 text-zinc-500 font-medium">Statut</th>
                  <th className="text-left py-2 px-2 text-zinc-500 font-medium">Evidence</th>
                </tr>
              </thead>
              <tbody>
                {hypotheses.map((h, i) => (
                  <tr key={i} className="border-b border-zinc-800/50">
                    <td className="py-2 px-2 text-white max-w-xs">{safeStr(h.hypothesis)}</td>
                    <td className="py-2 px-2 text-zinc-400">{safeStr(h.validationMethod)}</td>
                    <td className="py-2 px-2"><Badge className={`text-[10px] ${HYPOTHESIS_COLORS[safeStr(h.status)] ?? ""}`}>{safeStr(h.status)}</Badge></td>
                    <td className="py-2 px-2 text-zinc-500 max-w-xs">{safeStr(h.evidence).slice(0, 100)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>
      ) : <Section title="Hypotheses" icon={Lightbulb} accent="text-sky-400" empty />}

      {/* TAM SAM SOM */}
      {tamSamSom ? (
        <Section title="TAM / SAM / SOM" icon={Map} accent="text-sky-400">
          <div className="space-y-3">
            {[
              { key: "tam", label: "TAM — Marche Total Adressable", width: "100%" },
              { key: "sam", label: "SAM — Marche Adressable", width: "70%" },
              { key: "som", label: "SOM — Part Obtensible", width: "40%" },
            ].map(({ key, label, width }) => {
              const obj = safe<AnyContent>((tamSamSom as AnyContent)[key]);
              if (!obj) return null;
              return (
                <div key={key} className="flex items-center justify-center">
                  <div className="rounded-lg border border-sky-800/30 bg-sky-950/10 p-3" style={{ width }}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] font-semibold text-sky-300 uppercase">{label}</span>
                      <span className="text-sm font-bold text-white">{fmtCurrency(obj.value)} FCFA</span>
                    </div>
                    <p className="text-[10px] text-zinc-400">{safeStr(obj.description)}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </Section>
      ) : <Section title="TAM / SAM / SOM" icon={Map} accent="text-sky-400" empty />}
    </div>
  );
}

// ============================================================================
// PILLAR I — IMPLEMENTATION RENDERER
// ============================================================================

function RenderPillarI({ content }: { content: AnyContent }) {
  const sprint = safeArr(content.sprint90Days);
  const calendar = safeArr(content.annualCalendar);
  const budgetBreakdown = safe<AnyContent>(content.budgetBreakdown);
  const globalBudget = safeNum(content.globalBudget);
  const team = safeArr(content.teamStructure);
  const brandPlatform = safe<AnyContent>(content.brandPlatform);
  const copyStrategy = safe<AnyContent>(content.copyStrategy);
  const bigIdea = safe<AnyContent>(content.bigIdea);
  const syntheses = safe<AnyContent>(content.syntheses);
  const year1 = safeStr(content.year1);
  const vision3years = safeStr(content.vision3years);

  return (
    <div className="space-y-5">
      {/* Sprint 90 Days */}
      {sprint.length > 0 ? (
        <Section title={`Sprint 90 Jours (${sprint.length} actions)`} icon={Zap} accent="text-orange-400">
          <div className="space-y-2">
            {sprint.sort((a, b) => safeNum(a.priority) - safeNum(b.priority)).map((action, i) => (
              <div key={i} className="rounded-lg border border-zinc-800 bg-zinc-950/50 p-3 flex items-start gap-3">
                <span className={`flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold shrink-0 ${
                  action.isRiskMitigation ? "bg-red-600/20 text-red-300" : "bg-orange-600/20 text-orange-300"
                }`}>
                  {safeNum(action.priority)}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-zinc-200 mb-1">{safeStr(action.action)}</p>
                  <div className="flex flex-wrap gap-3 text-[10px] text-zinc-500">
                    {safeStr(action.owner) && <span>Resp. : {safeStr(action.owner)}</span>}
                    <span>KPI : {safeStr(action.kpi)}</span>
                    {!!action.isRiskMitigation && <Badge className="bg-red-500/10 text-red-300 text-[10px]">Mitigation</Badge>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Section>
      ) : <Section title="Sprint 90 Jours" icon={Zap} accent="text-orange-400" empty />}

      {/* Calendrier Annuel */}
      {calendar.length > 0 ? (
        <Section title="Calendrier Annuel" icon={Calendar} accent="text-orange-400">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            {[1, 2, 3, 4].map((q) => {
              const qCampaigns = calendar.filter((c) => safeNum(c.quarter) === q);
              return (
                <div key={q} className="rounded-lg border border-zinc-800 bg-zinc-950/50 p-3">
                  <span className="text-xs font-bold text-orange-300 block mb-2">Q{q}</span>
                  {qCampaigns.length === 0 ? (
                    <p className="text-[10px] text-zinc-600 italic">Aucune campagne</p>
                  ) : (
                    <div className="space-y-2">
                      {qCampaigns.map((c, i) => (
                        <div key={i} className="border-b border-zinc-800/50 pb-1.5 last:border-0 last:pb-0">
                          <p className="text-xs text-white font-medium">{safeStr(c.name)}</p>
                          <p className="text-[10px] text-zinc-500">{safeStr(c.objective)}</p>
                          {safeNum(c.budget) > 0 && <p className="text-[10px] text-zinc-600">{fmtCurrency(c.budget)} F</p>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </Section>
      ) : <Section title="Calendrier Annuel" icon={Calendar} accent="text-orange-400" empty />}

      {/* Budget */}
      {(globalBudget > 0 || budgetBreakdown) ? (
        <Section title="Budget" icon={DollarSign} accent="text-orange-400">
          {globalBudget > 0 && (
            <div className="rounded-lg border border-orange-800/30 bg-orange-950/10 p-3 mb-3 text-center">
              <span className="text-[10px] text-zinc-500 block">Budget Global</span>
              <span className="text-xl font-bold text-white">{fmtCurrency(globalBudget)} FCFA</span>
            </div>
          )}
          {budgetBreakdown && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { key: "production", label: "Production" },
                { key: "media", label: "Media" },
                { key: "talent", label: "Talent" },
                { key: "logistics", label: "Logistique" },
                { key: "technology", label: "Technologie" },
                { key: "legal", label: "Juridique" },
                { key: "contingency", label: "Contingence" },
                { key: "agencyFees", label: "Agence" },
              ].filter(({ key }) => safeNum((budgetBreakdown as AnyContent)[key]) > 0).map(({ key, label }) => (
                <div key={key} className="rounded bg-zinc-900/50 p-2 text-center">
                  <span className="text-[10px] text-zinc-500 block">{label}</span>
                  <span className="text-xs font-bold text-zinc-200">{fmtCurrency((budgetBreakdown as AnyContent)[key])} F</span>
                </div>
              ))}
            </div>
          )}
        </Section>
      ) : <Section title="Budget" icon={DollarSign} accent="text-orange-400" empty />}

      {/* Equipe */}
      {team.length > 0 ? (
        <Section title={`Equipe (${team.length})`} icon={Users} accent="text-orange-400">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {team.map((m, i) => (
              <div key={i} className="rounded-lg border border-zinc-800 bg-zinc-950/50 p-3 text-center">
                <p className="text-sm font-semibold text-white">{safeStr(m.name)}</p>
                <p className="text-[10px] text-orange-300 mt-0.5">{safeStr(m.title)}</p>
                <p className="text-[10px] text-zinc-500 mt-1">{safeStr(m.responsibility)}</p>
              </div>
            ))}
          </div>
        </Section>
      ) : <Section title="Equipe" icon={Users} accent="text-orange-400" empty />}

      {/* Brand Platform */}
      {brandPlatform ? (
        <Section title="Brand Platform" icon={Layers} accent="text-orange-400">
          <div className="space-y-2">
            {[
              { key: "name", label: "Nom" },
              { key: "benefit", label: "Benefice" },
              { key: "target", label: "Cible" },
              { key: "competitiveAdvantage", label: "Avantage concurrentiel" },
              { key: "emotionalBenefit", label: "Benefice emotionnel" },
              { key: "functionalBenefit", label: "Benefice fonctionnel" },
              { key: "supportedBy", label: "Soutenu par" },
            ].map(({ key, label }) => {
              const val = safeStr((brandPlatform as AnyContent)[key]);
              if (!val) return null;
              return <KVLine key={key} label={label} value={val} />;
            })}
          </div>
        </Section>
      ) : <Section title="Brand Platform" icon={Layers} accent="text-orange-400" empty />}

      {/* Copy Strategy */}
      {copyStrategy ? (
        <Section title="Copy Strategy" icon={FileText} accent="text-orange-400">
          <div className="space-y-2">
            {safeStr((copyStrategy as AnyContent).promise) && (
              <KVLine label="Promesse" value={safeStr((copyStrategy as AnyContent).promise)} />
            )}
            {safeStr((copyStrategy as AnyContent).rtb) && (
              <KVLine label="RTB" value={safeStr((copyStrategy as AnyContent).rtb)} />
            )}
          </div>
        </Section>
      ) : <Section title="Copy Strategy" icon={FileText} accent="text-orange-400" empty />}

      {/* Big Idea */}
      {bigIdea ? (
        <Section title="Big Idea" icon={Lightbulb} accent="text-orange-400">
          <div className="space-y-3">
            <div className="space-y-2">
              {safeStr((bigIdea as AnyContent).concept) && (
                <KVLine label="Concept" value={safeStr((bigIdea as AnyContent).concept)} />
              )}
              {safeStr((bigIdea as AnyContent).mechanism) && (
                <KVLine label="Mecanisme" value={safeStr((bigIdea as AnyContent).mechanism)} />
              )}
              {safeStr((bigIdea as AnyContent).insight) && (
                <KVLine label="Insight" value={safeStr((bigIdea as AnyContent).insight)} />
              )}
            </div>
            {safeArr((bigIdea as AnyContent).adaptations as unknown).length > 0 && (
              <div>
                <span className="text-[10px] font-semibold uppercase text-zinc-500 block mb-2">Adaptations</span>
                <div className="flex flex-wrap gap-1.5">
                  {safeArr((bigIdea as AnyContent).adaptations as unknown).map((a, i) => (
                    <Badge key={i} className="bg-orange-500/10 text-orange-300 text-[10px]">{safeStr(a)}</Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        </Section>
      ) : <Section title="Big Idea" icon={Lightbulb} accent="text-orange-400" empty />}

      {/* Syntheses */}
      {syntheses ? (
        <Section title="Syntheses" icon={BookOpen} accent="text-orange-400">
          <div className="space-y-3">
            {[
              { key: "brandIdentity", label: "Identite de marque" },
              { key: "positioning", label: "Positionnement" },
              { key: "valueArchitecture", label: "Architecture de valeur" },
              { key: "engagementStrategy", label: "Strategie d'engagement" },
              { key: "riskSynthesis", label: "Synthese des risques" },
              { key: "marketValidation", label: "Validation marche" },
            ].map(({ key, label }) => {
              const val = safeStr((syntheses as AnyContent)[key]);
              if (!val) return null;
              return (
                <div key={key} className="rounded-lg border border-zinc-800 bg-zinc-950/50 p-3">
                  <span className="text-[10px] font-semibold uppercase text-zinc-500 block mb-1">{label}</span>
                  <p className="text-xs text-zinc-300 leading-relaxed">{val}</p>
                </div>
              );
            })}
          </div>
        </Section>
      ) : <Section title="Syntheses" icon={BookOpen} accent="text-orange-400" empty />}

      {/* Year 1 & Vision 3 Years */}
      {(year1 || vision3years) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {year1 && (
            <Section title="Annee 1" icon={Flag} accent="text-orange-400">
              <p className="text-sm text-zinc-300 leading-relaxed">{year1}</p>
            </Section>
          )}
          {vision3years && (
            <Section title="Vision 3 ans" icon={Target} accent="text-orange-400">
              <p className="text-sm text-zinc-300 leading-relaxed">{vision3years}</p>
            </Section>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// PILLAR S — STRATEGIE RENDERER
// ============================================================================

function RenderPillarS({ content }: { content: AnyContent }) {
  const synthese = safeStr(content.syntheseExecutive);
  const fcs = Array.isArray(content.facteursClesSucces) ? content.facteursClesSucces as string[] : [];
  const recos = safeArr(content.recommandationsPrioritaires);
  const axes = safeArr(content.axesStrategiques);
  const coherenceScore = safeNum(content.coherenceScore);
  const visionStrategique = safeStr(content.visionStrategique);
  const coherencePiliers = safeArr(content.coherencePiliers);
  const sprint90Recap = safeArr(content.sprint90Recap);
  const kpiDashboard = safeArr(content.kpiDashboard);

  return (
    <div className="space-y-5">
      {/* Coherence Score */}
      {coherenceScore > 0 && <GaugeDisplay value={coherenceScore} label="Score de Coherence" />}

      {/* Synthese Executive */}
      {synthese ? (
        <Section title="Synthese Executive" icon={FileText} accent="text-pink-400">
          <p className="text-sm text-zinc-300 leading-relaxed whitespace-pre-wrap">{synthese}</p>
        </Section>
      ) : <Section title="Synthese Executive" icon={FileText} accent="text-pink-400" empty />}

      {/* Facteurs Cles de Succes */}
      {fcs.length > 0 ? (
        <Section title={`Facteurs Cles de Succes (${fcs.length})`} icon={Award} accent="text-pink-400">
          <div className="space-y-2">
            {fcs.map((f, i) => (
              <div key={i} className="flex items-start gap-3 rounded-lg border border-zinc-800 bg-zinc-950/50 p-3">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-pink-600/20 text-[10px] font-bold text-pink-300 shrink-0">{i + 1}</span>
                <p className="text-xs text-zinc-200">{f}</p>
              </div>
            ))}
          </div>
        </Section>
      ) : <Section title="Facteurs Cles de Succes" icon={Award} accent="text-pink-400" empty />}

      {/* Recommandations Prioritaires */}
      {recos.length > 0 ? (
        <Section title={`Recommandations Prioritaires (${recos.length})`} icon={ListChecks} accent="text-pink-400">
          <div className="space-y-2">
            {recos.sort((a, b) => safeNum(a.priority) - safeNum(b.priority)).map((r, i) => (
              <div key={i} className="flex items-start gap-3 rounded-lg border border-zinc-800 bg-zinc-950/50 p-3">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-pink-600/20 text-[10px] font-bold text-pink-300 shrink-0">
                  {safeNum(r.priority)}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-zinc-200">{safeStr(r.recommendation)}</p>
                  {safeStr(r.source) && (
                    <Badge className={`mt-1 text-[10px] ${PILLAR_TAG_BG[safeStr(r.source).toLowerCase() as PillarKey] ?? "bg-zinc-700 text-zinc-300"}`}>
                      Pilier {safeStr(r.source)}
                    </Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Section>
      ) : <Section title="Recommandations Prioritaires" icon={ListChecks} accent="text-pink-400" empty />}

      {/* Axes Strategiques */}
      {axes.length > 0 ? (
        <Section title={`Axes Strategiques (${axes.length})`} icon={Compass} accent="text-pink-400">
          <div className="space-y-3">
            {axes.map((a, i) => (
              <div key={i} className="rounded-lg border border-zinc-800 bg-zinc-950/50 p-4">
                <h5 className="text-sm font-semibold text-white mb-2">{safeStr(a.axe)}</h5>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {safeArr(a.pillarsLinked as unknown).map((p, j) => (
                    <Badge key={j} className={`text-[10px] ${PILLAR_TAG_BG[safeStr(p).toLowerCase() as PillarKey] ?? "bg-zinc-700 text-zinc-300"}`}>
                      {safeStr(p)} — {PILLAR_NAMES[safeStr(p).toLowerCase() as PillarKey] ?? safeStr(p)}
                    </Badge>
                  ))}
                </div>
                <div className="space-y-1">
                  {safeArr(a.kpis as unknown).map((kpi, j) => (
                    <p key={j} className="text-[10px] text-zinc-400 flex items-center gap-1.5">
                      <Gauge className="h-2.5 w-2.5 text-zinc-500" /> {safeStr(kpi)}
                    </p>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Section>
      ) : <Section title="Axes Strategiques" icon={Compass} accent="text-pink-400" empty />}

      {/* Vision Strategique */}
      {visionStrategique ? (
        <Section title="Vision Strategique" icon={Eye} accent="text-pink-400">
          <p className="text-sm text-zinc-300 leading-relaxed italic border-l-2 border-pink-600/40 pl-4">{visionStrategique}</p>
        </Section>
      ) : <Section title="Vision Strategique" icon={Eye} accent="text-pink-400" empty />}

      {/* Coherence Piliers */}
      {coherencePiliers.length > 0 ? (
        <Section title={`Coherence Piliers (${coherencePiliers.length})`} icon={Layers} accent="text-pink-400">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-zinc-800">
                  <th className="text-left py-2 px-2 text-zinc-500 font-medium">Pilier</th>
                  <th className="text-left py-2 px-2 text-zinc-500 font-medium">Contribution</th>
                  <th className="text-left py-2 px-2 text-zinc-500 font-medium">Articulation</th>
                </tr>
              </thead>
              <tbody>
                {coherencePiliers.map((cp, i) => (
                  <tr key={i} className="border-b border-zinc-800/50">
                    <td className="py-2 px-2 text-white font-medium">{safeStr(cp.pilier)}</td>
                    <td className="py-2 px-2 text-zinc-300">{safeStr(cp.contribution)}</td>
                    <td className="py-2 px-2 text-zinc-400">{safeStr(cp.articulation)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>
      ) : <Section title="Coherence Piliers" icon={Layers} accent="text-pink-400" empty />}

      {/* Sprint 90 Recap */}
      {sprint90Recap.length > 0 ? (
        <Section title={`Sprint 90 Recap (${sprint90Recap.length} actions)`} icon={Zap} accent="text-pink-400">
          <div className="space-y-2">
            {sprint90Recap.sort((a, b) => safeNum(a.priority) - safeNum(b.priority)).map((action, i) => (
              <div key={i} className="rounded-lg border border-zinc-800 bg-zinc-950/50 p-3 flex items-start gap-3">
                <span className={`flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold shrink-0 ${
                  action.isRiskMitigation ? "bg-red-600/20 text-red-300" : "bg-pink-600/20 text-pink-300"
                }`}>
                  {safeNum(action.priority)}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-zinc-200 mb-1">{safeStr(action.action)}</p>
                  <div className="flex flex-wrap gap-3 text-[10px] text-zinc-500">
                    {safeStr(action.owner) && <span>Resp. : {safeStr(action.owner)}</span>}
                    {safeStr(action.kpi) && <span>KPI : {safeStr(action.kpi)}</span>}
                    {!!action.isRiskMitigation && <Badge className="bg-red-500/10 text-red-300 text-[10px]">Mitigation</Badge>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Section>
      ) : <Section title="Sprint 90 Recap" icon={Zap} accent="text-pink-400" empty />}

      {/* KPI Dashboard */}
      {kpiDashboard.length > 0 ? (
        <Section title={`KPI Dashboard (${kpiDashboard.length})`} icon={Gauge} accent="text-pink-400">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-zinc-800">
                  <th className="text-left py-2 px-2 text-zinc-500 font-medium">Nom</th>
                  <th className="text-left py-2 px-2 text-zinc-500 font-medium">Pilier</th>
                  <th className="text-right py-2 px-2 text-zinc-500 font-medium">Objectif</th>
                  <th className="text-left py-2 px-2 text-zinc-500 font-medium">Frequence</th>
                </tr>
              </thead>
              <tbody>
                {kpiDashboard.map((kpi, i) => (
                  <tr key={i} className="border-b border-zinc-800/50">
                    <td className="py-2 px-2 text-white">{safeStr(kpi.name)}</td>
                    <td className="py-2 px-2">
                      <Badge className={`text-[10px] ${PILLAR_TAG_BG[safeStr(kpi.pillar).toLowerCase() as PillarKey] ?? "bg-zinc-700 text-zinc-300"}`}>
                        {safeStr(kpi.pillar)}
                      </Badge>
                    </td>
                    <td className="py-2 px-2 text-right text-zinc-200 font-medium">{safeStr(kpi.target)}</td>
                    <td className="py-2 px-2 text-zinc-500">{safeStr(kpi.frequency)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>
      ) : <Section title="KPI Dashboard" icon={Gauge} accent="text-pink-400" empty />}
    </div>
  );
}

// ============================================================================
// PILLAR RENDERER DISPATCHER
// ============================================================================

const PILLAR_RENDERERS: Record<PillarKey, React.FC<{ content: AnyContent }>> = {
  a: RenderPillarA,
  d: RenderPillarD,
  v: RenderPillarV,
  e: RenderPillarE,
  r: RenderPillarR,
  t: RenderPillarT,
  i: RenderPillarI,
  s: RenderPillarS,
};

// ============================================================================
// EDIT MODE: SECTION EDITOR COMPONENT
// ============================================================================

function SectionEditor({
  sectionKey,
  label,
  value,
  pillarKey,
  onSave,
  isSaving,
}: {
  sectionKey: string;
  label: string;
  value: unknown;
  pillarKey: PillarKey;
  onSave: (key: string, newValue: unknown) => void;
  isSaving: boolean;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState<string>("");

  const isArrayOfObjects = Array.isArray(value) && value.length > 0 && typeof value[0] === "object";
  const isObject = typeof value === "object" && !Array.isArray(value) && value !== null;
  const isString = typeof value === "string";
  const isNumber = typeof value === "number";

  const startEdit = useCallback(() => {
    if (isArrayOfObjects || isObject) {
      setDraft(JSON.stringify(value, null, 2));
    } else {
      setDraft(String(value ?? ""));
    }
    setIsEditing(true);
  }, [value, isArrayOfObjects, isObject]);

  const save = useCallback(() => {
    let parsed: unknown = draft;
    if (isArrayOfObjects || isObject) {
      try { parsed = JSON.parse(draft); } catch { return; }
    } else if (isNumber) {
      parsed = parseFloat(draft);
    }
    onSave(sectionKey, parsed);
    setIsEditing(false);
  }, [draft, sectionKey, onSave, isArrayOfObjects, isObject, isNumber]);

  if (!isEditing) {
    return (
      <button
        onClick={startEdit}
        className="flex items-center gap-1.5 rounded-lg border border-zinc-700/50 bg-zinc-800/50 px-2.5 py-1 text-[10px] font-medium text-zinc-400 hover:text-white hover:border-zinc-600 transition-colors"
      >
        <Pencil className="h-2.5 w-2.5" /> Editer {label}
      </button>
    );
  }

  return (
    <div className="mt-2 rounded-lg border border-amber-700/50 bg-amber-950/10 p-3 space-y-2">
      <textarea
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        rows={isArrayOfObjects || isObject ? 12 : 3}
        className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-xs text-white placeholder-zinc-500 outline-none focus:border-violet-600 focus:ring-1 focus:ring-violet-600 font-mono"
      />
      <div className="flex items-center gap-2">
        <button
          onClick={save}
          disabled={isSaving}
          className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-50 transition-colors"
        >
          <Save className="h-3 w-3" /> {isSaving ? "Enregistrement..." : "Enregistrer"}
        </button>
        <button
          onClick={() => setIsEditing(false)}
          className="flex items-center gap-1.5 rounded-lg bg-zinc-800 px-3 py-1.5 text-xs font-medium text-zinc-300 hover:bg-zinc-700 transition-colors"
        >
          <X className="h-3 w-3" /> Annuler
        </button>
      </div>
    </div>
  );
}

// ============================================================================
// RECOMMENDATIONS COMPONENT
// ============================================================================

function PillarRecommendations({
  pillarKey,
  strategyId,
  content,
}: {
  pillarKey: PillarKey;
  strategyId: string;
  content: AnyContent;
}) {
  const validateQuery = trpc.pillar.validate.useQuery(
    { strategyId, key: pillarKey.toUpperCase() as "A" | "D" | "V" | "E" | "R" | "T" | "I" | "S", content },
    { enabled: !!strategyId && Object.keys(content).length > 0 },
  );

  const crossRefQuery = trpc.pillar.validateCrossRefs.useQuery(
    { strategyId },
    { enabled: !!strategyId },
  );

  const validation = validateQuery.data;
  const crossRefs = crossRefQuery.data;

  const fullErrors = validation?.fullValidation?.errors ?? [];
  const completion = validation?.partialValidation?.completionPercentage ?? 0;

  return (
    <Section title="Recommandations & Validation" icon={Lightbulb} accent={PILLAR_ACCENT[pillarKey]}>
      {/* Completion */}
      <div className="mb-4">
        <div className="flex items-center justify-between text-xs mb-1">
          <span className="text-zinc-500">Completion</span>
          <span className={completion === 100 ? "text-emerald-400" : "text-zinc-400"}>{completion}%</span>
        </div>
        <div className="h-2 rounded-full bg-zinc-800">
          <div className={`h-full rounded-full transition-all ${completion === 100 ? "bg-emerald-500" : "bg-violet-500"}`} style={{ width: `${completion}%` }} />
        </div>
      </div>

      {/* Validation errors */}
      {fullErrors.length > 0 && (
        <div className="mb-4">
          <h5 className="text-[10px] font-semibold uppercase text-amber-400 mb-2">Champs manquants ou incomplets ({fullErrors.length})</h5>
          <div className="space-y-1 max-h-48 overflow-y-auto">
            {fullErrors.slice(0, 15).map((err, i) => (
              <div key={i} className="flex items-start gap-1.5 text-xs">
                <AlertCircle className="h-3 w-3 text-amber-400 shrink-0 mt-0.5" />
                <span className="text-zinc-400">
                  <strong className="text-zinc-300">{typeof err === "object" && "path" in err ? (err as { path: string }).path : ""}</strong>{" "}
                  {typeof err === "object" && "message" in err ? (err as { message: string }).message : String(err)}
                </span>
              </div>
            ))}
            {fullErrors.length > 15 && (
              <p className="text-[10px] text-zinc-600">...et {fullErrors.length - 15} autres</p>
            )}
          </div>
        </div>
      )}

      {/* Cross-ref warnings */}
      {crossRefs && Array.isArray(crossRefs) && crossRefs.length > 0 && (
        <div className="mb-4">
          <h5 className="text-[10px] font-semibold uppercase text-amber-400 mb-2">Alertes inter-piliers</h5>
          <div className="space-y-1">
            {(crossRefs as Array<{ message: string }>).slice(0, 5).map((ref, i) => (
              <div key={i} className="flex items-start gap-1.5 text-xs">
                <AlertTriangle className="h-3 w-3 text-amber-400 shrink-0 mt-0.5" />
                <span className="text-zinc-400">{typeof ref === "string" ? ref : ref.message ?? JSON.stringify(ref)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Score */}
      {validation?.score && (
        <div className="rounded-lg border border-zinc-800 bg-zinc-950/50 p-3">
          <div className="flex items-center justify-between text-xs">
            <span className="text-zinc-500">Score semantique</span>
            <span className="text-white font-bold">{safeNum((validation.score as unknown as AnyContent)?.score).toFixed(1)} / 25</span>
          </div>
        </div>
      )}
    </Section>
  );
}

// ============================================================================
// MAIN PAGE COMPONENT
// ============================================================================

export default function IdentityPage() {
  const strategyId = useCurrentStrategyId();
  const [activeTab, setActiveTab] = useState<string>("overview");
  const [editMode, setEditMode] = useState(false);
  const [savingSection, setSavingSection] = useState<string | null>(null);
  const [saveResult, setSaveResult] = useState<{ success: boolean; message: string } | null>(null);

  const strategyQuery = trpc.strategy.getWithScore.useQuery(
    { id: strategyId! },
    { enabled: !!strategyId },
  );

  const driversQuery = trpc.driver.list.useQuery(
    { strategyId: strategyId! },
    { enabled: !!strategyId },
  );

  const [actualizingPillar, setActualizingPillar] = useState<string | null>(null);
  const [cascadeRunning, setCascadeRunning] = useState(false);

  const updatePartialMutation = trpc.pillar.updatePartial.useMutation({
    onSuccess: () => {
      strategyQuery.refetch();
      setSaveResult({ success: true, message: "Enregistre avec succes" });
      setTimeout(() => setSaveResult(null), 3000);
    },
    onError: (err) => {
      setSaveResult({ success: false, message: err.message });
    },
    onSettled: () => {
      setSavingSection(null);
    },
  });

  const actualizeMutation = trpc.pillar.actualize.useMutation({
    onSuccess: (data) => {
      strategyQuery.refetch();
      const composite = data.scoreResult?.composite;
      setSaveResult({
        success: data.updated,
        message: data.updated
          ? `Pilier ${data.pillarKey} actualise par Mestor${composite ? ` (score global: ${composite.toFixed(1)}/200)` : ""}`
          : `Erreur: ${data.error ?? "Echec de l'actualisation"}`,
      });
      setTimeout(() => setSaveResult(null), 5000);
    },
    onError: (err) => {
      setSaveResult({ success: false, message: `Erreur Mestor: ${err.message}` });
    },
    onSettled: () => {
      setActualizingPillar(null);
    },
  });

  const cascadeMutation = trpc.pillar.cascadeRTIS.useMutation({
    onSuccess: (data) => {
      strategyQuery.refetch();
      const successCount = data.results.filter((r) => r.updated).length;
      setSaveResult({
        success: successCount > 0,
        message: `Cascade RTIS terminee: ${successCount}/${data.results.length} piliers actualises${data.finalScore ? ` (score: ${data.finalScore.composite.toFixed(1)}/200)` : ""}`,
      });
      setTimeout(() => setSaveResult(null), 8000);
    },
    onError: (err) => {
      setSaveResult({ success: false, message: `Erreur cascade: ${err.message}` });
    },
    onSettled: () => {
      setCascadeRunning(false);
    },
  });

  const handleActualize = useCallback((pillarKey: PillarKey) => {
    if (!strategyId) return;
    setActualizingPillar(pillarKey);
    actualizeMutation.mutate({
      strategyId,
      key: pillarKey.toUpperCase() as "A" | "D" | "V" | "E" | "R" | "T" | "I" | "S",
    });
  }, [strategyId, actualizeMutation]);

  const handleCascadeRTIS = useCallback(() => {
    if (!strategyId) return;
    setCascadeRunning(true);
    cascadeMutation.mutate({ strategyId, updateADVE: true });
  }, [strategyId, cascadeMutation]);

  const handleSaveSection = useCallback((pillarKey: PillarKey, sectionKey: string, newValue: unknown) => {
    if (!strategyId) return;
    setSavingSection(`${pillarKey}.${sectionKey}`);
    updatePartialMutation.mutate({
      strategyId,
      key: pillarKey.toUpperCase() as "A" | "D" | "V" | "E" | "R" | "T" | "I" | "S",
      content: { [sectionKey]: newValue },
    });
  }, [strategyId, updatePartialMutation]);

  if (!strategyId || strategyQuery.isLoading) {
    return <SkeletonPage />;
  }

  if (strategyQuery.error) {
    return (
      <div className="space-y-6">
        <PageHeader title="Profil ADVE-RTIS" />
        <div className="rounded-xl border border-red-900/50 bg-red-950/20 p-6 text-center">
          <AlertTriangle className="mx-auto h-8 w-8 text-red-400" />
          <p className="mt-2 text-sm text-red-300">{strategyQuery.error.message}</p>
        </div>
      </div>
    );
  }

  const strategy = strategyQuery.data;
  const vector = (strategy?.advertis_vector as Record<string, number>) ?? {};
  const scores: Partial<Record<PillarKey, number>> = {};
  for (const k of PILLAR_KEYS) { scores[k] = vector[k] ?? 0; }
  const composite = strategy?.composite ?? 0;
  const drivers = driversQuery.data ?? [];

  // Build pillar content map
  const pillarContentMap: Record<string, AnyContent> = {};
  for (const p of (strategy as Record<string, unknown> & { pillars?: Array<{ key: string; content: unknown; confidence: number | null }> })?.pillars ?? []) {
    pillarContentMap[p.key] = (p.content as AnyContent) ?? {};
  }

  const selectedPillar = activeTab !== "overview" ? (activeTab as PillarKey) : null;

  const tabs = [
    { key: "overview", label: "Vue d'ensemble" },
    ...PILLAR_KEYS.map((k) => ({
      key: k,
      label: `${k.toUpperCase()} — ${PILLAR_NAMES[k]}`,
    })),
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title="Profil ADVE-RTIS"
        description={`Les 8 dimensions de l'identite de marque : ${strategy?.name ?? ""}`}
        breadcrumbs={[
          { label: "Cockpit", href: "/cockpit" },
          { label: "Marque" },
          { label: "Identite" },
        ]}
      >
        <div className="flex items-center gap-2">
          <button
            onClick={handleCascadeRTIS}
            disabled={cascadeRunning}
            className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors bg-purple-500/15 text-purple-400 border border-purple-500/30 hover:bg-purple-500/25 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {cascadeRunning ? <><Activity className="h-4 w-4 animate-pulse" /> Cascade en cours...</> : <><Brain className="h-4 w-4" /> Cascade RTIS</>}
          </button>
          <button
            onClick={() => setEditMode(!editMode)}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              editMode
                ? "bg-amber-500/15 text-amber-400 border border-amber-500/30 hover:bg-amber-500/25"
                : "bg-zinc-800 text-zinc-300 border border-zinc-700 hover:bg-zinc-700"
            }`}
          >
            {editMode ? <><X className="h-4 w-4" /> Quitter l&apos;edition</> : <><Pencil className="h-4 w-4" /> Modifier</>}
          </button>
        </div>
      </PageHeader>

      {/* Edit mode banner */}
      {editMode && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-950/20 px-5 py-3 flex items-center gap-3">
          <Pencil className="h-4 w-4 text-amber-400 shrink-0" />
          <p className="text-sm text-amber-300 flex-1">
            Mode edition actif. Cliquez sur &laquo; Editer &raquo; dans chaque section pour modifier son contenu. Les modifications sont enregistrees via tRPC.
          </p>
        </div>
      )}

      {/* Save feedback */}
      {saveResult && (
        <div className={`rounded-xl border px-5 py-3 flex items-center gap-3 ${
          saveResult.success ? "border-emerald-500/30 bg-emerald-950/20" : "border-red-500/30 bg-red-950/20"
        }`}>
          {saveResult.success ? <Check className="h-4 w-4 text-emerald-400" /> : <AlertCircle className="h-4 w-4 text-red-400" />}
          <p className={`text-sm ${saveResult.success ? "text-emerald-300" : "text-red-300"}`}>{saveResult.message}</p>
        </div>
      )}

      {/* Compact score strip: score + mini pillar bars + radar toggle */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/80 px-5 py-4">
        <div className="flex items-center gap-6 flex-wrap">
          {/* Score composite — compact */}
          <div className="flex items-center gap-3 shrink-0">
            <ScoreBadge score={composite} size="sm" />
            <div>
              <p className="text-lg font-bold text-white">{composite.toFixed(0)}<span className="text-sm text-zinc-500">/200</span></p>
              <p className="text-[10px] uppercase tracking-wider text-zinc-500">
                {composite >= 181 ? "Icône" : composite >= 161 ? "Culte" : composite >= 121 ? "Forte" : composite >= 81 ? "Ordinaire" : "Zombie"}
              </p>
            </div>
          </div>
          {/* Separator */}
          <div className="h-10 w-px bg-zinc-800 shrink-0 hidden sm:block" />
          {/* Mini pillar scores inline */}
          <div className="flex items-center gap-3 flex-wrap flex-1 min-w-0">
            {PILLAR_KEYS.map((key) => {
              const s = scores[key] ?? 0;
              const pct = (s / 25) * 100;
              return (
                <button
                  key={key}
                  onClick={() => setActiveTab(key)}
                  className={`flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs transition-colors hover:bg-zinc-800 ${activeTab === key ? "bg-zinc-800 ring-1 ring-zinc-700" : ""}`}
                >
                  <span className={`font-bold ${PILLAR_ACCENT[key]}`}>{key.toUpperCase()}</span>
                  <div className="w-12 h-1.5 rounded-full bg-zinc-800 overflow-hidden">
                    <div className={`h-full rounded-full ${PILLAR_ACCENT[key].replace("text-", "bg-").replace("-400", "-500")}`} style={{ width: `${pct}%` }} />
                  </div>
                  <span className="text-zinc-500 tabular-nums">{s.toFixed(0)}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Tab navigation */}
      <div className="overflow-x-auto">
        <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />
      </div>

      {/* ===== OVERVIEW TAB ===== */}
      {!selectedPillar && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {PILLAR_KEYS.map((key) => {
            const score = scores[key] ?? 0;
            const content = pillarContentMap[key] ?? {};
            const total = Object.keys(content).length;
            const filled = Object.values(content).filter((v) => {
              if (Array.isArray(v)) return v.length > 0;
              if (typeof v === "object" && v !== null) return Object.keys(v).length > 0;
              if (typeof v === "boolean") return true;
              return String(v ?? "").length > 0;
            }).length;
            const pct = total > 0 ? Math.round((filled / total) * 100) : 0;

            // Pick 3 key fields to preview based on pillar type
            const previewFields = getOverviewPreview(key, content);

            return (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                className={`rounded-xl border ${PILLAR_BORDER[key]} bg-zinc-900/80 p-5 text-left transition-colors hover:border-zinc-600`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className={`flex h-10 w-10 items-center justify-center rounded-lg bg-zinc-800 text-sm font-bold ${PILLAR_ACCENT[key]}`}>
                      {key.toUpperCase()}
                    </span>
                    <div>
                      <p className="text-sm font-medium text-white">{PILLAR_NAMES[key]}</p>
                      <p className="text-xs text-zinc-500">{score.toFixed(1)} / 25</p>
                    </div>
                  </div>
                  <div className="text-right space-y-1">
                    <ScoreBadge score={Math.round((score / 25) * 100)} size="sm" />
                    <p className="text-[10px] text-zinc-600">{pct}% rempli</p>
                  </div>
                </div>
                <div className="mt-3 h-1.5 rounded-full bg-zinc-800">
                  <div className={`h-full rounded-full transition-all ${PILLAR_ACCENT[key].replace("text-", "bg-").replace("-400", "-500")}`}
                    style={{ width: `${(score / 25) * 100}%` }} />
                </div>
                {previewFields.length > 0 && (
                  <div className="mt-3 space-y-1 border-t border-zinc-800 pt-3">
                    {previewFields.map(({ label, value: val }, j) => (
                      <div key={j} className="flex items-start gap-2">
                        <span className="mt-0.5 text-[10px] font-medium uppercase text-zinc-600 w-24 shrink-0">{label}</span>
                        <span className="text-xs text-zinc-400 truncate">{val}</span>
                      </div>
                    ))}
                  </div>
                )}
                <div className="mt-2 flex items-center gap-1 text-[10px] text-zinc-600">
                  <ChevronRight className="h-2.5 w-2.5" /> Voir le detail
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* ===== PILLAR DETAIL TAB ===== */}
      {selectedPillar && (
        <div className="space-y-6">
          {/* Pillar header */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
            {/* Score card */}
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/80 p-6">
              <div className="flex items-center gap-3">
                <div className={`flex h-12 w-12 items-center justify-center rounded-xl bg-zinc-800 text-lg font-bold ${PILLAR_ACCENT[selectedPillar]}`}>
                  {selectedPillar.toUpperCase()}
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">{PILLAR_NAMES[selectedPillar]}</h3>
                  <p className="text-sm text-zinc-400">{(scores[selectedPillar] ?? 0).toFixed(1)} / 25</p>
                </div>
              </div>
              <div className="mt-4 h-3 rounded-full bg-zinc-800">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${PILLAR_ACCENT[selectedPillar].replace("text-", "bg-").replace("-400", "-500")}`}
                  style={{ width: `${((scores[selectedPillar] ?? 0) / 25) * 100}%` }}
                />
              </div>
              <div className="mt-3 flex items-center gap-2 text-sm">
                {(scores[selectedPillar] ?? 0) >= 18 ? (
                  <span className="flex items-center gap-1 text-emerald-400"><TrendingUp className="h-4 w-4" /> Excellent</span>
                ) : (scores[selectedPillar] ?? 0) >= 12 ? (
                  <span className="flex items-center gap-1 text-amber-400"><Target className="h-4 w-4" /> Bon — ameliorable</span>
                ) : (
                  <span className="flex items-center gap-1 text-red-400"><AlertTriangle className="h-4 w-4" /> A renforcer</span>
                )}
              </div>
              <p className="mt-3 text-xs text-zinc-500 leading-relaxed">{PILLAR_DESCRIPTIONS[selectedPillar]}</p>
              <button
                onClick={() => handleActualize(selectedPillar)}
                disabled={actualizingPillar === selectedPillar || cascadeRunning}
                className="mt-4 w-full flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors bg-purple-500/15 text-purple-400 border border-purple-500/30 hover:bg-purple-500/25 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {actualizingPillar === selectedPillar ? (
                  <><Activity className="h-4 w-4 animate-pulse" /> Mestor analyse...</>
                ) : (
                  <><Brain className="h-4 w-4" /> Actualiser via Mestor</>
                )}
              </button>
            </div>

            {/* Content area */}
            <div className="col-span-3 space-y-5">
              {/* Render specialized content */}
              {(() => {
                const content = pillarContentMap[selectedPillar] ?? {};
                if (Object.keys(content).length === 0) {
                  return (
                    <div className="rounded-xl border border-zinc-800 bg-zinc-900/80 p-6 text-center">
                      <p className="text-sm text-zinc-500">Aucun contenu pour ce pilier. Utilisez l&apos;API ou le mode edition pour le remplir.</p>
                    </div>
                  );
                }
                const Renderer = PILLAR_RENDERERS[selectedPillar];
                return <Renderer content={content} />;
              })()}

              {/* Edit mode: section editors */}
              {editMode && (() => {
                const content = pillarContentMap[selectedPillar] ?? {};
                const sections = Object.entries(content);
                if (sections.length === 0) return null;

                return (
                  <Section title="Edition" icon={Pencil} accent="text-amber-400">
                    <p className="text-xs text-zinc-500 mb-3">
                      Selectionnez une section a editer. Les modifications sont enregistrees immediatement.
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {sections.map(([key, value]) => (
                        <SectionEditor
                          key={key}
                          sectionKey={key}
                          label={key}
                          value={value}
                          pillarKey={selectedPillar}
                          onSave={(sKey, newVal) => handleSaveSection(selectedPillar, sKey, newVal)}
                          isSaving={savingSection === `${selectedPillar}.${key}`}
                        />
                      ))}
                    </div>
                  </Section>
                );
              })()}

              {/* Recommendations */}
              {strategyId && Object.keys(pillarContentMap[selectedPillar] ?? {}).length > 0 && (
                <PillarRecommendations
                  pillarKey={selectedPillar}
                  strategyId={strategyId}
                  content={pillarContentMap[selectedPillar] ?? {}}
                />
              )}
            </div>
          </div>

          {/* Related drivers */}
          {(() => {
            const pillarDrivers = drivers.filter((d) => {
              const pp = d.pillarPriority as Record<string, string> | null;
              return pp && (pp.primary?.toLowerCase() === selectedPillar || pp.secondary?.toLowerCase() === selectedPillar);
            });
            if (pillarDrivers.length === 0) return null;
            return (
              <div className="rounded-xl border border-zinc-800 bg-zinc-900/80 p-6">
                <h4 className="mb-3 text-sm font-medium text-zinc-400">Drivers associes</h4>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {pillarDrivers.map((d) => (
                    <div key={d.id} className="rounded-lg border border-zinc-800 bg-zinc-950/50 p-3">
                      <p className="text-sm font-medium text-white">{d.name}</p>
                      <p className="text-xs text-zinc-500">{d.channel}</p>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// OVERVIEW PREVIEW HELPER
// ============================================================================

function getOverviewPreview(key: PillarKey, content: AnyContent): Array<{ label: string; value: string }> {
  const results: Array<{ label: string; value: string }> = [];

  switch (key) {
    case "a": {
      if (content.archetype) results.push({ label: "Archetype", value: safeStr(content.archetype) });
      if (content.citationFondatrice) results.push({ label: "Citation", value: safeStr(content.citationFondatrice).slice(0, 60) });
      const valeurs = safeArr(content.valeurs);
      if (valeurs.length > 0) results.push({ label: "Valeurs", value: valeurs.map((v) => safeStr(v.customName)).join(", ") });
      break;
    }
    case "d": {
      const personas = safeArr(content.personas);
      if (personas.length > 0) results.push({ label: "Personas", value: personas.map((p) => safeStr(p.name).split(",")[0]).join(", ") });
      if (content.promesseMaitre) results.push({ label: "Promesse", value: safeStr(content.promesseMaitre).slice(0, 60) });
      if (content.positionnement) results.push({ label: "Position.", value: safeStr(content.positionnement).slice(0, 60) });
      break;
    }
    case "v": {
      const produits = safeArr(content.produitsCatalogue);
      if (produits.length > 0) results.push({ label: "Produits", value: `${produits.length} produit(s)` });
      const ue = safe<AnyContent>(content.unitEconomics);
      if (ue) {
        const ltv = safeNum(ue.ltv); const cac = safeNum(ue.cac);
        if (cac > 0) results.push({ label: "LTV/CAC", value: `${(ltv / cac).toFixed(0)}x` });
      }
      const ladder = safeArr(content.productLadder);
      if (ladder.length > 0) results.push({ label: "Gammes", value: `${ladder.length} tier(s)` });
      break;
    }
    case "e": {
      const tp = safeArr(content.touchpoints);
      if (tp.length > 0) results.push({ label: "Touchpoints", value: `${tp.length} canaux` });
      const rit = safeArr(content.rituels);
      if (rit.length > 0) results.push({ label: "Rituels", value: rit.map((r) => safeStr(r.nom)).join(", ") });
      const kpis = safeArr(content.kpis);
      if (kpis.length > 0) results.push({ label: "KPIs", value: `${kpis.length} indicateurs` });
      break;
    }
    case "r": {
      if (content.riskScore) results.push({ label: "Score risque", value: `${safeNum(content.riskScore)}/100` });
      const matrix = safeArr(content.probabilityImpactMatrix);
      if (matrix.length > 0) results.push({ label: "Risques", value: `${matrix.length} identifies` });
      const mit = safeArr(content.mitigationPriorities);
      if (mit.length > 0) results.push({ label: "Mitigations", value: `${mit.length} actions` });
      break;
    }
    case "t": {
      if (content.brandMarketFitScore) results.push({ label: "BMF Score", value: `${safeNum(content.brandMarketFitScore)}/100` });
      const hyp = safeArr(content.hypothesisValidation);
      if (hyp.length > 0) {
        const validated = hyp.filter((h) => safeStr(h.status) === "VALIDATED").length;
        results.push({ label: "Hypotheses", value: `${validated}/${hyp.length} validees` });
      }
      if (content.tamSamSom) results.push({ label: "TAM/SAM/SOM", value: "Defini" });
      break;
    }
    case "i": {
      const sprint = safeArr(content.sprint90Days);
      if (sprint.length > 0) results.push({ label: "Sprint 90j", value: `${sprint.length} actions` });
      const cal = safeArr(content.annualCalendar);
      if (cal.length > 0) results.push({ label: "Campagnes", value: `${cal.length} planifiees` });
      if (content.globalBudget) results.push({ label: "Budget", value: `${fmtCurrency(content.globalBudget)} FCFA` });
      break;
    }
    case "s": {
      if (content.coherenceScore) results.push({ label: "Coherence", value: `${safeNum(content.coherenceScore)}/100` });
      const recos = safeArr(content.recommandationsPrioritaires);
      if (recos.length > 0) results.push({ label: "Recos", value: `${recos.length} prioritaires` });
      const axes = safeArr(content.axesStrategiques);
      if (axes.length > 0) results.push({ label: "Axes", value: axes.map((a) => safeStr(a.axe).split(":")[0]).join(", ").slice(0, 60) });
      break;
    }
  }

  return results.slice(0, 3);
}
