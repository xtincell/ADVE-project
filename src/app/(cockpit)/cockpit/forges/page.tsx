"use client";

/**
 * Cockpit /cockpit/forges — Founder forge dashboard.
 *
 * Permet au founder de :
 *   1. Lancer une forge Ptah (form : kind + brief + pillar source + mode)
 *   2. Voir la forge en cours avec PtahForgeRunner (polling jusqu'à COMPLETED)
 *   3. Galerie de tous les assets matérialisés (PtahAssetLibrary)
 *
 * Cf. ADR-0009 + PANTHEON.md §2.5.
 */

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { useCurrentStrategyId } from "@/components/cockpit/strategy-context";
import { PageHeader } from "@/components/shared/page-header";
import { PtahForgeRunner, PtahAssetLibrary } from "@/components/neteru";
import { Hammer, Send, Sparkles } from "lucide-react";

const FORGE_KINDS = [
  { value: "image", label: "Image", description: "KV, packshot, banner" },
  { value: "video", label: "Vidéo", description: "Spot, plat tournant, story" },
  { value: "audio", label: "Audio", description: "TTS, jingle, voice-over" },
  { value: "icon", label: "Icône", description: "PNG/SVG, badge, symbole" },
  { value: "refine", label: "Raffiner", description: "Upscale, relight, style transfer" },
  { value: "transform", label: "Transformer", description: "Change camera, BG removal" },
  { value: "design", label: "Design", description: "Adobe / Figma / Canva" },
] as const;

const PILLAR_KEYS = ["A", "D", "V", "E", "R", "T", "I", "S"] as const;

const MANIPULATION_MODES = [
  { value: "peddler", label: "Peddler", description: "Pousse transactionnel direct" },
  { value: "dealer", label: "Dealer", description: "Addiction structurelle (drops)" },
  { value: "facilitator", label: "Facilitator", description: "Utilité, formation" },
  { value: "entertainer", label: "Entertainer", description: "Divertissement organique" },
] as const;

export default function ForgesPage() {
  const strategyId = useCurrentStrategyId();
  const [activeForgeId, setActiveForgeId] = useState<string | null>(null);
  const [form, setForm] = useState({
    kind: "image" as (typeof FORGE_KINDS)[number]["value"],
    briefText: "",
    pillarSource: "V" as (typeof PILLAR_KEYS)[number],
    manipulationMode: "entertainer" as (typeof MANIPULATION_MODES)[number]["value"],
  });
  const [error, setError] = useState<string | null>(null);

  const materialize = trpc.ptah.materializeBrief.useMutation({
    onSuccess: (result) => {
      setActiveForgeId(result.taskId);
      setError(null);
      setForm((f) => ({ ...f, briefText: "" }));
    },
    onError: (err) => {
      setError(err.message);
    },
  });

  if (!strategyId) {
    return (
      <div className="space-y-6">
        <PageHeader title="Forges Ptah" description="Sélectionnez d'abord une stratégie." />
      </div>
    );
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.briefText.trim()) {
      setError("Brief requis");
      return;
    }
    materialize.mutate({
      strategyId,
      sourceIntentId: `cockpit-direct-${Date.now()}`,
      brief: {
        briefText: form.briefText,
        forgeSpec: { kind: form.kind, parameters: {} },
        pillarSource: form.pillarSource,
        manipulationMode: form.manipulationMode,
      },
    });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Ptah · Forge des assets"
        description="Le 5ème Neter matérialise vos briefs en assets concrets (image / vidéo / audio / icône / refine / transform / design) via Magnific, Adobe Firefly, Figma ou Canva."
        breadcrumbs={[{ label: "Cockpit", href: "/cockpit" }, { label: "Forges" }]}
      />

      {/* Form */}
      <form
        onSubmit={handleSubmit}
        className="rounded-2xl border border-white/10 bg-gradient-to-br from-amber-500/5 via-white/[0.02] to-transparent p-6 backdrop-blur-sm"
      >
        <div className="mb-4 flex items-center gap-2 text-sm font-semibold">
          <Hammer className="h-4 w-4 text-amber-300" />
          Nouveau brief Ptah
        </div>

        {/* Forge kind selector */}
        <div className="mb-4">
          <label className="mb-2 block text-xs font-medium uppercase tracking-wider text-foreground-secondary">
            Type de forge
          </label>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
            {FORGE_KINDS.map((k) => (
              <button
                key={k.value}
                type="button"
                onClick={() => setForm({ ...form, kind: k.value })}
                className={`rounded-lg border p-2 text-left transition-colors ${
                  form.kind === k.value
                    ? "border-amber-500/50 bg-amber-500/10"
                    : "border-white/10 bg-white/[0.02] hover:bg-white/5"
                }`}
              >
                <div className="text-xs font-semibold text-foreground">{k.label}</div>
                <div className="mt-0.5 text-[10px] text-foreground-tertiary">{k.description}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Brief text */}
        <div className="mb-4">
          <label className="mb-2 block text-xs font-medium uppercase tracking-wider text-foreground-secondary">
            Brief (prompt)
          </label>
          <textarea
            value={form.briefText}
            onChange={(e) => setForm({ ...form, briefText: e.target.value })}
            placeholder="Bonnet Rouge billboard, golden hour, Cameroonian family savoring breakfast, premium dairy aesthetic"
            rows={3}
            className="w-full rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-foreground placeholder-foreground-tertiary focus:border-amber-500/50 focus:outline-none"
            required
          />
        </div>

        {/* Pillar + Mode */}
        <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-2 block text-xs font-medium uppercase tracking-wider text-foreground-secondary">
              Pilier ADVE-RTIS source <span className="text-amber-400">*</span>
            </label>
            <div className="flex gap-1">
              {PILLAR_KEYS.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setForm({ ...form, pillarSource: p })}
                  className={`h-9 w-9 rounded-md text-sm font-bold transition-colors ${
                    form.pillarSource === p
                      ? "bg-amber-500/20 text-amber-300"
                      : "bg-white/5 text-foreground-secondary hover:bg-white/10"
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="mb-2 block text-xs font-medium uppercase tracking-wider text-foreground-secondary">
              Manipulation mode
            </label>
            <select
              value={form.manipulationMode}
              onChange={(e) =>
                setForm({ ...form, manipulationMode: e.target.value as typeof form.manipulationMode })
              }
              className="w-full rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-foreground focus:border-amber-500/50 focus:outline-none"
            >
              {MANIPULATION_MODES.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label} — {m.description}
                </option>
              ))}
            </select>
          </div>
        </div>

        {error && <div className="mb-4 rounded-md bg-red-500/10 p-3 text-sm text-red-300">{error}</div>}

        <button
          type="submit"
          disabled={materialize.isPending}
          className="flex items-center gap-2 rounded-lg bg-amber-500/20 px-4 py-2 text-sm font-semibold text-amber-300 transition-colors hover:bg-amber-500/30 disabled:opacity-50"
        >
          {materialize.isPending ? (
            <>
              <Sparkles className="h-4 w-4 animate-pulse" />
              Forge en cours…
            </>
          ) : (
            <>
              <Send className="h-4 w-4" />
              Forger l'asset
            </>
          )}
        </button>
      </form>

      {/* Active forge */}
      {activeForgeId && (
        <div>
          <h2 className="mb-3 text-sm font-semibold text-foreground">Forge active</h2>
          <PtahForgeRunner taskId={activeForgeId} />
        </div>
      )}

      {/* Asset library */}
      <div>
        <h2 className="mb-3 text-sm font-semibold text-foreground">Bibliothèque d'assets</h2>
        <PtahAssetLibrary strategyId={strategyId} />
      </div>
    </div>
  );
}
