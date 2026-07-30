"use client";

/**
 * LECTEUR DE SECTION ORACLE — ouvrir la boîte noire.
 *
 * ── Pourquoi ce composant existe ──
 *
 * Signalement opérateur (2026-07-30) : « *je ne peux pas consulter les sections
 * individuellement pour être sûr du contenu · c'est encore une boîte noire* ».
 *
 * Vérifié en base sur SPAWT : les 35 sections sont COMPLETE, chacune avec un
 * payload réel (~3 300 caractères en moyenne, 34 Ko pour la plus riche) —
 * ennemi désigné, ikigai, pricing en FCFA, moodboard. Le livrable payant était
 * intégralement rédigé, et **rien dans l'interface ne permettait de le lire**.
 * La procédure `oracle.getSection` existait côté serveur sans un seul appel
 * dans `src/app` ni `src/components`.
 *
 * ── Le parti pris de rendu ──
 *
 * Les 35 sections ont 35 formes différentes (un schéma Zod par runner). Écrire
 * 35 composants serait ingérable et se périmerait au premier schéma modifié.
 * Ce lecteur rend donc la forme RÉELLE du payload, récursivement, en
 * réutilisant les atomes déjà écrits et testés de `field-renderers.tsx`
 * (`getFieldLabel` traduit les clés techniques en libellés lisibles).
 *
 * Il ne masque rien et n'invente rien : ce qui est dans le payload est montré,
 * ce qui est vide est dit vide. Un rendu tronqué (profondeur, longueur) le
 * signale toujours — jamais de coupe silencieuse qui ferait croire à un
 * contenu plus court qu'il n'est.
 */

import { useState } from "react";
import { getFieldLabel } from "@/components/cockpit/field-renderers";

/** Profondeur maximale rendue — au-delà, on propose le JSON brut plutôt que de mentir. */
const MAX_DEPTH = 3;
/** Éléments de liste affichés avant troncature ANNONCÉE. */
const MAX_ITEMS = 20;

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === "object" && !Array.isArray(v);
}

/** Une valeur « vide » au sens du rapport : rien à lire, et on le dit. */
function isEmptyValue(v: unknown): boolean {
  if (v === null || v === undefined) return true;
  if (typeof v === "string") return v.trim() === "";
  if (Array.isArray(v)) return v.length === 0;
  if (isPlainObject(v)) return Object.keys(v).length === 0;
  return false;
}

function Scalar({ value }: { value: unknown }) {
  if (typeof value === "boolean") {
    return <span className="text-sm text-foreground">{value ? "oui" : "non"}</span>;
  }
  if (typeof value === "number") {
    return <span className="font-mono text-sm text-foreground">{new Intl.NumberFormat("fr-FR").format(value)}</span>;
  }
  const s = String(value);
  const isUrl = /^https?:\/\//i.test(s);
  if (isUrl) {
    return (
      <a
        href={s}
        target="_blank"
        rel="noreferrer"
        className="break-all text-sm text-[color:var(--color-accent)] underline-offset-2 hover:underline"
      >
        {s}
      </a>
    );
  }
  return <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">{s}</p>;
}

function EmptyMark({ label }: { label: string }) {
  return (
    <div className="flex items-baseline gap-2">
      <span className="text-2xs uppercase tracking-wide text-foreground-muted">{label}</span>
      <span className="text-xs italic text-foreground-muted">vide</span>
    </div>
  );
}

/** Rendu récursif d'une valeur de payload, borné et honnête sur ses limites. */
function Node({ label, value, depth }: { label: string; value: unknown; depth: number }) {
  if (isEmptyValue(value)) return <EmptyMark label={label} />;

  // Profondeur dépassée : on ne fabrique pas un rendu approximatif, on donne
  // la matière brute et on dit pourquoi.
  if (depth > MAX_DEPTH && (isPlainObject(value) || Array.isArray(value))) {
    return (
      <details className="rounded-md border border-border/60 p-2">
        <summary className="cursor-pointer text-2xs uppercase tracking-wide text-foreground-muted">
          {label} — structure profonde, afficher la donnée brute
        </summary>
        <pre className="mt-2 overflow-x-auto text-2xs text-foreground-secondary">
          {JSON.stringify(value, null, 2)}
        </pre>
      </details>
    );
  }

  if (Array.isArray(value)) {
    const shown = value.slice(0, MAX_ITEMS);
    return (
      <div className="flex flex-col gap-1.5">
        <p className="text-2xs font-semibold uppercase tracking-wide text-foreground-muted">
          {label} ({value.length})
        </p>
        <ul className="flex flex-col gap-2 border-l border-border pl-3">
          {shown.map((item, i) => (
            <li key={i}>
              {isPlainObject(item) || Array.isArray(item) ? (
                <Node label={`${i + 1}`} value={item} depth={depth + 1} />
              ) : (
                <Scalar value={item} />
              )}
            </li>
          ))}
        </ul>
        {value.length > shown.length ? (
          <p className="text-2xs text-foreground-muted">+{value.length - shown.length} autres non affichés</p>
        ) : null}
      </div>
    );
  }

  if (isPlainObject(value)) {
    return (
      <div className="flex flex-col gap-2">
        <p className="text-2xs font-semibold uppercase tracking-wide text-foreground-muted">{label}</p>
        <div className="flex flex-col gap-2.5 border-l border-border pl-3">
          {Object.entries(value).map(([k, v]) => (
            <Node key={k} label={getFieldLabel(k)} value={v} depth={depth + 1} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      <p className="text-2xs font-semibold uppercase tracking-wide text-foreground-muted">{label}</p>
      <Scalar value={value} />
    </div>
  );
}

export interface OracleSectionReaderProps {
  /** Libellé de section du registre (« 01 », « 12 ») — une étiquette, pas un entier. */
  sectionNumber: string | number;
  sectionTitle: string;
  payload: unknown;
  confidence?: number | null;
  generatedAt?: string | Date | null;
  /** État de chargement — le contenu arrive à la demande, pas avec la liste. */
  loading?: boolean;
}

/**
 * Corps du lecteur (le conteneur — modale ou panneau — est fourni par
 * l'appelant, qui possède déjà celui des échecs).
 */
export function OracleSectionReader({
  sectionNumber,
  sectionTitle,
  payload,
  confidence,
  generatedAt,
  loading,
}: OracleSectionReaderProps) {
  const [raw, setRaw] = useState(false);

  if (loading) {
    return <p className="py-8 text-center text-sm text-foreground-muted">Chargement du contenu…</p>;
  }

  if (isEmptyValue(payload)) {
    // Honnêteté : une section sans contenu le dit, elle n'affiche pas un
    // squelette qui ferait croire à de la matière.
    return (
      <p className="py-8 text-center text-sm text-foreground-muted">
        Cette section n&apos;a pas encore de contenu rédigé.
      </p>
    );
  }

  const entries = isPlainObject(payload) ? Object.entries(payload) : [];
  const sizeKb = Math.round((JSON.stringify(payload).length / 1024) * 10) / 10;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3">
        <div className="min-w-0">
          <p className="font-mono text-2xs uppercase tracking-widest text-[color:var(--color-accent)]">
            Section {sectionNumber}
          </p>
          <h3 className="truncate text-base font-semibold text-foreground">{sectionTitle}</h3>
        </div>
        <div className="flex shrink-0 items-center gap-3 text-2xs text-foreground-muted">
          <span>{sizeKb} Ko rédigés</span>
          {typeof confidence === "number" ? <span>confiance {Math.round(confidence * 100)} %</span> : null}
          {generatedAt ? (
            <span>{new Date(generatedAt).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" })}</span>
          ) : null}
          <button
            type="button"
            onClick={() => setRaw((r) => !r)}
            className="underline-offset-2 hover:underline"
          >
            {raw ? "vue lisible" : "donnée brute"}
          </button>
        </div>
      </div>

      {raw ? (
        <pre className="max-h-[60vh] overflow-auto rounded-md border border-border bg-surface-raised p-3 text-2xs text-foreground-secondary">
          {JSON.stringify(payload, null, 2)}
        </pre>
      ) : (
        <div className="flex max-h-[60vh] flex-col gap-4 overflow-y-auto pr-1">
          {entries.length > 0 ? (
            entries.map(([k, v]) => <Node key={k} label={getFieldLabel(k)} value={v} depth={1} />)
          ) : (
            <Node label="Contenu" value={payload} depth={1} />
          )}
        </div>
      )}
    </div>
  );
}
