"use client";

/**
 * Dashboard OPÉRATIONNEL — « ce qui se passe avec votre marque aujourd'hui »
 * (mandat opérateur 2026-07-12 : « un Dashboard stratégique et un Dashboard
 * opérationnel »). La vue du jour (campagne, activité, communauté, réseaux,
 * veille) au-dessus du pilotage détaillé existant (actions priorisées,
 * charge, budget — OperationsCenter, conservé tel quel : on étend, on ne
 * double pas).
 */
import Link from "next/link";
import { trpc } from "@/lib/trpc/client";
import { useCurrentStrategyId, useStrategy } from "@/components/cockpit/strategy-context";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Gauge, Compass } from "lucide-react";
import { OperationsDashboard } from "@/components/cockpit/operations-dashboard";
import OperationsCenter from "@/components/cockpit/operations-center";

export default function OperationsCenterPage() {
  const strategyId = useCurrentStrategyId();
  const { strategies } = useStrategy();
  const brandName = strategies.find((s) => s.id === strategyId)?.name;
  // Le pilotage détaillé (actions priorisées, charge d'équipe, budgets) est
  // une mécanique de production : opérateurs uniquement (lot 12) — la garde
  // de segment a été retirée pour ouvrir la vue du jour au founder.
  const canOperate = trpc.auth.me.useQuery().data?.canOperate ?? false;

  if (!strategyId) {
    return (
      <div className="container mx-auto px-4 py-8">
        <EmptyState
          icon={Gauge}
          title="Sélectionnez une marque"
          description="Choisissez une marque pour ouvrir son suivi opérationnel."
        />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      <PageHeader
        title="Suivi du jour"
        description={brandName ? `Ce qui se passe avec ${brandName} aujourd'hui.` : "Ce qui se passe avec votre marque aujourd'hui."}
        breadcrumbs={[
          { label: "Cockpit", href: "/cockpit" },
          { label: "Mon activité" },
          { label: "Suivi du jour" },
        ]}
      >
        <Link href="/cockpit" className="ck-dash-switch">
          <Compass />Vue stratégique
        </Link>
      </PageHeader>

      <OperationsDashboard strategyId={strategyId} />

      {/* Pilotage détaillé (actions priorisées · charge · budget) — production */}
      {canOperate ? (
        <OperationsCenter strategyId={strategyId} />
      ) : (
        <p className="ck-ops__note">
          Le pilotage détaillé (charge d&apos;équipe, budgets de production) est tenu
          par votre équipe — les résultats vous arrivent dans vos campagnes et
          votre calendrier.
        </p>
      )}
    </div>
  );
}
