import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowLeft,
  Brain,
  Crosshair,
  ListChecks,
  Rocket,
  ShieldAlert,
  Target,
} from "lucide-react";
import { readSession } from "@/lib/session";
import { getBrandForSession, jsonRecord } from "@/server/brand";
import { isAdve, type PillarKey } from "@/domain/pillars";
import { PILLAR_LABELS } from "@/domain/pillar-fields";
import { composeRtisSynthese, type RtisPillarsContent } from "@/domain/rtis-synthese";
import { buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Synthèse RTIS" };

/** Chip pilier (A…S) — libellé complet en title. */
function PillarChip({ raw }: { raw: string }) {
  const key = (["A", "D", "V", "E", "R", "T", "I", "S"] as const).find((k) => k === raw);
  return (
    <span
      className="rounded-xs bg-white/6 px-1.5 py-0.5 font-mono text-[11px] font-bold text-sand"
      title={key ? PILLAR_LABELS[key] : raw}
    >
      {raw}
    </span>
  );
}

function SectionShell({
  icon,
  titre,
  source,
  children,
}: {
  icon: React.ReactNode;
  titre: string;
  source: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-lg border border-line bg-ink-2 p-6" aria-label={titre}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="flex items-center gap-2 font-display text-lg font-semibold text-bone [&_svg]:size-4.5 [&_svg]:text-coral">
          {icon}
          {titre}
        </h2>
        <span className="font-mono text-[11px] text-smoke-2">Source : {source}</span>
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function MissingNote({ children }: { children: React.ReactNode }) {
  return <p className="text-sm italic leading-relaxed text-smoke-2">{children}</p>;
}

/**
 * Synthèse RTIS — port de `legacy/(cockpit)/cockpit/brand/rtis/synthese` :
 * composition déterministe et lisible des 4 piliers dérivés (vision, axes,
 * sprint 90 jours, risques, réalité marché, potentiel). Chaque bloc cite sa
 * source pilier ; un bloc vide dit le manque, jamais un contenu de
 * remplacement (`domain/rtis-synthese`).
 */
export default async function RtisSynthesePage() {
  const session = await readSession();
  if (!session) redirect("/connexion?next=/app/rtis/synthese");

  const brand = await getBrandForSession(session);
  if (!brand) redirect("/app/rtis");

  const rtis: RtisPillarsContent = {};
  for (const pillar of brand.pillars) {
    if (!isAdve(pillar.key)) rtis[pillar.key as Exclude<PillarKey, "A" | "D" | "V" | "E">] =
      jsonRecord(pillar.content);
  }
  const synthese = composeRtisSynthese(rtis);

  if (!synthese.derived) {
    return (
      <div className="space-y-8">
        <div>
          <Link
            href="/app/rtis"
            className="inline-flex items-center gap-1.5 text-sm text-sand transition-colors hover:text-bone"
          >
            <ArrowLeft className="size-4" aria-hidden />
            Piliers dérivés
          </Link>
        </div>
        <header className="space-y-1">
          <p className="eyebrow text-coral">Espace marque</p>
          <h1 className="font-display text-3xl font-semibold">Synthèse RTIS</h1>
        </header>
        <EmptyState
          icon={<Brain />}
          title="Rien à synthétiser encore"
          description="La synthèse assemble les 4 piliers dérivés (R·T·I·S). Ils n'ont pas encore été dérivés depuis votre socle — lancez la dérivation d'abord."
        >
          <Link href="/app/rtis" className={buttonVariants({ variant: "primary", size: "md" })}>
            Aller à la dérivation
          </Link>
        </EmptyState>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <Link
          href="/app/rtis"
          className="inline-flex items-center gap-1.5 text-sm text-sand transition-colors hover:text-bone"
        >
          <ArrowLeft className="size-4" aria-hidden />
          Piliers dérivés
        </Link>
      </div>

      <header className="space-y-2">
        <p className="eyebrow text-coral">Espace marque</p>
        <h1 className="font-display text-3xl font-semibold">Synthèse RTIS — {brand.name}</h1>
        <p className="max-w-2xl text-sm text-sand">
          Lecture composée des 4 piliers dérivés. Assemblage déterministe de données réelles —
          les manques restent visibles, rien n&apos;est inventé pour les combler.
        </p>
      </header>

      {/* ── Vision stratégique (S) ────────────────────────────────────── */}
      <SectionShell icon={<Brain aria-hidden />} titre="Vision stratégique" source="S.visionStrategique">
        {synthese.vision ? (
          <p className="whitespace-pre-wrap text-[15px] leading-relaxed text-sand-2">
            {synthese.vision}
          </p>
        ) : (
          <MissingNote>
            Non dérivable depuis le socle actuel — la vision s&apos;assemble depuis la promesse
            fondamentale (A) et le positionnement (D). Complétez-les puis re-dérivez.
          </MissingNote>
        )}
        {synthese.strategieNote ? (
          <p className="mt-3 border-t border-line-soft pt-3 text-xs italic text-smoke-2">
            {synthese.strategieNote}
          </p>
        ) : null}
      </SectionShell>

      {/* ── Axes stratégiques (S) ─────────────────────────────────────── */}
      <SectionShell icon={<Target aria-hidden />} titre="Axes stratégiques" source="S.axesStrategiques">
        {synthese.axes.length > 0 ? (
          <div className="space-y-3">
            {synthese.axes.map((axe, i) => (
              <div
                key={`${i}-${axe.axe.slice(0, 24)}`}
                className="rounded-md border border-line-soft bg-ink-0/60 p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <p className="text-sm font-semibold leading-relaxed text-sand-2">{axe.axe}</p>
                  {axe.pillarsLinked.length > 0 ? (
                    <span className="flex gap-1">
                      {axe.pillarsLinked.map((p) => (
                        <PillarChip key={p} raw={p} />
                      ))}
                    </span>
                  ) : null}
                </div>
                {axe.kpis.length > 0 ? (
                  <p className="mt-2 flex flex-wrap gap-1.5">
                    {axe.kpis.map((kpi) => (
                      <span
                        key={kpi}
                        className="rounded-full bg-white/6 px-2.5 py-0.5 text-xs text-sand"
                      >
                        {kpi}
                      </span>
                    ))}
                  </p>
                ) : (
                  <p className="mt-2 text-xs italic text-smoke-2">
                    KPIs à poser par l&apos;opérateur — jamais dérivés mécaniquement.
                  </p>
                )}
              </div>
            ))}
          </div>
        ) : (
          <MissingNote>
            Aucun axe dérivable — les axes naissent des données déclarées (identité, offre,
            engagement). Complétez le socle puis re-dérivez.
          </MissingNote>
        )}
      </SectionShell>

      {/* ── Sprint 90 jours (S) ───────────────────────────────────────── */}
      <SectionShell icon={<Rocket aria-hidden />} titre="Sprint 90 jours" source="S.sprint90Days">
        {synthese.sprint.length > 0 ? (
          <ol className="space-y-2">
            {synthese.sprint.map((item, i) => (
              <li
                key={`${i}-${item.action.slice(0, 24)}`}
                className="flex items-start gap-3 rounded-md border border-line-soft bg-ink-0/60 p-3"
              >
                <span
                  className="flex size-6 shrink-0 items-center justify-center rounded-full bg-coral/15 font-mono text-xs font-bold text-coral"
                  aria-hidden
                >
                  {i + 1}
                </span>
                <div className="min-w-0 text-sm">
                  <p className="leading-relaxed text-sand-2">{item.action}</p>
                  <p className="mt-0.5 text-xs text-smoke-2">
                    {item.owner ? `Responsable : ${item.owner}` : null}
                    {item.owner && item.kpi ? " · " : null}
                    {item.kpi ? `KPI : ${item.kpi}` : null}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        ) : (
          <MissingNote>
            Aucune action de sprint — le sprint se dérive des manques du socle : un socle
            complet n&apos;en produit pas. Les actions de fond vivent dans le pilier Stratégie.
          </MissingNote>
        )}
      </SectionShell>

      {/* ── Risques (R) ───────────────────────────────────────────────── */}
      <SectionShell
        icon={<ShieldAlert aria-hidden />}
        titre="Risques & cohérence"
        source="R.globalSwot · R.coherenceRisks · R.mitigationPriorities"
      >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="rounded-md border border-line-soft bg-ink-0/60 p-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-success">
              Forces (déclarées)
            </h3>
            {synthese.risques.forces.length > 0 ? (
              <ul className="mt-2 space-y-1.5">
                {synthese.risques.forces.map((item) => (
                  <li key={item} className="text-sm leading-relaxed text-sand-2">
                    {item}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-sm italic text-smoke-2">
                Aucune décision structurante déclarée pour l&apos;instant.
              </p>
            )}
          </div>
          <div className="rounded-md border border-line-soft bg-ink-0/60 p-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-coral">
              Faiblesses (manques réels)
            </h3>
            {synthese.risques.faiblesses.length > 0 ? (
              <ul className="mt-2 space-y-1.5">
                {synthese.risques.faiblesses.map((item) => (
                  <li key={item} className="text-sm leading-relaxed text-sand-2">
                    {item}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-sm italic text-smoke-2">
                Aucun manque détecté sur les décisions humaines du socle.
              </p>
            )}
          </div>
        </div>
        {synthese.risques.swotNote ? (
          <p className="mt-3 text-xs italic text-smoke-2">{synthese.risques.swotNote}</p>
        ) : null}

        {synthese.risques.coherence.length > 0 ? (
          <div className="mt-4 space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-warning">
              Risques de cohérence détectés
            </h3>
            {synthese.risques.coherence.map((risk) => (
              <div
                key={risk.risk}
                className="rounded-md border border-warning/30 bg-warning/8 p-3 text-sm"
              >
                <p className="flex flex-wrap items-center gap-2 font-semibold text-bone">
                  <PillarChip raw={risk.pillars} />
                  {risk.risk}
                </p>
                <p className="mt-1 leading-relaxed text-sand">{risk.detail}</p>
              </div>
            ))}
          </div>
        ) : null}

        {synthese.risques.mitigations.length > 0 ? (
          <div className="mt-4 space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-sand">
              Priorités de mitigation
            </h3>
            <ol className="space-y-1.5">
              {synthese.risques.mitigations.map((item, i) => (
                <li key={`${i}-${item.action.slice(0, 24)}`} className="flex items-start gap-2 text-sm">
                  <span className="font-mono text-xs font-bold text-smoke-2">{i + 1}.</span>
                  <span className="leading-relaxed text-sand-2">
                    {item.action}
                    {item.owner ? (
                      <span className="text-smoke-2"> — {item.owner}</span>
                    ) : null}
                  </span>
                </li>
              ))}
            </ol>
          </div>
        ) : null}
      </SectionShell>

      {/* ── Réalité marché (T) ────────────────────────────────────────── */}
      <SectionShell icon={<Crosshair aria-hidden />} titre="Réalité marché" source="T.perceptionGap">
        <dl className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="rounded-md border border-line-soft bg-ink-0/60 p-4">
            <dt className="text-xs font-bold uppercase tracking-wider text-sand">
              Perception cible (dérivée du positionnement)
            </dt>
            <dd className="mt-2 text-sm leading-relaxed text-sand-2">
              {synthese.marche.targetPerception ?? (
                <span className="italic text-smoke-2">
                  Non dérivable — le positionnement (D) est vide.
                </span>
              )}
            </dd>
          </div>
          <div className="rounded-md border border-line-soft bg-ink-0/60 p-4">
            <dt className="text-xs font-bold uppercase tracking-wider text-sand">
              Perception actuelle (mesure terrain)
            </dt>
            <dd className="mt-2 text-sm leading-relaxed text-sand-2">
              {synthese.marche.currentPerception ?? (
                <span className="italic text-smoke-2">
                  Non mesurée — donnée marché réelle requise, jamais estimée à votre place.
                </span>
              )}
            </dd>
          </div>
        </dl>
        {synthese.marche.gapDescription ? (
          <p className="mt-3 text-sm leading-relaxed text-sand">{synthese.marche.gapDescription}</p>
        ) : null}
        {synthese.marche.note ? (
          <p className="mt-3 border-t border-line-soft pt-3 text-xs italic text-smoke-2">
            {synthese.marche.note}
          </p>
        ) : null}
      </SectionShell>

      {/* ── Potentiel d'action (I) ────────────────────────────────────── */}
      <SectionShell icon={<ListChecks aria-hidden />} titre="Potentiel d'action" source="I.catalogueParCanal">
        {synthese.potentiel.length > 0 ? (
          <div className="space-y-4">
            {synthese.potentiel.map((canal) => (
              <div key={canal.canal}>
                <h3 className="text-xs font-bold uppercase tracking-wider text-sand">
                  Canal : {canal.canal}
                </h3>
                <ul className="mt-2 space-y-1.5">
                  {canal.actions.map((action, i) => (
                    <li
                      key={`${i}-${action.action.slice(0, 24)}`}
                      className="rounded-md border border-line-soft bg-ink-0/60 p-3 text-sm"
                    >
                      <p className="leading-relaxed text-sand-2">{action.action}</p>
                      {action.source ? (
                        <p className="mt-1 font-mono text-[11px] text-smoke-2">
                          source : {action.source}
                        </p>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        ) : (
          <MissingNote>
            Aucune action dérivée — le catalogue naît des points de contact (E), personas (D)
            et de l&apos;identité (A) réellement déclarés.
          </MissingNote>
        )}
        {synthese.potentielNote ? (
          <p className="mt-3 border-t border-line-soft pt-3 text-xs italic text-smoke-2">
            {synthese.potentielNote}
          </p>
        ) : null}
      </SectionShell>

      <p className="text-xs text-smoke-2">
        Composition déterministe : mêmes piliers dérivés → même synthèse. Le détail champ par
        champ vit dans les piliers{" "}
        <Link href="/app/pilier/r" className="underline underline-offset-2 hover:text-bone">
          R
        </Link>
        ,{" "}
        <Link href="/app/pilier/t" className="underline underline-offset-2 hover:text-bone">
          T
        </Link>
        ,{" "}
        <Link href="/app/pilier/i" className="underline underline-offset-2 hover:text-bone">
          I
        </Link>{" "}
        et{" "}
        <Link href="/app/pilier/s" className="underline underline-offset-2 hover:text-bone">
          S
        </Link>
        .
      </p>
    </div>
  );
}
