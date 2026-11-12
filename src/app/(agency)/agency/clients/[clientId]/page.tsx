"use client";
import { OrganizationLabels, OrganizationSources } from "@/domain/client-organization";

import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { trpc } from "@/lib/trpc/client";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { StatusBadge } from "@/components/shared/status-badge";
import { ScoreBadge } from "@/components/shared/score-badge";
import { SkeletonPage } from "@/components/shared/loading-skeleton";
import { Building, Layers, TrendingUp, ExternalLink } from "lucide-react";
import { formatBrandComposite, meanBrandComposite, readCompositeFromVector } from "@/domain/brand-scores";
import { classifyBrand } from "@/lib/types/advertis-vector";

const CLASSIFICATION_MAP: Record<string, string> = {
  LATENT: "bg-zinc-400/15 text-zinc-400 ring-zinc-400/30",
  FRAGILE: "bg-orange-400/15 text-orange-300 ring-orange-400/30",
  ORDINAIRE: "bg-yellow-400/15 text-yellow-400 ring-yellow-400/30",
  FORTE: "bg-blue-400/15 text-blue-400 ring-blue-400/30",
  CULTE: "bg-purple-400/15 text-purple-400 ring-purple-400/30",
  ICONE: "bg-amber-400/15 text-amber-400 ring-amber-400/30",
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

  const references = OrganizationSources.safeParse(client.organizationSourceRefs);
  const brands = client.strategies ?? [];
  const avgScore = meanBrandComposite(brands.map(s => s.advertis_vector));

  return (
    <div className="space-y-6">
      <PageHeader
        title={client.name}
        description={[client.sector, client.country && `Siège · ${client.country}`].filter(Boolean).join(" - ") || "Client"}
        breadcrumbs={[
          { label: "Agence", href: "/agency" },
          { label: "Clients", href: "/agency/clients" },
          { label: client.name },
        ]}
      />

      {client.organizationKind !== "UNSPECIFIED" && (
        <section className="rounded-xl border border-zinc-800 p-5">
          <h2 className="font-semibold">{OrganizationLabels[client.organizationKind]}</h2>
          {client.parentClient && <p>Organisation parente · {client.parentClient.name}</p>}
          {client.country && <p>Pays du siège · {client.country}</p>}
          {references.success && <details><summary>Sources du rattachement</summary>
            <ul>{references.data.map(ref=><li key={ref.id}><p>{ref.statement}</p><small>{ref.scope}</small>
              {ref.url && <a href={ref.url} target="_blank" rel="noreferrer"> Consulter la source</a>}</li>)}</ul>
          </details>}
        </section>
      )}
      {/* Client info */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Marques" value={brands.length} icon={Layers} />
        <StatCard title="Score ADVE moyen" value={formatBrandComposite(avgScore)} icon={TrendingUp} />
        <StatCard title="Secteur" value={client.sector ?? "-"} icon={Building} />
        <StatCard title="Statut" value={client.status === "REFERENCE" ? "Référence" : client.status} icon={Building} />
      </div>

      {/* Contact info */}
      {(client.contactName || client.contactEmail) && (
        <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-4">
          <h3 className="mb-2 text-sm font-semibold text-zinc-400">Contact</h3>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            {client.contactName && (
              <div>
                <p className="text-xs text-zinc-500">Nom</p>
                <p className="text-sm text-white">{client.contactName}</p>
              </div>
            )}
            {client.contactEmail && (
              <div>
                <p className="text-xs text-zinc-500">Email</p>
                <p className="text-sm text-white">{client.contactEmail}</p>
              </div>
            )}
            {client.contactPhone && (
              <div>
                <p className="text-xs text-zinc-500">Telephone</p>
                <p className="text-sm text-white">{client.contactPhone}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Brands list */}
      <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-6">
        <h2 className="mb-4 text-lg font-semibold text-white">Marques ({brands.length})</h2>
        {brands.length === 0 ? (
          <p className="text-sm text-zinc-500">Aucune marque associee a ce client.</p>
        ) : (
          <div className="space-y-3">
            {brands.map((brand) => {
              const composite = readCompositeFromVector(brand.advertis_vector);
              const classification = composite === null ? null : classifyBrand(composite);
              return (
                <div
                  key={brand.id}
                  onClick={() => router.push(`/cockpit?strategy=${brand.id}`)}
                  className="flex cursor-pointer items-center justify-between rounded-lg border border-zinc-800 bg-zinc-900/80 px-4 py-3 transition-colors hover:border-zinc-700"
                >
                  <div className="flex items-center gap-3">
                    {composite === null ? <span className="text-xs text-zinc-400">Non évaluée</span> : <ScoreBadge score={composite} />}
                    <div>
                      <p className="text-sm font-medium text-white">{brand.name}</p>
                      <p className="text-xs text-zinc-500">{brand.pillars?.length ?? 0} piliers</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {classification && <StatusBadge status={classification} variantMap={CLASSIFICATION_MAP} />}
                    <StatusBadge status={brand.status ?? "DRAFT"} />
                    <ExternalLink className="h-3.5 w-3.5 text-zinc-500" />
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
