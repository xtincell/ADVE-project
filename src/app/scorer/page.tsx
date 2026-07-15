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

export default function ScorerPage() {
  const [brandName, setBrandName] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [socialLinksRaw, setSocialLinksRaw] = useState("");

  const score = trpc.footprint.scoreInstant.useMutation();
  const result = score.data;

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
  const followers = result?.followerCounts ?? null;
  const totalFollowers = followers?.reduce((s, f) => s + f.followerCount, 0) ?? 0;

  return (
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
            <Input
              placeholder="Site web (https://…)"
              value={websiteUrl}
              onChange={(e) => setWebsiteUrl(e.target.value)}
            />
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
            <CardTitle>Votre score d&apos;empreinte digitale</CardTitle>
            <CardDescription>
              Voici <strong>exactement</strong> ce qu&apos;on a mesuré publiquement, et la part
              de chaque signal dans votre score. Rien de gonflé : une dimension non
              mesurable est exclue du calcul, jamais comptée à zéro en douce.
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
                <Text className="text-center text-xs text-[color:var(--color-foreground-muted)]">
                  Score calculé sur <strong>{measuredDims.length}</strong> dimension(s) mesurée(s)
                  {unmeasuredDims.length > 0 ? ` · ${unmeasuredDims.length} non mesurée(s)` : ""}.
                </Text>
              </div>

              {/* Audience réelle par plateforme — la preuve la plus parlante */}
              {followers && followers.length > 0 ? (
                <div className="flex flex-col gap-2">
                  <Text className="font-semibold">
                    Audience mesurée · {fmt(totalFollowers)} abonnés
                  </Text>
                  <div className="flex flex-col gap-1.5">
                    {followers.map((f, i) => (
                      <div
                        key={`${f.platform}-${f.handle}-${i}`}
                        className="flex items-center justify-between rounded-md border px-3 py-2 text-sm"
                        style={{ borderColor: "var(--color-border)" }}
                      >
                        <span>
                          {PLATFORM_LABELS[f.platform.toLowerCase()] ?? f.platform}
                          {f.handle ? (
                            <span className="text-[color:var(--color-foreground-muted)]"> · {f.handle}</span>
                          ) : null}
                        </span>
                        <span className="font-mono font-semibold">{fmt(f.followerCount)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              {/* Détail factuel par dimension : la preuve puis la contribution */}
              <div className="flex flex-col gap-2">
                <Text className="font-semibold">Ce qu&apos;on a mesuré</Text>
                <div className="flex flex-col gap-2">
                  {measuredDims.map((d) => (
                    <div
                      key={d.key}
                      className="flex flex-col gap-0.5 rounded-md border px-3 py-2"
                      style={{ borderColor: "var(--color-border)" }}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <Text className="font-medium">{d.label ?? DIMENSION_LABELS[d.key] ?? d.key}</Text>
                        <Text className="font-mono text-sm">
                          {d.score !== null ? `${Math.round(d.score)}/100` : "—"}
                          <span className="text-xs text-[color:var(--color-foreground-muted)]"> · poids {d.weight}%</span>
                        </Text>
                      </div>
                      {d.details ? (
                        <Text className="text-xs text-[color:var(--color-foreground-muted)]">{d.details}</Text>
                      ) : null}
                    </div>
                  ))}
                </div>
              </div>

              {/* Non mesuré : transparent sur les angles morts et pourquoi */}
              {unmeasuredDims.length > 0 ? (
                <div className="flex flex-col gap-2">
                  <Text className="font-semibold text-[color:var(--color-foreground-muted)]">
                    Non mesuré
                  </Text>
                  <div className="flex flex-col gap-1.5">
                    {unmeasuredDims.map((d) => (
                      <div key={d.key} className="flex items-center justify-between gap-3 text-sm">
                        <Text className="text-[color:var(--color-foreground-muted)]">
                          {d.label ?? DIMENSION_LABELS[d.key] ?? d.key}
                        </Text>
                        <Text className="text-xs text-[color:var(--color-foreground-muted)]">
                          {d.details ?? "non mesuré"}
                        </Text>
                      </div>
                    ))}
                  </div>
                  <Text className="text-xs text-[color:var(--color-foreground-muted)]">
                    Ces dimensions n&apos;ont pas pénalisé votre score : elles sont exclues du
                    calcul tant qu&apos;on ne peut pas les vérifier.
                  </Text>
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
  );
}
