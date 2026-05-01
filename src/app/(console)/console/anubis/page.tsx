"use client";

import { trpc } from "@/lib/trpc/client";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { SkeletonPage } from "@/components/shared/loading-skeleton";
import {
  Megaphone,
  Send,
  Calendar,
  Key,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import Link from "next/link";

export default function AnubisDashboardPage() {
  const { data, isLoading } = trpc.anubis.dashboard.useQuery();

  if (isLoading) return <SkeletonPage />;

  const credCoverage =
    data && data.registeredCredentials > 0
      ? Math.round((data.activeCredentials / data.registeredCredentials) * 100)
      : 0;

  const sections = [
    {
      href: "/console/anubis/credentials",
      label: "Credentials Center",
      desc: "Configure ad networks (Meta/Google/X/TikTok) + Mailgun + Twilio. Pattern ADR-0021.",
      icon: Key,
    },
    {
      href: "/console/messages",
      label: "Notification Center",
      desc: "Notifications in-app persistantes (model Notification)",
      icon: Send,
    },
    {
      href: "/console/artemis/social",
      label: "Social Broadcast",
      desc: "Push social via canaux configurés",
      icon: Megaphone,
    },
    {
      href: "/console/artemis/media",
      label: "Media Buying",
      desc: "Ad inventory orchestration via providers",
      icon: Calendar,
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Anubis"
        description="7ème Neter — Comms (Ground Tier #7). Master of broadcast multi-canal, ad networks, notification center, Credentials Vault. Cap APOGEE 7/7 atteint."
        breadcrumbs={[{ label: "Console", href: "/console" }, { label: "Anubis" }]}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard title="Plans actifs" value={data?.activePlans ?? "—"} icon={Megaphone} />
        <StatCard title="Jobs queued" value={data?.queuedJobs ?? "—"} icon={Send} />
        <StatCard title="Envois 30j" value={data?.sentLast30d ?? "—"} icon={Calendar} />
        <StatCard
          title="Credentials"
          value={`${data?.activeCredentials ?? 0} / ${data?.registeredCredentials ?? 0}`}
          icon={Key}
        />
        <StatCard
          title="Couverture"
          value={`${credCoverage}%`}
          icon={credCoverage === 100 ? CheckCircle2 : AlertTriangle}
        />
      </div>

      {data && data.activeCredentials < data.registeredCredentials && (
        <div className="rounded-xl border border-warning bg-warning-subtle p-4 text-sm">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 flex-shrink-0 text-warning" />
            <div>
              <p className="font-semibold text-foreground">
                Credentials partiellement actives
              </p>
              <p className="mt-1 text-foreground-muted">
                {data.registeredCredentials - data.activeCredentials} connector
                {data.registeredCredentials - data.activeCredentials > 1 ? "s" : ""} enregistré
                {data.registeredCredentials - data.activeCredentials > 1 ? "s" : ""} mais non actif
                {data.registeredCredentials - data.activeCredentials > 1 ? "s" : ""}. Lancer un test pour activer.{" "}
                <Link href="/console/anubis/credentials" className="underline hover:text-foreground">
                  Configurer →
                </Link>
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {sections.map((s) => (
          <Link
            key={s.href}
            href={s.href}
            className="group rounded-xl border border-border bg-card p-6 transition-all hover:bg-card-hover"
          >
            <div className="flex items-center gap-3">
              <div
                className="rounded-lg p-2"
                style={{ backgroundColor: "var(--color-division-anubis-subtle, var(--color-bg-subtle))" }}
              >
                <s.icon
                  className="h-5 w-5"
                  style={{ color: "var(--color-division-anubis, var(--color-fg-default))" }}
                />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-foreground">{s.label}</h3>
                <p className="text-xs text-foreground-muted">{s.desc}</p>
              </div>
            </div>
          </Link>
        ))}
      </div>

      <div className="rounded-xl border border-border bg-card p-4 text-sm text-foreground-muted">
        <p>
          <strong className="text-foreground">Phase 15 active</strong> — Anubis est le 7ème Neter actif. Cap APOGEE
          atteint (7/7). Toute fonction nouvelle s'absorbe désormais dans un Neter existant ou exige un ADR de
          relèvement de plafond.
        </p>
      </div>
    </div>
  );
}
