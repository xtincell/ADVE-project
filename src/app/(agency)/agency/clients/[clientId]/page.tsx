"use client";

import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { trpc } from "@/lib/trpc/client";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { StatusBadge } from "@/components/shared/status-badge";
import { ScoreBadge } from "@/components/shared/score-badge";
import { SkeletonPage } from "@/components/shared/loading-skeleton";
import { Building, Layers, TrendingUp, ExternalLink } from "lucide-react";
import { PILLAR_KEYS, classifyBrand } from "@/lib/types/advertis-vector";

const CLASSIFICATION_MAP: Record<string, string> = {
  ZOMBIE: "bg-surface-raised text-foreground-secondary ring-border/30",
  ORDINAIRE: "bg-yellow-400/15 text-yellow-400 ring-yellow-400/30",
  FORTE: "bg-blue-400/15 text-blue-400 ring-blue-400/30",
  CULTE: "bg-purple-400/15 text-purple-400 ring-purple-400/30",
  ICONE: "bg-warning/15 text-warning ring-warning",
};

export default function AgencyClientDetailPage() {
  const params = useParams();
  const router = useRouter();
  const clientId = params.clientId as string;
  const { data: client, isLoading } = trpc.brandClient.get.useQuery({ id: clientId });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Client"
          breadcrumbs={[{ label: "Agence", href: "/agency" }, { label: "Clients", href: "/agency/clients" }, { label: "..." }]}
        />
        <SkeletonPage />
      </div>
    );
  }

  if (!client) return null;

  const brands = client.strategies ?? [];
  const brandScores = brands.map((s) => {
    const v = s.advertis_vector as Record<string, number> | null;
    return v ? PILLAR_KEYS.reduce((sum, k) => sum + (v[k] ?? 0), 0) : 0;
  });
  const avgScore = brandScores.length > 0
    ? (brandScores.reduce((a, b) => a + b, 0) / brandScores.length).toFixed(0)
    : "0";

  return (
    <div className="space-y-6">
      <PageHeader
        title={client.name}
        description={[client.sector, client.country].filter(Boolean).join(" - ") || "Client"}
        breadcrumbs={[
          { label: "Agence", href: "/agency" },
          { label: "Clients", href: "/agency/clients" },
          { label: client.name },
        ]}
      />

      {/* Client info */}
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
      <div className="rounded-lg border border-border bg-background/50 p-6">
        <h2 className="mb-4 text-lg font-semibold text-white">Marques ({brands.length})</h2>
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
                  onClick={() => router.push(`/cockpit?strategy=${brand.id}`)}
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
      </div>
    </div>
  );
}
