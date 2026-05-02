"use client";

import { use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { trpc } from "@/lib/trpc/client";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { StatusBadge } from "@/components/shared/status-badge";
import { ScoreBadge } from "@/components/shared/score-badge";
import { SkeletonPage } from "@/components/shared/loading-skeleton";
import {
  ArrowLeft,
  Building,
  Layers,
  TrendingUp,
  ExternalLink,
  AlertTriangle,
} from "lucide-react";
import { PILLAR_KEYS, classifyBrand } from "@/lib/types/advertis-vector";

const CLASSIFICATION_MAP: Record<string, string> = {
  ZOMBIE: "bg-surface-raised text-foreground-secondary ring-border/30",
  ORDINAIRE: "bg-yellow-400/15 text-yellow-400 ring-yellow-400/30",
  FORTE: "bg-blue-400/15 text-blue-400 ring-blue-400/30",
  CULTE: "bg-purple-400/15 text-purple-400 ring-purple-400/30",
  ICONE: "bg-warning/15 text-warning ring-warning",
};

export default function ClientDetailPage({
  params,
}: {
  params: Promise<{ strategyId: string }>;
}) {
  // Note: param is named strategyId for route compat, but it's actually a clientId
  const { strategyId: clientId } = use(params);
  const router = useRouter();
  const { data: client, isLoading, error } = trpc.brandClient.get.useQuery({ id: clientId });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Chargement..."
          breadcrumbs={[
            { label: "Console", href: "/console" },
            { label: "Oracle" },
            { label: "Clients", href: "/console/oracle/clients" },
            { label: "..." },
          ]}
        />
        <SkeletonPage />
      </div>
    );
  }

  if (error || !client) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Erreur"
          breadcrumbs={[
            { label: "Console", href: "/console" },
            { label: "Oracle" },
            { label: "Clients", href: "/console/oracle/clients" },
          ]}
        />
        <div className="rounded-xl border border-error/50 bg-error/20 p-6 text-center">
          <AlertTriangle className="mx-auto h-8 w-8 text-error" />
          <p className="mt-2 text-sm text-error">
            Impossible de charger ce client.
          </p>
          <Link
            href="/console/oracle/clients"
            className="mt-4 inline-flex items-center gap-1.5 text-sm text-foreground-secondary transition-colors hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Retour aux clients
          </Link>
        </div>
      </div>
    );
  }

  const brands = client.strategies ?? [];
  const brandScores = brands.map((s) => {
    const v = s.advertis_vector as Record<string, number> | null;
    return v ? PILLAR_KEYS.reduce((sum, k) => sum + (v[k] ?? 0), 0) : 0;
  });
  const avgScore = brandScores.length > 0
    ? (brandScores.reduce((a, b) => a + b, 0) / brandScores.length).toFixed(0)
    : "0";

  return (
    <div className="space-y-8">
      <Link
        href="/console/oracle/clients"
        className="inline-flex items-center gap-1.5 text-sm text-foreground-muted transition-colors hover:text-white"
      >
        <ArrowLeft className="h-4 w-4" />
        Retour aux clients
      </Link>

      <PageHeader
        title={client.name}
        description={[client.sector, client.country].filter(Boolean).join(" - ") || undefined}
        breadcrumbs={[
          { label: "Console", href: "/console" },
          { label: "Oracle" },
          { label: "Clients", href: "/console/oracle/clients" },
          { label: client.name },
        ]}
      >
        <div className="flex items-center gap-3">
          <StatusBadge status={client.status} />
          {client.operator && (
            <span className="rounded-full bg-background px-3 py-1 text-xs text-foreground-secondary">
              {client.operator.name}
            </span>
          )}
        </div>
      </PageHeader>

      {/* KPIs */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Marques" value={brands.length} icon={Layers} />
        <StatCard title="Score ADVE moyen" value={`${avgScore}/200`} icon={TrendingUp} />
        <StatCard title="Secteur" value={client.sector ?? "-"} icon={Building} />
        <StatCard title="Statut" value={client.status} icon={Building} />
      </div>

      {/* Contact info */}
      {(client.contactName || client.contactEmail) && (
        <div className="rounded-lg border border-border bg-background/50 p-4">
          <h3 className="mb-2 text-sm font-semibold text-foreground-secondary">Contact</h3>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            {client.contactName && (
              <div>
                <p className="text-xs text-foreground-muted">Nom</p>
                <p className="text-sm text-white">{client.contactName}</p>
              </div>
            )}
            {client.contactEmail && (
              <div>
                <p className="text-xs text-foreground-muted">Email</p>
                <p className="text-sm text-white">{client.contactEmail}</p>
              </div>
            )}
            {client.contactPhone && (
              <div>
                <p className="text-xs text-foreground-muted">Telephone</p>
                <p className="text-sm text-white">{client.contactPhone}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Brands list */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-white">Marques ({brands.length})</h2>
        {brands.length === 0 ? (
          <p className="text-sm text-foreground-muted">Aucune marque associee a ce client.</p>
        ) : (
          <div className="space-y-3">
            {brands.map((brand) => {
              const v = brand.advertis_vector as Record<string, number> | null;
              const composite = v ? PILLAR_KEYS.reduce((sum, k) => sum + (v[k] ?? 0), 0) : 0;
              const classification = classifyBrand(composite);
              return (
                <div
                  key={brand.id}
                  onClick={() => router.push(`/console/oracle/brands/${brand.id}`)}
                  className="flex cursor-pointer items-center justify-between rounded-lg border border-border bg-background/80 px-4 py-3 transition-colors hover:border-border"
                >
                  <div className="flex items-center gap-3">
                    <ScoreBadge score={composite} />
                    <div>
                      <p className="text-sm font-medium text-white">{brand.name}</p>
                      <p className="text-xs text-foreground-muted">{brand.pillars?.length ?? 0} piliers</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <StatusBadge status={classification} variantMap={CLASSIFICATION_MAP} />
                    <StatusBadge status={brand.status ?? "DRAFT"} />
                    <ExternalLink className="h-3.5 w-3.5 text-foreground-muted" />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Notes */}
      {client.notes && (
        <section className="space-y-2">
          <h3 className="text-sm font-semibold text-foreground-secondary">Notes</h3>
          <div className="rounded-lg border border-border bg-background/50 p-4">
            <p className="text-sm text-foreground-secondary whitespace-pre-wrap">{client.notes}</p>
          </div>
        </section>
      )}

      {/* Meta */}
      <section className="border-t border-border pt-4">
        <div className="flex flex-wrap items-center gap-6 text-xs text-foreground-muted">
          <span>Marques: {brands.length}</span>
          {client.createdAt && (
            <span>Cree le {new Date(client.createdAt).toLocaleDateString("fr-FR")}</span>
          )}
          {client.updatedAt && (
            <span>Mis a jour le {new Date(client.updatedAt).toLocaleDateString("fr-FR")}</span>
          )}
        </div>
      </section>
    </div>
  );
}
