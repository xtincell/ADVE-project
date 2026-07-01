"use client";

/**
 * Console Superviseur — gestion des comptes (Vague 7).
 * Promotion/rétrogradation des rôles (entrepreneur / créateur / agence /
 * partenaire / opérateur / admin), acte gouverné + motivé + audité.
 */

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { PageHeader } from "@/components/shared/page-header";
import { SkeletonPage } from "@/components/shared/loading-skeleton";
import { Shield, Search } from "lucide-react";

const ROLE_OPTIONS = [
  { value: "USER", label: "Utilisateur" },
  { value: "FOUNDER", label: "Entrepreneur (founder)" },
  { value: "BRAND", label: "Marque" },
  { value: "CREATOR", label: "Créateur" },
  { value: "FREELANCE", label: "Freelance" },
  { value: "AGENCY", label: "Agence" },
  { value: "PARTNER", label: "Partenaire" },
  { value: "CLIENT_RETAINER", label: "Client retainer" },
  { value: "CLIENT_STATIC", label: "Client one-shot" },
  { value: "OPERATOR", label: "Opérateur UPgraders" },
  { value: "ADMIN", label: "Administrateur" },
] as const;

const ROLE_TONE: Record<string, string> = {
  ADMIN: "bg-error/15 text-error",
  OPERATOR: "bg-accent/15 text-accent",
  AGENCY: "bg-warning/15 text-warning",
  PARTNER: "bg-warning/15 text-warning",
  CREATOR: "bg-success/15 text-success",
  FREELANCE: "bg-success/15 text-success",
  FOUNDER: "bg-bg-subtle text-foreground",
};

export default function AccountsSupervisorPage() {
  const utils = trpc.useUtils();
  const [search, setSearch] = useState("");
  const [pendingRole, setPendingRole] = useState<Record<string, string>>({});
  const [reason, setReason] = useState<Record<string, string>>({});

  const { data, isLoading } = trpc.accounts.list.useQuery({ search: search || undefined, limit: 100 });
  const { data: stats } = trpc.accounts.roleStats.useQuery();
  const setRole = trpc.accounts.setRole.useMutation({
    onSuccess: () => {
      utils.accounts.list.invalidate();
      utils.accounts.roleStats.invalidate();
    },
  });

  if (isLoading) return <SkeletonPage />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Comptes & rôles"
        description="Console superviseur : promotion / rétrogradation des comptes (entrepreneur, créateur, agence, partenaire…). Chaque changement est motivé, gouverné et audité."
        breadcrumbs={[
          { label: "Console", href: "/console" },
          { label: "Gouvernance", href: "/console/governance" },
          { label: "Comptes" },
        ]}
      />

      {/* Répartition par rôle */}
      <div className="flex flex-wrap gap-2">
        {Object.entries(stats ?? {}).map(([role, count]) => (
          <span key={role} className={`rounded-full px-2.5 py-1 font-mono text-[11px] ${ROLE_TONE[role] ?? "bg-bg-subtle text-foreground-muted"}`}>
            {role} · {count as number}
          </span>
        ))}
      </div>

      {/* Recherche */}
      <div className="flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2">
        <Search className="h-4 w-4 text-foreground-muted" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher par nom ou email…"
          className="w-full bg-transparent text-sm outline-none"
        />
      </div>

      {/* Liste */}
      <div className="divide-y divide-border rounded-xl border border-border bg-card">
        {(data?.items ?? []).map((u) => (
          <div key={u.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-foreground">{u.name ?? "—"}</span>
                <span className={`rounded-full px-2 py-0.5 font-mono text-[10px] ${ROLE_TONE[u.role] ?? "bg-bg-subtle text-foreground-muted"}`}>
                  {u.role}
                </span>
                {u.talentProfile && (
                  <span className="rounded-full bg-bg-subtle px-2 py-0.5 text-[10px] text-foreground-muted">
                    Guilde {u.talentProfile.tier} · {u.talentProfile.totalMissions} mission(s)
                  </span>
                )}
              </div>
              <p className="text-xs text-foreground-muted">
                {u.email} · {u._count.Strategy} stratégie(s) · {u._count.missionApplications} candidature(s) · créé {new Date(u.createdAt).toLocaleDateString("fr-FR")}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <select
                value={pendingRole[u.id] ?? u.role}
                onChange={(e) => setPendingRole({ ...pendingRole, [u.id]: e.target.value })}
                className="rounded-lg border border-border bg-bg px-2 py-1.5 text-xs"
              >
                {ROLE_OPTIONS.map((r) => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
              <input
                placeholder="Motif (obligatoire)"
                value={reason[u.id] ?? ""}
                onChange={(e) => setReason({ ...reason, [u.id]: e.target.value })}
                className="w-44 rounded-lg border border-border bg-bg px-2 py-1.5 text-xs"
              />
              <button
                onClick={() =>
                  setRole.mutate({
                    userId: u.id,
                    role: (pendingRole[u.id] ?? u.role) as (typeof ROLE_OPTIONS)[number]["value"],
                    reason: reason[u.id] ?? "",
                  })
                }
                disabled={
                  setRole.isPending ||
                  (pendingRole[u.id] ?? u.role) === u.role ||
                  (reason[u.id] ?? "").trim().length < 3
                }
                className="flex items-center gap-1 rounded-lg bg-accent px-3 py-1.5 text-xs font-medium text-accent-foreground hover:opacity-90 disabled:opacity-40"
              >
                <Shield className="h-3 w-3" /> Appliquer
              </button>
            </div>
          </div>
        ))}
        {(data?.items ?? []).length === 0 && (
          <div className="p-6 text-center text-sm text-foreground-muted">Aucun compte trouvé.</div>
        )}
      </div>
      {setRole.error && <p className="text-xs text-error">{setRole.error.message}</p>}
    </div>
  );
}
