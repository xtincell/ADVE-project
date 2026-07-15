"use client";

/**
 * /console/signal/prospect-scoring — ADR-0154.
 *
 * Voie produit gouvernée : l'opérateur mesure un prospect (et ses concurrents) et
 * les place sur le leaderboard public pour créer l'envie de se positionner. Chaque
 * marque = une émission gouvernée `SESHAT_SCORE_PROSPECT` (shell → footprint →
 * score). Le client boucle par-marque. Puis Hunter (LLM) propose des victoires
 * documentées → file de revue → `recordEpreuve`.
 *
 * missionContribution: GROUND_INFRASTRUCTURE
 * groundJustification: surface opérateur interne (acquisition/mesure). Le résultat
 *   public est le leaderboard ; cette console ne l'est jamais.
 */

import { useMemo, useState } from "react";
import Link from "next/link";
import { trpc } from "@/lib/trpc/client";
import { PageHeader } from "@/components/shared/page-header";
import { canonicalSectorSlug } from "@/domain/sector-taxonomy";
import { MARKET_SCALES, MARKET_SCALE_LABELS, type MarketScale } from "@/domain/market-scale";
import { INTAKE_SECTORS, INTAKE_COUNTRIES } from "@/lib/constants/intake-options";
import {
  Button, Card, CardHeader, CardTitle, CardDescription, CardBody,
  Badge, Heading, Text, Input, Select, Spinner,
} from "@/components/primitives";

interface BrandForm {
  name: string;
  sectorRaw: string;
  countryCode: string;
  marketScale: string;
  websiteUrl: string;
  socialLinksRaw: string;
}
const EMPTY: BrandForm = { name: "", sectorRaw: "", countryCode: "CM", marketScale: "NATION", websiteUrl: "", socialLinksRaw: "" };

interface Placed {
  strategyId: string;
  name: string;
  force: number;
  tier: string;
  coveragePct: number;
  league: string;
  footprintStatus: string;
}

export default function ProspectScoringPage() {
  const [brands, setBrands] = useState<BrandForm[]>([{ ...EMPTY }]);
  const [placed, setPlaced] = useState<Placed[]>([]);
  const [progress, setProgress] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [rivalName, setRivalName] = useState("");

  const score = trpc.scoreur.scoreProspect.useMutation();
  const hunt = trpc.scoreur.huntVictories.useMutation();
  const decide = trpc.scoreur.decideCandidate.useMutation();
  const utils = trpc.useUtils();
  const subjectId = placed[0]?.strategyId;
  const candidates = trpc.scoreur.listCandidates.useQuery(
    { subjectStrategyId: subjectId, status: "PENDING" },
    { enabled: !!subjectId },
  );

  function setBrand(i: number, patch: Partial<BrandForm>) {
    setBrands((b) => b.map((x, j) => (j === i ? { ...x, ...patch } : x)));
  }

  async function placeAll() {
    setErr(null);
    setPlaced([]);
    const list = brands.filter((b) => b.name.trim());
    if (!list.length) return;
    const results: Placed[] = [];
    for (let i = 0; i < list.length; i++) {
      const b = list[i]!;
      setProgress(`Mesure de « ${b.name} » (${i + 1}/${list.length})…`);
      try {
        const r = await score.mutateAsync({
          name: b.name.trim(),
          sectorRaw: b.sectorRaw.trim() || null,
          countryCode: b.countryCode || null,
          marketScale: (b.marketScale || null) as MarketScale | null,
          websiteUrl: b.websiteUrl.trim() || null,
          socialLinksRaw: b.socialLinksRaw.trim() || null,
        });
        results.push({
          strategyId: r.strategyId,
          name: b.name.trim(),
          force: r.verdict.force,
          tier: r.verdict.tier,
          coveragePct: r.verdict.coveragePct,
          league: `${r.league.sectorSlug} · ${r.league.marketScale ?? "n.d."} · ${r.league.countryCode ?? "—"}`,
          footprintStatus: r.footprintStatus,
        });
        setPlaced([...results].sort((x, y) => y.force - x.force));
      } catch (e) {
        setErr(`« ${b.name} » : ${e instanceof Error ? e.message : String(e)}`);
        break;
      }
    }
    setProgress(null);
  }

  const leagueOfSubject = placed[0]?.league;
  const sameLeague = useMemo(
    () => placed.length > 1 && placed.every((p) => p.league === placed[0]!.league),
    [placed],
  );

  return (
    <section className="space-y-6">
      <PageHeader
        title="Scorer un prospect"
        description="Mesurez une marque (et ses concurrents) et placez-la sur le leaderboard public — pour créer l'envie de se positionner. Données publiques uniquement."
      />

      {/* ── Bloc 1 : placer une marque + rivaux ── */}
      <Card>
        <CardHeader>
          <CardTitle>Placer des marques</CardTitle>
          <CardDescription>Le prospect + ses concurrents. Chacun est mesuré et classé dans sa ligue.</CardDescription>
        </CardHeader>
        <CardBody>
          <div className="flex flex-col gap-5">
            {brands.map((b, i) => (
              <div key={i} className="flex flex-col gap-2 rounded-lg border border-border p-3">
                <div className="flex items-center justify-between">
                  <Text className="text-xs font-mono uppercase tracking-wider text-foreground-muted">
                    {i === 0 ? "Prospect" : `Concurrent ${i}`}
                  </Text>
                  {i > 0 && (
                    <button
                      type="button"
                      onClick={() => setBrands((arr) => arr.filter((_, j) => j !== i))}
                      className="text-xs text-foreground-muted hover:text-error"
                    >
                      Retirer
                    </button>
                  )}
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  <Input placeholder="Nom de la marque *" value={b.name} onChange={(e) => setBrand(i, { name: e.target.value })} />
                  <div className="flex items-center gap-2">
                    <Input placeholder="Secteur (texte libre)" value={b.sectorRaw} onChange={(e) => setBrand(i, { sectorRaw: e.target.value })} />
                    {b.sectorRaw.trim() ? <Badge tone="info">{canonicalSectorSlug(b.sectorRaw)}</Badge> : null}
                  </div>
                  <Select value={b.countryCode} onChange={(e) => setBrand(i, { countryCode: e.target.value })}>
                    {INTAKE_COUNTRIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                  </Select>
                  <Select value={b.marketScale} onChange={(e) => setBrand(i, { marketScale: e.target.value })}>
                    {MARKET_SCALES.map((s) => <option key={s} value={s}>{MARKET_SCALE_LABELS[s]}</option>)}
                  </Select>
                  <Input placeholder="Site web (https://…)" value={b.websiteUrl} onChange={(e) => setBrand(i, { websiteUrl: e.target.value })} />
                  <Input placeholder="Réseaux (un lien par ligne)" value={b.socialLinksRaw} onChange={(e) => setBrand(i, { socialLinksRaw: e.target.value })} />
                </div>
                <details className="text-xs text-foreground-muted">
                  <summary className="cursor-pointer">Choisir un secteur canon</summary>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {INTAKE_SECTORS.map((s) => (
                      <button key={s.value} type="button" onClick={() => setBrand(i, { sectorRaw: s.value })}
                        className="rounded border border-border px-2 py-0.5 hover:border-accent">{s.label}</button>
                    ))}
                  </div>
                </details>
              </div>
            ))}
            <div className="flex flex-wrap items-center gap-3">
              <Button variant="outline" onClick={() => setBrands((b) => [...b, { ...EMPTY }])}>+ Ajouter un concurrent</Button>
              <Button onClick={placeAll} disabled={score.isPending || !brands.some((b) => b.name.trim())}>
                {score.isPending ? <><Spinner size="sm" /> {progress ?? "Mesure…"}</> : "Mesurer et placer sur le leaderboard"}
              </Button>
              {progress ? <Text className="text-sm text-foreground-muted">{progress}</Text> : null}
            </div>
            {err ? <Badge tone="error">{err}</Badge> : null}
          </div>
        </CardBody>
      </Card>

      {/* ── Bloc 2 : tête-à-tête ── */}
      {placed.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Tête-à-tête</CardTitle>
            <CardDescription>
              {sameLeague ? `Même ligue : ${leagueOfSubject}` : "Ligues différentes (échelle/secteur/pays distincts)."}
              {" · "}
              <Link href="/leaderboard" className="text-[color:var(--color-accent)] underline-offset-2 hover:underline">Voir le leaderboard public →</Link>
            </CardDescription>
          </CardHeader>
          <CardBody>
            <div className="overflow-x-auto rounded-xl border border-border">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-border bg-background/60 text-xs uppercase tracking-wider text-foreground-muted">
                  <tr><th className="px-4 py-2">#</th><th className="px-4 py-2">Marque</th><th className="px-4 py-2">Force</th><th className="px-4 py-2">Palier</th><th className="px-4 py-2">Couverture</th><th className="px-4 py-2">Ligue</th><th className="px-4 py-2">Empreinte</th></tr>
                </thead>
                <tbody>
                  {placed.map((p, i) => (
                    <tr key={p.strategyId} className="border-b border-border last:border-0">
                      <td className="px-4 py-2 font-mono">{i + 1}</td>
                      <td className="px-4 py-2 font-medium text-foreground">{p.name}{i === 0 ? <Badge tone="info" className="ml-2">prospect</Badge> : null}</td>
                      <td className="px-4 py-2 font-mono font-semibold">{p.force}/200</td>
                      <td className="px-4 py-2">{p.tier}</td>
                      <td className="px-4 py-2 font-mono">{p.coveragePct}%</td>
                      <td className="px-4 py-2 font-mono text-xs text-foreground-secondary">{p.league}</td>
                      <td className="px-4 py-2 text-xs">{p.footprintStatus === "OK" ? <Badge tone="success">collectée</Badge> : <Badge tone="warning">{p.footprintStatus === "DEFERRED" ? "à connecter" : "sans signal"}</Badge>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardBody>
        </Card>
      )}

      {/* ── Bloc 3 : file de revue des victoires (Hunter) ── */}
      {subjectId && (
        <Card>
          <CardHeader>
            <CardTitle>Victoires documentées — revue</CardTitle>
            <CardDescription>Hunter (IA) propose des victoires sourcées du prospect vs un rival. Chaque victoire validée devient une épreuve qui compte dans le score.</CardDescription>
          </CardHeader>
          <CardBody>
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <Input placeholder="Nom du rival à comparer" value={rivalName} onChange={(e) => setRivalName(e.target.value)} className="max-w-xs" />
              <Button
                variant="outline"
                disabled={hunt.isPending || !rivalName.trim()}
                onClick={async () => {
                  setErr(null);
                  try {
                    const r = await hunt.mutateAsync({ subjectStrategyId: subjectId, rivalName: rivalName.trim() });
                    if (r.deferred) setErr("Recherche IA indisponible (clé LLM absente) — 0 victoire proposée.");
                    await utils.scoreur.listCandidates.invalidate();
                  } catch (e) { setErr(e instanceof Error ? e.message : String(e)); }
                }}
              >
                {hunt.isPending ? <><Spinner size="sm" /> Chasse…</> : "Chasser des victoires"}
              </Button>
              {hunt.data && !hunt.data.deferred ? <Text className="text-sm text-foreground-muted">{hunt.data.pending} en attente · {hunt.data.autoRejected} sans source (rejetées)</Text> : null}
            </div>

            {candidates.isLoading ? (
              <Spinner />
            ) : !candidates.data || candidates.data.length === 0 ? (
              <Text className="text-sm text-foreground-muted">Aucune victoire en attente de revue.</Text>
            ) : (
              <div className="flex flex-col gap-2">
                {candidates.data.map((c) => (
                  <div key={c.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border p-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <Badge tone="neutral">Arène {c.arena}</Badge>
                        <Badge tone={c.proposedResult === "WIN" ? "success" : "error"}>{c.proposedResult}</Badge>
                        <Text className="text-xs text-foreground-muted">vs {c.rivalName}</Text>
                      </div>
                      <Text className="mt-1 text-sm">{c.claim}</Text>
                      {c.sourceUrl ? <a href={c.sourceUrl} target="_blank" rel="noreferrer" className="text-xs text-[color:var(--color-accent)] underline-offset-2 hover:underline">{c.sourceTitle ?? c.sourceUrl}</a> : null}
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" disabled={decide.isPending}
                        onClick={async () => { await decide.mutateAsync({ candidateId: c.id, decision: "APPROVE" }); await utils.scoreur.listCandidates.invalidate(); }}>
                        Valider
                      </Button>
                      <Button size="sm" variant="outline" disabled={decide.isPending}
                        onClick={async () => { await decide.mutateAsync({ candidateId: c.id, decision: "REJECT" }); await utils.scoreur.listCandidates.invalidate(); }}>
                        Refuser
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardBody>
        </Card>
      )}
    </section>
  );
}
