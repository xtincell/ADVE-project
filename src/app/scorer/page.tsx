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
 */

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { trpc } from "@/lib/trpc/client";
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

const DIMENSION_LABELS: Record<string, string> = {
  site: "Site web",
  social: "Réseaux sociaux",
  reviews: "Avis clients",
  press: "Presse & mentions",
  email: "Infrastructure email",
  domain: "Ancienneté du domaine",
  perf: "Performance du site",
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

const fmt = (n: number) => new Intl.NumberFormat("fr-FR").format(n);

/**
 * Ce que chaque signal non mesuré attend — SANS site fourni (pas de jargon
 * interne). Une fois le site fourni, on n'affiche plus jamais ce hint statique
 * pour email/domain/perf — le `details` du serveur (déjà honnête : « site
 * fourni — vérification en échec, réessayez ») prend le relais (audit
 * 2026-07-16 : « le site est collecté mais ça dit le contraire »).
 */
const LEAD_HINT: Record<string, string> = {
  site: "Ajoutez votre site web",
  email: "Nécessite votre site web",
  domain: "Nécessite votre site web",
  perf: "Nécessite votre site web",
  reviews: "Votre fiche Google (avis)",
  press: "Aucune retombée presse trouvée pour l'instant",
  social: "Ajoutez vos réseaux sociaux",
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
const SCAN_STEPS: Array<{ at: number; label: string }> = [
  { at: 0, label: "Lecture de votre site (https, balises, sitemap)…" },
  { at: 8, label: "Découverte de vos réseaux sociaux…" },
  { at: 16, label: "Relevé des audiences (Instagram, Facebook, TikTok) — l'étape la plus longue…" },
  { at: 34, label: "Presse, avis Google, domaine, email professionnel…" },
  { at: 46, label: "Consolidation de tout ce qu'on a trouvé…" },
];
const SCAN_TOTAL_S = 55;

function ScanProgress() {
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
            <Text className="text-sm font-semibold">Scan en cours — environ une minute</Text>
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
            {step.label}
          </Text>
          <Text className="text-xs text-[color:var(--color-foreground-muted)]">
            On interroge tout en parallèle et on ne garde que le vérifiable — rien n&apos;est inventé.
          </Text>
        </div>
      </CardBody>
    </Card>
  );
}

/** Verdict en langage clair du /100 (le prospect comprend ce que ça VEUT dire). */
function scoreVerdict(total: number): string {
  if (total >= 80) return "Votre présence en ligne est forte — une bonne base pour bâtir une marque culte.";
  if (total >= 60) return "Votre présence en ligne est solide, mais il reste des leviers à activer.";
  if (total >= 40) return "Votre présence en ligne est en construction — plusieurs signaux clés manquent encore.";
  return "Votre présence en ligne est encore fragile — c'est justement là qu'on intervient.";
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
function buildLeadProse(brand: string, facts: FactsView, totalFollowers: number): string {
  const s: string[] = [];
  const nPlatforms = new Set(facts.socials.map((x) => x.platform.toLowerCase())).size;
  if (totalFollowers > 0) {
    s.push(`${brand} parle déjà à ${fmt(totalFollowers)} personnes sur ${nPlatforms} réseau${nPlatforms > 1 ? "x" : ""} — c'est le premier actif de la marque.`);
  } else if (nPlatforms > 0) {
    s.push(`${brand} est présente sur ${nPlatforms} réseau${nPlatforms > 1 ? "x" : ""} — l'audience reste à relever.`);
  }
  if (facts.press.length > 0) {
    s.push(`La presse en parle : ${facts.press.length} mention${facts.press.length > 1 ? "s" : ""} récente${facts.press.length > 1 ? "s" : ""}.`);
  }
  if (facts.reviews?.rating != null) {
    s.push(`Vos clients vous notent ${facts.reviews.rating}/5${facts.reviews.reviewCount ? ` sur ${fmt(facts.reviews.reviewCount)} avis` : ""}.`);
  }
  if (facts.domain?.ageYears != null && facts.domain.ageYears >= 3) {
    s.push(`Et le socle est installé : votre domaine a ${facts.domain.ageYears} ans.`);
  } else if (facts.site?.reachable) {
    s.push(`Votre site répond présent.`);
  }
  return s.join(" ");
}

/** Prose du chapitre audience — factuelle, une à deux phrases. */
function audienceProse(facts: FactsView, totalFollowers: number, audienceReason: string): string {
  const measured = facts.socials.filter((x) => x.followerCount !== null);
  if (measured.length > 0) {
    const top = [...measured].sort((a, b) => (b.followerCount ?? 0) - (a.followerCount ?? 0))[0]!;
    const topLabel = PLATFORM_LABELS[top.platform.toLowerCase()] ?? top.platform;
    return `${fmt(totalFollowers)} abonnés relevés, compte par compte. Votre place forte : ${topLabel}${top.followerCount ? ` (${fmt(top.followerCount)} abonnés)` : ""}.`;
  }
  if (facts.socials.length > 0) {
    return `${facts.socials.length} compte${facts.socials.length > 1 ? "s" : ""} détecté${facts.socials.length > 1 ? "s" : ""} — ${audienceReason}.`;
  }
  return "Aucun réseau détecté pour l'instant — ajoutez vos liens pour qu'on relève votre audience.";
}

/** Prose du chapitre réputation (presse + avis). */
function reputationProse(facts: FactsView): string {
  const p = facts.press.length;
  const r = facts.reviews;
  if (p > 0 && r?.rating != null) {
    return `On écrit sur vous, et vos clients parlent : ${p} retombée${p > 1 ? "s" : ""} presse récente${p > 1 ? "s" : ""}, et une note de ${r.rating}/5 sur votre fiche Google.`;
  }
  if (p > 0) return `On écrit sur vous : ${p} retombée${p > 1 ? "s" : ""} récente${p > 1 ? "s" : ""}. C'est du capital de preuve — chaque lien ci-dessous est vérifiable.`;
  if (r?.rating != null) return `Vos clients ont la parole : ${r.rating}/5${r.reviewCount ? ` sur ${fmt(r.reviewCount)} avis Google` : ""}.`;
  return "Pas de trace mesurée dans la presse ni d'avis Google pour l'instant — un espace à conquérir.";
}

/** Phrase verbale par fondation (site / domaine / email / perf) — depuis les faits. */
function foundationSentence(key: string, facts: FactsView, dim: Dim | undefined): string {
  switch (key) {
    case "site":
      if (!facts.site) return "";
      return facts.site.reachable
        ? `Votre site répond${dim?.details ? ` — ${dim.details}` : ""}.`
        : "Un site est déclaré mais il était injoignable pendant le scan.";
    case "domain": {
      const d = facts.domain;
      if (!d || d.ageYears == null) return "";
      return `Enregistré il y a ${d.ageYears} an${d.ageYears > 1 ? "s" : ""}${d.registrar ? ` chez ${d.registrar}` : ""} — ${d.ageYears >= 5 ? "une présence installée, ça se voit" : "une marque encore jeune sur le web"}.`;
    }
    case "email": {
      const e = facts.email;
      if (!e) return "";
      if (!e.hasMx) return "Aucune infrastructure email professionnelle détectée sur votre domaine.";
      const auth = [e.hasSpf ? "SPF" : null, e.hasDmarc ? "DMARC" : null].filter(Boolean).join(" + ");
      return `Vos emails passent par ${e.mxProvider ?? "un serveur dédié"}${auth ? `, authentifiés (${auth})` : " — sans authentification SPF/DMARC, ils risquent le dossier spam"}.`;
    }
    case "perf": {
      const p = facts.performance;
      if (!p || p.performanceScore == null) return "";
      return `${p.performanceScore}/100 sur mobile${p.lcpMs ? `, premier affichage en ${(p.lcpMs / 1000).toFixed(1)} s` : ""}.`;
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
  const [brandName, setBrandName] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [socialLinksRaw, setSocialLinksRaw] = useState("");

  const score = trpc.footprint.scoreInstant.useMutation();
  const result = score.data;
  // POURQUOI l'audience manque (jamais un « non relevée » nu) — statut absent
  // (rapport en cache pré-mise-à-jour) → copy générique.
  const audienceStatus = (result as { audienceStatus?: string } | undefined)?.audienceStatus;
  const audienceReason =
    audienceStatus === "DEFERRED"
      ? "relevé d'audience non configuré sur la plateforme"
      : audienceStatus === "PENDING"
        ? "relevé en cours en arrière-plan — revenez dans une minute et cliquez Actualiser"
        : audienceStatus === "DEGRADED"
          ? "relevé d'audience en échec — cliquez Actualiser"
          : "audience non relevée";

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
    ? new Date(result.capturedAt).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })
    : null;

  const foundationKeys = ["site", "domain", "email", "perf"] as const;
  const foundationRows = facts
    ? foundationKeys
        .map((k) => ({ key: k, dim: dimByKey.get(k), sentence: foundationSentence(k, facts, dimByKey.get(k)) }))
        .filter((r) => r.sentence && r.dim?.measured)
    : [];

  return (
    <>
      {/* En-tête léger — la page /scorer est autonome (hors layout marketing) :
          sans ça, aucun logo ni retour. Logo → La Fusée, + accès classement/connexion. */}
      <nav className="sticky top-0 z-[var(--z-topbar)] border-b border-border-subtle bg-background/70 backdrop-blur-md">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-5 py-3">
          <Link href="/lafusee" className="flex items-center gap-2" aria-label="La Fusée — accueil">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand/logos/lafusee-logo.png" alt="" aria-hidden="true" className="h-6 w-auto" />
            <span className="text-sm font-semibold tracking-tight text-foreground">
              La Fusée<span className="text-[color:var(--color-accent)]">.</span>
            </span>
          </Link>
          <div className="flex items-center gap-4 text-sm">
            <Link href="/leaderboard" className="text-foreground-secondary transition-colors hover:text-foreground">
              Classement
            </Link>
            <Link href="/lafusee" className="hidden text-foreground-secondary transition-colors hover:text-foreground sm:inline">
              L&apos;OS
            </Link>
            <Link
              href="/login"
              className="font-medium text-[color:var(--color-accent)] transition-colors hover:underline"
            >
              Connexion
            </Link>
          </div>
        </div>
      </nav>

      <main className="mx-auto flex max-w-2xl flex-col gap-6 px-5 py-10">
        <header className="flex flex-col gap-2">
        <Text className="font-mono text-xs uppercase tracking-widest text-[color:var(--color-accent)]">
          La Fusée · score gratuit · sans email
        </Text>
        <Heading level={1}>Scorez votre marque en une minute</Heading>
        <Text>
          Entrez votre marque, votre site et vos réseaux — on scanne votre empreinte
          digitale en <strong>une minute</strong>, sans inscription. Puis, si vous voulez
          aller plus loin, votre diagnostic complet (méthode ADVE) vous attend.
        </Text>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Votre marque</CardTitle>
          <CardDescription>Rien n&apos;est enregistré à cette étape.</CardDescription>
        </CardHeader>
        <CardBody>
          <form onSubmit={submit} className="flex flex-col gap-3">
            <Input
              placeholder="Nom de la marque *"
              value={brandName}
              onChange={(e) => setBrandName(e.target.value)}
              required
            />
            <div className="flex flex-col gap-1">
              <Input
                placeholder="Site web (https://…) — recommandé"
                value={websiteUrl}
                onChange={(e) => setWebsiteUrl(e.target.value)}
              />
              <Text className="text-xs text-[color:var(--color-foreground-muted)]">
                Votre site débloque 4 signaux de plus (domaine, email, performance…).
              </Text>
            </div>
            <textarea
              placeholder="Réseaux sociaux (un lien par ligne : Instagram, Facebook, TikTok…)"
              value={socialLinksRaw}
              onChange={(e) => setSocialLinksRaw(e.target.value)}
              rows={3}
              className="rounded-md border p-3 text-sm"
              style={{ borderColor: "var(--color-border)", background: "var(--color-surface)" }}
            />
            <Button type="submit" disabled={score.isPending || !brandName.trim()}>
              {score.isPending ? "Analyse en cours…" : "Scorer ma marque — gratuit"}
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
                    Le rapport d&apos;empreinte · {scanDate ?? "aujourd'hui"}
                  </Text>
                  {result.stale ? (
                    <Badge tone="warning">Donnée à rafraîchir</Badge>
                  ) : result.cached ? (
                    <Badge tone="neutral">Depuis le cache</Badge>
                  ) : null}
                </div>

                <div className="flex flex-wrap items-start justify-between gap-4" role="status" aria-live="polite">
                  <div className="min-w-0 flex-1">
                    <Heading level={1} as="h2" className="break-words">
                      {brandName.trim() || "Votre marque"}
                    </Heading>
                    {result.total !== null ? (
                      <Text className="mt-2 text-base text-foreground">{scoreVerdict(result.total)}</Text>
                    ) : (
                      <Text className="mt-2 text-base text-[color:var(--color-foreground-muted)]">
                        Pas encore assez de signal mesurable — ajoutez votre site et vos réseaux.
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
                  const lead = buildLeadProse(brandName.trim() || "Votre marque", facts, totalFollowers);
                  return lead ? (
                    <Text className="border-l-2 pl-4 text-[15px] leading-relaxed" style={{ borderColor: "var(--color-accent)" }}>
                      {lead}
                    </Text>
                  ) : null;
                })()}

                {/* Tuiles de stats — les trois chiffres de couverture du rapport */}
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { v: totalFollowers > 0 ? fmt(totalFollowers) : "—", l: "abonnés mesurés" },
                    { v: String(facts.press.length), l: "mentions presse" },
                    { v: `${Math.round(coveragePct)} %`, l: "du spectre mesuré" },
                  ].map((t) => (
                    <div key={t.l} className="flex flex-col items-center gap-0.5 rounded-lg border px-2 py-3 text-center" style={{ borderColor: "var(--color-border)" }}>
                      <span className="font-mono text-lg font-semibold text-foreground">{t.v}</span>
                      <span className="text-[10px] uppercase tracking-wide text-[color:var(--color-foreground-muted)]">{t.l}</span>
                    </div>
                  ))}
                </div>

                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[color:var(--color-foreground-muted)]">
                  <span>
                    Basé sur <strong>{measuredDims.length}</strong> signal(aux) vérifié(s) — on ne note que le vérifiable, rien n&apos;est inventé.
                  </span>
                  <button
                    type="button"
                    onClick={() => run(true)}
                    disabled={score.isPending}
                    className="font-medium text-[color:var(--color-accent)] underline-offset-2 hover:underline disabled:opacity-50"
                  >
                    {score.isPending ? "Actualisation…" : "Actualiser"}
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
                  <ChapterHead n="01" title="Votre audience" art="/brand/illustrations/megaphone-3d.png" />
                  <Text className="text-sm leading-relaxed">{audienceProse(facts, totalFollowers, audienceReason)}</Text>
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
                            <span className="shrink-0 text-xs text-[color:var(--color-foreground-muted)]">détecté · {audienceReason}</span>
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
                  <ChapterHead n="02" title="Votre réputation" art="/brand/illustrations/speech-3d.png" />
                  <Text className="text-sm leading-relaxed">{reputationProse(facts)}</Text>
                  {facts.reviews ? (
                    <div className="flex items-center justify-between gap-3 rounded-md border px-3 py-2 text-sm" style={{ borderColor: "var(--color-border)" }}>
                      <span className="min-w-0 truncate">{facts.reviews.placeName ?? "Fiche Google"}</span>
                      <span className="shrink-0 font-mono font-semibold">
                        {facts.reviews.rating}/5
                        {facts.reviews.reviewCount !== null ? (
                          <span className="text-xs font-normal text-[color:var(--color-foreground-muted)]"> · {fmt(facts.reviews.reviewCount)} avis</span>
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
                          <span className="text-sm text-foreground">« {p.title} »</span>
                          <span className="text-xs text-[color:var(--color-foreground-muted)]">
                            {p.sourceName ?? "presse"}
                            {p.publishedAt ? ` · ${new Date(p.publishedAt).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" })}` : ""}
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
                  <ChapterHead n="03" title="Vos fondations" art="/brand/illustrations/target-3d.png" />
                  <Text className="text-sm leading-relaxed">
                    Ce qui tient votre présence en ligne debout : le site, le domaine, l&apos;email, la vitesse.
                    C&apos;est invisible pour vos clients — jusqu&apos;au jour où ça manque.
                  </Text>
                  <div className="flex flex-col gap-3">
                    {foundationRows.map((r) => (
                      <div key={r.key} className="flex flex-col gap-1.5">
                        <div className="flex items-center justify-between gap-3">
                          <Text className="text-sm font-medium">{r.dim?.label ?? DIMENSION_LABELS[r.key] ?? r.key}</Text>
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
                  <ChapterHead n="04" title="Encore à mesurer" art="/brand/illustrations/lightbulb-3d.png" />
                  {/* Si le site manque → le levier n°1, mis en avant avec re-score inline */}
                  {unmeasuredDims.some((d) => d.key === "site") ? (
                    <div className="flex flex-col gap-2 rounded-lg border border-accent/30 bg-accent/[0.05] p-3">
                      <Text className="text-sm font-semibold text-foreground">
                        Ajoutez votre site web pour un score plus complet
                      </Text>
                      <Text className="text-xs text-[color:var(--color-foreground-muted)]">
                        Il débloque d&apos;un coup 4 signaux (domaine, email, performance…).
                      </Text>
                      <div className="flex flex-wrap items-center gap-2">
                        <Input
                          placeholder="https://votre-site.com"
                          value={websiteUrl}
                          onChange={(e) => setWebsiteUrl(e.target.value)}
                        />
                        <Button
                          size="sm"
                          disabled={score.isPending || !websiteUrl.trim()}
                          onClick={() => run(true)}
                        >
                          {score.isPending ? "…" : "Re-scorer"}
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
                            {d.label ?? DIMENSION_LABELS[d.key] ?? d.key}
                          </Text>
                          <Text className="text-xs text-[color:var(--color-foreground-muted)]">
                            {NEEDS_SITE.has(d.key) && unmeasuredDims.some((x) => x.key === "site")
                              ? "↑ via votre site"
                              // Le site a été mesuré : le hint statique « nécessite
                              // votre site » serait FAUX ici — on montre la vraie
                              // raison serveur (RDAP/DNS en échec, clé absente…).
                              : NEEDS_SITE.has(d.key) && d.key !== "site"
                                ? d.details ?? LEAD_HINT[d.key] ?? "à mesurer"
                                : LEAD_HINT[d.key] ?? "à mesurer"}
                          </Text>
                        </div>
                      ))}
                    <Text className="mt-1 text-xs text-[color:var(--color-foreground-muted)]">
                      Ces signaux n&apos;ont pas baissé votre score — ils sont juste en attente.
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
              <Heading level={3}>Ce n&apos;est que votre présence. Et votre marque, elle vaut quoi ?</Heading>
              <Text>
                Le vrai diagnostic (méthode ADVE, votre place dans votre ligue) est offert.
                On reprend votre marque, votre site et vos réseaux — il ne reste que vos coordonnées.
              </Text>
              <div className="flex flex-wrap justify-center gap-3">
                <Link href={intakeHref}>
                  <Button size="lg">Obtenir mon diagnostic complet — offert</Button>
                </Link>
                <Link href="/leaderboard">
                  <Button size="lg" variant="outline">Voir le classement des marques</Button>
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
