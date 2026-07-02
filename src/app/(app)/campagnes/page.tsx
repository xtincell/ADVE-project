import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Megaphone, Rocket } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import {
  CampaignStatusBadge,
  DATE_FORMAT,
  formatAmount,
} from "@/components/campaigns/status";
import { costSummary, listCampaigns, listMarkets } from "@/server/campaigns";
import { NewCampaignForm } from "./new-campaign-form";
import { requireSessionAndBrand } from "./session-brand";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Campagnes" };

/**
 * /campagnes — le pipeline de production de la marque (WP-008, essence
 * ADR-0119/0120) : la campagne est le cadre, les actions lui appartiennent,
 * les briefs et missions en découlent gate par gate. Coûts affichés = lookup
 * référentiel marché ; trou de référentiel = « à estimer », jamais masqué.
 */
export default async function CampaignsPage() {
  const { brand } = await requireSessionAndBrand("/campagnes");

  if (!brand) {
    return (
      <div className="space-y-8">
        <header className="space-y-1">
          <p className="eyebrow text-coral">Production</p>
          <h1 className="font-display text-3xl font-semibold">Campagnes</h1>
        </header>
        <EmptyState
          icon={<Rocket />}
          title="Aucune marque dans cet espace"
          description="Les campagnes se construisent sur le socle d'une marque. Commencez par le diagnostic gratuit — il crée votre marque et ses piliers ADVE."
        >
          <Link href="/intake" className={buttonVariants({ variant: "primary", size: "md" })}>
            Commencer le diagnostic
          </Link>
        </EmptyState>
      </div>
    );
  }

  const [campaigns, markets] = await Promise.all([listCampaigns(brand.id), listMarkets()]);

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-1">
          <p className="eyebrow text-coral">Production</p>
          <h1 className="font-display text-3xl font-semibold">Campagnes</h1>
          <p className="max-w-2xl text-sm leading-relaxed text-sand">
            Le circuit de production de {brand.name} : une campagne pose le cadre (objectif,
            marché), ses actions sont chiffrées depuis le référentiel marché, chaque brief validé
            s&apos;éclate en missions.
          </p>
        </div>
        <NewCampaignForm
          markets={markets.map((m) => ({ code: m.code, name: m.name, currency: m.currency }))}
        />
      </header>

      {campaigns.length === 0 ? (
        <EmptyState
          icon={<Megaphone />}
          title="Aucune campagne"
          description="Créez votre première campagne : nom, objectif, marché. Les actions de production, leurs briefs et leurs missions se construisent ensuite, gate par gate."
        />
      ) : (
        <div className="grid gap-bento md:grid-cols-2">
          {campaigns.map((campaign) => {
            const costs = costSummary(campaign.actions);
            const actionCount = campaign.actions.filter((a) => a.status !== "CANCELLED").length;
            return (
              <Link
                key={campaign.id}
                href={`/campagnes/${campaign.id}`}
                className="group rounded-lg border border-line bg-ink-2 p-6 transition-colors hover:border-coral/50"
              >
                <div className="flex items-start justify-between gap-3">
                  <h2 className="min-w-0 truncate font-display text-lg font-semibold text-bone">
                    {campaign.name}
                  </h2>
                  <CampaignStatusBadge status={campaign.status} />
                </div>
                <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-sand">
                  {campaign.objective}
                </p>
                <dl className="mt-4 grid grid-cols-3 gap-3 border-t border-line-soft pt-4 text-sm">
                  <div>
                    <dt className="text-[11px] font-bold uppercase tracking-wider text-smoke-2">
                      Marché
                    </dt>
                    <dd className="mt-0.5 text-sand-2">{campaign.country.name}</dd>
                  </div>
                  <div>
                    <dt className="text-[11px] font-bold uppercase tracking-wider text-smoke-2">
                      Actions
                    </dt>
                    <dd className="mt-0.5 text-sand-2">{actionCount}</dd>
                  </div>
                  <div>
                    <dt className="text-[11px] font-bold uppercase tracking-wider text-smoke-2">
                      Budget estimé
                    </dt>
                    <dd className="mt-0.5 text-sand-2">
                      {costs.total > 0 ? formatAmount(costs.total, costs.currency) : "—"}
                      {costs.unestimated > 0 ? (
                        <span className="block text-xs text-coral">
                          {costs.unestimated} action{costs.unestimated > 1 ? "s" : ""} à estimer
                        </span>
                      ) : null}
                    </dd>
                  </div>
                </dl>
                <p className="mt-4 flex items-center gap-1.5 font-mono text-[11px] text-smoke-2">
                  créée le {DATE_FORMAT.format(campaign.createdAt)}
                  <ArrowRight
                    className="ml-auto size-3.5 text-coral opacity-0 transition-opacity group-hover:opacity-100"
                    aria-hidden
                  />
                </p>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
