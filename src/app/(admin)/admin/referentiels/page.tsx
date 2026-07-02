import type { Metadata } from "next";
import Link from "next/link";
import { Database } from "lucide-react";
import { getDb } from "@/lib/db";
import {
  listCountries,
  listZoneIndexFamilies,
  listZoneIndexes,
  parsePage,
  zoneIndexValidity,
  type ZoneIndexValidity,
} from "@/server/admin";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Pager } from "../../pager";
import {
  CountryForm,
  ZoneIndexCreateForm,
  ZoneIndexEditForm,
} from "./referentiels-forms";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Référentiels" };

const DAY_FORMAT = new Intl.DateTimeFormat("fr-FR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});
const VALUE_FORMAT = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 4 });

const VALIDITY_BADGES: Record<ZoneIndexValidity, { label: string; variant: BadgeProps["variant"] }> =
  {
    en_vigueur: { label: "En vigueur", variant: "gold" },
    programme: { label: "Programmé", variant: "coral" },
    clos: { label: "Clos", variant: "outline" },
  };

/** Date → valeur d'un <input type="date"> (AAAA-MM-JJ). */
function toDateInput(date: Date | null): string {
  return date ? date.toISOString().slice(0, 10) : "";
}

type PageProps = {
  searchParams: Promise<{
    famille?: string;
    zone?: string;
    pays?: string;
    indice?: string;
    page?: string;
  }>;
};

/**
 * /admin/referentiels — CRUD réel Country + ZoneIndex (esprit des panneaux
 * legacy socle/pricing, socle/market-costs et governance/markets, ramené aux
 * tables v7). C'est le remplacement du « barème seedé » : l'opérateur édite
 * les valeurs pricing / cost-of-living EN BASE — source obligatoire,
 * validFrom porté par chaque ligne, mutation via service + AuditLog chaîné.
 * Le seed (prisma/seed.mjs) ne fait qu'amorcer ; la vérité vit ici.
 */
export default async function AdminReferentielsPage({ searchParams }: PageProps) {
  const { famille, zone, pays, indice, page: rawPage } = await searchParams;
  const page = parsePage(rawPage);
  const familyFilter = famille?.trim() || undefined;
  const zoneFilter = zone?.trim() || undefined;

  const [countries, families, { rows: indexes, total }] = await Promise.all([
    listCountries(),
    listZoneIndexFamilies(),
    listZoneIndexes({ family: familyFilter, countryCode: zoneFilter, page }),
  ]);

  // Cibles d'édition (prefill des formulaires via l'URL — zéro état client).
  const editedCountry = pays ? (countries.find((c) => c.code === pays.toUpperCase()) ?? null) : null;
  const editedIndex = indice
    ? await getDb().zoneIndex.findUnique({ where: { id: indice } })
    : null;

  const now = new Date();
  const preservedFilters = { famille: familyFilter, zone: zoneFilter };
  const listQuery = new URLSearchParams();
  if (familyFilter) listQuery.set("famille", familyFilter);
  if (zoneFilter) listQuery.set("zone", zoneFilter);
  if (page > 1) listQuery.set("page", String(page));

  return (
    <div className="space-y-10">
      <header className="space-y-1">
        <p className="eyebrow text-coral">Console</p>
        <h1 className="font-display text-3xl font-semibold">Référentiels</h1>
        <p className="text-sm text-smoke">
          Pays et indices de zone (pricing, cost-of-living…) — les barèmes vivent en base,
          jamais dans le code. Chaque valeur porte sa source et sa période de validité ;
          chaque mutation est tracée dans l&apos;AuditLog hash-chaîné.
        </p>
      </header>

      {/* ── Pays ─────────────────────────────────────────────────────── */}
      <section id="pays" className="space-y-4">
        <h2 className="font-display text-xl font-semibold">Pays ({countries.length})</h2>

        {countries.length === 0 ? (
          <EmptyState
            tone="light"
            icon={<Database />}
            title="Aucun pays en base"
            description="Le référentiel pays n'est pas seedé (prisma/seed.mjs) — ajoutez les pays ci-dessous, le pricing par zone en dépend."
          />
        ) : (
          <div className="overflow-x-auto rounded-lg bg-white shadow-card">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-ink/10 text-left">
                  <th className="px-4 py-3 font-semibold text-graphite">Code</th>
                  <th className="px-4 py-3 font-semibold text-graphite">Nom</th>
                  <th className="px-4 py-3 font-semibold text-graphite">Devise</th>
                  <th className="px-4 py-3 font-semibold text-graphite">Zone</th>
                  <th className="px-4 py-3 font-semibold text-graphite">Marques</th>
                  <th className="px-4 py-3 font-semibold text-graphite" />
                </tr>
              </thead>
              <tbody>
                {countries.map((c) => (
                  <tr key={c.code} className="border-b border-ink/5 last:border-0">
                    <td className="px-4 py-3 font-mono text-xs font-semibold text-ink">{c.code}</td>
                    <td className="px-4 py-3 font-semibold text-ink">{c.name}</td>
                    <td className="px-4 py-3 font-mono text-xs text-graphite">{c.currency}</td>
                    <td className="px-4 py-3 font-mono text-xs text-graphite">{c.zone ?? "—"}</td>
                    <td className="px-4 py-3 font-mono text-xs text-graphite">{c._count.brands}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-right">
                      <Link
                        href={`/admin/referentiels?${new URLSearchParams({ ...(familyFilter ? { famille: familyFilter } : {}), ...(zoneFilter ? { zone: zoneFilter } : {}), pays: c.code }).toString()}#pays`}
                        className="text-xs font-semibold text-coral hover:underline"
                      >
                        Modifier
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <Card padding="md" className={editedCountry ? "border border-gold/60" : undefined}>
          <h3 className="font-display text-base font-semibold">
            {editedCountry ? `Modifier ${editedCountry.name} (${editedCountry.code})` : "Ajouter un pays"}
          </h3>
          <p className="mb-4 mt-1 text-xs text-smoke">
            La clé est le code ISO-2 : soumettre un code existant met le pays à jour
            (audité <span className="font-mono">country.upsert</span>).
            {editedCountry ? (
              <>
                {" "}
                <Link
                  href={`/admin/referentiels${listQuery.size ? `?${listQuery}` : ""}#pays`}
                  className="font-semibold text-coral hover:underline"
                >
                  Annuler l&apos;édition
                </Link>
              </>
            ) : null}
          </p>
          <CountryForm
            defaults={
              editedCountry
                ? {
                    code: editedCountry.code,
                    name: editedCountry.name,
                    currency: editedCountry.currency,
                    zone: editedCountry.zone ?? "",
                  }
                : undefined
            }
          />
        </Card>
      </section>

      {/* ── Indices de zone ──────────────────────────────────────────── */}
      <section id="indices" className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="font-display text-xl font-semibold">Indices de zone ({total})</h2>
            <p className="text-xs text-smoke">
              La résolution (pricing, coûts) prend la ligne la plus récente valide à date —
              changer un barème = créer une nouvelle ligne avec sa date d&apos;effet.
            </p>
          </div>
          <form method="GET" action="/admin/referentiels" className="flex items-center gap-2">
            <Select
              name="famille"
              defaultValue={familyFilter ?? ""}
              className="h-9 w-44 text-sm"
              aria-label="Filtrer par famille"
            >
              <option value="">Toutes familles</option>
              {families.map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </Select>
            <Input
              type="search"
              name="zone"
              defaultValue={zoneFilter ?? ""}
              placeholder="Zone / pays (UEMOA…)"
              className="h-9 w-44 font-mono text-sm"
              aria-label="Filtrer par zone ou pays"
            />
            <button
              type="submit"
              className="h-9 rounded-sm bg-ink px-3 text-xs font-semibold text-bone transition-colors hover:bg-ink-3"
            >
              Filtrer
            </button>
          </form>
        </div>

        {editedIndex ? (
          <Card padding="md" className="border border-gold/60">
            <h3 className="font-display text-base font-semibold">
              Corriger la ligne{" "}
              <span className="font-mono text-sm text-smoke">
                {editedIndex.family} · {editedIndex.countryCode} · {editedIndex.key}
              </span>
            </h3>
            <p className="mb-4 mt-1 text-xs text-smoke">
              Audité <span className="font-mono">zone_index.update</span> (avant/après) —{" "}
              <Link
                href={`/admin/referentiels${listQuery.size ? `?${listQuery}` : ""}#indices`}
                className="font-semibold text-coral hover:underline"
              >
                Annuler l&apos;édition
              </Link>
            </p>
            <ZoneIndexEditForm
              defaults={{
                id: editedIndex.id,
                family: editedIndex.family,
                countryCode: editedIndex.countryCode,
                key: editedIndex.key,
                value: String(editedIndex.value),
                source: editedIndex.source,
                validFrom: toDateInput(editedIndex.validFrom),
                validUntil: toDateInput(editedIndex.validUntil),
              }}
            />
          </Card>
        ) : null}

        {indexes.length === 0 ? (
          <EmptyState
            tone="light"
            icon={<Database />}
            title={
              familyFilter || zoneFilter
                ? "Aucune ligne pour ces filtres"
                : "Référentiel d'indices vide"
            }
            description={
              familyFilter || zoneFilter
                ? "Aucun indice ne correspond — élargissez les filtres ou créez la ligne ci-dessous."
                : "Sans lignes pricing, la page /tarifs et la facturation affichent l'indisponibilité (aucun montant inventé). Seedez (prisma/seed.mjs) ou créez les lignes ici."
            }
          />
        ) : (
          <>
            <div className="overflow-x-auto rounded-lg bg-white shadow-card">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b border-ink/10 text-left">
                    <th className="px-4 py-3 font-semibold text-graphite">Famille</th>
                    <th className="px-4 py-3 font-semibold text-graphite">Zone / pays</th>
                    <th className="px-4 py-3 font-semibold text-graphite">Clé</th>
                    <th className="px-4 py-3 font-semibold text-graphite">Valeur</th>
                    <th className="px-4 py-3 font-semibold text-graphite">Validité</th>
                    <th className="px-4 py-3 font-semibold text-graphite">Source</th>
                    <th className="px-4 py-3 font-semibold text-graphite" />
                  </tr>
                </thead>
                <tbody>
                  {indexes.map((row) => {
                    const validity = VALIDITY_BADGES[zoneIndexValidity(row, now)];
                    const editQuery = new URLSearchParams(listQuery);
                    editQuery.set("indice", row.id);
                    return (
                      <tr key={row.id} className="border-b border-ink/5 last:border-0">
                        <td className="px-4 py-3 font-mono text-xs text-graphite">{row.family}</td>
                        <td className="px-4 py-3 font-mono text-xs font-semibold text-ink">
                          {row.countryCode}
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-graphite">{row.key}</td>
                        <td className="whitespace-nowrap px-4 py-3 font-mono text-xs font-semibold text-ink">
                          {VALUE_FORMAT.format(row.value)}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3">
                          <Badge variant={validity.variant}>{validity.label}</Badge>
                          <span className="ml-2 font-mono text-[11px] text-smoke">
                            {DAY_FORMAT.format(row.validFrom)}
                            {row.validUntil ? ` → ${DAY_FORMAT.format(row.validUntil)}` : " →"}
                          </span>
                        </td>
                        <td className="max-w-56 truncate px-4 py-3 text-xs text-graphite" title={row.source}>
                          {row.source}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-right">
                          <Link
                            href={`/admin/referentiels?${editQuery.toString()}#indices`}
                            className="text-xs font-semibold text-coral hover:underline"
                          >
                            Corriger
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <Pager
              pathname="/admin/referentiels"
              params={preservedFilters}
              page={page}
              total={total}
            />
          </>
        )}

        <Card padding="md">
          <h3 className="font-display text-base font-semibold">Nouvelle ligne d&apos;indice</h3>
          <p className="mb-4 mt-1 text-xs text-smoke">
            La voie normale pour changer un barème : nouvelle valeur, nouvelle date
            d&apos;effet, source obligatoire (audité{" "}
            <span className="font-mono">zone_index.create</span>). Clés pricing connues :{" "}
            <span className="font-mono">plan.cockpit.monthly</span> ·{" "}
            <span className="font-mono">plan.retainer.quarterly</span> (zone en colonne
            « Zone / pays », ex. UEMOA).
          </p>
          <ZoneIndexCreateForm
            defaults={{
              family: familyFilter,
              countryCode: zoneFilter,
              validFrom: toDateInput(now),
            }}
          />
        </Card>
      </section>
    </div>
  );
}
