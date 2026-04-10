"use client";

import { trpc } from "@/lib/trpc/client";
import { PageHeader } from "@/components/shared/page-header";
import { ScoreBadge } from "@/components/shared/score-badge";
import { StatusBadge } from "@/components/shared/status-badge";
import { SkeletonPage } from "@/components/shared/loading-skeleton";
import { Sparkline } from "@/components/shared/sparkline";
import {
  Building2,
  Rocket,
  Users,
  DollarSign,
  ClipboardList,
  AlertTriangle,
  ArrowRight,
  Plus,
  Eye,
  Clock,
} from "lucide-react";
import Link from "next/link";

interface DivisionCard {
  title: string;
  division: string;
  colorVar: string;
  stats: { label: string; value: string | number }[];
  href: string;
}

export default function ConsoleDashboard() {
  const { data: strategies, isLoading: loadingStrategies } = trpc.strategy.list.useQuery({});
  const { data: missions, isLoading: loadingMissions } = trpc.mission.list.useQuery({ limit: 50 });
  const { data: guildStats, isLoading: loadingGuild } = trpc.guilde.getStats.useQuery();
  const { data: intakes } = trpc.quickIntake.listAll.useQuery({ limit: 50 });
  const { data: slaAlerts } = trpc.mission.checkSla.useQuery();
  const { data: commissions } = trpc.commission.list.useQuery({ limit: 50 });

  const isLoading = loadingStrategies || loadingMissions || loadingGuild;
  if (isLoading) return <SkeletonPage />;

  const activeStrategies = (strategies ?? []).filter((s) => s.status === "ACTIVE");
  const activeMissions = (missions ?? []).filter((m) => m.status === "IN_PROGRESS" || m.status === "DRAFT");
  const totalGuild = guildStats?.total ?? 0;
  const pendingCommissions = (commissions?.items ?? []).filter((c) => c.status === "PENDING");
  const totalOutstanding = pendingCommissions.reduce((sum, c) => sum + (c.commissionAmount ?? 0), 0);
  const intakeItems = intakes?.items ?? [];
  const intakeThisMonth = intakeItems.filter((i) => {
    const d = new Date(i.createdAt);
    const now = new Date();
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });

  const alerts: Array<{ severity: string; text: string; link: string }> = [];
  for (const a of (slaAlerts ?? []).slice(0, 3)) {
    alerts.push({
      severity: a.severity,
      text: `SLA ${a.severity}: ${a.title} (${a.strategyName}) - ${a.hoursRemaining}h restantes`,
      link: "/console/artemis/missions",
    });
  }
  for (const intake of intakeItems.filter((i) => i.status === "COMPLETED").slice(0, 2)) {
    alerts.push({
      severity: "success",
      text: `Quick Intake termine - ${intake.companyName}`,
      link: "/console/oracle/intake",
    });
  }

  const divisionCards: DivisionCard[] = [
    {
      title: "L'Oracle",
      division: "oracle",
      colorVar: "var(--color-division-oracle)",
      stats: [
        { label: "Clients actifs", value: activeStrategies.length },
        { label: "Intakes ce mois", value: intakeThisMonth.length },
      ],
      href: "/console/oracle/clients",
    },
    {
      title: "Mestor",
      division: "mestor",
      colorVar: "var(--color-division-mestor)",
      stats: [
        { label: "Plans actifs", value: "—" },
        { label: "Recos en attente", value: "—" },
      ],
      href: "/console/mestor",
    },
    {
      title: "Artemis",
      division: "artemis",
      colorVar: "var(--color-division-artemis)",
      stats: [
        { label: "Missions actives", value: activeMissions.length },
        { label: "SLA", value: `${(slaAlerts ?? []).length} alertes` },
      ],
      href: "/console/artemis",
    },
    {
      title: "Seshat",
      division: "seshat",
      colorVar: "var(--color-division-seshat)",
      stats: [
        { label: "Signaux", value: "—" },
        { label: "Alertes", value: alerts.length },
      ],
      href: "/console/seshat/intelligence",
    },
    {
      title: "L'Arene",
      division: "arene",
      colorVar: "var(--color-division-arene)",
      stats: [
        { label: "Creatifs", value: totalGuild },
        { label: "FPR moyen", value: `${(guildStats as Record<string, unknown>)?.avgFpr ?? 0}%` },
      ],
      href: "/console/arene/guild",
    },
    {
      title: "Le Socle",
      division: "socle",
      colorVar: "var(--color-division-socle)",
      stats: [
        { label: "Commissions", value: `${new Intl.NumberFormat("fr-FR").format(totalOutstanding)} XAF` },
        { label: "Operateurs", value: 1 },
      ],
      href: "/console/socle/revenue",
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Industry OS"
        description="Vue d'ensemble — NETERU (Mestor + Artemis + Seshat)"
      />

      {/* Division Cards Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {divisionCards.map((card) => (
          <Link
            key={card.division}
            href={card.href}
            className="group rounded-xl border bg-card p-4 transition-all hover:bg-card-hover"
            style={{ borderColor: `color-mix(in oklch, ${card.colorVar} 30%, transparent)` }}
          >
            <div className="mb-3 flex items-center gap-2">
              <div
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: card.colorVar }}
              />
              <h3 className="text-xs font-semibold uppercase tracking-wider" style={{ color: card.colorVar }}>
                {card.title}
              </h3>
            </div>
            {card.stats.map((stat) => (
              <div key={stat.label} className="flex items-baseline justify-between py-1">
                <span className="text-[11px] text-foreground-muted">{stat.label}</span>
                <span className="text-sm font-semibold text-foreground">{stat.value}</span>
              </div>
            ))}
            <div className="mt-2 flex items-center gap-1 text-[10px] text-foreground-muted opacity-0 transition-opacity group-hover:opacity-100">
              Voir details <ArrowRight className="h-3 w-3" />
            </div>
          </Link>
        ))}
      </div>

      {/* Alerts + Quick Actions */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Alerts */}
        <div className="rounded-xl border border-border bg-card p-6">
          <div className="mb-4 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-warning" />
            <h3 className="text-sm font-semibold text-foreground">Alertes & Actions</h3>
          </div>
          {alerts.length === 0 ? (
            <p className="text-sm text-foreground-muted">Aucune alerte active.</p>
          ) : (
            <ul className="space-y-3">
              {alerts.map((alert, i) => (
                <li key={i} className="flex items-start gap-3">
                  <span
                    className="mt-1.5 h-2 w-2 shrink-0 rounded-full"
                    style={{
                      backgroundColor:
                        alert.severity === "breached"
                          ? "var(--color-destructive)"
                          : alert.severity === "urgent"
                            ? "var(--color-warning)"
                            : alert.severity === "success"
                              ? "var(--color-success)"
                              : "var(--color-warning)",
                    }}
                  />
                  <div className="flex-1">
                    <p className="text-sm text-foreground-secondary">{alert.text}</p>
                    <Link href={alert.link} className="text-xs text-foreground-muted hover:text-foreground">
                      Voir details <ArrowRight className="inline h-3 w-3" />
                    </Link>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Quick Actions */}
        <div className="rounded-xl border border-border bg-card p-6">
          <h3 className="mb-4 text-sm font-semibold text-foreground">Actions rapides</h3>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {[
              { href: "/console/oracle/intake", icon: Plus, label: "Nouveau Client", sub: "Quick Intake", color: "var(--color-division-oracle)" },
              { href: "/console/artemis/skill-tree", icon: ClipboardList, label: "Skill Tree", sub: "40 sequences, 6 tiers", color: "var(--color-division-artemis)" },
              { href: "/console/artemis/missions", icon: Clock, label: "Missions SLA", sub: `${(slaAlerts ?? []).length} alertes`, color: "var(--color-division-artemis)" },
              { href: "/console/seshat/intelligence", icon: Eye, label: "Intelligence", sub: "Seshat + Tarsis", color: "var(--color-division-seshat)" },
            ].map((action) => (
              <Link
                key={action.href}
                href={action.href}
                className="flex items-center gap-3 rounded-lg border border-border-subtle p-3 transition-colors hover:border-border hover:bg-background-overlay/50"
              >
                <div className="rounded-lg p-2" style={{ backgroundColor: `color-mix(in oklch, ${action.color} 15%, transparent)` }}>
                  <action.icon className="h-4 w-4" style={{ color: action.color }} />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">{action.label}</p>
                  <p className="text-xs text-foreground-muted">{action.sub}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Pipeline Phase Distribution — industry health */}
      <div className="rounded-xl border border-violet-800/30 bg-violet-950/10 p-6">
        <div className="mb-4 flex items-center gap-2">
          <Rocket className="h-4 w-4 text-violet-400" />
          <h3 className="text-sm font-semibold text-foreground">Pipeline de transformation</h3>
          <span className="text-xs text-foreground-muted">({activeStrategies.length} marques actives)</span>
        </div>
        <div className="grid grid-cols-3 gap-4">
          {(() => {
            const allStrats = activeStrategies;
            // Count brands by pipeline phase based on which pillars have data
            const phaseCount = { adve: 0, rt: 0, is: 0 };
            for (const s of allStrats) {
              const v = s.advertis_vector as Record<string, number> | null;
              if (!v) { phaseCount.adve++; continue; }
              const hasADVE = (v.a ?? 0) > 0 && (v.d ?? 0) > 0 && (v.v ?? 0) > 0 && (v.e ?? 0) > 0;
              const hasRT = hasADVE && (v.r ?? 0) > 0 && (v.t ?? 0) > 0;
              if (hasRT) phaseCount.is++;
              else if (hasADVE) phaseCount.rt++;
              else phaseCount.adve++;
            }
            return [
              { label: "Phase 1 — ADVE", count: phaseCount.adve, desc: "Construction identite", color: "text-amber-400", bg: "bg-amber-500/10" },
              { label: "Phase 2 — R+T", count: phaseCount.rt, desc: "Diagnostic profond", color: "text-sky-400", bg: "bg-sky-500/10" },
              { label: "Phase 3 — I+S", count: phaseCount.is, desc: "Recommandations", color: "text-emerald-400", bg: "bg-emerald-500/10" },
            ].map((phase) => (
              <div key={phase.label} className={`rounded-lg ${phase.bg} p-4`}>
                <p className={`text-2xl font-black tabular-nums ${phase.color}`}>{phase.count}</p>
                <p className="text-xs font-semibold text-foreground">{phase.label}</p>
                <p className="text-[10px] text-foreground-muted">{phase.desc}</p>
              </div>
            ));
          })()}
        </div>
      </div>

      {/* Brand Instances */}
      <div className="rounded-xl border border-border bg-card p-6">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground">Brand Instances</h3>
          <Link href="/console/oracle/clients" className="text-xs text-foreground-muted hover:text-foreground">
            Voir tout <ArrowRight className="inline h-3 w-3" />
          </Link>
        </div>
        {activeStrategies.length === 0 ? (
          <p className="text-sm text-foreground-muted">Aucun client actif.</p>
        ) : (
          <div className="space-y-2">
            {activeStrategies.slice(0, 5).map((s) => {
              const v = s.advertis_vector as Record<string, number> | null;
              const composite = v ? ["a", "d", "v", "e", "r", "t", "i", "s"].reduce((sum, k) => sum + (v[k] ?? 0), 0) : 0;
              return (
                <div key={s.id} className="flex items-center justify-between rounded-lg border border-border-subtle p-3 transition-colors hover:bg-background-overlay/50">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground">{s.name}</p>
                    <p className="truncate text-xs text-foreground-muted">{s.description}</p>
                  </div>
                  <div className="ml-4 flex items-center gap-3">
                    <ScoreBadge score={composite} size="sm" showClassification={false} showRing={false} animated={false} />
                    <StatusBadge status={s.status ?? "draft"} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
