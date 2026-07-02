import Link from "next/link";
import { redirect } from "next/navigation";
import { Layers, PenLine } from "lucide-react";
import { readSession } from "@/lib/session";
import { getBrandForSession, jsonRecord } from "@/server/brand";
import { PILLAR_LABELS } from "@/domain/pillar-fields";
import {
  resolveThemeField,
  THEME_VIEWS,
  themeFieldRefs,
  type ThemeViewId,
} from "@/domain/pillar-views";
import { isFilled } from "@/domain/scoring";
import { renderValue } from "@/domain/oracle";
import { buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { CertaintyBadge } from "@/components/pillars/certainty-badge";
import { fieldStatus } from "@/components/pillars/certainty";
import { ScoreBar } from "@/components/pillars/score-bar";

/**
 * Écran partagé des vues éditoriales par thème (/app/positionnement,
 * /app/proposition, /app/offre) — port de l'esprit des pages legacy
 * positioning / proposition / offer. Ce sont des VUES : chaque carte lit un
 * champ RÉEL des piliers existants (mapping pur `domain/pillar-views`) et
 * renvoie vers l'éditeur du pilier. Zéro donnée nouvelle, zéro écriture ici.
 *
 * Pas un route segment (fichier ≠ page.tsx) : composant serveur partagé,
 * colocalisé dans le périmètre du cockpit marque.
 */
export async function ThemeViewScreen({ viewId }: { viewId: ThemeViewId }) {
  const view = THEME_VIEWS[viewId];

  const session = await readSession();
  if (!session) redirect(`/connexion?next=/app/${viewId}`);

  const brand = await getBrandForSession(session);
  if (!brand) {
    return (
      <div className="space-y-8">
        <header className="space-y-1">
          <p className="eyebrow text-coral">Vue marque</p>
          <h1 className="font-display text-3xl font-semibold">{view.titre}</h1>
        </header>
        <EmptyState
          icon={<Layers />}
          title="Aucune marque dans cet espace"
          description="Cette vue regroupe des champs de vos piliers — commencez par le diagnostic gratuit pour poser le socle ADVE."
        >
          <Link href="/intake" className={buttonVariants({ variant: "primary", size: "md" })}>
            Commencer le diagnostic
          </Link>
        </EmptyState>
      </div>
    );
  }

  // Contenus + certitudes par pilier (une seule passe).
  const contentByKey = new Map(brand.pillars.map((p) => [p.key, jsonRecord(p.content)]));
  const certaintyByKey = new Map(brand.pillars.map((p) => [p.key, jsonRecord(p.certainty)]));

  const refs = themeFieldRefs(view);
  const filledCount = refs.filter((ref) =>
    isFilled(contentByKey.get(ref.pillar)?.[ref.fieldId]),
  ).length;

  // Piliers réellement mobilisés par la vue (pour la légende).
  const pillarsUsed = [...new Set(refs.map((ref) => ref.pillar))];

  return (
    <div className="space-y-10">
      <header className="space-y-4">
        <div className="space-y-2">
          <p className="eyebrow text-coral">Vue marque</p>
          <h1 className="font-display text-3xl font-semibold">{view.titre}</h1>
          <p className="max-w-2xl text-sm text-sand">{view.question}</p>
        </div>
        <div className="max-w-xl space-y-2">
          <div className="flex items-baseline justify-between gap-4 text-sm">
            <span className="text-sand">
              Vue composée des piliers{" "}
              {pillarsUsed.map((k) => `${PILLAR_LABELS[k]} (${k})`).join(", ")}
            </span>
            <span className="shrink-0 font-mono font-bold text-bone">
              {filledCount}
              <span className="text-xs font-medium text-smoke-2"> /{refs.length} champs</span>
            </span>
          </div>
          <ScoreBar
            value={filledCount}
            max={refs.length}
            size="sm"
            label={`Complétion de la vue ${view.titre}`}
          />
          <p className="text-xs text-smoke-2">
            Une vue, pas une donnée : chaque carte lit un champ réel d&apos;un pilier —
            l&apos;édition se fait dans le pilier, jamais ici.
          </p>
        </div>
      </header>

      {view.groups.map((group) => (
        <section key={group.titre} className="space-y-4" aria-label={group.titre}>
          <div>
            <h2 className="font-display text-xl font-semibold">{group.titre}</h2>
            <p className="text-sm text-sand">{group.intent}</p>
          </div>
          <div className="grid grid-cols-1 gap-bento lg:grid-cols-2">
            {group.fields.map((ref) => {
              const field = resolveThemeField(ref);
              if (!field) return null; // impossible par tests — jamais de carte fantôme
              const content = contentByKey.get(ref.pillar) ?? {};
              const certainty = certaintyByKey.get(ref.pillar) ?? {};
              const value = content[field.id];
              const rendered = isFilled(value) ? renderValue(value, 600) : null;
              const status = fieldStatus(content, certainty, field.id);

              return (
                <article
                  key={`${ref.pillar}.${ref.fieldId}`}
                  className="flex flex-col gap-3 rounded-lg border border-line bg-ink-2 p-5"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className="rounded-xs bg-white/6 px-1.5 py-0.5 font-mono text-[11px] font-bold text-sand"
                      title={`Pilier ${PILLAR_LABELS[ref.pillar]}`}
                    >
                      {ref.pillar}
                    </span>
                    <h3 className="font-display text-base font-semibold text-bone">
                      {field.label}
                    </h3>
                    <CertaintyBadge status={status} className="ml-auto" />
                  </div>
                  <p className="text-sm text-smoke-2">{field.description}</p>
                  {rendered ? (
                    <p className="whitespace-pre-wrap text-[15px] leading-relaxed text-sand-2">
                      {rendered}
                    </p>
                  ) : (
                    <p className="text-sm italic text-smoke-2">
                      Vide — {field.needsHuman ? "décision à déclarer" : "à formuler"} dans le
                      pilier {PILLAR_LABELS[ref.pillar]}.
                    </p>
                  )}
                  <div className="mt-auto border-t border-line-soft pt-3">
                    <Link
                      href={`/app/pilier/${ref.pillar.toLowerCase()}`}
                      className="inline-flex items-center gap-1.5 text-sm text-sand underline-offset-2 transition-colors hover:text-bone hover:underline"
                    >
                      <PenLine className="size-4" aria-hidden />
                      Modifier dans le pilier {PILLAR_LABELS[ref.pillar]}
                    </Link>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
