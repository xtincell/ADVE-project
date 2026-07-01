"use client";

/**
 * Pillar Kit — primitives partagées des renderers bespoke des piliers.
 *
 * Porté du handoff claude.ai/design (projet 12e8dbb1, pillar-*.jsx). Les pages
 * pilier gardent le shell gouverné (pillar-page.tsx : toolbar, score, panneaux,
 * modals) ; ces primitives remplacent la grille générique AutoField par des
 * cartes bespoke adaptées à la forme de chaque champ.
 *
 * Data-driven : alimentées par `content` (Pillar.content) + `fieldCertainty`
 * (Pillar.fieldCertainty) du tRPC `pillar.get`. Aucune donnée inventée — un
 * champ vide reste VISIBLE avec un état « à saisir / à générer ».
 */

import type { ReactNode } from "react";

// ── Helpers ────────────────────────────────────────────────────────────

export type Rec = Record<string, unknown>;

export function isEmpty(v: unknown): boolean {
  return v == null || v === "" || (Array.isArray(v) && v.length === 0);
}

const STATUS_LABEL: Record<string, [string, string]> = {
  DECLARED: ["Déclaré", "ok"],
  INFERRED: ["Inféré", "orange"],
  CALCULATED: ["Calculé", "info"],
  EMPTY: ["À saisir", "muted"],
};

/** Resolve a field's certainty marker for a bare key, tolerating "a.key" form. */
export function makeStatusFor(certainty: Record<string, string> | null | undefined, pillarKey: string) {
  const fc = certainty ?? {};
  const prefix = `${pillarKey.toLowerCase()}.`;
  return (key: string): string | undefined => fc[key] ?? fc[`${prefix}${key}`];
}

export function asRec(v: unknown): Rec {
  return v && typeof v === "object" && !Array.isArray(v) ? (v as Rec) : {};
}
export function asArr(v: unknown): Rec[] {
  return Array.isArray(v) ? (v as Rec[]) : [];
}
export function str(v: unknown): string {
  if (v == null) return "";
  if (typeof v === "string") return v;
  if (typeof v === "number") return v.toLocaleString("fr-FR");
  if (typeof v === "boolean") return v ? "Oui" : "Non";
  if (Array.isArray(v)) return (v as unknown[]).map(str).filter(Boolean).join(", ");
  if (typeof v === "object") {
    const vals = Object.values(v as Record<string, unknown>);
    const first = vals.find((x): x is string => typeof x === "string" && x.length > 0);
    return first ?? vals.map(str).filter(Boolean).join(", ");
  }
  return String(v);
}

// ── Section ────────────────────────────────────────────────────────────

export function Section({ title, sub, children }: { title: string; sub?: string; children: ReactNode }) {
  return (
    <section className="ck-psec">
      <header className="ck-psec__head">
        <h2 className="ck-psec__title">{title}</h2>
        {sub ? <p className="ck-psec__sub">{sub}</p> : null}
      </header>
      {children}
    </section>
  );
}

// ── Status dot ─────────────────────────────────────────────────────────

export function StatusDot({ status, empty }: { status?: string; empty: boolean }) {
  const fallback: [string, string] = ["Déclaré", "ok"];
  const entry = (empty ? STATUS_LABEL.EMPTY : STATUS_LABEL[status ?? "DECLARED"]) ?? fallback;
  const [lbl, tone] = entry;
  return <span className="ck-fc__status" data-t={tone}>{lbl}</span>;
}

export function EmptyValue() {
  return <span className="ck-af__empty">à saisir</span>;
}

// ── Generic A-style card ───────────────────────────────────────────────

export function ACard({
  title, status, empty, span, accent, children,
}: { title: string; status?: string; empty: boolean; span?: boolean; accent?: boolean; children: ReactNode }) {
  return (
    <div className={`ck-a-card${span ? " ck-a-card--span" : ""}${accent ? " ck-a-card--accent" : ""}`}>
      <div className="ck-a-card__h">
        <span className="ck-a-card__t">{title}</span>
        <StatusDot status={status} empty={empty} />
      </div>
      <div className="ck-a-card__b">{children}</div>
    </div>
  );
}

export function EmptyBody({ verb = "À saisir" }: { verb?: string }) {
  return <div className="ck-a-empty">{verb} — ce champ alimentera le pilier à l&apos;enrichissement.</div>;
}

export function TagRow({ items, tone = "neutral" }: { items: unknown; tone?: string }) {
  if (isEmpty(items)) return <EmptyValue />;
  const arr = Array.isArray(items) ? items : [items];
  return (
    <div className="ck-fc__tags">
      {arr.map((x, i) => <span className="ck-fc__tag" data-tone={tone} key={i}>{str(x)}</span>)}
    </div>
  );
}

// ── Structured object → key/value rows ─────────────────────────────────

export function ObjCard({
  title, value, status, fields, span,
}: { title: string; value: unknown; status?: string; fields: Array<[string, string]>; span?: boolean }) {
  const empty = isEmpty(value);
  const obj = asRec(value);
  return (
    <ACard title={title} status={status} empty={empty} span={span}>
      {empty ? <EmptyBody verb="À générer" /> : (
        <div className="ck-a-obj">
          {fields.map(([k, label]) => {
            const val = obj[k];
            return (
              <div className="ck-a-obj__row" key={k}>
                <span className="ck-a-obj__k">{label}</span>
                <div className="ck-a-obj__v">
                  {isEmpty(val) ? <EmptyValue /> : Array.isArray(val) ? <TagRow items={val} /> : <span>{str(val)}</span>}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </ACard>
  );
}

// ── List of proofs (array of objects → columns) ────────────────────────

export function ProofList({
  title, items, status, cols,
}: { title: string; items: unknown; status?: string; cols: Array<[string, string]> }) {
  const empty = isEmpty(items);
  const arr = asArr(items);
  return (
    <ACard title={title + (empty ? "" : ` · ${arr.length}`)} status={status} empty={empty} span>
      {empty ? <EmptyBody verb="À générer" /> : (
        <div className="ck-a-proofs">
          {arr.map((it, i) => (
            <div className="ck-a-proof" key={i}>
              {cols.map(([k, label]) => (!isEmpty(it[k]) ? (
                <div className="ck-a-proof__cell" key={k}>
                  <span className="ck-a-proof__k">{label}</span>
                  <span className="ck-a-proof__v">{Array.isArray(it[k]) ? (it[k] as unknown[]).map(str).join(", ") : str(it[k])}</span>
                </div>
              ) : null))}
            </div>
          ))}
        </div>
      )}
    </ACard>
  );
}

// ── Metric cards ───────────────────────────────────────────────────────

export function MetricObj({
  title, value, status, fields,
}: { title: string; value: unknown; status?: string; fields: Array<[string, string]> }) {
  const empty = isEmpty(value);
  const obj = asRec(value);
  return (
    <ACard title={title} status={status} empty={empty}>
      {empty ? <EmptyBody /> : (
        <div className="ck-fc__kv">
          {fields.map(([k, label]) => (
            <div className="ck-fc__kv-row" key={k}>
              <span className="ck-fc__kv-k">{label}</span>
              <span className="ck-fc__kv-v">{isEmpty(obj[k]) ? <EmptyValue /> : str(obj[k])}</span>
            </div>
          ))}
        </div>
      )}
    </ACard>
  );
}

export function MetricNum({
  title, value, unit, status,
}: { title: string; value: unknown; unit?: string; status?: string }) {
  const empty = isEmpty(value);
  return (
    <ACard title={title} status={status} empty={empty}>
      {empty ? <EmptyBody /> : <span className="ck-a-num">{str(value)}{unit ? <i>{unit}</i> : null}</span>}
    </ACard>
  );
}
