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
    ogImage?: string | null;
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
  webMentions?: { status: string; items: Array<{ title: string; url: string; host: string }> };
  maps?: { status: string; placeName: string | null; rating: number | null; reviewCount: number | null; address: string | null; topReviews?: Array<{ text: string; stars: number }> };
  youtube?: { status: string; handle: string | null; channelTitle: string | null; subscriberCount: number | null; viewCount: number | null; videoCount: number | null };
  domain?: { status: string; domain: string | null; ageYears: number | null; registrar: string | null };
  emailInfra?: { status: string; domain: string | null; hasMx: boolean; mxProvider: string | null; hasSpf: boolean; hasDmarc: boolean };
  performance?: { status: string; performanceScore: number | null; lcpMs: number | null };
  ads?: { status: string; activeAdsCount: number | null; pageName: string | null };
  score?: { total: number | null; outOf: number; measuredWeight: number; dimensions: FootprintDimensionJson[] };
  narrative?: { text: string; source: "LLM" | "TEMPLATE" };
  collectedAt?: string;
  /** ADR-0162 — rapport du filtrage d'homonymie (persisté serveur). */
  entityGate?: {
    ambiguousName: boolean;
    ambiguityReason: string | null;
    discriminants: string[];
    judge: "DETERMINISTIC_ONLY" | "DETERMINISTIC_PLUS_LLM";
    filtered: { press: number; discovery: number; maps: number; site: number; citations: number; adversarial: number };
  };
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

/**
 * « Déclaré vs Observé » (vague D) — juxtaposition déterministe, sans
 * jugement : ce que le founder a déclaré au questionnaire (pilier E) face à
 * ce que la collecte publique a réellement mesuré. Rendu seulement quand les
 * DEUX côtés existent — jamais de comparaison fabriquée.
 */
function buildDeclaredVsObserved(
  declaredE: Record<string, unknown> | null,
  fp: WebFootprintJson,
): Array<{ label: string; declared: string; observed: string }> {
  if (!declaredE) return [];
  const rows: Array<{ label: string; declared: string; observed: string }> = [];

  const totalAudience =
    (fp.followerCounts ?? []).reduce((s, c) => s + c.followerCount, 0) +
    (fp.youtube?.status === "LIVE" && fp.youtube.subscriberCount ? fp.youtube.subscriberCount : 0);
  const community = typeof declaredE.e_community === "string" ? declaredE.e_community : null;
  if (community && (totalAudience > 0 || (fp.socials ?? []).length > 0)) {
    rows.push({
      label: "Communauté",
      declared: community,
      observed: `${(fp.socials ?? []).length} canal(aux) détecté(s)${totalAudience > 0 ? ` · ${nf.format(totalAudience)} abonnés mesurés` : ""}`,
    });
  }

  const advocates = typeof declaredE.e_advocates === "string" ? declaredE.e_advocates : null;
  if (advocates && fp.maps?.status === "LIVE" && fp.maps.rating !== null) {
    rows.push({
      label: "Recommandation",
      declared: `Bouche-à-oreille : ${advocates.toLowerCase()}`,
      observed: `${fp.maps.rating}/5 · ${nf.format(fp.maps.reviewCount ?? 0)} avis Google publics`,
    });
  }

  const frequency = typeof declaredE.e_frequency === "string" ? declaredE.e_frequency : null;
  if (frequency && (fp.press ?? []).length > 0) {
    rows.push({
      label: "Rayonnement",
      declared: `Communication : ${frequency.toLowerCase()}`,
      observed: `${(fp.press ?? []).length} mention(s) presse récente(s)`,
    });
  }

  return rows;
}

export function FootprintSection({
  footprint,
  companyName,
  declaredE = null,
  gateLabels = null,
}: {
  footprint: unknown;
  companyName: string;
  /** Réponses déclarées du pilier E (intake.responses.e) — optionnel. */
  declaredE?: Record<string, unknown> | null;
  /** Libellés i18n du bloc filtrage d'homonymie (ADR-0162) — résolus par la page. */
  gateLabels?: { title: string; filteredSuffix: string; judgeDet: string; judgeLlm: string; discriminants: string } | null;
}) {
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
  const declaredVsObserved = buildDeclaredVsObserved(declaredE, fp);

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
        <div className="mb-3 flex gap-3 rounded-lg border border-border-subtle bg-background-raised p-3 print:rounded-none">
          {/* Visuel DÉTECTÉ du site (og:image, ADR-0164) — jamais inventé. */}
          {fp.site.ogImage && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={fp.site.ogImage}
              alt=""
              className="h-16 w-16 shrink-0 rounded-md border border-border-subtle object-cover"
              onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
            />
          )}
          <div className="min-w-0">
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

      {/* ── Citations web (ADR-0164) — ce que le web dit de la marque ── */}
      {(fp.webMentions?.items ?? []).length > 0 && (
        <div className="mt-3">
          <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-foreground-secondary">
            Ce qu&apos;on trouve de vous en ligne
          </p>
          <ul className="space-y-1">
            {fp.webMentions!.items.slice(0, 6).map((m) => (
              <li key={m.url} className="flex items-center gap-1.5 text-xs">
                {/* Favicon de la source (rendu client, jamais stocké) — repère
                    visuel immédiat : Tripadvisor, Petit Futé… (ADR-0164). */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`https://www.google.com/s2/favicons?domain=${encodeURIComponent(m.host)}&sz=32`}
                  alt=""
                  className="h-4 w-4 shrink-0 rounded-sm"
                  loading="lazy"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                />
                <a
                  href={m.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-foreground-secondary hover:text-primary hover:underline"
                >
                  {m.title}
                </a>
                <span className="shrink-0 text-foreground-muted"> — {m.host}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* ── Déclaré vs Observé (vague D) — juxtaposition honnête ── */}
      {declaredVsObserved.length > 0 && (
        <div className="mt-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-foreground-secondary">
            Déclaré vs observé
          </p>
          <div className="overflow-hidden rounded-lg border border-border-subtle print:rounded-none">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border-subtle bg-background-raised text-left">
                  <th className="px-3 py-1.5 font-medium text-foreground-muted"> </th>
                  <th className="px-3 py-1.5 font-medium text-foreground-muted">Vous déclarez</th>
                  <th className="px-3 py-1.5 font-medium text-foreground-muted">La collecte publique observe</th>
                </tr>
              </thead>
              <tbody>
                {declaredVsObserved.map((row) => (
                  <tr key={row.label} className="border-b border-border-subtle last:border-0">
                    <td className="px-3 py-2 font-medium text-foreground">{row.label}</td>
                    <td className="px-3 py-2 text-foreground-secondary">{row.declared}</td>
                    <td className="px-3 py-2 text-foreground">{row.observed}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-1 text-[10px] text-foreground-muted">
            Juxtaposition factuelle — la collecte publique ne voit qu'une partie de votre réalité (le hors-ligne lui échappe).
          </p>
        </div>
      )}

      {/* ── Fiche Google absente : dit honnêtement (signal, pas silence) ── */}
      {fp.maps?.status === "NOT_FOUND" && (
        <p className="mt-3 flex items-center gap-1.5 text-xs text-foreground-muted">
          <Globe className="h-3 w-3" />
          Aucune fiche Google Business trouvée pour {companyName} lors de la collecte.
        </p>
      )}

      {/* ── Filtrage d'homonymie (ADR-0162) — transparence sur le tri ── */}
      {gateLabels &&
        fp.entityGate &&
        (() => {
          const gate = fp.entityGate;
          const totalFiltered = Object.values(gate.filtered).reduce((s, n) => s + (n || 0), 0);
          if (!gate.ambiguousName && totalFiltered === 0) return null;
          return (
            <div className="mt-4 rounded-lg border border-border-subtle bg-background-raised p-3 text-xs text-foreground-secondary print:rounded-none print:border-0 print:p-0">
              <p className="font-semibold uppercase tracking-wider text-foreground-muted">{gateLabels.title}</p>
              {totalFiltered > 0 && (
                <p className="mt-1">
                  {totalFiltered} {gateLabels.filteredSuffix}
                </p>
              )}
              <p className="mt-1 text-foreground-muted">
                {gate.judge === "DETERMINISTIC_PLUS_LLM" ? gateLabels.judgeLlm : gateLabels.judgeDet}
              </p>
              {gate.discriminants.length > 0 && (
                <p className="mt-1 text-foreground-muted">
                  {gateLabels.discriminants} {gate.discriminants.slice(0, 8).join(" · ")}
                </p>
              )}
            </div>
          );
        })()}
    </section>
  );
}
