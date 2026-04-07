"use client";

import { useState, useCallback } from "react";
import { type FieldDef, getFieldDef } from "@/lib/types/field-registry";
import { Save, X, Plus, Trash2, Pencil } from "lucide-react";

// ─── Styles ──────────────────────────────────────────────────────────────

const inputClass = "w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-xs text-white outline-none focus:border-violet-600 focus:ring-1 focus:ring-violet-600";
const selectClass = `${inputClass} appearance-none`;
const labelClass = "text-[10px] font-medium uppercase tracking-wider text-zinc-500 mb-1 block";
const btnSm = "rounded-lg px-2.5 py-1 text-[10px] font-medium transition-colors";

// ─── Atomic editors ──────────────────────────────────────────────────────

function EnumEditor({ value, def, onChange }: { value: unknown; def: Extract<FieldDef, { kind: "enum" }>; onChange: (v: string | null) => void }) {
  // Normalize: match case-insensitively against options
  const rawVal = String(value ?? "").toUpperCase();
  const matched = def.options.find((o) => o.toUpperCase() === rawVal) ?? "";
  return (
    <select value={matched} onChange={(e) => onChange(e.target.value || null)} className={selectClass}>
      {def.nullable && <option value="">— Aucun —</option>}
      {!matched && rawVal && <option value={String(value)}>{String(value)} (non standard)</option>}
      {def.options.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
    </select>
  );
}

function TextEditor({ value, def, onChange }: { value: unknown; def: Extract<FieldDef, { kind: "text" }>; onChange: (v: string) => void }) {
  if (def.multiline) {
    return <textarea value={String(value ?? "")} onChange={(e) => onChange(e.target.value)} rows={3} maxLength={def.maxLength} placeholder={def.placeholder} className={inputClass} />;
  }
  return <input type="text" value={String(value ?? "")} onChange={(e) => onChange(e.target.value)} maxLength={def.maxLength} placeholder={def.placeholder} className={inputClass} />;
}

function NumberEditor({ value, def, onChange }: { value: unknown; def: Extract<FieldDef, { kind: "number" }>; onChange: (v: number) => void }) {
  return (
    <div className="flex items-center gap-1.5">
      <input type="number" value={typeof value === "number" ? value : ""} onChange={(e) => onChange(parseFloat(e.target.value) || 0)} min={def.min} max={def.max} className={`${inputClass} flex-1`} />
      {def.unit && <span className="text-[10px] text-zinc-500 shrink-0">{def.unit}</span>}
    </div>
  );
}

function MultiEnumEditor({ value, def, onChange }: { value: unknown; def: Extract<FieldDef, { kind: "multi-enum" }>; onChange: (v: string[]) => void }) {
  // Normalize: match case-insensitively
  const rawArr = Array.isArray(value) ? value as string[] : [];
  const normalizedSet = new Set(rawArr.map((v) => {
    const match = def.options.find((o) => o.toUpperCase() === String(v).toUpperCase());
    return match ?? v;
  }));
  const selected = normalizedSet;
  return (
    <div className="flex flex-wrap gap-1">
      {def.options.map((opt) => (
        <button
          key={opt}
          type="button"
          onClick={() => {
            const next = new Set(selected);
            if (next.has(opt)) next.delete(opt); else next.add(opt);
            onChange([...next]);
          }}
          className={`rounded-full px-2 py-0.5 text-[10px] border transition-colors ${
            selected.has(opt)
              ? "bg-violet-500/20 text-violet-300 border-violet-500/40"
              : "bg-zinc-800 text-zinc-500 border-zinc-700 hover:text-zinc-300"
          }`}
        >
          {opt}
        </button>
      ))}
    </div>
  );
}

function StringsEditor({ value, def, onChange }: { value: unknown; def: Extract<FieldDef, { kind: "array-of-strings" }>; onChange: (v: string[]) => void }) {
  const items = Array.isArray(value) ? value as string[] : [];
  return (
    <div className="space-y-1">
      {items.map((item, i) => (
        <div key={i} className="flex items-center gap-1">
          <input type="text" value={item} onChange={(e) => { const next = [...items]; next[i] = e.target.value; onChange(next); }} placeholder={def.placeholder} className={`${inputClass} flex-1`} />
          <button type="button" onClick={() => onChange(items.filter((_, j) => j !== i))} className="text-zinc-600 hover:text-red-400"><Trash2 className="h-3 w-3" /></button>
        </div>
      ))}
      <button type="button" onClick={() => onChange([...items, ""])} className={`${btnSm} bg-zinc-800 text-zinc-400 hover:text-white flex items-center gap-1`}>
        <Plus className="h-2.5 w-2.5" /> Ajouter
      </button>
    </div>
  );
}

// ─── Compound editors ────────────────────────────────────────────────────

function ObjectEditor({ value, def, onChange }: { value: unknown; def: Extract<FieldDef, { kind: "object" }>; onChange: (v: Record<string, unknown>) => void }) {
  const obj = (typeof value === "object" && value !== null ? value : {}) as Record<string, unknown>;
  return (
    <div className="space-y-2 rounded-lg border border-zinc-800 bg-zinc-950/30 p-3">
      {Object.entries(def.fields).map(([key, fieldDef]) => (
        <div key={key}>
          <label className={labelClass}>{fieldDef.label}</label>
          <AtomicEditor value={obj[key]} def={fieldDef} onChange={(v) => onChange({ ...obj, [key]: v })} />
        </div>
      ))}
    </div>
  );
}

function ArrayOfObjectsEditor({ value, def, onChange }: { value: unknown; def: Extract<FieldDef, { kind: "array-of-objects" }>; onChange: (v: unknown[]) => void }) {
  const items = Array.isArray(value) ? value as Record<string, unknown>[] : [];
  return (
    <div className="space-y-2">
      {items.map((item, i) => (
        <div key={i} className="rounded-lg border border-zinc-800 bg-zinc-950/30 p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-medium text-zinc-400">{def.itemLabel ?? "Item"} #{i + 1}</span>
            <button type="button" onClick={() => onChange(items.filter((_, j) => j !== i))} className="text-zinc-600 hover:text-red-400"><Trash2 className="h-3 w-3" /></button>
          </div>
          <div className="space-y-2">
            {Object.entries(def.itemFields).map(([key, fieldDef]) => (
              <div key={key}>
                <label className={labelClass}>{fieldDef.label}</label>
                <AtomicEditor value={item[key]} def={fieldDef} onChange={(v) => {
                  const next = [...items];
                  next[i] = { ...item, [key]: v };
                  onChange(next);
                }} />
              </div>
            ))}
          </div>
        </div>
      ))}
      <button type="button" onClick={() => onChange([...items, {}])} className={`${btnSm} bg-zinc-800 text-zinc-400 hover:text-white flex items-center gap-1 w-full justify-center py-2`}>
        <Plus className="h-3 w-3" /> Ajouter {def.itemLabel?.toLowerCase() ?? "item"}
      </button>
    </div>
  );
}

function JsonEditor({ value, onChange }: { value: unknown; onChange: (v: unknown) => void }) {
  const [draft, setDraft] = useState(JSON.stringify(value, null, 2));
  return (
    <textarea
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={() => { try { onChange(JSON.parse(draft)); } catch { /* invalid */ } }}
      rows={6}
      className={`${inputClass} font-mono`}
    />
  );
}

// ─── Dispatcher ──────────────────────────────────────────────────────────

function AtomicEditor({ value, def, onChange }: { value: unknown; def: FieldDef; onChange: (v: unknown) => void }) {
  switch (def.kind) {
    case "enum": return <EnumEditor value={value} def={def} onChange={onChange as (v: string | null) => void} />;
    case "text": return <TextEditor value={value} def={def} onChange={onChange as (v: string) => void} />;
    case "number": return <NumberEditor value={value} def={def} onChange={onChange as (v: number) => void} />;
    case "multi-enum": return <MultiEnumEditor value={value} def={def} onChange={onChange as (v: string[]) => void} />;
    case "array-of-strings": return <StringsEditor value={value} def={def} onChange={onChange as (v: string[]) => void} />;
    case "object": return <ObjectEditor value={value} def={def} onChange={onChange as (v: Record<string, unknown>) => void} />;
    case "array-of-objects": return <ArrayOfObjectsEditor value={value} def={def} onChange={onChange as (v: unknown[]) => void} />;
    case "json": return <JsonEditor value={value} onChange={onChange} />;
  }
}

// ─── Main SmartFieldEditor ───────────────────────────────────────────────

export function SmartFieldEditor({
  pillarKey,
  sectionKey,
  value,
  onSave,
  isSaving,
}: {
  pillarKey: string;
  sectionKey: string;
  value: unknown;
  onSave: (key: string, newValue: unknown) => void;
  isSaving: boolean;
}) {
  const def = getFieldDef(pillarKey, sectionKey);
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState<unknown>(value);

  const startEdit = useCallback(() => {
    setDraft(value);
    setIsEditing(true);
  }, [value]);

  const save = useCallback(() => {
    onSave(sectionKey, draft);
    setIsEditing(false);
  }, [sectionKey, draft, onSave]);

  if (!isEditing) {
    return (
      <button
        onClick={startEdit}
        className="flex items-center gap-1.5 rounded-lg border border-zinc-700/50 bg-zinc-800/50 px-2.5 py-1 text-[10px] font-medium text-zinc-400 hover:text-white hover:border-zinc-600 transition-colors"
      >
        <Pencil className="h-2.5 w-2.5" /> Editer
      </button>
    );
  }

  return (
    <div className="mt-2 rounded-lg border border-amber-700/40 bg-amber-950/10 p-3 space-y-3">
      <div className="text-[10px] font-medium text-amber-400 uppercase tracking-wider">{def.label}</div>
      <AtomicEditor value={draft} def={def} onChange={setDraft} />
      <div className="flex items-center gap-2">
        <button onClick={save} disabled={isSaving} className={`${btnSm} bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 flex items-center gap-1`}>
          <Save className="h-3 w-3" /> {isSaving ? "..." : "Enregistrer"}
        </button>
        <button onClick={() => setIsEditing(false)} className={`${btnSm} bg-zinc-800 text-zinc-300 hover:bg-zinc-700 flex items-center gap-1`}>
          <X className="h-3 w-3" /> Annuler
        </button>
      </div>
    </div>
  );
}
