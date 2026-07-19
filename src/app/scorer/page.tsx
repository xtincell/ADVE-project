"use client";

/**
 * /scorer — le hook du funnel de capture. Score d'empreinte /100 INSTANTANÉ, public,
 * sans email (largeur max du haut de funnel). Résultat → CTA vers l'intake PRÉ-REMPLI
 * (capture email = onboarding pour le diagnostic ADVE complet). Le /100 (présence
 * digitale) est le teaser ; la force révélée /200 (leaderboard) est ce vers quoi on
 * grimpe via l'intake/la démo.
 *
 * RAPPORT MAGAZINE (mandat opérateur 2026-07-16 « du verbe et de l'image ») : les
 * données collectées sont racontées en prose éditoriale — couverture (titre, chapo,
 * score), chapitres numérotés (audience / réputation / fondations / à mesurer),
 * illustrations de marque, jauges. La prose est 100 % DÉTERMINISTE, composée depuis
 * les faits mesurés uniquement — jamais une phrase sur un signal non mesuré
 * présentée comme un fait (ADR-0046).
 *
 * i18n : toutes les chaînes rendues vivent dans `src/lib/i18n/pages/scorer.ts`
 * (fragment `scorer.*`, FR/EN/ZH). Les phrases interpolées gardent leurs
 * placeholders (`{brand}`, `{count}`…) remplacés via le helper `tf` — les
 * données dynamiques (noms, chiffres, détails serveur) ne sont jamais traduites.
 */

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { trpc } from "@/lib/trpc/client";
import { useT } from "@/lib/i18n/use-t";
import { ScoreBadge } from "@/components/shared/score-badge";
import {
  Button,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardBody,
  Heading,
  Text,
  Input,
  Badge,
} from "@/components/primitives";

const DIMENSION_LABEL_KEYS: Record<string, string> = {
  site: "scorer.dim.site",
  social: "scorer.dim.social",
  reviews: "scorer.dim.reviews",
  press: "scorer.dim.press",
  email: "scorer.dim.email",
  domain: "scorer.dim.domain",
  perf: "scorer.dim.perf",
};

const PLATFORM_LABELS: Record<string, string> = {
  instagram: "Instagram",
  facebook: "Facebook",
  tiktok: "TikTok",
  youtube: "YouTube",
  linkedin: "LinkedIn",
  x: "X",
  twitter: "X",
};

/** Locale BCP-47 pour dates/nombres, alignée sur la locale UI. */
const localeTag = (locale: string) =>
  locale === "en" ? "en-GB" : locale === "zh" ? "zh-CN" : "fr-FR";

/** Contexte i18n passé aux composeurs de prose déterministe. */
interface I18nCtx {
  t: (key: string) => string;
  tf: (key: string, vars: Record<string, string | number>) => string;
  fmt: (n: number) => string;
}

/**
 * Ce que chaque signal non mesuré attend — SANS site fourni (pas de jargon
 * interne). Une fois le site fourni, on n'affiche plus jamais ce hint statique
 * pour email/domain/perf — le `details` du serveur (déjà honnête : « site
 * fourni — vérification en échec, réessayez ») prend le relais (audit
 * 2026-07-16 : « le site est collecté mais ça dit le contraire »).
 */
const LEAD_HINT_KEYS: Record<string, string> = {
  site: "scorer.hint.site",
  email: "scorer.hint.email",
  domain: "scorer.hint.domain",
  perf: "scorer.hint.perf",
  reviews: "scorer.hint.reviews",
  press: "scorer.hint.press",
  social: "scorer.hint.social",
};
/** Dimensions qui se débloquent en fournissant un site web. */
const NEEDS_SITE = new Set(["site", "email", "domain", "perf"]);

/**
 * Progression du scan — la fenêtre de collecte dure ~1 minute (tout part en
 * parallèle : site, découverte des réseaux, relevé des audiences, presse,
 * domaine, email…) et on consolide à la fin. L'animation suit cette minute
 * pour rendre l'attente tolérable ; les étapes affichées sont les étapes
 * RÉELLES du scan, pas un théâtre.
 */
const SCAN_STEPS: Array<{ at: number; key: string }> = [
  { at: 0, key: "scorer.scan.step1" },
  { at: 8, key: "scorer.scan.step2" },
  { at: 16, key: "scorer.scan.step3" },
  { at: 34, key: "scorer.scan.step4" },
  { at: 46, key: "scorer.scan.step5" },
];
const SCAN_TOTAL_S = 55;

function ScanProgress() {
  const { t } = useT();
  const [elapsed, setElapsed] = useState(0);
  const startRef = useRef(Date.now());
  useEffect(() => {
    const id = setInterval(() => setElapsed(Math.floor((Date.now() - startRef.current) / 1000)), 500);
    return () => clearInterval(id);
  }, []);
  // La barre plafonne à 96 % tant que la réponse n'est pas là — jamais un faux 100 %.
  const pct = Math.min(96, Math.round((elapsed / SCAN_TOTAL_S) * 100));
  const step = [...SCAN_STEPS].reverse().find((st) => elapsed >= st.at) ?? SCAN_STEPS[0]!;
  return (
    <Card>
      <CardBody>
        <div className="flex flex-col gap-3 py-2">
          <div className="flex items-center justify-between gap-3">
            <Text className="text-sm font-semibold">{t("scorer.scan.title")}</Text>
            <Text className="font-mono text-xs text-[color:var(--color-foreground-muted)]">
              {Math.min(elapsed, SCAN_TOTAL_S)}s / ~{SCAN_TOTAL_S}s
            </Text>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full" style={{ background: "var(--color-surface)" }}>
            <div
              className="h-full rounded-full transition-all duration-500 ease-linear"
              style={{ width: `${pct}%`, background: "var(--color-accent)" }}
            />
          </div>
          <Text className="text-xs text-[color:var(--color-foreground-muted)]" aria-live="polite">
            {t(step.key)}
          </Text>
          <Text className="text-xs text-[color:var(--color-foreground-muted)]">
            {t("scorer.scan.honesty")}
          </Text>
        </div>
      </CardBody>
    </Card>
  );
}

/** Verdict en langage clair du /100 (le prospect comprend ce que ça VEUT dire). */
function scoreVerdict(total: number, t: I18nCtx["t"]): string {
  if (total >= 80) return t("scorer.verdict.strong");
  if (total >= 60) return t("scorer.verdict.solid");
  if (total >= 40) return t("scorer.verdict.building");
  return t("scorer.verdict.fragile");
}

// ── Types locaux (miroir du contrat serveur, côté rendu) ─────────────────────
interface Dim {
  key: string;
  label: string;
  details: string;
  measured: boolean;
  score: number | null;
  weight: number;
}
interface FactsView {
  socials: Array<{ platform: string; handle: string | null; url: string | null; followerCount: number | null; source: string | null }>;
  press: Array<{ title: string; url: string; sourceName: string | null; publishedAt: string | null }>;
  domain: { domain: string | null; ageYears: number | null; registrar: string | null; createdAt: string | null } | null;
  email: { hasMx: boolean; mxProvider: string | null; hasSpf: boolean; hasDmarc: boolean } | null;
  reviews: { placeName: string | null; rating: number | null; reviewCount: number | null } | null;
  performance: { performanceScore: number | null; lcpMs: number | null } | null;
  youtube: { channelTitle: string | null; subscriberCount: number | null; videoCount: number | null } | null;
  site: { url: string | null; reachable: boolean } | null;
}

/**
 * CHAPO — la prose de couverture, 100 % déterministe, composée UNIQUEMENT
 * depuis les faits mesurés. Chaque phrase a sa condition de mesure : on ne
 * raconte jamais un signal non relevé comme un fait.
 */
function buildLeadProse(brand: string, facts: FactsView, totalFollowers: number, i: I18nCtx): string {
  const s: string[] = [];
  const nPlatforms = new Set(facts.socials.map((x) => x.platform.toLowerCase())).size;
  const networks = i.t(nPlatforms > 1 ? "scorer.unit.networks" : "scorer.unit.network");
  if (totalFollowers > 0) {
    s.push(i.tf("scorer.lead.audience", { brand, followers: i.fmt(totalFollowers), count: nPlatforms, networks }));
  } else if (nPlatforms > 0) {
    s.push(i.tf("scorer.lead.presence", { brand, count: nPlatforms, networks }));
  }
  if (facts.press.length > 0) {
    s.push(
      facts.press.length > 1
        ? i.tf("scorer.lead.press.many", { count: facts.press.length })
        : i.t("scorer.lead.press.one"),
    );
  }
  if (facts.reviews?.rating != null) {
    const reviewsPart = facts.reviews.reviewCount
      ? i.tf("scorer.lead.reviewsPart", { count: i.fmt(facts.reviews.reviewCount) })
      : "";
    s.push(i.tf("scorer.lead.reviews", { rating: facts.reviews.rating, reviewsPart }));
  }
  if (facts.domain?.ageYears != null && facts.domain.ageYears >= 3) {
    s.push(i.tf("scorer.lead.domain", { age: facts.domain.ageYears }));
  } else if (facts.site?.reachable) {
    s.push(i.t("scorer.lead.site"));
  }
  return s.join(" ");
}

/** Prose du chapitre audience — factuelle, une à deux phrases. */
function audienceProse(facts: FactsView, totalFollowers: number, audienceReason: string, i: I18nCtx): string {
  const measured = facts.socials.filter((x) => x.followerCount !== null);
  if (measured.length > 0) {
    const top = [...measured].sort((a, b) => (b.followerCount ?? 0) - (a.followerCount ?? 0))[0]!;
    const topLabel = PLATFORM_LABELS[top.platform.toLowerCase()] ?? top.platform;
    const topPart = top.followerCount ? i.tf("scorer.audience.topPart", { count: i.fmt(top.followerCount) }) : "";
    return i.tf("scorer.audience.measured", { total: i.fmt(totalFollowers), top: topLabel, topPart });
  }
  if (facts.socials.length > 0) {
    return facts.socials.length > 1
      ? i.tf("scorer.audience.detected.many", { count: facts.socials.length, reason: audienceReason })
      : i.tf("scorer.audience.detected.one", { reason: audienceReason });
  }
  return i.t("scorer.audience.none");
}

/** Prose du chapitre réputation (presse + avis). */
function reputationProse(facts: FactsView, i: I18nCtx): string {
  const p = facts.press.length;
  const r = facts.reviews;
  if (p > 0 && r?.rating != null) {
    const pressPart =
      p > 1 ? i.tf("scorer.reputation.pressCount.many", { count: p }) : i.t("scorer.reputation.pressCount.one");
    return i.tf("scorer.reputation.both", { pressPart, rating: r.rating });
  }
  if (p > 0) {
    const pressPart =
      p > 1
        ? i.tf("scorer.reputation.pressOnlyCount.many", { count: p })
        : i.t("scorer.reputation.pressOnlyCount.one");
    return i.tf("scorer.reputation.pressOnly", { pressPart });
  }
  if (r?.rating != null) {
    const reviewsPart = r.reviewCount ? i.tf("scorer.reputation.reviewsPart", { count: i.fmt(r.reviewCount) }) : "";
    return i.tf("scorer.reputation.reviewsOnly", { rating: r.rating, reviewsPart });
  }
  return i.t("scorer.reputation.none");
}

/** Phrase verbale par fondation (site / domaine / email / perf) — depuis les faits. */
function foundationSentence(key: string, facts: FactsView, dim: Dim | undefined, i: I18nCtx): string {
  switch (key) {
    case "site":
      if (!facts.site) return "";
      return facts.site.reachable
        ? i.tf("scorer.foundation.siteUp", { detailsPart: dim?.details ? ` — ${dim.details}` : "" })
        : i.t("scorer.foundation.siteDown");
    case "domain": {
      const d = facts.domain;
      if (!d || d.ageYears == null) return "";
      return i.tf("scorer.foundation.domain", {
        age: d.ageYears,
        years: i.t(d.ageYears > 1 ? "scorer.unit.years" : "scorer.unit.year"),
        registrarPart: d.registrar ? i.tf("scorer.foundation.domainRegistrar", { registrar: d.registrar }) : "",
        ageVerdict: i.t(d.ageYears >= 5 ? "scorer.foundation.domainInstalled" : "scorer.foundation.domainYoung"),
      });
    }
    case "email": {
      const e = facts.email;
      if (!e) return "";
      if (!e.hasMx) return i.t("scorer.foundation.emailNone");
      const auth = [e.hasSpf ? "SPF" : null, e.hasDmarc ? "DMARC" : null].filter(Boolean).join(" + ");
      return i.tf("scorer.foundation.email", {
        provider: e.mxProvider ?? i.t("scorer.foundation.emailDedicated"),
        authPart: auth ? i.tf("scorer.foundation.emailAuth", { auth }) : i.t("scorer.foundation.emailNoAuth"),
      });
    }
    case "perf": {
      const p = facts.performance;
      if (!p || p.performanceScore == null) return "";
      return i.tf("scorer.foundation.perf", {
        score: p.performanceScore,
        lcpPart: p.lcpMs ? i.tf("scorer.foundation.perfLcp", { seconds: (p.lcpMs / 1000).toFixed(1) }) : "",
      });
    }
    default:
      return dim?.details ?? "";
  }
}

/** Jauge éditoriale (barre fine) — tokens only. */
function Meter({ value }: { value: number }) {
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full" style={{ background: "var(--color-surface)" }} aria-hidden>
      <div className="h-full rounded-full" style={{ width: `${Math.max(2, Math.min(100, value))}%`, background: "var(--color-accent)" }} />
    </div>
  );
}

/** En-tête de chapitre magazine : numéro mono + filet + titre + illustration. */
function ChapterHead({ n, title, art }: { n: string; title: string; art?: string }) {
  return (
    <div className="flex items-center gap-3 pt-2">
      <span className="font-mono text-xs tracking-widest text-[color:var(--color-accent)]">{n}</span>
      <div className="h-px flex-1" style={{ background: "var(--color-border)" }} />
      <Heading level={3} as="h2" className="shrink-0">{title}</Heading>
      {art ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={art} alt="" aria-hidden="true" className="h-9 w-9 shrink-0 object-contain" />
      ) : null}
    </div>
  );
}

export default function ScorerPage() {
  const { t, locale } = useT();
  const [brandName, setBrandName] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [socialLinksRaw, setSocialLinksRaw] = useState("");

  // Helpers i18n : formatage nombres/dates aligné sur la locale UI + interpolation.
  const intlTag = localeTag(locale);
  const fmt = (n: number) => new Intl.NumberFormat(intlTag).format(n);
  const tf = (key: string, vars: Record<string, string | number>): string =>
    Object.entries(vars).reduce((acc, [k, v]) => acc.split(`{${k}}`).join(String(v)), t(key));
  const i18n: I18nCtx = { t, tf, fmt };

  const score = trpc.footprint.scoreInstant.useMutation();
  const result = score.data;
  // POURQUOI l'audience manque (jamais un « non relevée » nu) — statut absent
  // (rapport en cache pré-mise-à-jour) → copy générique.
  const audienceStatus = (result as { audienceStatus?: string } | undefined)?.audienceStatus;
  const audienceReason =
    audienceStatus === "DEFERRED"
      ? t("scorer.audienceReason.deferred")
      : audienceStatus === "PENDING"
        ? t("scorer.audienceReason.pending")
        : audienceStatus === "DEGRADED"
          ? t("scorer.audienceReason.degraded")
          : t("scorer.audienceReason.none");

  /** Label localisé d'une dimension — le label serveur (donnée) garde la priorité. */
  const dimLabel = (key: string, serverLabel?: string | null): string => {
    const k = DIMENSION_LABEL_KEYS[key];
    return serverLabel ?? (k ? t(k) : key);
  };
  const leadHint = (key: string): string => {
    const k = LEAD_HINT_KEYS[key];
    return k ? t(k) : t("scorer.hint.pending");
  };

  function run(refresh: boolean) {
    if (!brandName.trim()) return;
    score.mutate({
      brandName: brandName.trim(),
      websiteUrl: websiteUrl.trim() || undefined,
      socialLinksRaw: socialLinksRaw.trim() || undefined,
      refresh,
    });
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    run(false);
  }

  const intakeHref =
    `/intake?company=${encodeURIComponent(brandName.trim())}` +
    (websiteUrl.trim() ? `&website=${encodeURIComponent(websiteUrl.trim())}` : "") +
    (socialLinksRaw.trim() ? `&social=${encodeURIComponent(socialLinksRaw.trim())}` : "") +
    `&source=scorer`;

  const dims = (result?.dimensions ?? []) as Dim[];
  const dimByKey = new Map(dims.map((d) => [d.key, d]));
  const measuredDims = dims.filter((d) => d.measured);
  const unmeasuredDims = dims.filter((d) => !d.measured);
  const facts = (result?.facts ?? null) as FactsView | null;
  const factSocials = facts?.socials ?? [];
  const totalFollowers = factSocials.reduce((s, f) => s + (f.followerCount ?? 0), 0);
  const maxFollowers = Math.max(0, ...factSocials.map((f) => f.followerCount ?? 0));
  const coveragePct = result?.measuredWeight ?? 0;
  const scanDate = result?.capturedAt
    ? new Date(result.capturedAt).toLocaleDateString(intlTag, { day: "numeric", month: "long", year: "numeric" })
    : null;

  const foundationKeys = ["site", "domain", "email", "perf"] as const;
  const foundationRows = facts
    ? foundationKeys
        .map((k) => ({ key: k, dim: dimByKey.get(k), sentence: foundationSentence(k, facts, dimByKey.get(k), i18n) }))
        .filter((r) => r.sentence && r.dim?.measured)
    : [];

  return (
    <>
      {/* En-tête léger — la page /scorer est autonome (hors layout marketing) :
          sans ça, aucun logo ni retour. Logo → La Fusée, + accès classement/connexion. */}
      <nav className="sticky top-0 z-[var(--z-topbar)] border-b border-border-subtle bg-background/70 backdrop-blur-md">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-5 py-3">
          <Link href="/lafusee" className="flex items-center gap-2" aria-label={t("scorer.nav.homeAria")}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand/logos/lafusee-logo.png" alt="" aria-hidden="true" className="h-6 w-auto" />
            <span className="text-sm font-semibold tracking-tight text-foreground">
              {t("scorer.nav.brand")}<span className="text-[color:var(--color-accent)]">.</span>
            </span>
          </Link>
          <div className="flex items-center gap-4 text-sm">
            <Link href="/leaderboard" className="text-foreground-secondary transition-colors hover:text-foreground">
              {t("scorer.nav.leaderboard")}
            </Link>
            <Link href="/lafusee" className="hidden text-foreground-secondary transition-colors hover:text-foreground sm:inline">
              {t("scorer.nav.os")}
            </Link>
            <Link
              href="/login"
              className="font-medium text-[color:var(--color-accent)] transition-colors hover:underline"
            >
              {t("scorer.nav.login")}
            </Link>
          </div>
        </div>
      </nav>

      <main className="mx-auto flex max-w-2xl flex-col gap-6 px-5 py-10">
        <header className="flex flex-col gap-2">
        <Text className="font-mono text-xs uppercase tracking-widest text-[color:var(--color-accent)]">
          {t("scorer.hero.kicker")}
        </Text>
        <Heading level={1}>{t("scorer.hero.title")}</Heading>
        <Text>
          {t("scorer.hero.lede.before")}
          <strong>{t("scorer.hero.lede.strong")}</strong>
          {t("scorer.hero.lede.after")}
        </Text>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>{t("scorer.form.title")}</CardTitle>
          <CardDescription>{t("scorer.form.description")}</CardDescription>
        </CardHeader>
        <CardBody>
          <form onSubmit={submit} className="flex flex-col gap-3">
            <Input
              placeholder={t("scorer.form.brandPlaceholder")}
              value={brandName}
              onChange={(e) => setBrandName(e.target.value)}
              required
            />
            <div className="flex flex-col gap-1">
              <Input
                placeholder={t("scorer.form.websitePlaceholder")}
                value={websiteUrl}
                onChange={(e) => setWebsiteUrl(e.target.value)}
              />
              <Text className="text-xs text-[color:var(--color-foreground-muted)]">
                {t("scorer.form.websiteHint")}
              </Text>
            </div>
            <textarea
              placeholder={t("scorer.form.socialPlaceholder")}
              value={socialLinksRaw}
              onChange={(e) => setSocialLinksRaw(e.target.value)}
              rows={3}
              className="rounded-md border p-3 text-sm"
              style={{ borderColor: "var(--color-border)", background: "var(--color-surface)" }}
            />
            <Button type="submit" disabled={score.isPending || !brandName.trim()}>
              {score.isPending ? t("scorer.form.submitting") : t("scorer.form.submit")}
            </Button>
            {score.error ? <Badge tone="error">{score.error.message}</Badge> : null}
          </form>
        </CardBody>
      </Card>

      {score.isPending ? <ScanProgress /> : null}

      {result && facts ? (
        <article className="flex flex-col gap-6">
          {/* ── COUVERTURE — le rapport s'ouvre comme un magazine ─────────── */}
          <Card>
            <CardBody>
              <div className="flex flex-col gap-5 py-2">
                <div className="flex items-center justify-between gap-3">
                  <Text className="font-mono text-[10px] uppercase tracking-[0.2em] text-[color:var(--color-accent)]">
                    {t("scorer.cover.kicker")} · {scanDate ?? t("scorer.cover.today")}
                  </Text>
                  {result.stale ? (
                    <Badge tone="warning">{t("scorer.cover.stale")}</Badge>
                  ) : result.cached ? (
                    <Badge tone="neutral">{t("scorer.cover.cached")}</Badge>
                  ) : null}
                </div>

                <div className="flex flex-wrap items-start justify-between gap-4" role="status" aria-live="polite">
                  <div className="min-w-0 flex-1">
                    <Heading level={1} as="h2" className="break-words">
                      {brandName.trim() || t("scorer.cover.yourBrand")}
                    </Heading>
                    {result.total !== null ? (
                      <Text className="mt-2 text-base text-foreground">{scoreVerdict(result.total, t)}</Text>
                    ) : (
                      <Text className="mt-2 text-base text-[color:var(--color-foreground-muted)]">
                        {t("scorer.cover.noSignal")}
                      </Text>
                    )}
                  </div>
                  <div className="flex shrink-0 flex-col items-center gap-1">
                    {result.total !== null ? (
                      <ScoreBadge score={result.total} maxScore={100} mode="cockpit" size="xl" />
                    ) : (
                      <span className="font-mono text-4xl text-[color:var(--color-foreground-muted)]">—/100</span>
                    )}
                  </div>
                </div>

                {/* Chapo éditorial — prose déterministe depuis les faits mesurés */}
                {(() => {
                  const lead = buildLeadProse(brandName.trim() || t("scorer.cover.yourBrand"), facts, totalFollowers, i18n);
                  return lead ? (
                    <Text className="border-l-2 pl-4 text-[15px] leading-relaxed" style={{ borderColor: "var(--color-accent)" }}>
                      {lead}
                    </Text>
                  ) : null;
                })()}

                {/* Tuiles de stats — les trois chiffres de couverture du rapport */}
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { v: totalFollowers > 0 ? fmt(totalFollowers) : "—", l: t("scorer.cover.stat.followers") },
                    { v: String(facts.press.length), l: t("scorer.cover.stat.press") },
                    { v: `${Math.round(coveragePct)} %`, l: t("scorer.cover.stat.coverage") },
                  ].map((tile) => (
                    <div key={tile.l} className="flex flex-col items-center gap-0.5 rounded-lg border px-2 py-3 text-center" style={{ borderColor: "var(--color-border)" }}>
                      <span className="font-mono text-lg font-semibold text-foreground">{tile.v}</span>
                      <span className="text-[10px] uppercase tracking-wide text-[color:var(--color-foreground-muted)]">{tile.l}</span>
                    </div>
                  ))}
                </div>

                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[color:var(--color-foreground-muted)]">
                  <span>
                    {t("scorer.cover.basis.before")} <strong>{measuredDims.length}</strong> {t("scorer.cover.basis.after")}
                  </span>
                  <button
                    type="button"
                    onClick={() => run(true)}
                    disabled={score.isPending}
                    className="font-medium text-[color:var(--color-accent)] underline-offset-2 hover:underline disabled:opacity-50"
                  >
                    {score.isPending ? t("scorer.cover.refreshing") : t("scorer.cover.refresh")}
                  </button>
                </div>
              </div>
            </CardBody>
          </Card>

          {/* ── 01 · VOTRE AUDIENCE ───────────────────────────────────────── */}
          {factSocials.length > 0 ? (
            <Card>
              <CardBody>
                <div className="flex flex-col gap-4">
                  <ChapterHead n="01" title={t("scorer.ch1.title")} art="/brand/illustrations/megaphone-3d.png" />
                  <Text className="text-sm leading-relaxed">{audienceProse(facts, totalFollowers, audienceReason, i18n)}</Text>
                  <div className="flex flex-col gap-2.5">
                    {factSocials.map((f, i) => (
                      <div key={`${f.platform}-${f.handle ?? i}`} className="flex flex-col gap-1.5">
                        <div className="flex items-center justify-between gap-3 text-sm">
                          <span className="min-w-0 truncate">
                            <span className="font-medium">{PLATFORM_LABELS[f.platform.toLowerCase()] ?? f.platform}</span>
                            {f.handle ? (
                              f.url ? (
                                <a href={f.url} target="_blank" rel="noreferrer" className="text-[color:var(--color-foreground-muted)] underline-offset-2 hover:underline"> @{f.handle}</a>
                              ) : (
                                <span className="text-[color:var(--color-foreground-muted)]"> @{f.handle}</span>
                              )
                            ) : null}
                          </span>
                          {f.followerCount !== null ? (
                            <span className="shrink-0 font-mono font-semibold">{fmt(f.followerCount)}</span>
                          ) : (
                            <span className="shrink-0 text-xs text-[color:var(--color-foreground-muted)]">{t("scorer.ch1.detected")} · {audienceReason}</span>
                          )}
                        </div>
                        {f.followerCount !== null && maxFollowers > 0 ? (
                          <Meter value={(f.followerCount / maxFollowers) * 100} />
                        ) : null}
                      </div>
                    ))}
                  </div>
                </div>
              </CardBody>
            </Card>
          ) : null}

          {/* ── 02 · VOTRE RÉPUTATION (presse + avis) ─────────────────────── */}
          {facts.press.length > 0 || facts.reviews ? (
            <Card>
              <CardBody>
                <div className="flex flex-col gap-4">
                  <ChapterHead n="02" title={t("scorer.ch2.title")} art="/brand/illustrations/speech-3d.png" />
                  <Text className="text-sm leading-relaxed">{reputationProse(facts, i18n)}</Text>
                  {facts.reviews ? (
                    <div className="flex items-center justify-between gap-3 rounded-md border px-3 py-2 text-sm" style={{ borderColor: "var(--color-border)" }}>
                      <span className="min-w-0 truncate">{facts.reviews.placeName ?? t("scorer.ch2.googleCard")}</span>
                      <span className="shrink-0 font-mono font-semibold">
                        {facts.reviews.rating}/5
                        {facts.reviews.reviewCount !== null ? (
                          <span className="text-xs font-normal text-[color:var(--color-foreground-muted)]"> · {fmt(facts.reviews.reviewCount)} {t("scorer.ch2.reviewsUnit")}</span>
                        ) : null}
                      </span>
                    </div>
                  ) : null}
                  {facts.press.length > 0 ? (
                    <div className="flex flex-col gap-1.5">
                      {facts.press.map((p, i) => (
                        <a
                          key={`${p.url}-${i}`}
                          href={p.url}
                          target="_blank"
                          rel="noreferrer"
                          className="flex flex-col gap-0.5 rounded-md border px-3 py-2 transition-colors hover:border-[color:var(--color-accent)]"
                          style={{ borderColor: "var(--color-border)" }}
                        >
                          <span className="text-sm text-foreground">{t("scorer.ch2.quoteOpen")}{p.title}{t("scorer.ch2.quoteClose")}</span>
                          <span className="text-xs text-[color:var(--color-foreground-muted)]">
                            {p.sourceName ?? t("scorer.ch2.pressFallback")}
                            {p.publishedAt ? ` · ${new Date(p.publishedAt).toLocaleDateString(intlTag, { day: "numeric", month: "short", year: "numeric" })}` : ""}
                          </span>
                        </a>
                      ))}
                    </div>
                  ) : null}
                </div>
              </CardBody>
            </Card>
          ) : null}

          {/* ── 03 · VOS FONDATIONS (site, domaine, email, performance) ───── */}
          {foundationRows.length > 0 ? (
            <Card>
              <CardBody>
                <div className="flex flex-col gap-4">
                  <ChapterHead n="03" title={t("scorer.ch3.title")} art="/brand/illustrations/target-3d.png" />
                  <Text className="text-sm leading-relaxed">
                    {t("scorer.ch3.lede")}
                  </Text>
                  <div className="flex flex-col gap-3">
                    {foundationRows.map((r) => (
                      <div key={r.key} className="flex flex-col gap-1.5">
                        <div className="flex items-center justify-between gap-3">
                          <Text className="text-sm font-medium">{dimLabel(r.key, r.dim?.label)}</Text>
                          <Text className="shrink-0 font-mono text-sm">{r.dim?.score !== null && r.dim ? `${Math.round(r.dim.score!)}/100` : "—"}</Text>
                        </div>
                        <Text className="text-xs leading-relaxed text-[color:var(--color-foreground-muted)]">{r.sentence}</Text>
                        {r.dim?.score != null ? <Meter value={r.dim.score} /> : null}
                      </div>
                    ))}
                  </div>
                </div>
              </CardBody>
            </Card>
          ) : null}

          {/* ── 04 · ENCORE À MESURER — honnête, avec l'action claire ─────── */}
          {unmeasuredDims.length > 0 ? (
            <Card>
              <CardBody>
                <div className="flex flex-col gap-4">
                  <ChapterHead n="04" title={t("scorer.ch4.title")} art="/brand/illustrations/lightbulb-3d.png" />
                  {/* Si le site manque → le levier n°1, mis en avant avec re-score inline */}
                  {unmeasuredDims.some((d) => d.key === "site") ? (
                    <div className="flex flex-col gap-2 rounded-lg border border-accent/30 bg-accent/[0.05] p-3">
                      <Text className="text-sm font-semibold text-foreground">
                        {t("scorer.ch4.addSiteTitle")}
                      </Text>
                      <Text className="text-xs text-[color:var(--color-foreground-muted)]">
                        {t("scorer.ch4.addSiteHint")}
                      </Text>
                      <div className="flex flex-wrap items-center gap-2">
                        <Input
                          placeholder={t("scorer.ch4.sitePlaceholder")}
                          value={websiteUrl}
                          onChange={(e) => setWebsiteUrl(e.target.value)}
                        />
                        <Button
                          size="sm"
                          disabled={score.isPending || !websiteUrl.trim()}
                          onClick={() => run(true)}
                        >
                          {score.isPending ? "…" : t("scorer.ch4.rescore")}
                        </Button>
                      </div>
                    </div>
                  ) : null}

                  {/* Le reste, en une ligne claire chacun (jamais les raisons internes) */}
                  <div className="flex flex-col gap-1">
                    {unmeasuredDims
                      .filter((d) => d.key !== "site")
                      .map((d) => (
                        <div key={d.key} className="flex items-center justify-between gap-3 text-sm">
                          <Text className="text-[color:var(--color-foreground-muted)]">
                            {dimLabel(d.key, d.label)}
                          </Text>
                          <Text className="text-xs text-[color:var(--color-foreground-muted)]">
                            {NEEDS_SITE.has(d.key) && unmeasuredDims.some((x) => x.key === "site")
                              ? t("scorer.hint.viaSite")
                              // Le site a été mesuré : le hint statique « nécessite
                              // votre site » serait FAUX ici — on montre la vraie
                              // raison serveur (RDAP/DNS en échec, clé absente…).
                              : NEEDS_SITE.has(d.key) && d.key !== "site"
                                ? d.details ?? leadHint(d.key)
                                : leadHint(d.key)}
                          </Text>
                        </div>
                      ))}
                    <Text className="mt-1 text-xs text-[color:var(--color-foreground-muted)]">
                      {t("scorer.ch4.note")}
                    </Text>
                  </div>
                </div>
              </CardBody>
            </Card>
          ) : null}
        </article>
      ) : null}

      {result ? (
        <Card>
          <CardBody>
            <div className="flex flex-col gap-3 text-center">
              <Heading level={3}>{t("scorer.cta.title")}</Heading>
              <Text>
                {t("scorer.cta.body")}
              </Text>
              <div className="flex flex-wrap justify-center gap-3">
                <Link href={intakeHref}>
                  <Button size="lg">{t("scorer.cta.diagnostic")}</Button>
                </Link>
                <Link href="/leaderboard">
                  <Button size="lg" variant="outline">{t("scorer.cta.leaderboard")}</Button>
                </Link>
              </div>
            </div>
          </CardBody>
        </Card>
      ) : null}
      </main>
    </>
  );
}
