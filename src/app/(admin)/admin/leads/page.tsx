import type { Metadata } from "next";
import { ExternalLink, Inbox } from "lucide-react";
import { getDb } from "@/lib/db";
import { intakeCountryName } from "@/server/funnel-mapping";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { CopyLinkButton } from "./copy-link-button";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Leads" };

const DATE_FORMAT = new Intl.DateTimeFormat("fr-FR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

const STATUS_META: Record<string, { label: string; variant: BadgeProps["variant"] }> = {
  NEW: { label: "Nouveau", variant: "coral" },
  QUALIFIED: { label: "Qualifié", variant: "gold" },
  CONVERTED: { label: "Converti", variant: "neutral" },
  ARCHIVED: { label: "Archivé", variant: "outline" },
};

/** Contexte marché du payload funnel — extraction défensive (Json non typé). */
function leadContext(payload: unknown): { secteur: string | null; pays: string | null } {
  if (payload === null || typeof payload !== "object" || Array.isArray(payload)) {
    return { secteur: null, pays: null };
  }
  const record = payload as Record<string, unknown>;
  const secteur = typeof record.secteur === "string" && record.secteur ? record.secteur : null;
  const code = typeof record.countryCode === "string" ? record.countryCode : null;
  const pays = code ? (intakeCountryName(code) ?? code) : null;
  return { secteur, pays };
}

export default async function AdminLeadsPage() {
  const db = getDb();
  const leads = await db.intakeLead.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return (
    <div className="space-y-8">
      <header className="space-y-1">
        <p className="eyebrow text-coral">Opérations</p>
        <h1 className="font-display text-3xl font-semibold">Leads</h1>
        <p className="text-sm text-smoke">
          Diagnostics soumis via le funnel public — les 100 plus récents. Le lien mène à
          la page résultat publique (diagnostic recalculé, jamais stocké).
        </p>
      </header>

      {leads.length === 0 ? (
        <EmptyState
          tone="light"
          icon={<Inbox />}
          title="Aucun lead pour le moment"
          description="Les diagnostics gratuits soumis via le funnel public (/intake) apparaîtront ici dès la première soumission."
        />
      ) : (
        <div className="overflow-x-auto rounded-lg bg-white shadow-card">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-ink/10 text-left">
                <th className="px-4 py-3 font-semibold text-graphite">Date</th>
                <th className="px-4 py-3 font-semibold text-graphite">Email</th>
                <th className="px-4 py-3 font-semibold text-graphite">Marque</th>
                <th className="px-4 py-3 font-semibold text-graphite">Secteur</th>
                <th className="px-4 py-3 font-semibold text-graphite">Pays</th>
                <th className="px-4 py-3 font-semibold text-graphite">Statut</th>
                <th className="px-4 py-3 font-semibold text-graphite">Résultat</th>
              </tr>
            </thead>
            <tbody>
              {leads.map((lead) => {
                const { secteur, pays } = leadContext(lead.payload);
                const status = STATUS_META[lead.status] ?? {
                  label: lead.status,
                  variant: "outline" as const,
                };
                const resultPath = `/intake/resultat/${lead.id}`;
                return (
                  <tr key={lead.id} className="border-b border-ink/5 last:border-0">
                    <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-smoke">
                      {DATE_FORMAT.format(lead.createdAt)}
                    </td>
                    <td className="px-4 py-3 text-graphite">{lead.email}</td>
                    <td className="px-4 py-3 font-semibold text-ink">{lead.brandName}</td>
                    <td className="px-4 py-3 text-graphite">{secteur ?? "—"}</td>
                    <td className="px-4 py-3 text-graphite">{pays ?? "—"}</td>
                    <td className="px-4 py-3">
                      <Badge variant={status.variant}>{status.label}</Badge>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <span className="inline-flex items-center gap-1">
                        <CopyLinkButton path={resultPath} />
                        <a
                          href={resultPath}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 rounded-sm px-2 py-1 text-xs font-semibold text-smoke transition-colors hover:bg-ink/5 hover:text-ink"
                          title="Ouvrir la page résultat"
                        >
                          <ExternalLink className="size-3.5" aria-hidden /> Ouvrir
                        </a>
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
