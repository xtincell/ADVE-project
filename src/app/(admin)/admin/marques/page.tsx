import type { Metadata } from "next";
import { Rocket } from "lucide-react";
import { getDb } from "@/lib/db";
import { LEVEL_DEFINITIONS, COMPOSITE_MAX_SCORE } from "@/domain/scoring";
import type { BrandLevel } from "@/domain/pillars";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Marques" };

const DATE_FORMAT = new Intl.DateTimeFormat("fr-FR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

/** Variants lisibles sur fond CLAIR (le LevelBadge cockpit est calé sombre). */
const LEVEL_VARIANTS: Record<BrandLevel, BadgeProps["variant"]> = {
  LATENT: "neutral",
  FRAGILE: "neutral",
  ORDINAIRE: "neutral",
  FORTE: "coral",
  CULTE: "gold",
  ICONE: "gold",
};

/** Dernière activité d'une marque = dernier pilier touché (sinon création). */
function lastActivity(brand: {
  createdAt: Date;
  pillars: ReadonlyArray<{ updatedAt: Date }>;
}): Date {
  let latest = brand.createdAt;
  for (const pillar of brand.pillars) {
    if (pillar.updatedAt.getTime() > latest.getTime()) latest = pillar.updatedAt;
  }
  return latest;
}

export default async function AdminMarquesPage() {
  const db = getDb();
  const brands = await db.brand.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
    include: {
      workspace: { select: { name: true, slug: true } },
      scores: { orderBy: { computedAt: "desc" }, take: 1, select: { total: true } },
      pillars: { select: { updatedAt: true } },
    },
  });

  return (
    <div className="space-y-8">
      <header className="space-y-1">
        <p className="eyebrow text-coral">Opérations</p>
        <h1 className="font-display text-3xl font-semibold">Marques</h1>
        <p className="text-sm text-smoke">
          La flotte — palier, dernier score composite (/{COMPOSITE_MAX_SCORE}) et dernière
          activité (dernier pilier modifié).
        </p>
      </header>

      {brands.length === 0 ? (
        <EmptyState
          tone="light"
          icon={<Rocket />}
          title="Aucune marque en base"
          description="Les marques naissent à l'inscription d'un fondateur (ou à la conversion d'un lead du funnel) — elles apparaîtront ici."
        />
      ) : (
        <div className="overflow-x-auto rounded-lg bg-white shadow-card">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-ink/10 text-left">
                <th className="px-4 py-3 font-semibold text-graphite">Marque</th>
                <th className="px-4 py-3 font-semibold text-graphite">Workspace</th>
                <th className="px-4 py-3 font-semibold text-graphite">Secteur</th>
                <th className="px-4 py-3 font-semibold text-graphite">Palier</th>
                <th className="px-4 py-3 font-semibold text-graphite">Score</th>
                <th className="px-4 py-3 font-semibold text-graphite">Dernière activité</th>
              </tr>
            </thead>
            <tbody>
              {brands.map((brand) => {
                const score = brand.scores[0]?.total ?? null;
                return (
                  <tr key={brand.id} className="border-b border-ink/5 last:border-0">
                    <td className="px-4 py-3 font-semibold text-ink">{brand.name}</td>
                    <td className="px-4 py-3 text-graphite">
                      {brand.workspace.name}{" "}
                      <span className="font-mono text-xs text-smoke-2">
                        ({brand.workspace.slug})
                      </span>
                    </td>
                    <td className="px-4 py-3 text-graphite">{brand.sector ?? "—"}</td>
                    <td className="px-4 py-3">
                      <Badge variant={LEVEL_VARIANTS[brand.level]}>
                        {LEVEL_DEFINITIONS[brand.level].label}
                      </Badge>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-graphite">
                      {score !== null ? `${Math.round(score)} / ${COMPOSITE_MAX_SCORE}` : "—"}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-smoke">
                      {DATE_FORMAT.format(lastActivity(brand))}
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
