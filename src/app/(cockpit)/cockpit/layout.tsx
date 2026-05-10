"use client";

import { AppShell, cockpitNavGroups } from "@/components/navigation";
import { Sparkles } from "lucide-react";
import { StrategyProvider, useStrategy } from "@/components/cockpit/strategy-context";
import { StrategySelector } from "@/components/cockpit/strategy-selector";
import { PortalWelcome } from "@/components/shared/portal-welcome";
import { PortalTourHost } from "@/components/shared/portal-tour";
import { NotoriaStatusDock } from "@/components/cockpit/notoria/notoria-status-dock";

function CockpitSidebarHeader() {
  const { strategies, strategyId } = useStrategy();
  const current = strategies.find((s) => s.id === strategyId);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary-subtle">
          <Sparkles className="h-3.5 w-3.5 text-primary" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-bold text-foreground">Brand OS</p>
          {current && (
            <p className="truncate text-[11px] text-muted-foreground">{current.name}</p>
          )}
        </div>
      </div>
      <StrategySelector />
    </div>
  );
}

export default function CockpitLayout({ children }: { children: React.ReactNode }) {
  return (
    <div data-density="comfortable" data-portal="cockpit" className="contents">
      <StrategyProvider>
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
