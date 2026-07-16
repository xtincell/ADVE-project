"use client";

/**
 * /scorer — le hook du funnel de capture. Score d'empreinte /100 INSTANTANÉ, public,
 * sans email (largeur max du haut de funnel). Résultat → CTA vers l'intake PRÉ-REMPLI
 * (capture email = onboarding pour le diagnostic ADVE complet). Le /100 (présence
 * digitale) est le teaser ; la force révélée /200 (leaderboard) est ce vers quoi on
 * grimpe via l'intake/la démo.
 *
 * Rapport DENSE & FACTUEL : chaque dimension affiche la PREUVE mesurée (`details` —
 * « 6 an(s) · registrar », « MX · SPF · DMARC », « 1 753 abonnés mesurés ») avant sa
 * contribution au /100. Le score n'est jamais un chiffre nu : on montre sur quoi il
 * se base, et ce qui n'a pas pu être mesuré (et pourquoi).
 */

import { useState } from "react";
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

/** Verdict en langage clair du /100 (le prospect comprend ce que ça VEUT dire). */
function scoreVerdict(total: number): string {
  if (total >= 80) return "Votre présence en ligne est forte — une bonne base pour bâtir une marque culte.";
  if (total >= 60) return "Votre présence en ligne est solide, mais il reste des leviers à activer.";
  if (total >= 40) return "Votre présence en ligne est en construction — plusieurs signaux clés manquent encore.";
  return "Votre présence en ligne est encore fragile — c'est justement là qu'on intervient.";
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

  const dims = result?.dimensions ?? [];
  const measuredDims = dims.filter((d) => d.measured);
  const unmeasuredDims = dims.filter((d) => !d.measured);
  const facts = result?.facts ?? null;
  const factSocials = facts?.socials ?? [];
  const totalFollowers = factSocials.reduce((s, f) => s + (f.followerCount ?? 0), 0);
  const coveragePct = result?.measuredWeight ?? 0;

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
        <Heading level={1}>Scorez votre marque en 30 secondes</Heading>
        <Text>
          Entrez votre marque, votre site et vos réseaux — on mesure votre empreinte
          digitale <strong>tout de suite</strong>, sans inscription. Puis, si vous voulez
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

      {result ? (
        <Card>
          <CardHeader>
            <CardTitle>Votre présence en ligne, mesurée</CardTitle>
            <CardDescription>
              Voici ce qu&apos;on a trouvé sur vous <strong>publiquement</strong>, en 30 secondes.
              On ne note que ce qu&apos;on peut vérifier — rien n&apos;est inventé.
            </CardDescription>
            {result.capturedAt ? (
              <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[color:var(--color-foreground-muted)]">
                <span>
                  {result.cached ? "Dernier scan" : "Scanné"} le{" "}
                  {new Date(result.capturedAt).toLocaleDateString("fr-FR", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </span>
                {result.stale ? (
                  <Badge tone="warning">Donnée à rafraîchir</Badge>
                ) : result.cached ? (
                  <Badge tone="neutral">Depuis le cache</Badge>
                ) : null}
                <button
                  type="button"
                  onClick={() => run(true)}
                  disabled={score.isPending}
                  className="font-medium text-[color:var(--color-accent)] underline-offset-2 hover:underline disabled:opacity-50"
                >
                  {score.isPending ? "Actualisation…" : "Actualiser"}
                </button>
              </div>
            ) : null}
          </CardHeader>
          <CardBody>
            <div className="flex flex-col gap-6">
              {/* Score + résumé de couverture */}
              <div className="flex flex-col items-center gap-3">
                {result.total !== null ? (
                  <ScoreBadge score={result.total} maxScore={100} mode="cockpit" size="xl" />
                ) : (
                  <div className="flex flex-col items-center gap-1">
                    <span className="font-mono text-4xl text-[color:var(--color-foreground-muted)]">—/100</span>
                    <Text className="text-xs text-[color:var(--color-foreground-muted)]">
                      Pas encore assez de signal mesurable
                    </Text>
                  </div>
                )}
                {result.total !== null ? (
                  <Text className="max-w-[42ch] text-center text-sm text-foreground">
                    {scoreVerdict(result.total)}
                  </Text>
                ) : null}
                <Text className="text-center text-xs text-[color:var(--color-foreground-muted)]">
                  Basé sur <strong>{measuredDims.length}</strong> signal(aux) vérifié(s)
                  {coveragePct > 0 && coveragePct < 100 ? ` · ${Math.round(coveragePct)} % du spectre public mesuré` : ""}.
                </Text>
              </div>

              {/* Vos réseaux — chaque compte détecté, avec l'audience quand mesurée */}
              {factSocials.length > 0 ? (
                <div className="flex flex-col gap-2">
                  <Text className="font-semibold">
                    Vos réseaux{totalFollowers > 0 ? ` · ${fmt(totalFollowers)} abonnés mesurés` : ""}
                  </Text>
                  <div className="flex flex-col gap-1.5">
                    {factSocials.map((f, i) => (
                      <div
                        key={`${f.platform}-${f.handle ?? i}`}
                        className="flex items-center justify-between gap-3 rounded-md border px-3 py-2 text-sm"
                        style={{ borderColor: "var(--color-border)" }}
                      >
                        <span className="min-w-0 truncate">
                          {PLATFORM_LABELS[f.platform.toLowerCase()] ?? f.platform}
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
                          <span className="shrink-0 text-xs text-[color:var(--color-foreground-muted)]">compte détecté · {audienceReason}</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              {/* Presse — les mentions elles-mêmes, vérifiables (titre + source + lien) */}
              {facts && facts.press.length > 0 ? (
                <div className="flex flex-col gap-2">
                  <Text className="font-semibold">On parle de vous · {facts.press.length} mention(s)</Text>
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
                        <span className="text-sm text-foreground">{p.title}</span>
                        <span className="text-xs text-[color:var(--color-foreground-muted)]">
                          {p.sourceName ?? "presse"}
                          {p.publishedAt ? ` · ${new Date(p.publishedAt).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" })}` : ""}
                        </span>
                      </a>
                    ))}
                  </div>
                </div>
              ) : null}

              {/* Avis Google — la fiche trouvée, note réelle */}
              {facts?.reviews ? (
                <div className="flex flex-col gap-2">
                  <Text className="font-semibold">Vos avis clients</Text>
                  <div
                    className="flex items-center justify-between gap-3 rounded-md border px-3 py-2 text-sm"
                    style={{ borderColor: "var(--color-border)" }}
                  >
                    <span className="min-w-0 truncate">{facts.reviews.placeName ?? "Fiche Google"}</span>
                    <span className="shrink-0 font-mono font-semibold">
                      {facts.reviews.rating}/5
                      {facts.reviews.reviewCount !== null ? (
                        <span className="text-xs font-normal text-[color:var(--color-foreground-muted)]"> · {fmt(facts.reviews.reviewCount)} avis</span>
                      ) : null}
                    </span>
                  </div>
                </div>
              ) : null}

              {/* Ce qu'on a trouvé : la preuve, en clair (pas de « poids » ni jargon) */}
              {measuredDims.length > 0 ? (
                <div className="flex flex-col gap-2">
                  <Text className="font-semibold">Ce qu&apos;on a trouvé sur vous</Text>
                  <div className="flex flex-col gap-2">
                    {measuredDims.map((d) => (
                      <div
                        key={d.key}
                        className="flex flex-col gap-0.5 rounded-md border px-3 py-2"
                        style={{ borderColor: "var(--color-border)" }}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <Text className="font-medium">{d.label ?? DIMENSION_LABELS[d.key] ?? d.key}</Text>
                          <Text className="font-mono text-sm text-foreground">
                            {d.score !== null ? `${Math.round(d.score)}/100` : "—"}
                          </Text>
                        </div>
                        {d.details ? (
                          <Text className="text-xs text-[color:var(--color-foreground-muted)]">{d.details}</Text>
                        ) : null}
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              {/* À débloquer : action claire (surtout : ajouter le site), zéro jargon */}
              {unmeasuredDims.length > 0 ? (
                <div className="flex flex-col gap-3">
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
                    <Text className="text-xs font-semibold text-[color:var(--color-foreground-muted)]">
                      Encore à mesurer
                    </Text>
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
              ) : null}
            </div>
          </CardBody>
        </Card>
      ) : null}

      {result ? (
        <Card>
          <CardBody>
            <div className="flex flex-col gap-3 text-center">
              <Heading level={3}>Ce n&apos;est que votre présence. Et votre marque, elle vaut quoi ?</Heading>
              <Text>
                Le vrai diagnostic (méthode ADVE, votre place dans votre ligue) est offert.
                On reprend ce que vous venez d&apos;entrer — vous n&apos;avez rien à re-taper.
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
