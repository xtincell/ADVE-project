import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, GitBranch, TriangleAlert } from "lucide-react";
import { readSession } from "@/lib/session";
import { adveIsEmpty, brandPillarsContent, getBrandForSession, jsonRecord } from "@/server/brand";
import { isAdve, RTIS_PILLARS, type RtisPillarKey } from "@/domain/pillars";
import { getFieldDef, PILLAR_FIELDS, PILLAR_LABELS } from "@/domain/pillar-fields";
import { scorePillarContent } from "@/domain/scoring";
import { buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { ActionForm } from "@/components/pillars/action-form";
import { ScoreBar } from "@/components/pillars/score-bar";
import { deriveRtisAction } from "../actions";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "RTIS" };

const DATE_FORMAT = new Intl.DateTimeFormat("fr-FR", {
  day: "numeric",
  month: "long",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

/** Descriptions FR des 4 dérivés (port du registre RTIS_META legacy). */
const RTIS_DESCRIPTIONS: Record<RtisPillarKey, string> = {
  R: "Diagnostic des risques et vulnérabilités du socle : manques, incohérences cross-pilier.",
  T: "Confrontation à la réalité marché : perception, écart, taille — rien n'est estimé à votre place.",
  I: "Le potentiel d'action de la marque, dérivé de données réelles du socle.",
  S: "La synthèse stratégique : vision, axes, sprint 90 jours vers le superfan.",
};

/**
 * Libellé lisible d'une référence de provenance `_derivedFrom` :
 * « A » → « A · Authenticité » ; « D.positionnement » → « D · Positionnement ».
 */
function provenanceLabel(ref: string): string {
  const [pillarRaw, fieldId] = ref.split(".");
  const pillar = (["A", "D", "V", "E", "R", "T", "I", "S"] as const).find(
    (k) => k === pillarRaw,
  );
  if (!pillar) return ref;
  if (!fieldId) return `${pillar} · ${PILLAR_LABELS[pillar]}`;
  const field = getFieldDef(pillar, fieldId);
  return `${pillar} · ${field?.label ?? fieldId}`;
}

/** Les refs de provenance réellement écrites par la dérivation (métadonnées). */
function derivedFromRefs(content: Record<string, unknown>): string[] {
  const raw = content["_derivedFrom"];
  if (!Array.isArray(raw)) return [];
  return raw.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
}

/**
 * RTIS — port de `legacy/(cockpit)/cockpit/brand/rtis` sur les données v7 :
 * les 4 piliers dérivés (R·T·I·S), leur provenance réelle (métadonnées
 * `_derivedFrom` écrites par la dérivation déterministe), leur fraîcheur vs
 * le socle, et la re-dérivation (action existante — la seule écriture, ailleurs).
 */
export default async function RtisPage() {
  const session = await readSession();
  if (!session) redirect("/connexion?next=/app/rtis");

  const brand = await getBrandForSession(session);
  if (!brand) {
    return (
      <div className="space-y-8">
        <header className="space-y-1">
          <p className="eyebrow text-coral">Espace marque</p>
          <h1 className="font-display text-3xl font-semibold">Piliers dérivés — RTIS</h1>
        </header>
        <EmptyState
          icon={<GitBranch />}
          title="Aucune marque dans cet espace"
          description="Les piliers RTIS se dérivent du socle ADVE d'une marque — commencez par le diagnostic gratuit."
        >
          <Link href="/intake" className={buttonVariants({ variant: "primary", size: "md" })}>
            Commencer le diagnostic
          </Link>
        </EmptyState>
      </div>
    );
  }

  const content = brandPillarsContent(brand.pillars);
  const socleEmpty = adveIsEmpty(content);
  const rtisRows = brand.pillars.filter((p) => !isAdve(p.key));
  const derivedOnce = rtisRows.length > 0;

  // Fraîcheur : un dérivé est en retard si un pilier ADVE a bougé après lui.
  const latestAdveUpdate = brand.pillars
    .filter((p) => isAdve(p.key))
    .reduce<Date | null>(
      (max, p) => (max === null || p.updatedAt.getTime() > max.getTime() ? p.updatedAt : max),
      null,
    );
  const staleKeys = latestAdveUpdate
    ? rtisRows
        .filter((p) => p.updatedAt.getTime() < latestAdveUpdate.getTime())
        .map((p) => p.key)
    : [];

  return (
    <div className="space-y-8">
      <header className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="space-y-2">
            <p className="eyebrow text-coral">Espace marque</p>
            <h1 className="font-display text-3xl font-semibold">Piliers dérivés — RTIS</h1>
            <p className="max-w-2xl text-sm text-sand">
              R·T·I·S sont calculés depuis votre socle A·D·V·E par une dérivation 100 %
              déterministe — jamais édités à la main. Pour les faire évoluer : modifiez le
              socle, puis re-dérivez.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {derivedOnce ? (
              <Link
                href="/app/rtis/synthese"
                className={buttonVariants({ variant: "outline", size: "sm" })}
              >
                Lire la synthèse
                <ArrowRight aria-hidden />
              </Link>
            ) : null}
            <ActionForm
              action={deriveRtisAction}
              label={derivedOnce ? "Re-dériver depuis le socle" : "Dériver depuis le socle"}
              pendingLabel="Dérivation…"
              disabled={socleEmpty}
              hint={
                socleEmpty
                  ? "Le socle ADVE est vide — complétez au moins un champ avant de dériver."
                  : undefined
              }
              size="sm"
            />
          </div>
        </div>

        {staleKeys.length > 0 ? (
          <div className="flex items-start gap-3 rounded-lg border border-warning/40 bg-warning/10 p-4">
            <TriangleAlert className="mt-0.5 size-5 shrink-0 text-warning" aria-hidden />
            <div className="text-sm">
              <p className="font-semibold text-bone">Dérivés en retard sur le socle.</p>
              <p className="text-sand">
                Le socle ADVE a été modifié après la dernière dérivation de{" "}
                {staleKeys.map((k) => PILLAR_LABELS[k]).join(", ")} — re-dérivez pour
                resynchroniser.
              </p>
            </div>
          </div>
        ) : null}
      </header>

      {!derivedOnce ? (
        <EmptyState
          icon={<GitBranch />}
          title="Les piliers RTIS n'ont pas encore été dérivés"
          description={
            socleEmpty
              ? "Le socle ADVE est vide — rien ne se dérive de rien. Complétez d'abord vos piliers Authenticité, Distinction, Valeur ou Engagement."
              : "Lancez la dérivation : diagnostic des risques (R), confrontation marché (T), potentiel d'action (I) et synthèse stratégique (S) seront calculés depuis votre socle réel."
          }
        >
          {socleEmpty ? (
            <Link href="/app" className={buttonVariants({ variant: "outline", size: "md" })}>
              Compléter le socle
            </Link>
          ) : (
            <ActionForm
              action={deriveRtisAction}
              label="Dériver RTIS depuis le socle"
              pendingLabel="Dérivation…"
            />
          )}
        </EmptyState>
      ) : (
        <section
          className="grid grid-cols-1 gap-bento md:grid-cols-2"
          aria-label="Les 4 piliers dérivés"
        >
          {RTIS_PILLARS.map((key) => {
            const row = rtisRows.find((p) => p.key === key) ?? null;
            const pillarContent = jsonRecord(row?.content);
            const fields = PILLAR_FIELDS[key];
            const pillarScore = scorePillarContent(pillarContent, fields);
            const provenance = derivedFromRefs(pillarContent);
            const note = typeof pillarContent["note"] === "string" ? pillarContent["note"] : null;
            const stale = staleKeys.includes(key);

            return (
              <article
                key={key}
                className="flex flex-col gap-4 rounded-lg border border-dashed border-line bg-ink-0/70 p-5"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span
                      className="flex size-9 items-center justify-center rounded-sm bg-white/6 font-mono text-sm font-bold text-sand-2"
                      aria-hidden
                    >
                      {key}
                    </span>
                    <div>
                      <h2 className="font-display text-lg font-semibold text-bone">
                        {PILLAR_LABELS[key]}
                      </h2>
                      <p className="text-xs text-smoke-2">
                        {row
                          ? `v${row.version} · dérivé le ${DATE_FORMAT.format(row.updatedAt)}`
                          : "jamais dérivé"}
                      </p>
                    </div>
                  </div>
                  {stale ? (
                    <span
                      className="inline-flex items-center gap-1 rounded-xs bg-warning/15 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider text-warning"
                      title="Le socle a été modifié après cette dérivation"
                    >
                      En retard
                    </span>
                  ) : null}
                </div>

                <p className="text-sm leading-relaxed text-sand">{RTIS_DESCRIPTIONS[key]}</p>

                <div className="space-y-1.5">
                  <div className="flex items-baseline justify-between gap-3 text-sm">
                    <span className="text-sand">
                      {pillarScore.filled.length}/{fields.length} champs dérivés
                    </span>
                    <span className="font-mono font-bold text-bone">
                      {pillarScore.score}
                      <span className="text-xs font-medium text-smoke-2"> /100</span>
                    </span>
                  </div>
                  <ScoreBar
                    value={pillarScore.score}
                    max={100}
                    size="sm"
                    label={`Score du pilier ${PILLAR_LABELS[key]}`}
                  />
                </div>

                {/* Provenance réelle — métadonnées écrites par la dérivation. */}
                <div className="space-y-1.5">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-smoke-2">
                    Dérivé de
                  </p>
                  {provenance.length > 0 ? (
                    <p className="flex flex-wrap gap-1.5">
                      {provenance.map((ref) => (
                        <span
                          key={ref}
                          className="rounded-xs bg-white/6 px-2 py-0.5 font-mono text-[11px] text-sand"
                          title={ref}
                        >
                          {provenanceLabel(ref)}
                        </span>
                      ))}
                    </p>
                  ) : (
                    <p className="text-xs italic text-smoke-2">
                      Provenance non enregistrée pour cette version — re-dérivez pour la tracer.
                    </p>
                  )}
                </div>

                {note ? (
                  <p className="border-t border-line-soft pt-3 text-xs italic leading-relaxed text-smoke-2">
                    Note de dérivation : {note}
                  </p>
                ) : null}

                <div className="mt-auto pt-1">
                  <Link
                    href={`/app/pilier/${key.toLowerCase()}`}
                    className="inline-flex items-center gap-1.5 text-sm text-sand underline-offset-2 transition-colors hover:text-bone hover:underline"
                  >
                    Ouvrir le pilier
                    <ArrowRight className="size-4" aria-hidden />
                  </Link>
                </div>
              </article>
            );
          })}
        </section>
      )}

      <p className="text-xs text-smoke-2">
        Dérivation déterministe : même socle → mêmes dérivés, à l&apos;octet près. Chaque champ
        dérivé est marqué « à valider » (INFERRED) — on ne certifie jamais une donnée calculée
        à la place de l&apos;humain.
      </p>
    </div>
  );
}
