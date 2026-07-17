"use client";

/**
 * Cockpit — `/cockpit/intelligence/previsions` (ADR-0156).
 *
 * Le rapport prédictif de la marque : forecast d'audience DÉTERMINISTE
 * (tendance robuste + intervalle), avec son ERREUR MESURÉE (backtest) et une
 * confiance CALIBRÉE sur les issues réelles des prédictions passées — jamais
 * une boule de cristal auto-proclamée. Sans historique suffisant, la page le
 * dit et explique comment l'obtenir (connecter les réseaux → relevés quotidiens).
 */

import { TrendingUp } from "lucide-react";
import { trpc } from "@/lib/trpc/client";
import { useCurrentStrategyId } from "@/components/cockpit/strategy-context";
import { Card, CardBody, CardHeader, CardTitle, CardDescription, Text, Badge } from "@/components/primitives";

const fmt = (n: number) => new Intl.NumberFormat("fr-FR").format(Math.round(n));
const dateFr = (iso: string) =>
  new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });

export default function PrevisionsPage() {
  const strategyId = useCurrentStrategyId();
  const report = trpc.cockpitDashboard.getPredictiveReport.useQuery(
    { strategyId: strategyId ?? "" },
    { enabled: !!strategyId },
  );

  const r = report.data;
  const audience = r?.audience;

  return (
    <section className="@container space-y-6">
      <header>
        <h1 className="flex items-center gap-2 text-xl font-semibold text-foreground">
          <TrendingUp className="h-5 w-5 text-accent" aria-hidden />
          Prévisions
        </h1>
        <p className="mt-1 max-w-2xl text-sm text-foreground-secondary">
          Ce que vos données laissent prévoir — avec l&apos;erreur de la méthode mesurée sur votre
          propre historique, et une confiance corrigée par les prédictions passées vérifiées.
          Rien n&apos;est inventé : sans historique suffisant, on vous le dit.
        </p>
      </header>

      {report.isLoading ? (
        <Card><CardBody><Text className="text-sm text-foreground-secondary">Calcul des prévisions…</Text></CardBody></Card>
      ) : null}
      {report.error ? (
        <Card><CardBody><Badge tone="error">{report.error.message}</Badge></CardBody></Card>
      ) : null}

      {audience ? (
        <Card>
          <CardHeader>
            <CardTitle>Audience — projection à 30 jours</CardTitle>
            <CardDescription>
              Tendance robuste calculée sur vos relevés quotidiens ({audience.samples} relevés,{" "}
              {audience.spanDays} jours d&apos;historique).
            </CardDescription>
          </CardHeader>
          <CardBody>
            {audience.status === "OK" && audience.points.length > 0 ? (
              <div className="flex flex-col gap-4">
                <div className="flex flex-wrap items-baseline gap-x-6 gap-y-2">
                  <div>
                    <Text className="text-xs uppercase tracking-wide text-[color:var(--color-foreground-muted)]">Aujourd&apos;hui</Text>
                    <Text className="font-mono text-2xl font-semibold">{fmt(audience.lastValue ?? 0)}</Text>
                  </div>
                  <div>
                    <Text className="text-xs uppercase tracking-wide text-[color:var(--color-foreground-muted)]">Dans 30 jours</Text>
                    <Text className="font-mono text-2xl font-semibold text-[color:var(--color-accent)]">
                      {fmt(audience.points[audience.points.length - 1]!.v)}
                    </Text>
                    <Text className="text-xs text-[color:var(--color-foreground-muted)]">
                      intervalle {fmt(audience.points[audience.points.length - 1]!.lo)} – {fmt(audience.points[audience.points.length - 1]!.hi)}
                    </Text>
                  </div>
                  <div>
                    <Text className="text-xs uppercase tracking-wide text-[color:var(--color-foreground-muted)]">Rythme</Text>
                    <Text className="font-mono text-lg">
                      {audience.slopePerDay >= 0 ? "+" : ""}{fmt(audience.slopePerDay)}/jour
                    </Text>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 text-xs">
                  {audience.backtestMape !== null ? (
                    <Badge tone="neutral">
                      Erreur mesurée (backtest) : ±{Math.round(audience.backtestMape * 100)} %
                    </Badge>
                  ) : null}
                  {audience.calibratedConfidence !== null ? (
                    <Badge tone="neutral">
                      Confiance calibrée : {Math.round(audience.calibratedConfidence * 100)} %
                    </Badge>
                  ) : null}
                  {r && r.calibration.resolved > 0 ? (
                    <Badge tone="neutral">
                      {r.calibration.hits}/{r.calibration.resolved} prédictions passées vérifiées justes
                    </Badge>
                  ) : (
                    <Badge tone="warning">Aucune prédiction encore arrivée à échéance — la calibration s&apos;affinera</Badge>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-2 rounded-lg border border-warning/30 bg-warning/10 p-4">
                <Text className="text-sm font-semibold">Pas encore assez d&apos;historique pour prévoir honnêtement</Text>
                <Text className="text-sm text-foreground-secondary">
                  Il faut au moins 5 relevés d&apos;audience répartis sur 14 jours ({audience.samples} relevé{audience.samples > 1 ? "s" : ""} pour l&apos;instant).
                  Connectez vos réseaux (Réglages → Connexions) : les relevés quotidiens s&apos;accumulent automatiquement,
                  et la prévision s&apos;activera d&apos;elle-même.
                </Text>
              </div>
            )}
          </CardBody>
        </Card>
      ) : null}

      {r && r.openForecasts.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Prédictions en cours</CardTitle>
            <CardDescription>Enregistrées avant l&apos;échéance, elles seront confrontées au réel — c&apos;est ce qui rend la méthode vérifiable.</CardDescription>
          </CardHeader>
          <CardBody>
            <div className="flex flex-col gap-2">
              {r.openForecasts.map((f, i) => (
                <div key={i} className="flex flex-col gap-0.5 rounded-md border px-3 py-2" style={{ borderColor: "var(--color-border)" }}>
                  <Text className="text-sm">{f.statement}</Text>
                  <Text className="text-xs text-[color:var(--color-foreground-muted)]">
                    échéance {dateFr(f.horizonAt)} · confiance déclarée {Math.round(f.confidence * 100)} %
                    {f.backtestMape !== null ? ` · erreur backtest ±${Math.round(f.backtestMape * 100)} %` : ""}
                  </Text>
                </div>
              ))}
            </div>
          </CardBody>
        </Card>
      ) : null}

      {r && r.theses.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Signaux faibles — thèses en observation</CardTitle>
            <CardDescription>
              Raisonnement causal sur les signaux de votre marché. Chaque thèse est consignée et attend sa
              confrontation au réel — une thèse n&apos;est pas un fait.
            </CardDescription>
          </CardHeader>
          <CardBody>
            <div className="flex flex-col gap-2">
              {r.theses.map((t, i) => (
                <div key={i} className="flex flex-col gap-0.5 rounded-md border px-3 py-2" style={{ borderColor: "var(--color-border)" }}>
                  <Text className="text-sm">{t.statement}</Text>
                  <Text className="text-xs text-[color:var(--color-foreground-muted)]">
                    {t.category.toLowerCase().replace(/_/g, " ")} · confiance {Math.round(t.confidence * 100)} % · {dateFr(t.createdAt)}
                  </Text>
                </div>
              ))}
            </div>
          </CardBody>
        </Card>
      ) : null}
    </section>
  );
}
