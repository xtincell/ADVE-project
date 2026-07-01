/**
 * /console/governance/phase-18-residuals — Formulaire opérateur Phase 18 résidus.
 *
 * Permet à l'opérateur de remplir progressivement les paliers reportés Phase 18 :
 *   - N5-bis : Variable Bible reclassif (~300 entrées × 9 BrandNature × 3 inheritance modes)
 *   - N6-bis : Glory tools annotation (56 tools × applicableNatures)
 *   - N9     : Décision sur duplicate piliers détectés (BR-CI/SN/NG → BR Global inheritance)
 *   - N10    : Activation/désactivation feature flag global rollout
 *   - LLM    : Trigger fine-tune Phase 2 (extractor / classifier / coherence-gate)
 *   - 18-bis : M&A NodeOwnershipTransfer + 8 archétypes non-PRODUCT
 *   - CACHE  : Migration Redis cross-process
 *
 * Chaque réponse persistée comme `Phase18ResidualEntry`. NEFER consulte cette
 * page (+ memory user `phase_18_residuals_pending.md` + RESIDUAL-DEBT.md
 * §Phase 18) à chaque session pour reprendre les résidus.
 *
 * Manual-first parity (ADR-0060) : c'est par définition manuel — le formulaire
 * EST le mode de saisie principal.
 */

"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { ALL_BRAND_NATURES } from "@/domain/brand-nature-archetypes";
import {
  ClipboardList, Tag, Wrench, Network, ToggleRight, Brain, Database,
  Building2, CheckCircle2, XCircle, Plus,
} from "lucide-react";

const CATEGORY_META = [
  { key: "BIBLE_VAR" as const, label: "N5-bis — Variable Bible", icon: Tag, color: "bg-emerald-500/15 text-emerald-300", desc: "Reclassif manuelle ~300 entrées BIBLE_*. Pour chaque clé : applicableNatures + inheritanceMode." },
  { key: "GLORY_TOOL" as const, label: "N6-bis — Glory tools", icon: Wrench, color: "bg-blue-500/15 text-blue-300", desc: "Annotation manuelle des 56 Glory tools : applicableNatures (universel par défaut)." },
  { key: "PILLAR_DUPLICATE" as const, label: "N9 — Duplicate piliers", icon: Network, color: "bg-amber-500/15 text-amber-300", desc: "Décision sur BrandNode siblings aux mêmes piliers (BR-CI/SN/NG) → propose conversion en héritage." },
  { key: "FEATURE_FLAG" as const, label: "N10 — Feature flags", icon: ToggleRight, color: "bg-violet-500/15 text-violet-300", desc: "Activation/désactivation rollout flags (BRAND_TREE_INHERITANCE_ENABLED, etc.)." },
  { key: "LLM_TUNING" as const, label: "LLM Phase 2 fine-tune", icon: Brain, color: "bg-pink-500/15 text-pink-300", desc: "Trigger fine-tune (extractor / classifier / narrative-coherence) après ≥30j prod." },
  { key: "PHASE_18_BIS" as const, label: "Phase 18-bis", icon: Building2, color: "bg-orange-500/15 text-orange-300", desc: "M&A NodeOwnershipTransfer + 8 archétypes non-PRODUCT (CHARACTER_IP, MEDIA_IP, etc.)." },
  { key: "CACHE_INFRA" as const, label: "Cache Redis", icon: Database, color: "bg-zinc-500/15 text-zinc-300", desc: "Migration cache in-memory → Redis cross-process (multi-pod scaling)." },
] as const;

type Category = (typeof CATEGORY_META)[number]["key"];

const STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-zinc-500/15 text-zinc-300",
  IN_PROGRESS: "bg-blue-500/15 text-blue-300",
  RESOLVED: "bg-emerald-500/15 text-emerald-300",
  DISMISSED: "bg-zinc-500/10 text-zinc-500",
};

export default function Phase18ResidualsPage() {
  const [activeCategory, setActiveCategory] = useState<Category>("BIBLE_VAR");
  const { data: operator } = trpc.operator.getOwn.useQuery();
  const { data: stats } = trpc.phase18Residuals.stats.useQuery(
    { operatorId: operator?.id ?? "" },
    { enabled: Boolean(operator?.id) },
  );

  if (!operator) return <div className="p-6 text-sm text-foreground-secondary">Loading…</div>;

  return (
    <div className="flex flex-col gap-6 p-6">
      <header>
        <h1 className="flex items-center gap-2 text-2xl font-semibold">
          <ClipboardList className="h-6 w-6" /> Phase 18 — Résidus
        </h1>
        <p className="mt-1 text-sm text-foreground-secondary">
          Formulaire opérateur pour remplir progressivement les paliers reportés Phase 18 (N5-bis,
          N6-bis, N9, N10, LLM Phase 2, Phase 18-bis, Cache Redis). Chaque entrée crée un audit
          trail persistant. NEFER consulte cette page à chaque session pour reprendre les résidus.
        </p>
        <p className="mt-1 text-xs text-foreground-secondary">
          Operator : <strong>{operator.name}</strong> · Sources de vérité NEFER :
          {" "}<code>~/.claude/.../phase_18_residuals_pending.md</code> · <code>docs/governance/RESIDUAL-DEBT.md</code> §Phase 18
        </p>
      </header>

      {/* Stats par catégorie */}
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
        {CATEGORY_META.map((c) => {
          const counts = stats?.byCategory?.[c.key] ?? {};
          const pending = counts.PENDING ?? 0;
          const inProgress = counts.IN_PROGRESS ?? 0;
          const resolved = counts.RESOLVED ?? 0;
          const dismissed = counts.DISMISSED ?? 0;
          const total = pending + inProgress + resolved + dismissed;
          const Icon = c.icon;
          return (
            <button
              key={c.key}
              onClick={() => setActiveCategory(c.key)}
              className={`rounded border p-3 text-left transition ${
                activeCategory === c.key
                  ? "border-accent bg-accent/5"
                  : "border-zinc-800 bg-zinc-900/30 hover:border-zinc-700"
              }`}
            >
              <div className={`mb-1 inline-flex items-center gap-1.5 rounded px-1.5 py-0.5 text-[10px] uppercase ${c.color}`}>
                <Icon className="h-3 w-3" />
                {c.key.replace(/_/g, " ")}
              </div>
              <div className="text-sm font-medium">{c.label}</div>
              <div className="mt-1 flex gap-2 text-[10px] text-foreground-secondary">
                <span>{total} total</span>
                {pending > 0 && <span className="text-amber-400">· {pending} pending</span>}
                {resolved > 0 && <span className="text-emerald-400">· {resolved} done</span>}
              </div>
            </button>
          );
        })}
      </section>

      {/* Active category form */}
      <CategoryForm
        category={activeCategory}
        operatorId={operator.id}
      />
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────
// CategoryForm — formulaire principal pour la catégorie active
// ──────────────────────────────────────────────────────────────────────

function CategoryForm({ category, operatorId }: { category: Category; operatorId: string }) {
  const meta = CATEGORY_META.find((c) => c.key === category)!;
  const [showAddForm, setShowAddForm] = useState(false);

  const { data: entries, refetch } = trpc.phase18Residuals.list.useQuery({ operatorId, category });

  return (
    <section className="rounded border border-zinc-700">
      <header className="flex items-center justify-between border-b border-zinc-700 px-4 py-3">
        <div>
          <h2 className="flex items-center gap-2 font-medium">
            <meta.icon className="h-4 w-4" />
            {meta.label}
          </h2>
          <p className="mt-1 text-xs text-foreground-secondary">{meta.desc}</p>
        </div>
        <button
          onClick={() => setShowAddForm((v) => !v)}
          className="inline-flex items-center gap-1.5 rounded bg-accent px-3 py-1.5 text-sm font-medium text-white hover:bg-accent/80"
        >
          <Plus className="h-4 w-4" />
          {showAddForm ? "Annuler" : "Nouvelle entrée"}
        </button>
      </header>

      {showAddForm && (
        <div className="border-b border-zinc-800 bg-zinc-900/30">
          <NewEntryForm
            category={category}
            operatorId={operatorId}
            onSuccess={() => {
              setShowAddForm(false);
              refetch();
            }}
          />
        </div>
      )}

      <div className="p-4">
        {!entries || entries.length === 0 ? (
          <div className="rounded border border-dashed border-zinc-700 p-6 text-center text-sm text-foreground-secondary">
            Aucune entrée pour cette catégorie. Clique "+ Nouvelle entrée" pour démarrer.
          </div>
        ) : (
          <ul className="space-y-2">
            {entries.map((e) => (
              <EntryRow key={e.id} entry={e} operatorId={operatorId} onRefresh={refetch} />
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

// ──────────────────────────────────────────────────────────────────────
// NewEntryForm — saisie d'une nouvelle entrée
// ──────────────────────────────────────────────────────────────────────

function NewEntryForm({
  category,
  operatorId,
  onSuccess,
}: {
  category: Category;
  operatorId: string;
  onSuccess: () => void;
}) {
  const [targetKey, setTargetKey] = useState("");
  const [notes, setNotes] = useState("");
  const [payload, setPayload] = useState<Record<string, unknown>>({});

  const upsertMutation = trpc.phase18Residuals.upsert.useMutation({ onSuccess });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetKey.trim()) return;
    await upsertMutation.mutateAsync({
      operatorId,
      category,
      targetKey,
      payload,
      notes: notes || null,
    });
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-3 p-4 text-sm">
      <label className="flex flex-col gap-1">
        <span className="font-medium">{getTargetKeyLabel(category)}</span>
        <input
          type="text"
          required
          value={targetKey}
          onChange={(e) => setTargetKey(e.target.value)}
          placeholder={getTargetKeyPlaceholder(category)}
          className="rounded border border-zinc-700 bg-zinc-900 px-2 py-1.5 font-mono text-xs"
        />
      </label>

      {/* Payload spécifique par category */}
      {(category === "BIBLE_VAR" || category === "GLORY_TOOL") && (
        <NaturePicker
          value={(payload.applicableNatures as string[] | undefined) ?? []}
          onChange={(natures) => setPayload((p) => ({ ...p, applicableNatures: natures }))}
        />
      )}

      {category === "BIBLE_VAR" && (
        <label className="flex flex-col gap-1">
          <span className="font-medium">Inheritance mode</span>
          <select
            value={(payload.inheritanceMode as string | undefined) ?? "INHERIT_BY_DEFAULT"}
            onChange={(e) => setPayload((p) => ({ ...p, inheritanceMode: e.target.value }))}
            className="rounded border border-zinc-700 bg-zinc-900 px-2 py-1.5"
          >
            <option value="INHERIT_BY_DEFAULT">INHERIT_BY_DEFAULT</option>
            <option value="NEVER_INHERIT">NEVER_INHERIT</option>
            <option value="MERGE_WITH_PARENT">MERGE_WITH_PARENT</option>
          </select>
        </label>
      )}

      {category === "FEATURE_FLAG" && (
        <div className="flex gap-3">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={Boolean(payload.enabled)}
              onChange={(e) => setPayload((p) => ({ ...p, enabled: e.target.checked }))}
            />
            <span>Enabled</span>
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs">Scope</span>
            <select
              value={(payload.scope as string | undefined) ?? "OPERATOR"}
              onChange={(e) => setPayload((p) => ({ ...p, scope: e.target.value }))}
              className="rounded border border-zinc-700 bg-zinc-900 px-2 py-1"
            >
              <option value="OPERATOR">OPERATOR (per-operator)</option>
              <option value="GLOBAL">GLOBAL (rollout total)</option>
            </select>
          </label>
        </div>
      )}

      {category === "PILLAR_DUPLICATE" && (
        <label className="flex flex-col gap-1">
          <span className="font-medium">Action sur duplicate</span>
          <select
            value={(payload.action as string | undefined) ?? "PROPAGATE_FROM_ANCESTOR"}
            onChange={(e) => setPayload((p) => ({ ...p, action: e.target.value }))}
            className="rounded border border-zinc-700 bg-zinc-900 px-2 py-1.5"
          >
            <option value="PROPAGATE_FROM_ANCESTOR">Convertir en héritage depuis ancêtre</option>
            <option value="KEEP_AS_OVERRIDE">Garder comme override local explicite</option>
            <option value="DEFER">Décision différée</option>
          </select>
        </label>
      )}

      <label className="flex flex-col gap-1">
        <span className="font-medium">Notes</span>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          placeholder="Justification, contexte, lien Slack/Notion, etc."
          className="rounded border border-zinc-700 bg-zinc-900 px-2 py-1.5"
        />
      </label>

      <div className="flex justify-end gap-2 pt-1">
        <button
          type="submit"
          disabled={upsertMutation.isPending}
          className="rounded bg-accent px-3 py-1.5 text-sm font-medium text-white hover:bg-accent/80 disabled:opacity-50"
        >
          {upsertMutation.isPending ? "Enregistrement…" : "Enregistrer"}
        </button>
      </div>
    </form>
  );
}

// ──────────────────────────────────────────────────────────────────────
// NaturePicker — multi-select BrandNature[]
// ──────────────────────────────────────────────────────────────────────

function NaturePicker({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
  const toggle = (n: string) => {
    if (value.includes(n)) onChange(value.filter((x) => x !== n));
    else onChange([...value, n]);
  };
  return (
    <fieldset className="flex flex-col gap-1.5">
      <legend className="text-sm font-medium">Applicable BrandNatures (vide = universel)</legend>
      <div className="flex flex-wrap gap-1">
        {ALL_BRAND_NATURES.map((n) => {
          const active = value.includes(n);
          return (
            <button
              key={n}
              type="button"
              onClick={() => toggle(n)}
              className={`rounded px-2 py-0.5 text-[11px] uppercase transition ${
                active ? "bg-accent text-white" : "bg-zinc-800 text-foreground-secondary hover:bg-zinc-700"
              }`}
            >
              {n}
            </button>
          );
        })}
        <button
          type="button"
          onClick={() => onChange([])}
          className="rounded border border-zinc-700 px-2 py-0.5 text-[11px] hover:bg-zinc-800"
        >
          Universel
        </button>
      </div>
    </fieldset>
  );
}

// ──────────────────────────────────────────────────────────────────────
// EntryRow — affichage + actions sur une entrée existante
// ──────────────────────────────────────────────────────────────────────

interface EntryRowEntry {
  id: string;
  category: string;
  targetKey: string;
  payload: unknown;
  status: string;
  notes: string | null;
  createdAt: Date;
  resolvedAt: Date | null;
  resolvedBy: string | null;
}

function EntryRow({ entry, operatorId, onRefresh }: { entry: EntryRowEntry; operatorId: string; onRefresh: () => void }) {
  const resolveMutation = trpc.phase18Residuals.resolve.useMutation({ onSuccess: onRefresh });
  const dismissMutation = trpc.phase18Residuals.dismiss.useMutation({ onSuccess: onRefresh });

  return (
    <li className="rounded border border-zinc-800 p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <code className="font-mono text-xs">{entry.targetKey}</code>
            <span className={`rounded px-1.5 py-0.5 text-[10px] uppercase ${STATUS_COLORS[entry.status] ?? ""}`}>
              {entry.status}
            </span>
            <span className="text-[10px] text-foreground-secondary">
              {new Date(entry.createdAt).toLocaleDateString("fr-FR")}
            </span>
          </div>
          {entry.payload != null && (
            <pre className="mt-1 max-h-24 overflow-auto rounded bg-zinc-900/50 p-1.5 text-[10px] text-foreground-secondary">
              {JSON.stringify(entry.payload, null, 2)}
            </pre>
          )}
          {entry.notes && (
            <p className="mt-1 text-xs text-foreground-secondary">{entry.notes}</p>
          )}
        </div>
        {entry.status !== "RESOLVED" && entry.status !== "DISMISSED" && (
          <div className="flex flex-col gap-1">
            <button
              onClick={() => {
                const notes = prompt("Notes de résolution :");
                if (notes && notes.trim()) {
                  resolveMutation.mutate({ entryId: entry.id, resolvedBy: operatorId, resolutionNotes: notes });
                }
              }}
              className="inline-flex items-center gap-1 rounded bg-emerald-500/20 px-2 py-1 text-[10px] text-emerald-300 hover:bg-emerald-500/30"
            >
              <CheckCircle2 className="h-3 w-3" /> Résolu
            </button>
            <button
              onClick={() => {
                const reason = prompt("Raison du dismissal :");
                if (reason && reason.trim()) {
                  dismissMutation.mutate({ entryId: entry.id, reason });
                }
              }}
              className="inline-flex items-center gap-1 rounded bg-zinc-700 px-2 py-1 text-[10px] text-foreground-secondary hover:bg-zinc-600"
            >
              <XCircle className="h-3 w-3" /> Dismiss
            </button>
          </div>
        )}
      </div>
    </li>
  );
}

// ──────────────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────────────

function getTargetKeyLabel(category: Category): string {
  switch (category) {
    case "BIBLE_VAR": return "Bible key (ex: BIBLE_A.tone)";
    case "GLORY_TOOL": return "Glory tool slug (ex: creative-brief)";
    case "PILLAR_DUPLICATE": return "Source nodeId (BrandNode dont le pilier est duplicate)";
    case "FEATURE_FLAG": return "Flag name (ex: BRAND_TREE_INHERITANCE_ENABLED)";
    case "LLM_TUNING": return "Module ciblé (extractor / classifier / coherence-gate)";
    case "PHASE_18_BIS": return "Sub-phase / archétype (ex: M&A, CHARACTER_IP)";
    case "CACHE_INFRA": return "Composant (ex: REDIS_MIGRATION)";
  }
}

function getTargetKeyPlaceholder(category: Category): string {
  switch (category) {
    case "BIBLE_VAR": return "BIBLE_A.tone";
    case "GLORY_TOOL": return "creative-brief";
    case "PILLAR_DUPLICATE": return "ckxxx... (cuid)";
    case "FEATURE_FLAG": return "BRAND_TREE_INHERITANCE_ENABLED";
    case "LLM_TUNING": return "extractor";
    case "PHASE_18_BIS": return "CHARACTER_IP";
    case "CACHE_INFRA": return "REDIS_MIGRATION";
  }
}
