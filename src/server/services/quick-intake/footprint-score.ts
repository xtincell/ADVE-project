/**
 * Score d'empreinte digitale /100 (ADR-0121 vague A). 100 % déterministe.
 *
 * Principe d'honnêteté : une dimension NON MESURÉE (pas de clé, pas de site,
 * rien trouvé faute de moyen de vérifier) est EXCLUE du dénominateur — le
 * total est renormalisé sur le poids effectivement mesuré. Une dimension
 * mesurée et FAIBLE (site injoignable, 0 abonnés) compte, elle. Si rien
 * n'est mesurable → total null (« non mesuré »), jamais un faux zéro.
 */

// Types importés depuis le module feuille `footprint-types` (et non depuis
// `public-enrichment`) : rompt le cycle d'import statique. Re-export pour la
// rétro-compat des consommateurs qui importaient d'ici (footprint-narrative,
// footprint-section).
import type {
  EnrichedFootprint,
  FootprintDimension,
  FootprintScore,
} from "./footprint-types";

export type { FootprintDimension, FootprintScore } from "./footprint-types";

const clamp = (n: number, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, Math.round(n)));

/** Échelle log borne pour les audiences (1k→~50, 100k→~83, 1M→100). */
function audienceScore(total: number): number {
  if (total <= 0) return 0;
  return clamp((Math.log10(total) / 6) * 100);
}

export function computeFootprintScore(f: EnrichedFootprint): FootprintScore {
  const dims: FootprintDimension[] = [];

  // ── Site (20) — mesuré dès qu'une URL a été déclarée/testée ──
  if (f.site) {
    let s = 0;
    const parts: string[] = [];
    if (f.site.reachable) {
      s += 40;
      const t = f.site.tech;
      if (t?.https) { s += 10; parts.push("https"); }
      if (t?.hasMetaDescription) { s += 15; parts.push("meta description"); }
      if (t?.hasOgTags) { s += 10; parts.push("og:tags"); }
      if (t?.hasSitemap) { s += 15; parts.push("sitemap"); }
      if (t?.hasRobotsTxt) { s += 10; parts.push("robots.txt"); }
      if (t?.cms) parts.push(t.cms);
    } else {
      parts.push("site injoignable");
    }
    dims.push({ key: "site", label: "Site web", weight: 20, measured: true, score: clamp(s), details: parts.join(" · ") || "site atteint" });
  } else {
    dims.push({ key: "site", label: "Site web", weight: 20, measured: false, score: null, details: "aucun site déclaré ni détecté" });
  }

  // ── Social (30) — mesuré si ≥1 profil détecté OU si la découverte a réellement tourné ──
  const realCounts = f.followerCounts ?? [];
  const ytSubs = f.youtube?.status === "LIVE" && f.youtube.subscriberCount ? f.youtube.subscriberCount : 0;
  const totalAudience = realCounts.reduce((sum, c) => sum + c.followerCount, 0) + ytSubs;
  const socialMeasured = f.socials.length > 0 || f.discovery.status === "OK";
  if (socialMeasured) {
    const presence = clamp(f.socials.length * 15, 0, 40); // multi-canal
    const audience = totalAudience > 0 ? (audienceScore(totalAudience) * 60) / 100 : realCounts.length > 0 || ytSubs > 0 ? 0 : 20; // hints seuls : mi-chemin prudent
    // Détail FACTUEL : nommer les plateformes détectées (jamais un « 3 canal(aux) »
    // opaque) + l'audience mesurée, ou dire honnêtement qu'elle n'est pas relevée.
    const platforms = [...new Set(f.socials.map((s) => s.platform.toLowerCase()))].join(", ");
    dims.push({
      key: "social", label: "Réseaux sociaux", weight: 30, measured: true,
      score: clamp(presence + audience),
      details: `${platforms || "présence détectée"}${totalAudience > 0 ? ` · ${new Intl.NumberFormat("fr-FR").format(totalAudience)} abonnés mesurés` : " · audience non relevée"}`,
    });
  } else {
    dims.push({ key: "social", label: "Réseaux sociaux", weight: 30, measured: false, score: null, details: "découverte non exécutée (clé absente) et rien de déclaré" });
  }

  // ── Avis (15) — mesuré seulement si le collecteur Maps a tourné ──
  if (f.maps && (f.maps.status === "LIVE" || f.maps.status === "NOT_FOUND")) {
    if (f.maps.status === "LIVE" && f.maps.rating !== null) {
      const volume = clamp(Math.log10(Math.max(1, f.maps.reviewCount ?? 1)) * 25, 0, 40);
      dims.push({
        key: "reviews", label: "Avis Google", weight: 15, measured: true,
        score: clamp((f.maps.rating / 5) * 60 + volume),
        details: `${f.maps.rating}/5 · ${f.maps.reviewCount ?? 0} avis`,
      });
    } else {
      dims.push({ key: "reviews", label: "Avis Google", weight: 15, measured: true, score: 0, details: "aucune fiche Google Business trouvée" });
    }
  } else {
    dims.push({ key: "reviews", label: "Avis Google", weight: 15, measured: false, score: null, details: "collecteur non configuré" });
  }

  // ── Presse (10) — mesurée dès que le flux a tourné (press défini) ──
  if (f.enrichment.press === "LIVE" || f.enrichment.press === "EMPTY") {
    const n = (f.press ?? []).length;
    dims.push({ key: "press", label: "Presse", weight: 10, measured: true, score: clamp(n * 25), details: n > 0 ? `${n} mention(s) récente(s)` : "aucune mention récente" });
  } else {
    dims.push({ key: "press", label: "Presse", weight: 10, measured: false, score: null, details: "flux presse indisponible" });
  }

  // ── Email pro (10) ──
  if (f.emailInfra?.status === "LIVE") {
    let s = 0;
    const parts: string[] = [];
    if (f.emailInfra.hasMx) { s += 50; parts.push(f.emailInfra.mxProvider ?? "MX"); }
    if (f.emailInfra.hasSpf) { s += 25; parts.push("SPF"); }
    if (f.emailInfra.hasDmarc) { s += 25; parts.push("DMARC"); }
    dims.push({ key: "email", label: "Email professionnel", weight: 10, measured: true, score: clamp(s), details: parts.join(" · ") || "aucune infrastructure email" });
  } else {
    dims.push({ key: "email", label: "Email professionnel", weight: 10, measured: false, score: null, details: "domaine non vérifiable" });
  }

  // ── Maturité domaine (5) ──
  if (f.domain?.status === "LIVE" && f.domain.ageYears !== null) {
    dims.push({
      key: "domain", label: "Maturité du domaine", weight: 5, measured: true,
      score: clamp((f.domain.ageYears / 10) * 100),
      details: `${f.domain.ageYears} an(s)${f.domain.registrar ? ` · ${f.domain.registrar}` : ""}`,
    });
  } else {
    dims.push({ key: "domain", label: "Maturité du domaine", weight: 5, measured: false, score: null, details: "domaine non vérifiable" });
  }

  // ── Performance (10) ──
  if (f.performance?.status === "LIVE" && f.performance.performanceScore !== null) {
    dims.push({
      key: "perf", label: "Performance du site", weight: 10, measured: true,
      score: clamp(f.performance.performanceScore),
      details: `${f.performance.performanceScore}/100 mobile${f.performance.lcpMs ? ` · LCP ${(f.performance.lcpMs / 1000).toFixed(1)}s` : ""}`,
    });
  } else {
    dims.push({ key: "perf", label: "Performance du site", weight: 10, measured: false, score: null, details: "non mesurée" });
  }

  const measured = dims.filter((d) => d.measured && d.score !== null);
  const measuredWeight = measured.reduce((s, d) => s + d.weight, 0);
  const total =
    measuredWeight > 0
      ? clamp(measured.reduce((s, d) => s + (d.score! * d.weight) / measuredWeight, 0))
      : null;

  return { total, outOf: 100, measuredWeight, dimensions: dims };
}
