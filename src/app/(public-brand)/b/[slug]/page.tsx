/**
 * Page publique de marque — <slug>.powerupgraders.com (réécrite par le proxy
 * vers /b/<slug>) et /b/<slug> en direct. Vague « cockpit qui ramène tout »
 * (2026-07-12) — première pierre du Personal Brand Cockpit (blueprint).
 *
 * Server component, DONNÉES PUBLIQUES UNIQUEMENT : nom, logo du coffre,
 * accroche/positionnement du pilier A/D, réseaux (handles publics + dernier
 * compteur), site web. Aucun contact privé, aucun contenu de pilier interne,
 * aucun secret. Marque sans publicSlug → 404.
 */
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { isBrandPublicSlug } from "@/domain/brand-slug";

export const dynamic = "force-dynamic";

const PLATFORM_LINKS: Record<string, (h: string) => string> = {
  FACEBOOK: (h) => `https://facebook.com/${h}`,
  INSTAGRAM: (h) => `https://instagram.com/${h}`,
  TIKTOK: (h) => `https://tiktok.com/@${h}`,
  TWITTER: (h) => `https://x.com/${h}`,
  YOUTUBE: (h) => `https://youtube.com/@${h}`,
  LINKEDIN: (h) => `https://linkedin.com/in/${h}`,
};

const PLATFORM_LABELS: Record<string, string> = {
  FACEBOOK: "Facebook", INSTAGRAM: "Instagram", TIKTOK: "TikTok",
  TWITTER: "X", YOUTUBE: "YouTube", LINKEDIN: "LinkedIn",
};

function fmtCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)} M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)} k`;
  return String(n);
}

async function loadBrand(slug: string) {
  const strategy = await db.strategy.findUnique({
    where: { publicSlug: slug },
    select: { id: true, name: true, status: true },
  });
  if (!strategy || strategy.status === "ARCHIVED" || strategy.status === "DELETED") return null;

  const [logo, pillarA, pillarD, snapshots] = await Promise.all([
    db.brandAsset.findFirst({
      where: { strategyId: strategy.id, kind: "LOGO_FINAL", state: "ACTIVE", fileUrl: { not: null } },
      select: { fileUrl: true },
    }),
    db.pillar.findUnique({
      where: { strategyId_key: { strategyId: strategy.id, key: "a" } },
      select: { content: true },
    }),
    db.pillar.findUnique({
      where: { strategyId_key: { strategyId: strategy.id, key: "d" } },
      select: { content: true },
    }),
    db.followerSnapshot.findMany({
      where: { strategyId: strategy.id },
      orderBy: { capturedAt: "desc" },
      take: 40,
      select: { platform: true, handle: true, followerCount: true },
    }),
  ]);

  const a = (pillarA?.content ?? {}) as Record<string, unknown>;
  const d = (pillarD?.content ?? {}) as Record<string, unknown>;
  const accroche =
    (typeof a.accroche === "string" && a.accroche) ||
    (typeof (a.assetsLinguistiques as Record<string, unknown> | undefined)?.slogan === "string"
      && ((a.assetsLinguistiques as Record<string, unknown>).slogan as string)) || null;
  const positionnement = typeof d.positionnement === "string" ? d.positionnement : null;

  const networks: Array<{ platform: string; handle: string; followers: number; url: string }> = [];
  const seen = new Set<string>();
  for (const snap of snapshots) {
    const key = String(snap.platform);
    if (seen.has(key) || !snap.handle) continue;
    seen.add(key);
    const link = PLATFORM_LINKS[key];
    if (!link) continue;
    networks.push({
      platform: PLATFORM_LABELS[key] ?? key,
      handle: snap.handle,
      followers: snap.followerCount,
      url: link(snap.handle.replace(/^@/, "")),
    });
  }

  return {
    name: strategy.name,
    logoUrl: logo?.fileUrl ?? null,
    accroche,
    positionnement,
    networks,
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
        <h1 className="pb-name">{brand.name}</h1>
        {brand.accroche && <p className="pb-tagline">{brand.accroche}</p>}
        {brand.positionnement && <p className="pb-positioning">{brand.positionnement}</p>}

        {brand.networks.length > 0 && (
          <div className="pb-networks">
            {brand.networks.map((n) => (
              <a className="pb-network" key={n.platform} href={n.url} target="_blank" rel="noopener noreferrer">
                <span className="pb-network__platform">{n.platform}</span>
                <span className="pb-network__handle">@{n.handle.replace(/^@/, "")}</span>
                {n.followers > 0 && <span className="pb-network__count">{fmtCount(n.followers)}</span>}
              </a>
            ))}
          </div>
        )}

        <p className="pb-footer">Propulsé par La Fusée · UPgraders</p>
      </div>
    </main>
  );
}
