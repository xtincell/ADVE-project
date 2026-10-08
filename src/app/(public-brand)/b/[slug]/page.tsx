/** Public page reads only the chosen, frozen edition in the existing vault.
 * Draft strategy/pillar revisions never publish implicitly (ADR-0209).
 */
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { readPublicBrand } from "@/server/services/brand-vault/publication";
import { isBrandPublicSlug } from "@/domain/brand-slug";

export const dynamic = "force-dynamic";

async function loadBrand(slug: string) {
  const edition = await readPublicBrand(slug);
  if (!edition) return null;
  const c = edition.content;
  return { name: c.name, title: c.title, logoUrl: c.logoUrl,
    accroche: c.tagline, positionnement: c.description,
    networks: c.links.map((link) => ({ platform: link.label, url: link.url })),
  };
}

export async function generateMetadata(
  { params }: { params: Promise<{ slug: string }> },
): Promise<Metadata> {
  const { slug } = await params;
  const brand = await loadBrand(slug).catch(() => null);
  if (!brand) return { title: "Marque introuvable" };
  return {
    title: `${brand.name}`,
    description: brand.accroche ?? brand.positionnement ?? `${brand.name} — page officielle.`,
  };
}

export default async function PublicBrandPage(
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  // Point de vérité domaine (audit 2026-07-16 `b-slug-lfa-regex-404` : le regex
  // ad-hoc minuscules rejetait TOUT slug au format canon `LFA-…` — 100 % des
  // pages publiques 404 après la migration des slugs).
  if (!isBrandPublicSlug(slug)) notFound();
  const brand = await loadBrand(slug).catch(() => null);
  if (!brand) notFound();

  return (
    <main className="pb-page" data-theme="light">
      <div className="pb-card">
        {brand.logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- logo du coffre (data-URL ou CDN validé)
          <img className="pb-logo" src={brand.logoUrl} alt={`Logo ${brand.name}`} />
        ) : (
          <div className="pb-logo pb-logo--placeholder" aria-hidden>{brand.name.slice(0, 1)}</div>
        )}
        <h1 className="pb-name">{brand.title}</h1>
        {brand.accroche && <p className="pb-tagline">{brand.accroche}</p>}
        {brand.positionnement && <p className="pb-positioning">{brand.positionnement}</p>}

        {brand.networks.length > 0 && (
          <div className="pb-networks">
            {brand.networks.map((n) => (
              <a className="pb-network" key={n.platform} href={n.url} target="_blank" rel="noopener noreferrer">
                <span className="pb-network__platform">{n.platform}</span>
              </a>
            ))}
          </div>
        )}

        <p className="pb-footer">Propulsé par La Fusée · UPgraders</p>
      </div>
    </main>
  );
}
