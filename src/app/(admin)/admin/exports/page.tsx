import type { Metadata } from "next";
import { FolderOutput } from "lucide-react";
import { getDb } from "@/lib/db";
import { parsePage, PAGE_SIZE } from "@/server/admin";
import {
  DELIVERABLE_KINDS,
  ORACLE_KIND,
  oracleIsStale,
  parseOracleDocument,
} from "@/server/deliverables";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Pager } from "../../pager";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Exports" };

const DATE_FORMAT = new Intl.DateTimeFormat("fr-FR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

/** Libellés FR des statuts persistés — variants lisibles sur fond CLAIR. */
const STATUS_UI: Record<string, { label: string; variant: BadgeProps["variant"] }> = {
  DRAFT: { label: "Brouillon", variant: "neutral" },
  GENERATING: { label: "En cours", variant: "neutral" },
  READY: { label: "Prêt", variant: "gold" },
  STALE: { label: "En retard", variant: "coral" },
  ARCHIVED: { label: "Archivé", variant: "outline" },
};

/** Libellé d'un kind depuis le registre en code — la valeur brute sinon. */
function kindLabel(kind: string): string {
  return kind in DELIVERABLE_KINDS
    ? DELIVERABLE_KINDS[kind as keyof typeof DELIVERABLE_KINDS].label
    : kind;
}

type PageProps = { searchParams: Promise<{ page?: string }> };

/**
 * /admin/exports — checklist des livrables cross-flotte (WP-020, esprit du
 * suivi de livrables de la console legacy) : chaque Deliverable réellement
 * composé, sa marque, son statut persisté ET sa fraîcheur RECALCULÉE à la
 * lecture (piliers modifiés après composition = périmé — même règle que le
 * cockpit, WP-006/016). Lecture seule : la composition reste une action
 * explicite dans le cockpit de la marque.
 */
export default async function AdminExportsPage({ searchParams }: PageProps) {
  const { page: rawPage } = await searchParams;
  const page = parsePage(rawPage);
  const db = getDb();

  // Une seule vérité pour compteurs + fraîcheur : toutes les lignes (sans le
  // contenu Json, lourd), puis le contenu des seules lignes affichées.
  const [rows, brandTotal] = await Promise.all([
    db.deliverable.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        kind: true,
        title: true,
        status: true,
        composedAt: true,
        brandId: true,
        brand: {
          select: {
            name: true,
            workspace: { select: { name: true } },
            pillars: { select: { updatedAt: true } },
          },
        },
      },
    }),
    db.brand.count(),
  ]);

  const withFreshness = rows.map((row) => ({
    ...row,
    stale: row.kind === ORACLE_KIND ? oracleIsStale(row.composedAt, row.brand.pillars) : false,
  }));

  const readyCount = withFreshness.filter((r) => r.status === "READY").length;
  const staleCount = withFreshness.filter((r) => r.status === "READY" && r.stale).length;
  const coveredBrands = new Set(rows.map((r) => r.brandId)).size;

  const pageRows = withFreshness.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const contents = await db.deliverable.findMany({
    where: { id: { in: pageRows.map((r) => r.id) } },
    select: { id: true, content: true },
  });
  const contentById = new Map(contents.map((c) => [c.id, c.content]));

  const tiles = [
    { label: "Livrables composés", value: String(rows.length), hint: "table Deliverable, toutes marques" },
    { label: "Prêts", value: String(readyCount), hint: "statut READY persisté" },
    {
      label: "Périmés",
      value: String(staleCount),
      hint: "piliers modifiés après composition — à recomposer",
    },
    {
      label: "Marques couvertes",
      value: `${coveredBrands} / ${brandTotal}`,
      hint: "marques ayant au moins un livrable composé",
    },
  ];

  return (
    <div className="space-y-8">
      <header className="space-y-1">
        <p className="eyebrow text-coral">Console</p>
        <h1 className="font-display text-3xl font-semibold">Exports</h1>
        <p className="text-sm text-smoke">
          Les livrables composés, toutes marques — statut persisté et fraîcheur recalculée à
          la lecture. La composition reste une action explicite du cockpit (/app/oracle),
          jamais un effet de bord de cette page.
        </p>
      </header>

      <div className="grid gap-bento sm:grid-cols-2 lg:grid-cols-4">
        {tiles.map((tile) => (
          <div key={tile.label} className="rounded-lg bg-white p-6 shadow-card">
            <p className="text-sm font-medium text-smoke">{tile.label}</p>
            <p className="font-display mt-2 text-4xl font-semibold text-ink">{tile.value}</p>
            <p className="mt-1 text-xs text-smoke-2">{tile.hint}</p>
          </div>
        ))}
      </div>

      {rows.length === 0 ? (
        <EmptyState
          tone="light"
          icon={<FolderOutput />}
          title="Aucun livrable composé"
          description="L'Oracle (et les kinds à venir du registre) se compose dans le cockpit de chaque marque, sur action explicite. Le hub cross-flotte se remplit avec les compositions réelles."
        />
      ) : (
        <>
          <div className="overflow-x-auto rounded-lg bg-white shadow-card">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-ink/10 text-left">
                  <th className="px-4 py-3 font-semibold text-graphite">Livrable</th>
                  <th className="px-4 py-3 font-semibold text-graphite">Kind</th>
                  <th className="px-4 py-3 font-semibold text-graphite">Marque</th>
                  <th className="px-4 py-3 font-semibold text-graphite">Statut</th>
                  <th className="px-4 py-3 font-semibold text-graphite">Sections</th>
                  <th className="px-4 py-3 font-semibold text-graphite">Composé le</th>
                </tr>
              </thead>
              <tbody>
                {pageRows.map((row) => {
                  const statusUi = STATUS_UI[row.status] ?? {
                    label: row.status,
                    variant: "neutral" as const,
                  };
                  const document =
                    row.kind === ORACLE_KIND
                      ? parseOracleDocument(contentById.get(row.id) ?? null)
                      : null;
                  const insufficient =
                    document?.sections.filter((s) => s.status === "insuffisant").length ?? 0;
                  return (
                    <tr key={row.id} className="border-b border-ink/5 last:border-0">
                      <td className="px-4 py-3 font-semibold text-ink">{row.title}</td>
                      <td className="px-4 py-3 text-graphite">{kindLabel(row.kind)}</td>
                      <td className="px-4 py-3 text-graphite">
                        {row.brand.name}
                        <span className="block text-xs text-smoke-2">
                          {row.brand.workspace.name}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="flex flex-wrap items-center gap-1.5">
                          <Badge variant={statusUi.variant}>{statusUi.label}</Badge>
                          {row.status === "READY" && row.stale ? (
                            <Badge variant="coral">Périmé — à recomposer</Badge>
                          ) : null}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-graphite">
                        {document
                          ? `${document.sections.length}${
                              insufficient > 0 ? ` (${insufficient} insuffisante${insufficient > 1 ? "s" : ""})` : ""
                            }`
                          : "—"}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-smoke">
                        {row.composedAt ? DATE_FORMAT.format(row.composedAt) : "jamais"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <Pager pathname="/admin/exports" params={{}} page={page} total={rows.length} />
        </>
      )}
    </div>
  );
}
