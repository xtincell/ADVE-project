"use client";

import { AppShell, cockpitNavGroups } from "@/components/navigation";
import { Sparkles } from "lucide-react";
import { trpc } from "@/lib/trpc/client";
import { StrategyProvider, useStrategy } from "@/components/cockpit/strategy-context";
import { StrategySelector } from "@/components/cockpit/strategy-selector";
import { BrandAccentVars } from "@/components/cockpit/brand-theme";
import { CockpitThemeToggle } from "@/components/cockpit/theme-toggle";
import { PortalWelcome } from "@/components/shared/portal-welcome";
import { PortalTourHost } from "@/components/shared/portal-tour";
import { NotoriaStatusDock } from "@/components/cockpit/notoria/notoria-status-dock";

function CockpitSidebarHeader() {
  const { strategies, strategyId } = useStrategy();
  const current = strategies.find((s) => s.id === strategyId);
  // Le portail porte le visage de la marque active (mandat « le cockpit doit
  // refléter la marque ») : logo du coffre en tête de sidebar quand il existe.
  const identity = trpc.cockpitDashboard.getBrandIdentity.useQuery(
    { strategyId: strategyId ?? "" },
    { enabled: !!strategyId, staleTime: 300_000 },
  ).data;
  // ADR-0131 — un collaborateur délégué sait d'un coup d'œil sous quel
  // métier il opère (une ligne discrète, pas une bannière).
  const myAccess = trpc.strategy.getMyAccess.useQuery(
    { strategyId: strategyId ?? "" },
    { enabled: !!strategyId, staleTime: 300_000 },
  ).data;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        {identity?.logo ? (
          // eslint-disable-next-line @next/next/no-img-element -- logo du coffre (URL http(s) validée côté vault)
          <img className="ck-side-logo" src={identity.logo.url} alt={`Logo ${identity.brandName}`} />
        ) : (
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary-subtle">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold text-foreground">{current?.name ?? "Brand OS"}</p>
          <p className="truncate text-2xs text-muted-foreground">
            {myAccess?.access === "collaborator" && myAccess.roleLabel
              ? `Accès délégué — ${myAccess.roleLabel}`
              : current ? "Brand OS" : ""}
          </p>
        </div>
        <CockpitThemeToggle />
      </div>
      <StrategySelector />
    </div>
  );
}

export default function CockpitLayout({ children }: { children: React.ReactNode }) {
  return (
    <div data-density="comfortable" data-portal="cockpit" className="contents">
      <StrategyProvider>
        {/* ADR-0130 — le cockpit puise dans le code couleur de la marque active. */}
        <BrandAccentVars />
        <AppShell
          portal="cockpit"
          navGroups={cockpitNavGroups}
          portalAccentVar="var(--color-portal-cockpit)"
          sidebarHeader={<CockpitSidebarHeader />}
        >
          {children}
        </AppShell>
        <PortalWelcome portal="cockpit" />
        <PortalTourHost portal="cockpit" />
        {/* Persistent Notoria status — visible on every cockpit page so the
            operator always knows the engine state (pillar maturity + pending
            recos + next pipeline step). Source: notoria.getDashboard via
            getStrategyReadiness (governance layer). */}
        <NotoriaStatusDock />
      </StrategyProvider>
    </div>
  );
}
