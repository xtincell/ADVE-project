"use client";

/**
 * Vitrine visuelle du dashboard (mandat « plus vivant », 2026-07-12) :
 * carte « Campagne du moment » + bandeau des créations récentes de la marque.
 * Données réelles uniquement (campagnes du système, images de la forge,
 * actifs du coffre) — jamais de visuel de démonstration. Vide → EmptyState
 * honnête avec le geste qui remplit la carte.
 */
import Link from "next/link";
import { trpc } from "@/lib/trpc/client";
import { Megaphone, Images, ArrowRight } from "lucide-react";

const STATE_LABELS: Record<string, string> = {
  BRIEF_DRAFT: "Brief en cours",
  BRIEF_VALIDATED: "Brief validé",
  PLANNING: "Planification",
  CREATIVE_DEV: "Création en cours",
  PRE_PRODUCTION: "Pré-production",
  PRODUCTION: "Production",
  APPROVAL: "En validation",
  READY_TO_LAUNCH: "Prête au lancement",
  LIVE: "En cours",
  POST_CAMPAIGN: "Bilan en cours",
};

function fmtDate(iso: string | null): string | null {
  if (!iso) return null;
  try {
    return new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "long" });
  } catch {
    return null;
  }
}

export function CampaignShowcase({ strategyId }: { strategyId: string }) {
  const { data, isLoading } = trpc.cockpitDashboard.getCampaignShowcase.useQuery(
    { strategyId },
    { staleTime: 60_000 },
  );

  if (isLoading) {
    return (
      <div className="ck-grid ck-grid--2">
        <div className="ck-card ck-camp ck-camp--loading" aria-busy="true" />
        <div className="ck-card ck-camp ck-camp--loading" aria-busy="true" />
      </div>
    );
  }

  const campaign = data?.campaign ?? null;
  const visuals = data?.visuals ?? [];
  const hero = visuals[0] ?? null;
  const strip = hero ? visuals.slice(1, 7) : visuals.slice(0, 6);
  const until = fmtDate(campaign?.endDate ?? null);
  const from = fmtDate(campaign?.startDate ?? null);

  return (
    <div className="ck-grid ck-grid--2">
      {/* ── Campagne du moment ─────────────────────────────────── */}
      <div className="ck-card ck-camp" data-live={campaign?.state === "LIVE" ? 1 : 0}>
        <p className="ck-card__eyebrow"><Megaphone />Campagne du moment</p>
        {campaign ? (
          <div className="ck-camp__body">
            {hero ? (
              // eslint-disable-next-line @next/next/no-img-element -- visuel du coffre/forge (URL externe déjà validée http(s) côté serveur)
              <img className="ck-camp__visual" src={hero.url} alt={hero.label} />
            ) : (
              <div className="ck-camp__visual ck-camp__visual--empty" aria-hidden>
                <Megaphone />
              </div>
            )}
            <div className="ck-camp__meta">
              <p className="ck-camp__name">{campaign.name}</p>
              <p className="ck-camp__state">
                <span className="ck-camp__chip" data-health={campaign.healthSignal}>
                  {STATE_LABELS[campaign.state] ?? campaign.state}
                </span>
                {until ? <span className="ck-camp__dates">jusqu&apos;au {until}</span>
                  : from ? <span className="ck-camp__dates">depuis le {from}</span> : null}
              </p>
              <Link href="/cockpit/operate/campaigns" className="ck-card__link">
                Suivre la campagne <ArrowRight />
              </Link>
            </div>
          </div>
        ) : (
          <div className="ck-camp__empty">
            <p>Aucune campagne en cours.</p>
            <p className="ck-camp__empty-sub">
              Votre prochaine campagne apparaîtra ici avec son visuel clé dès son lancement.
            </p>
            <Link href="/cockpit/operate/campaigns" className="ck-card__link">Mes campagnes <ArrowRight /></Link>
          </div>
        )}
      </div>

      {/* ── Créations récentes ─────────────────────────────────── */}
      <div className="ck-card ck-camp">
        <p className="ck-card__eyebrow"><Images />Créations récentes</p>
        {strip.length > 0 ? (
          <div className="ck-gallery">
            {strip.map((v) => (
              // eslint-disable-next-line @next/next/no-img-element -- visuels du coffre/forge (URLs http(s) validées serveur)
              <img key={v.url} className="ck-gallery__thumb" src={v.url} alt={v.label} title={v.label} loading="lazy" />
            ))}
          </div>
        ) : (
          <div className="ck-camp__empty">
            <p>Pas encore de création visuelle.</p>
            <p className="ck-camp__empty-sub">
              Les visuels produits pour votre marque (affiches, visuels clés, déclinaisons)
              s&apos;afficheront ici au fil des productions.
            </p>
            <Link href="/cockpit/operate/forge" className="ck-card__link">Composer un livrable <ArrowRight /></Link>
          </div>
        )}
      </div>
    </div>
  );
}
