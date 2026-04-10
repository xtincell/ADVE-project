"use client";

import { useState, useCallback } from "react";
import { trpc } from "@/lib/trpc/client";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { Tabs } from "@/components/shared/tabs";
import { EmptyState } from "@/components/shared/empty-state";
import { SkeletonPage } from "@/components/shared/loading-skeleton";
import { useCurrentStrategyId } from "@/components/cockpit/strategy-context";
import {
  Shield, Eye, Gem, Heart, AlertTriangle, Target, Rocket, Compass,
  Save, CheckCircle, XCircle, AlertCircle, ChevronRight, Plus, Trash2,
} from "lucide-react";

const PILLAR_CONFIG = [
  { key: "A", label: "Authenticité", icon: Shield, color: "text-red-400", bgColor: "bg-red-400/10" },
  { key: "D", label: "Distinction", icon: Eye, color: "text-blue-400", bgColor: "bg-blue-400/10" },
  { key: "V", label: "Valeur", icon: Gem, color: "text-emerald-400", bgColor: "bg-emerald-400/10" },
  { key: "E", label: "Engagement", icon: Heart, color: "text-pink-400", bgColor: "bg-pink-400/10" },
  { key: "R", label: "Risk", icon: AlertTriangle, color: "text-amber-400", bgColor: "bg-amber-400/10" },
  { key: "T", label: "Track", icon: Target, color: "text-cyan-400", bgColor: "bg-cyan-400/10" },
  { key: "I", label: "Implémentation", icon: Rocket, color: "text-violet-400", bgColor: "bg-violet-400/10" },
  { key: "S", label: "Stratégie", icon: Compass, color: "text-orange-400", bgColor: "bg-orange-400/10" },
] as const;

const SCHWARTZ_VALUES = [
  "POUVOIR", "ACCOMPLISSEMENT", "HEDONISME", "STIMULATION", "AUTONOMIE",
  "UNIVERSALISME", "BIENVEILLANCE", "TRADITION", "CONFORMITE", "SECURITE",
];

const ARCHETYPES = [
  "INNOCENT", "SAGE", "EXPLORATEUR", "REBELLE", "MAGICIEN", "HEROS",
  "AMOUREUX", "BOUFFON", "CITOYEN", "SOUVERAIN", "CREATEUR", "PROTECTEUR",
];

export default function PillarEditorPage() {
  const contextStrategyId = useCurrentStrategyId();
  const [urlParams] = useState(() => {
    if (typeof window === "undefined") return { strategyId: "", focus: "", from: "", seq: "" };
    const sp = new URLSearchParams(window.location.search);
    return {
      strategyId: sp.get("strategyId") ?? "",
      focus: sp.get("focus") ?? "",
      from: sp.get("from") ?? "",
      seq: sp.get("seq") ?? "",
    };
  });
  const strategyId = contextStrategyId ?? urlParams.strategyId;

  // Focus mode: pillar paths that need completion (from Glory queue scan)
  const focusPaths = urlParams.focus ? urlParams.focus.split(",") : [];
  const focusMode = focusPaths.length > 0;
  const focusSeqKey = urlParams.seq;

  // Group focus paths by pillar: { "a": ["a.noyauIdentitaire"], "d": ["d.tonDeVoix.personnalite"] }
  const focusByPillar: Record<string, string[]> = {};
  for (const p of focusPaths) {
    const pillarKey = p.split(".")[0]!.toUpperCase();
    if (!focusByPillar[pillarKey]) focusByPillar[pillarKey] = [];
    focusByPillar[pillarKey].push(p);
  }

  // Auto-select first pillar with gaps
  const firstFocusPillar = focusPaths.length > 0 ? focusPaths[0]!.split(".")[0]!.toUpperCase() : "A";
  const [activePillar, setActivePillar] = useState(focusMode ? firstFocusPillar : "A");
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const { data: allPillars, isLoading, refetch } = trpc.pillar.getAll.useQuery(
    { strategyId },
    { enabled: !!strategyId }
  );
  const { data: crossRefSummary } = trpc.pillar.crossRefSummary.useQuery(
    { strategyId },
    { enabled: !!strategyId }
  );

  const updatePartial = trpc.pillar.updatePartial.useMutation();

  const [localContent, setLocalContent] = useState<Record<string, Record<string, unknown>>>({});

  const getContent = useCallback((key: string): Record<string, unknown> => {
    if (localContent[key]) return localContent[key];
    return (allPillars?.[key]?.content as Record<string, unknown>) ?? {};
  }, [localContent, allPillars]);

  const setField = useCallback((pillarKey: string, field: string, value: unknown) => {
    setLocalContent((prev) => ({
      ...prev,
      [pillarKey]: { ...(prev[pillarKey] ?? getContent(pillarKey)), [field]: value },
    }));
  }, [getContent]);

  const handleSave = useCallback(async () => {
    if (!strategyId || !localContent[activePillar]) return;
    setSaving(true);
    setSaveMessage(null);
    try {
      const result = await updatePartial.mutateAsync({
        strategyId,
        key: activePillar as "A" | "D" | "V" | "E" | "R" | "T" | "I" | "S",
        content: localContent[activePillar],
      });
      if (result.success) {
        setSaveMessage({ type: "success", text: `Pilier ${activePillar} sauvegarde` });
        refetch();
      } else {
        setSaveMessage({ type: "error", text: `Erreurs de validation: ${result.validation?.errors?.length ?? 0}` });
      }
    } catch (err) {
      setSaveMessage({ type: "error", text: err instanceof Error ? err.message : "Erreur de sauvegarde" });
    } finally {
      setSaving(false);
    }
  }, [strategyId, activePillar, localContent, updatePartial, refetch]);

  if (!strategyId) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Editeur Fiche ADVE"
          description="Editez chaque pilier de votre strategie de marque"
          breadcrumbs={[
            { label: "Cockpit", href: "/cockpit" },
            { label: "Brand", href: "/cockpit/brand/identity" },
            { label: "Editeur ADVE" },
          ]}
        />
        <EmptyState
          icon={Shield}
          title="Aucune strategie selectionnee"
          description="Selectionnez une strategie depuis le cockpit ou ajoutez ?strategyId= dans l'URL pour editer sa fiche ADVE."
        />
      </div>
    );
  }

  if (isLoading) return <SkeletonPage />;

  const currentConfig = PILLAR_CONFIG.find((p) => p.key === activePillar)!;
  const currentData = getContent(activePillar);
  const pillarInfo = allPillars?.[activePillar];
  const composite = allPillars
    ? Object.values(allPillars).reduce((sum, p) => sum + ((p as Record<string, unknown>)?.score as number ?? 0), 0)
    : 0;

  // Focus mode: check which focus fields are now filled
  const focusFieldsFilled = focusPaths.filter((path) => {
    const parts = path.split(".");
    const pillarKey = parts[0]!.toUpperCase();
    const content = getContent(pillarKey);
    let current: unknown = content;
    for (let i = 1; i < parts.length; i++) {
      if (current === null || current === undefined || typeof current !== "object") return false;
      current = (current as Record<string, unknown>)[parts[i]!];
    }
    if (current === null || current === undefined) return false;
    if (typeof current === "string" && current.trim() === "") return false;
    if (Array.isArray(current) && current.length === 0) return false;
    return true;
  });
  const focusCompletedCount = focusFieldsFilled.length;
  const focusAllDone = focusMode && focusCompletedCount === focusPaths.length;

  // Helper: is this field path in the focus list?
  const isFocusField = (pillarKey: string, fieldPath: string) =>
    focusPaths.includes(`${pillarKey.toLowerCase()}.${fieldPath}`);

  return (
    <div className="space-y-6">
      {/* Focus mode banner */}
      {focusMode && (
        <div className="sticky top-0 z-20 rounded-xl border border-amber-500/30 bg-amber-500/5 backdrop-blur-sm px-5 py-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-amber-400">
                Mode completion{focusSeqKey ? ` — ${focusSeqKey}` : ""}
              </p>
              <p className="text-xs text-zinc-400 mt-0.5">
                {focusCompletedCount}/{focusPaths.length} champs completes
              </p>
            </div>
            <div className="flex items-center gap-3">
              {!focusAllDone && (
                <span className="text-[10px] text-zinc-500">
                  Piliers: {Object.keys(focusByPillar).join(", ")}
                </span>
              )}
              {focusAllDone ? (
                <a
                  href="/console/fusee/glory"
                  className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-500"
                >
                  <CheckCircle className="h-3.5 w-3.5" /> Retour a la queue
                </a>
              ) : (
                <a
                  href="/console/fusee/glory"
                  className="rounded-lg border border-zinc-700 px-3 py-1.5 text-[10px] text-zinc-500 hover:text-zinc-300"
                >
                  Retour
                </a>
              )}
            </div>
          </div>
          <div className="mt-2 h-1.5 rounded-full bg-zinc-800">
            <div
              className="h-1.5 rounded-full bg-amber-500 transition-all"
              style={{ width: `${focusPaths.length > 0 ? (focusCompletedCount / focusPaths.length) * 100 : 0}%` }}
            />
          </div>
        </div>
      )}

      <PageHeader
        title={focusMode ? "Completer les champs manquants" : "Editeur Fiche ADVE"}
        description={focusMode ? `${focusPaths.length} champs requis pour la sequence ${focusSeqKey}` : "Editez chaque pilier de votre strategie de marque"}
        breadcrumbs={[
          { label: "Cockpit", href: "/cockpit" },
          { label: "Brand", href: "/cockpit/brand/identity" },
          { label: focusMode ? "Completion" : "Editeur ADVE" },
        ]}
      />

      {/* Score overview */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard title="Score composite" value={`${composite.toFixed(0)}/200`} icon={Shield} />
        <StatCard title="Piliers remplis" value={`${Object.values(allPillars ?? {}).filter((p) => (p as Record<string, unknown>)?.completion as number > 0).length}/8`} icon={CheckCircle} />
        <StatCard title="Cross-refs valides" value={`${crossRefSummary?.score ?? 0}%`} icon={Target} trendValue={`${crossRefSummary?.valid ?? 0}/${crossRefSummary?.total ?? 0}`} />
        <StatCard title="Erreurs" value={Object.values(allPillars ?? {}).reduce((sum, p) => sum + ((p as Record<string, unknown>)?.errors as number ?? 0), 0)} icon={AlertCircle} />
      </div>

      {/* Pillar selector tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {PILLAR_CONFIG.map((p) => {
          const info = allPillars?.[p.key] as Record<string, unknown> | undefined;
          const completion = (info?.completion as number) ?? 0;
          const score = (info?.score as number) ?? 0;
          return (
            <button
              key={p.key}
              onClick={() => setActivePillar(p.key)}
              className={`flex shrink-0 items-center gap-2 rounded-lg border px-4 py-3 text-sm transition-all ${
                activePillar === p.key
                  ? `border-zinc-600 bg-zinc-800 ${p.color}`
                  : "border-zinc-800 bg-zinc-900/50 text-zinc-400 hover:border-zinc-700"
              }`}
            >
              <p.icon className="h-4 w-4" />
              <div className="text-left">
                <div className="flex items-center gap-1.5 font-medium">
                  {p.key} — {p.label}
                  {focusByPillar[p.key] && focusByPillar[p.key]!.length > 0 && (
                    <span className="flex h-4 w-4 items-center justify-center rounded-full bg-amber-500 text-[9px] font-bold text-black">
                      {focusByPillar[p.key]!.length}
                    </span>
                  )}
                </div>
                <div className="text-[10px] text-zinc-500">{score.toFixed(1)}/25 · {completion}%</div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Active pillar editor */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/80 p-6">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`rounded-lg p-2 ${currentConfig.bgColor}`}>
              <currentConfig.icon className={`h-5 w-5 ${currentConfig.color}`} />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">{currentConfig.key} — {currentConfig.label}</h2>
              <p className="text-xs text-zinc-500">
                Score: {(pillarInfo?.score as number ?? 0).toFixed(1)}/25 · Complétude: {pillarInfo?.completion ?? 0}% · Erreurs: {pillarInfo?.errors ?? 0}
              </p>
            </div>
          </div>
          <button
            onClick={handleSave}
            disabled={saving || !localContent[activePillar]}
            className="flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-200 disabled:opacity-50"
          >
            <Save className="h-4 w-4" />
            {saving ? "Sauvegarde..." : "Sauvegarder"}
          </button>
        </div>

        {saveMessage && (
          <div className={`mb-4 flex items-center gap-2 rounded-lg p-3 text-sm ${
            saveMessage.type === "success" ? "bg-emerald-400/10 text-emerald-400" : "bg-red-400/10 text-red-400"
          }`}>
            {saveMessage.type === "success" ? <CheckCircle className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
            {saveMessage.text}
          </div>
        )}

        {/* Dynamic form fields based on active pillar */}
        <div className="space-y-6">
          {activePillar === "A" && (
            <>
              <FieldSection title="Identité">
                <SelectField label="Archétype" value={currentData.archetype as string ?? ""} options={ARCHETYPES} onChange={(v) => setField("A", "archetype", v)} highlight={isFocusField("A", "archetype")} />
                <TextField label="Citation fondatrice" placeholder="Je crois que..." value={currentData.citationFondatrice as string ?? ""} onChange={(v) => setField("A", "citationFondatrice", v)} minLength={30} highlight={isFocusField("A", "citationFondatrice")} />
                <TextArea label="Noyau identitaire" placeholder="L'ADN de la marque en 2-3 phrases..." value={currentData.noyauIdentitaire as string ?? ""} onChange={(v) => setField("A", "noyauIdentitaire", v)} minLength={100} highlight={isFocusField("A", "noyauIdentitaire")} />
              </FieldSection>
              <FieldSection title="Ikigai">
                <TextArea label="Passion (Love)" placeholder="Ce que la marque aime faire..." value={(currentData.ikigai as Record<string, string>)?.love ?? ""} onChange={(v) => setField("A", "ikigai", { ...(currentData.ikigai as Record<string, string> ?? {}), love: v })} minLength={50} />
                <TextArea label="Compétence" placeholder="Ce que la marque fait mieux que les autres..." value={(currentData.ikigai as Record<string, string>)?.competence ?? ""} onChange={(v) => setField("A", "ikigai", { ...(currentData.ikigai as Record<string, string> ?? {}), competence: v })} minLength={50} />
                <TextArea label="Besoin du monde" placeholder="Ce dont le monde a besoin (phrased as manque/injustice)..." value={(currentData.ikigai as Record<string, string>)?.worldNeed ?? ""} onChange={(v) => setField("A", "ikigai", { ...(currentData.ikigai as Record<string, string> ?? {}), worldNeed: v })} minLength={50} />
                <TextArea label="Rémunération" placeholder="Comment le client transfère de la valeur..." value={(currentData.ikigai as Record<string, string>)?.remuneration ?? ""} onChange={(v) => setField("A", "ikigai", { ...(currentData.ikigai as Record<string, string> ?? {}), remuneration: v })} minLength={50} />
              </FieldSection>
              <FieldSection title="Valeurs Schwartz (3-7)">
                {(getArray(currentData.valeurs) as Array<Record<string, string>>).map((val, i) => (
                  <div key={i} className="rounded-lg border border-zinc-800 bg-zinc-950/40 p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-zinc-400">Valeur #{i + 1}</span>
                      <button onClick={() => {
                        const arr = [...getArray(currentData.valeurs)];
                        arr.splice(i, 1);
                        setField("A", "valeurs", arr);
                      }} className="text-red-400 hover:text-red-300"><Trash2 className="h-3 w-3" /></button>
                    </div>
                    <SelectField label="Valeur Schwartz" value={val.value ?? ""} options={SCHWARTZ_VALUES} onChange={(v) => {
                      const arr = [...getArray(currentData.valeurs)] as Record<string, string>[];
                      arr[i] = { ...arr[i], value: v };
                      setField("A", "valeurs", arr);
                    }} />
                    <TextField label="Nom personnalisé" value={val.customName ?? ""} onChange={(v) => {
                      const arr = [...getArray(currentData.valeurs)] as Record<string, string>[];
                      arr[i] = { ...arr[i], customName: v };
                      setField("A", "valeurs", arr);
                    }} />
                    <TextArea label="Justification (50+ chars)" value={val.justification ?? ""} onChange={(v) => {
                      const arr = [...getArray(currentData.valeurs)] as Record<string, string>[];
                      arr[i] = { ...arr[i], justification: v };
                      setField("A", "valeurs", arr);
                    }} minLength={50} />
                    <TextArea label="Coût de maintien (30+ chars)" value={val.costOfHolding ?? ""} onChange={(v) => {
                      const arr = [...getArray(currentData.valeurs)] as Record<string, string>[];
                      arr[i] = { ...arr[i], costOfHolding: v };
                      setField("A", "valeurs", arr);
                    }} minLength={30} />
                  </div>
                ))}
                {getArray(currentData.valeurs).length < 7 && (
                  <button onClick={() => setField("A", "valeurs", [...getArray(currentData.valeurs), { value: "", customName: "", rank: getArray(currentData.valeurs).length + 1, justification: "", costOfHolding: "" }])}
                    className="flex items-center gap-2 rounded-lg border border-dashed border-zinc-700 px-4 py-3 text-sm text-zinc-400 hover:border-zinc-600 hover:text-zinc-300">
                    <Plus className="h-4 w-4" /> Ajouter une valeur
                  </button>
                )}
              </FieldSection>
            </>
          )}

          {activePillar === "D" && (
            <>
              <FieldSection title="Positionnement">
                <TextField label="Promesse maître (≤150 chars)" value={currentData.promesseMaitre as string ?? ""} onChange={(v) => setField("D", "promesseMaitre", v)} maxLength={150} highlight={isFocusField("D", "promesseMaitre")} />
                <TextField label="Positionnement (≤200 chars)" placeholder="To [persona], [brand] is the [category] that [unique benefit]..." value={currentData.positionnement as string ?? ""} onChange={(v) => setField("D", "positionnement", v)} maxLength={200} highlight={isFocusField("D", "positionnement")} />
              </FieldSection>
              <FieldSection title="Ton de voix">
                <TextField label="Personnalité (5-7 mots, virgules)" placeholder="audacieuse, honnête, mystérieuse..." value={Array.isArray((currentData.tonDeVoix as Record<string, unknown>)?.personnalite) ? ((currentData.tonDeVoix as Record<string, unknown>).personnalite as string[]).join(", ") : ""} onChange={(v) => setField("D", "tonDeVoix", { ...(currentData.tonDeVoix as Record<string, unknown> ?? {}), personnalite: v.split(",").map((s) => s.trim()).filter(Boolean) })} highlight={isFocusField("D", "tonDeVoix.personnalite") || isFocusField("D", "tonDeVoix")} />
                <TextArea label="On dit (3+ phrases, une par ligne)" placeholder="Phrase typique de la marque..." value={Array.isArray((currentData.tonDeVoix as Record<string, unknown>)?.onDit) ? ((currentData.tonDeVoix as Record<string, unknown>).onDit as string[]).join("\n") : ""} onChange={(v) => setField("D", "tonDeVoix", { ...(currentData.tonDeVoix as Record<string, unknown> ?? {}), onDit: v.split("\n").filter(Boolean) })} />
                <TextArea label="On ne dit pas (2+ phrases, une par ligne)" placeholder="Ce que la marque n'utilise jamais..." value={Array.isArray((currentData.tonDeVoix as Record<string, unknown>)?.onNeditPas) ? ((currentData.tonDeVoix as Record<string, unknown>).onNeditPas as string[]).join("\n") : ""} onChange={(v) => setField("D", "tonDeVoix", { ...(currentData.tonDeVoix as Record<string, unknown> ?? {}), onNeditPas: v.split("\n").filter(Boolean) })} />
              </FieldSection>
            </>
          )}

          {activePillar !== "A" && activePillar !== "D" && (
            <div className="space-y-4">
              <p className="text-sm text-zinc-400">
                Éditeur générique pour le pilier {currentConfig.label}. Modifiez le contenu JSON ci-dessous.
              </p>
              {/* Focus mode: show missing paths for this pillar */}
              {focusMode && focusByPillar[activePillar] && focusByPillar[activePillar].length > 0 && (
                <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3">
                  <p className="text-xs font-semibold text-amber-400 mb-1.5">Champs a completer dans ce pilier :</p>
                  <div className="flex flex-wrap gap-1.5">
                    {focusByPillar[activePillar].map((path) => (
                      <span key={path} className="inline-flex rounded-full bg-amber-500/10 px-2.5 py-0.5 text-[10px] font-mono text-amber-400 ring-1 ring-inset ring-amber-500/30">
                        {path}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              <TextArea
                label={`Contenu du pilier ${activePillar}`}
                value={JSON.stringify(currentData, null, 2)}
                onChange={(v) => {
                  try {
                    const parsed = JSON.parse(v);
                    setLocalContent((prev) => ({ ...prev, [activePillar]: parsed }));
                  } catch {
                    // Ignore parse errors during editing
                  }
                }}
                rows={20}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// HELPER COMPONENTS
// ============================================================================

function FieldSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-zinc-300 border-b border-zinc-800 pb-2">{title}</h3>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function TextField({ label, value, onChange, placeholder, minLength, maxLength, highlight }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; minLength?: number; maxLength?: number; highlight?: boolean;
}) {
  const len = value.length;
  const isShort = minLength && len > 0 && len < minLength;
  const isLong = maxLength && len > maxLength;
  const isEmpty = highlight && len === 0;
  return (
    <div className={highlight ? "rounded-lg p-2 -m-2 ring-1 ring-amber-500/40 bg-amber-500/5" : ""}>
      <label className="mb-1 flex items-center gap-2 text-xs font-medium text-zinc-400">
        {label}
        {isEmpty && <span className="text-[9px] font-semibold text-amber-400 uppercase">Requis</span>}
        {highlight && len > 0 && <span className="text-[9px] font-semibold text-emerald-400">✓</span>}
      </label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        maxLength={maxLength}
        className={`w-full rounded-lg border bg-zinc-950/60 px-3 py-2 text-sm text-white placeholder-zinc-600 ${
          isEmpty ? "border-amber-500/60" : isShort ? "border-amber-500/50" : isLong ? "border-red-500/50" : "border-zinc-800"
        }`}
      />
      {(minLength || maxLength) && (
        <p className={`mt-1 text-[10px] ${isShort ? "text-amber-400" : isLong ? "text-red-400" : "text-zinc-600"}`}>
          {len} caractères{minLength ? ` (min: ${minLength})` : ""}{maxLength ? ` (max: ${maxLength})` : ""}
        </p>
      )}
    </div>
  );
}

function TextArea({ label, value, onChange, placeholder, minLength, rows = 3, highlight }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; minLength?: number; rows?: number; highlight?: boolean;
}) {
  const len = value.length;
  const isShort = minLength && len > 0 && len < minLength;
  const isEmpty = highlight && len === 0;
  return (
    <div className={highlight ? "rounded-lg p-2 -m-2 ring-1 ring-amber-500/40 bg-amber-500/5" : ""}>
      <label className="mb-1 flex items-center gap-2 text-xs font-medium text-zinc-400">
        {label}
        {isEmpty && <span className="text-[9px] font-semibold text-amber-400 uppercase">Requis</span>}
        {highlight && len > 0 && <span className="text-[9px] font-semibold text-emerald-400">✓</span>}
      </label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        className={`w-full rounded-lg border bg-zinc-950/60 px-3 py-2 text-sm text-white placeholder-zinc-600 ${
          isEmpty ? "border-amber-500/60" : isShort ? "border-amber-500/50" : "border-zinc-800"
        }`}
      />
      {minLength && (
        <p className={`mt-1 text-[10px] ${isShort ? "text-amber-400" : "text-zinc-600"}`}>
          {len}/{minLength} caractères minimum
        </p>
      )}
    </div>
  );
}

function SelectField({ label, value, options, onChange, highlight }: {
  label: string; value: string; options: string[]; onChange: (v: string) => void; highlight?: boolean;
}) {
  const isEmpty = highlight && !value;
  return (
    <div className={highlight ? "rounded-lg p-2 -m-2 ring-1 ring-amber-500/40 bg-amber-500/5" : ""}>
      <label className="mb-1 flex items-center gap-2 text-xs font-medium text-zinc-400">
        {label}
        {isEmpty && <span className="text-[9px] font-semibold text-amber-400 uppercase">Requis</span>}
        {highlight && value && <span className="text-[9px] font-semibold text-emerald-400">✓</span>}
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-zinc-800 bg-zinc-950/60 px-3 py-2 text-sm text-white"
      >
        <option value="">— Sélectionner —</option>
        {options.map((opt) => (
          <option key={opt} value={opt}>{opt}</option>
        ))}
      </select>
    </div>
  );
}

function getArray(val: unknown): unknown[] {
  return Array.isArray(val) ? val : [];
}
