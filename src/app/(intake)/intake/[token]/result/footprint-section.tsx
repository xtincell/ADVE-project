// ============================================================================
// MODULE M35 — Quick Intake Result: Empreinte digitale publique (ADR-0121)
// ============================================================================
// Rend l'empreinte ENTIÈRE mesurée par l'enrichissement public (vague A) :
// score /100 renormalisé + barres par dimension + sous-blocs factuels
// (site, réseaux, Google Business, YouTube, domaine, email, performance,
// pubs, presse) + narratif. Honnêteté ADR-0046 : les dimensions non mesurées
// sont affichées « non mesuré » — jamais un faux zéro, jamais masquées.
// Print-safe : mêmes conventions print: que la page résultat.
// ============================================================================

"use client";

import { Globe, Star, CirclePlay, Mail, Gauge, Megaphone, CalendarClock } from "lucide-react";

// ── Types (miroir JSON de EnrichedFootprint + FootprintScore persistés) ──

interface FootprintDimensionJson {
  key: string;
  label: string;
  weight: number;
  measured: boolean;
  score: number | null;
  details: string;
}

export interface WebFootprintJson {
  site?: {
    url: string;
    reachable: boolean;
    title: string | null;
    description: string | null;
    tech?: {
      cms: string | null;
      https: boolean;
      hasMetaDescription: boolean;
      hasOgTags: boolean;
      hasRobotsTxt: boolean | null;
      hasSitemap: boolean | null;
    };
  } | null;
  socials?: Array<{ platform: string; url: string; handle: string | null; followersHint?: number | null }>;
  articles?: Array<{ url: string; title: string | null }>;
  followerCounts?: Array<{ platform: string; handle: string; followerCount: number }>;
  press?: Array<{ title: string; url: string; sourceName: string | null; publishedAt: string | null }>;
  maps?: { status: string; placeName: string | null; rating: number | null; reviewCount: number | null; address: string | null; topReviews?: Array<{ text: string; stars: number }> };
  youtube?: { status: string; handle: string | null; channelTitle: string | null; subscriberCount: number | null; viewCount: number | null; videoCount: number | null };
  domain?: { status: string; domain: string | null; ageYears: number | null; registrar: string | null };
  emailInfra?: { status: string; domain: string | null; hasMx: boolean; mxProvider: string | null; hasSpf: boolean; hasDmarc: boolean };
  performance?: { status: string; performanceScore: number | null; lcpMs: number | null };
  ads?: { status: string; activeAdsCount: number | null; pageName: string | null };
  score?: { total: number | null; outOf: number; measuredWeight: number; dimensions: FootprintDimensionJson[] };
  narrative?: { text: string; source: "LLM" | "TEMPLATE" };
  collectedAt?: string;
}

const nf = new Intl.NumberFormat("fr-FR");

/** Jauge d'une dimension du score — barre pleine ou état « non mesuré ». */
function DimensionBar({ dim }: { dim: FootprintDimensionJson }) {
  return (
    <div className="grid grid-cols-[130px_1fr] items-center gap-3 sm:grid-cols-[160px_1fr]">
      <div>
        <p className="text-xs font-medium text-foreground">{dim.label}</p>
        <p className="text-[10px] text-foreground-muted">poids {dim.weight}</p>
      </div>
      {dim.measured && dim.score !== null ? (
        <div className="flex items-center gap-2">
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-background-raised print:border print:border-border">
            <div
              className="h-full rounded-full bg-primary transition-[width]"
              style={{ width: `${Math.max(2, dim.score)}%` }}
            />
          </div>
          <span className="w-14 shrink-0 text-right text-xs font-semibold tabular-nums text-foreground">
            {dim.score}/100
          </span>
        </div>
      ) : (
        <p className="text-xs italic text-foreground-muted">non mesuré — {dim.details}</p>
      )}
    </div>
  );
}

/** Petit fait mesuré avec icône (sous-blocs de l'empreinte). */
function FactCard({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-border-subtle bg-background-raised p-3 print:rounded-none">
      <p className="mb-1 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-foreground-secondary">
        {icon}
        {title}
      </p>
      <div className="text-xs text-foreground">{children}</div>
    </div>
  );
}

function TechBadge({ on, label }: { on: boolean | null | undefined; label: string }) {
  if (on === null || on === undefined) return null;
  return (
    <span
      className={`rounded-full border px-2 py-0.5 text-[10px] ${
        on ? "border-primary/40 text-foreground" : "border-border-subtle text-foreground-muted line-through"
      }`}
    >
      {label}
    </span>
  );
}

export function FootprintSection({ footprint, companyName }: { footprint: unknown; companyName: string }) {
  const fp = footprint as WebFootprintJson | null;
  const hasAnything =
    fp &&
    (fp.site ||
      (fp.socials ?? []).length > 0 ||
      (fp.press ?? []).length > 0 ||
      fp.score?.total !== undefined);
  if (!fp || !hasAnything) return null;

  // Compteurs RÉELS (Apify) indexés par plateforme:handle — priment sur les hints.
  const realCounts = new Map(
    (fp.followerCounts ?? []).map((c) => [`${c.platform}:${c.handle.toLowerCase()}`, c.followerCount]),
  );
  const score = fp.score;
  const dims = score?.dimensions ?? [];
  const measuredDims = dims.filter((d) => d.measured && d.score !== null);

  return (
    <section className="mb-8 rounded-2xl border border-border bg-card p-6 print:rounded-none print:border-0 print:p-0 print:mb-8">
      <div className="mb-1 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wider text-primary">
            Empreinte digitale publique
          </h2>
          <p className="mt-1 text-xs text-foreground-muted">
            Collectée automatiquement avant la rédaction du rapport
            {fp.collectedAt ? ` (${new Date(fp.collectedAt).toLocaleDateString("fr-FR")})` : ""} — elle ancre le
            diagnostic Engagement dans votre présence réelle.
          </p>
        </div>
        {score && score.total !== null && (
          <div className="shrink-0 rounded-xl border border-primary/30 bg-primary-subtle/20 px-4 py-2 text-center print:rounded-none">
            <p className="text-2xl font-bold tabular-nums text-foreground">
              {score.total}
              <span className="text-sm font-normal text-foreground-muted">/100</span>
            </p>
            <p className="text-[10px] uppercase tracking-wider text-foreground-secondary">Score d&apos;empreinte</p>
          </div>
        )}
      </div>

      {fp.narrative?.text && (
        <p className="mb-4 mt-3 rounded-lg border border-border-subtle bg-background-raised p-3 text-sm leading-relaxed text-foreground print:rounded-none print:border-0 print:p-0">
          {fp.narrative.text}
        </p>
      )}

      {/* ── Barres par dimension (mesurées + non mesurées, honnêtes) ── */}
      {dims.length > 0 && (
        <div className="mb-5 mt-4 space-y-2.5">
          {dims.map((d) => (
            <DimensionBar key={d.key} dim={d} />
          ))}
          {score && measuredDims.length < dims.length && (
            <p className="pt-1 text-[10px] text-foreground-muted">
              Score calculé sur les dimensions réellement mesurées ({score.measuredWeight} points de poids sur 100) —
              une dimension non mesurée n&apos;est jamais comptée comme une faiblesse.
            </p>
          )}
        </div>
      )}

      {/* ── Site déclaré ── */}
      {fp.site && (
        <div className="mb-3 rounded-lg border border-border-subtle bg-background-raised p-3 print:rounded-none">
          <p className="text-sm font-medium text-foreground">
            {fp.site.title ?? fp.site.url}{" "}
            {!fp.site.reachable && <span className="text-xs text-warning">(site injoignable lors de la collecte)</span>}
          </p>
          {fp.site.description && <p className="mt-0.5 text-xs text-foreground-muted">{fp.site.description}</p>}
          <a href={fp.site.url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline">
            {fp.site.url}
          </a>
          {fp.site.tech && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {fp.site.tech.cms && (
                <span className="rounded-full border border-border-subtle px-2 py-0.5 text-[10px] text-foreground">
                  {fp.site.tech.cms}
                </span>
              )}
              <TechBadge on={fp.site.tech.https} label="HTTPS" />
              <TechBadge on={fp.site.tech.hasMetaDescription} label="meta description" />
              <TechBadge on={fp.site.tech.hasOgTags} label="og:tags" />
              <TechBadge on={fp.site.tech.hasSitemap} label="sitemap" />
              <TechBadge on={fp.site.tech.hasRobotsTxt} label="robots.txt" />
            </div>
          )}
        </div>
      )}

      {/* ── Réseaux sociaux (compteur réel > hint) ── */}
      {(fp.socials ?? []).length > 0 && (
        <div className="mb-3 flex flex-wrap gap-2">
          {fp.socials!.map((so) => {
            const real = so.handle ? realCounts.get(`${so.platform}:${so.handle.toLowerCase()}`) : undefined;
            const countLabel = real
              ? ` · ${nf.format(real)} abonnés`
              : so.followersHint
                ? ` · ~${nf.format(so.followersHint)} abonnés`
                : "";
            return (
              <a
                key={so.url}
                href={so.url}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-full border border-border bg-background-raised px-3 py-1 text-xs text-foreground hover:border-primary"
              >
                {so.platform}
                {so.handle ? ` · @${so.handle}` : ""}
                {countLabel}
              </a>
            );
          })}
        </div>
      )}

      {/* ── Sous-blocs factuels mesurés ── */}
      {(fp.maps?.status === "LIVE" ||
        fp.youtube?.status === "LIVE" ||
        fp.domain?.status === "LIVE" ||
        fp.emailInfra?.status === "LIVE" ||
        fp.performance?.status === "LIVE" ||
        fp.ads?.status === "LIVE") && (
        <div className="mb-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {fp.maps?.status === "LIVE" && fp.maps.rating !== null && (
            <FactCard icon={<Star className="h-3 w-3" />} title="Avis Google">
              <p className="font-semibold">
                {fp.maps.rating}/5 · {nf.format(fp.maps.reviewCount ?? 0)} avis
              </p>
              {fp.maps.placeName && <p className="mt-0.5 text-foreground-muted">{fp.maps.placeName}</p>}
              {(fp.maps.topReviews ?? []).slice(0, 1).map((r, i) => (
                <p key={i} className="mt-1 italic text-foreground-muted">« {r.text.slice(0, 120)}{r.text.length > 120 ? "…" : ""} »</p>
              ))}
            </FactCard>
          )}
          {fp.youtube?.status === "LIVE" && (
            <FactCard icon={<CirclePlay className="h-3 w-3" />} title="YouTube">
              <p className="font-semibold">
                {fp.youtube.subscriberCount !== null ? `${nf.format(fp.youtube.subscriberCount)} abonnés` : "abonnés masqués"}
              </p>
              <p className="mt-0.5 text-foreground-muted">
                {fp.youtube.channelTitle ?? fp.youtube.handle}
                {fp.youtube.videoCount !== null ? ` · ${nf.format(fp.youtube.videoCount)} vidéos` : ""}
                {fp.youtube.viewCount !== null ? ` · ${nf.format(fp.youtube.viewCount)} vues` : ""}
              </p>
            </FactCard>
          )}
          {fp.domain?.status === "LIVE" && fp.domain.ageYears !== null && (
            <FactCard icon={<CalendarClock className="h-3 w-3" />} title="Domaine">
              <p className="font-semibold">{fp.domain.ageYears} an(s) d&apos;ancienneté</p>
              <p className="mt-0.5 text-foreground-muted">
                {fp.domain.domain}
                {fp.domain.registrar ? ` · ${fp.domain.registrar}` : ""}
              </p>
            </FactCard>
          )}
          {fp.emailInfra?.status === "LIVE" && (
            <FactCard icon={<Mail className="h-3 w-3" />} title="Email professionnel">
              <p className="font-semibold">
                {fp.emailInfra.hasMx ? (fp.emailInfra.mxProvider ?? "MX configuré") : "aucune infrastructure email"}
              </p>
              <div className="mt-1 flex gap-1.5">
                <TechBadge on={fp.emailInfra.hasMx} label="MX" />
                <TechBadge on={fp.emailInfra.hasSpf} label="SPF" />
                <TechBadge on={fp.emailInfra.hasDmarc} label="DMARC" />
              </div>
            </FactCard>
          )}
          {fp.performance?.status === "LIVE" && fp.performance.performanceScore !== null && (
            <FactCard icon={<Gauge className="h-3 w-3" />} title="Performance du site">
              <p className="font-semibold">{fp.performance.performanceScore}/100 mobile</p>
              {fp.performance.lcpMs !== null && (
                <p className="mt-0.5 text-foreground-muted">LCP {(fp.performance.lcpMs / 1000).toFixed(1)}s</p>
              )}
            </FactCard>
          )}
          {fp.ads?.status === "LIVE" && (
            <FactCard icon={<Megaphone className="h-3 w-3" />} title="Publicité Meta">
              <p className="font-semibold">{nf.format(fp.ads.activeAdsCount ?? 0)} pub(s) active(s)</p>
              {fp.ads.pageName && <p className="mt-0.5 text-foreground-muted">{fp.ads.pageName}</p>}
            </FactCard>
          )}
        </div>
      )}

      {/* ── Articles du site ── */}
      {(fp.articles ?? []).length > 0 && (
        <ul className="space-y-1">
          {fp.articles!.slice(0, 5).map((a) => (
            <li key={a.url} className="text-xs">
              <a
                href={a.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-foreground-secondary hover:text-primary hover:underline"
              >
                ▸ {a.title ?? a.url}
              </a>
            </li>
          ))}
        </ul>
      )}

      {/* ── Mentions presse ── */}
      {(fp.press ?? []).length > 0 && (
        <div className="mt-3">
          <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-foreground-secondary">
            Mentions presse
          </p>
          <ul className="space-y-1">
            {fp.press!.slice(0, 5).map((p) => (
              <li key={p.url} className="text-xs">
                <a
                  href={p.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-foreground-secondary hover:text-primary hover:underline"
                >
                  ▸ {p.title}
                </a>
                {p.sourceName && <span className="text-foreground-muted"> — {p.sourceName}</span>}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* ── Fiche Google absente : dit honnêtement (signal, pas silence) ── */}
      {fp.maps?.status === "NOT_FOUND" && (
        <p className="mt-3 flex items-center gap-1.5 text-xs text-foreground-muted">
          <Globe className="h-3 w-3" />
          Aucune fiche Google Business trouvée pour {companyName} lors de la collecte.
        </p>
      )}
    </section>
  );
}
