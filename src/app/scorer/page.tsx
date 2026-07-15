"use client";

/**
 * /scorer — le hook du funnel de capture. Score d'empreinte /100 INSTANTANÉ, public,
 * sans email (largeur max du haut de funnel). Résultat → CTA vers l'intake PRÉ-REMPLI
 * (capture email = onboarding pour le diagnostic ADVE complet). Le /100 (présence
 * digitale) est le teaser ; la force révélée /200 (leaderboard) est ce vers quoi on
 * grimpe via l'intake/la démo.
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
              Mesure de votre présence publique aujourd&apos;hui. Chaque dimension non
              mesurable est exclue — le score est honnête, jamais gonflé.
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
            {result.total === null ? (
              <Text>
                Trop peu de signal public mesurable pour l&apos;instant. Ajoutez un site et
                des réseaux, ou passez directement au diagnostic complet ci-dessous.
              </Text>
            ) : (
              <div className="flex flex-col items-center gap-4">
                <ScoreBadge score={result.total} maxScore={100} mode="cockpit" size="xl" />
                <div className="flex w-full flex-col gap-1">
                  {result.dimensions.map((d) => (
                    <div key={d.key} className="flex items-center justify-between text-sm">
                      <Text>{DIMENSION_LABELS[d.key] ?? d.key}</Text>
                      <Text className="font-mono">
                        {d.measured ? (d.score !== null ? `${Math.round(d.score)}/100` : "—") : "non mesuré"}
                      </Text>
                    </div>
                  ))}
                </div>
              </div>
            )}
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
