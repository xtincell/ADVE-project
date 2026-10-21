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
import { ARENA_LABELS, SCOREUR_ARENAS, type ScoreurArena, type EpreuveResult, type LeagueKey } from "@/domain/scoreur";
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
  leagueKey: LeagueKey;
  footprintStatus: string;
}

export default function ProspectScoringPage() {
  const [brands, setBrands] = useState<BrandForm[]>([{ ...EMPTY }]);
  const [placed, setPlaced] = useState<Placed[]>([]);
  const [progress, setProgress] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [proofFeedback, setProofFeedback] = useState<{ error: boolean; text: string } | null>(null);
  const [reviewFeedback, setReviewFeedback] = useState<{ error: boolean; text: string } | null>(null);
  const [rivalName, setRivalName] = useState("");
  const [subjectId, setSubjectId] = useState<string>();
  const [existingId, setExistingId] = useState("");
  const [rivalLinks, setRivalLinks] = useState<Record<string, string>>({});
  const [proofDates, setProofDates] = useState<Record<string, string>>({});
  const [manual, setManual] = useState({ opponent: "", claim: "", source: "", date: "", arena: "D" as ScoreurArena, result: "WIN" as EpreuveResult });

  const score = trpc.scoreur.scoreProspect.useMutation();
  const existingScore = trpc.scoreur.scoreBrand.useMutation();
  const record = trpc.scoreur.recordEpreuve.useMutation();
  const dossiers = trpc.strategy.list.useQuery({});
  const canon = trpc.scoreur.getCanon.useQuery();
  const hunt = trpc.scoreur.huntVictories.useMutation();
  const decide = trpc.scoreur.decideCandidate.useMutation();
  const utils = trpc.useUtils();
  const subject = placed.find((p) => p.strategyId === subjectId);
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
    setSubjectId(undefined);
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
          leagueKey: r.league,
          footprintStatus: r.footprintStatus,
        });
        if (results.length === 1) setSubjectId(r.strategyId);
        setPlaced([...results].sort((x, y) => y.force - x.force));
      } catch (e) {
        setErr(`« ${b.name} » : ${e instanceof Error ? e.message : String(e)}`);
        break;
      }
    }
    setProgress(null);
  }

  const leagueOfSubject = subject?.league;
  const sameLeague = useMemo(
    () => placed.length > 0 && placed.every((p) => p.league === placed[0]!.league),
    [placed],
  );
  const availableAnchors = (canon.data?.anchors ?? []).filter((a) => subject &&
    (!a.sectorSlug || a.sectorSlug === subject.leagueKey.sectorSlug) &&
    (!a.marketScale || a.marketScale === subject.leagueKey.marketScale) &&
    (!a.countryCode || a.countryCode === subject.leagueKey.countryCode));

  function updateDisplayedScore(strategyId: string, verdict: { force: number; tier: string; coveragePct: number }) {
    setPlaced((rows) => rows.map((p) => p.strategyId === strategyId ? { ...p, force: verdict.force, tier: verdict.tier, coveragePct: verdict.coveragePct } : p)
      .sort((a, b) => b.force - a.force));
  }

  async function addExisting() {
    const dossier = dossiers.data?.find((s) => s.id === existingId);
    if (!dossier) return;
    setErr(null);
    try {
      const r = await existingScore.mutateAsync({ strategyId: dossier.id });
      const l = r.verdict.league;
      const row: Placed = { strategyId: dossier.id, name: dossier.name, force: r.verdict.force, tier: r.verdict.tier,
        coveragePct: r.verdict.coveragePct, leagueKey: l, league: `${l.sectorSlug} · ${l.marketScale ?? "n.d."} · ${l.countryCode ?? "—"}`, footprintStatus: "STORED" };
      setPlaced((rows) => [...rows.filter((p) => p.strategyId !== dossier.id), row].sort((a, b) => b.force - a.force));
      setSubjectId((id) => id ?? dossier.id);
    } catch (e) { setErr(e instanceof Error ? e.message : String(e)); }
  }

  async function recordManual(event: React.FormEvent) {
    event.preventDefault();
    if (!subject) return;
    setErr(null);
    setProofFeedback(null);
    try {
      const [kind, id] = manual.opponent.split(":");
      if (!id) throw new Error("Choisissez un adversaire identifié");
      const url = new URL(manual.source);
      if (!["https:", "http:"].includes(url.protocol)) throw new Error("Indiquez une source web consultable");
      const r = await record.mutateAsync({ strategyId: subject.strategyId,
        ...(kind === "ref" ? { opponentBrandRefId: id } : { opponentStrategyId: id }), league: { ...subject.leagueKey, marketScale: subject.leagueKey.marketScale as MarketScale | null },
        arena: manual.arena, result: manual.result, proofWeight: 0.5,
        source: `manual-review:${manual.claim.trim()} @${url.href}`, occurredAt: new Date(`${manual.date}T00:00:00.000Z`).toISOString() });
      updateDisplayedScore(subject.strategyId, r.score.verdict);
      setManual((value) => ({ ...value, claim: "", source: "", date: "" }));
      setProofFeedback({ error: false, text: "Observation enregistrée et score publié." });
    } catch (e) { setProofFeedback({ error: true, text: e instanceof Error ? e.message : String(e) }); }
  }

  async function decideProof(candidateId: string, decision: "APPROVE" | "REJECT") {
    setErr(null);
    setReviewFeedback(null);
    try {
      const r = await decide.mutateAsync({ candidateId, decision, strategyId: subjectId,
        ...(decision === "APPROVE" ? { occurredAt: new Date(`${proofDates[candidateId]}T00:00:00.000Z`).toISOString() } : {}),
        ...(rivalLinks[candidateId] ? { rivalStrategyId: rivalLinks[candidateId] } : {}) });
      if (r.score) updateDisplayedScore(r.strategyId, r.score.verdict);
      await utils.scoreur.listCandidates.invalidate();
      setReviewFeedback({ error: false, text: decision === "APPROVE" ? "Preuve validée et score publié." : "Preuve refusée ; elle ne compte pas dans le score." });
    } catch (e) { setReviewFeedback({ error: true, text: e instanceof Error ? e.message : String(e) }); }
  }

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
            <div className="space-y-2 rounded-lg border border-border p-3">
              <label htmlFor="score-existing" className="text-sm text-foreground-secondary">Marque existante</label>
              <div className="flex flex-wrap items-center gap-2">
                <Select id="score-existing" value={existingId} onChange={(e) => setExistingId(e.target.value)} className="max-w-md">
                  <option value="">Choisir un dossier…</option>
                  {(dossiers.data ?? []).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </Select>
                <Button variant="outline" disabled={!existingId || existingScore.isPending} onClick={addExisting}>Calculer depuis les données conservées</Button>
              </div>
              <Text className="text-xs text-foreground-muted">Reprend le même dossier et ses observations. Aucune nouvelle collecte n’est lancée.</Text>
            </div>
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
              {" · "}
              <Link href="/console/signal/brand-directory" className="text-[color:var(--color-accent)] underline-offset-2 hover:underline">Base de marques</Link>
              {" · "}
              <Link href="/console/signal/scoreur-canon" className="text-[color:var(--color-accent)] underline-offset-2 hover:underline">Canon du scoreur</Link>
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
                      <td className="px-4 py-2 font-mono">{sameLeague ? i + 1 : "—"}</td>
                      <td className="px-4 py-2 font-medium text-foreground">{p.name}{p.strategyId === subjectId ? <Badge tone="info" className="ml-2">prospect</Badge> : null}</td>
                      <td className="px-4 py-2 font-mono font-semibold">{p.force}/200</td>
                      <td className="px-4 py-2">{p.tier}</td>
                      <td className="px-4 py-2 font-mono">{p.coveragePct}%</td>
                      <td className="px-4 py-2 font-mono text-xs text-foreground-secondary">{p.league}</td>
                      <td className="px-4 py-2 text-xs">{p.footprintStatus === "STORED" ? <Badge tone="neutral">données conservées</Badge> : p.footprintStatus === "OK" ? <Badge tone="success">collectée</Badge> : <Badge tone="warning">{p.footprintStatus === "DEFERRED" ? "à connecter" : "sans signal"}</Badge>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardBody>
        </Card>
      )}

      {subject && (
        <Card>
          <CardHeader><CardTitle>Observation sourcée</CardTitle><CardDescription>Enregistrez une comparaison vérifiée. Le score est recalculé à partir de cette preuve, sans recherche ni génération assistée.</CardDescription></CardHeader>
          <CardBody>
            <label htmlFor="score-subject" className="text-sm text-foreground-secondary">Marque étudiée</label>
            <Select id="score-subject" value={subjectId} onChange={(e) => { setSubjectId(e.target.value); setRivalName(""); setProofFeedback(null); setReviewFeedback(null); setManual((value) => ({ ...value, opponent: "" })); }} className="mb-4 max-w-md">
              {placed.map((p) => <option key={p.strategyId} value={p.strategyId}>{p.name}</option>)}
            </Select>
            <form onSubmit={recordManual} className="grid gap-3 sm:grid-cols-2">
              <div><label htmlFor="proof-opponent" className="text-sm text-foreground-secondary">Adversaire</label>
                <Select id="proof-opponent" required value={manual.opponent} onChange={(e) => setManual((value) => ({ ...value, opponent: e.target.value }))}>
                  <option value="">Choisir une marque ou un étalon…</option>
                  {placed.filter((p) => p.strategyId !== subjectId).map((p) => <option key={p.strategyId} value={`strategy:${p.strategyId}`}>{p.name}</option>)}
                  {availableAnchors.map((a) => <option key={a.id} value={`ref:${a.id}`}>Étalon · {a.name}</option>)}
                </Select></div>
              <div><label htmlFor="proof-arena" className="text-sm text-foreground-secondary">Arène</label>
                <Select id="proof-arena" value={manual.arena} onChange={(e) => setManual((value) => ({ ...value, arena: e.target.value as ScoreurArena }))}>
                  {SCOREUR_ARENAS.map((a) => <option key={a} value={a}>{a} · {ARENA_LABELS[a]}</option>)}
                </Select></div>
              <div><label htmlFor="proof-result" className="text-sm text-foreground-secondary">Résultat observé</label>
                <Select id="proof-result" value={manual.result} onChange={(e) => setManual((value) => ({ ...value, result: e.target.value as EpreuveResult }))}>
                  <option value="WIN">Victoire</option><option value="LOSS">Défaite</option><option value="DRAW">Égalité</option>
                </Select></div>
              <div><label htmlFor="proof-date" className="text-sm text-foreground-secondary">Date d’observation</label>
                <Input id="proof-date" type="date" required value={manual.date} onChange={(e) => setManual((value) => ({ ...value, date: e.target.value }))} /></div>
              <div><label htmlFor="proof-claim" className="text-sm text-foreground-secondary">Fait observé</label>
                <Input id="proof-claim" required value={manual.claim} onChange={(e) => setManual((value) => ({ ...value, claim: e.target.value }))} /></div>
              <div><label htmlFor="proof-source" className="text-sm text-foreground-secondary">Source publique</label>
                <Input id="proof-source" type="url" required value={manual.source} onChange={(e) => setManual((value) => ({ ...value, source: e.target.value }))} /></div>
              <Button type="submit" disabled={record.isPending || !manual.opponent || !manual.claim.trim() || !manual.source || !manual.date}>Enregistrer l’observation</Button>
            </form>
            <Text className="mt-2 text-xs text-foreground-muted">Poids de preuve standard : moyen (0,5). Une source publique seule ne prouve pas son contenu ; vérifiez le fait et la date avant de valider.</Text>
            {proofFeedback ? <Text role={proofFeedback.error ? "alert" : "status"} className={`mt-3 text-sm ${proofFeedback.error ? "text-error" : "text-success"}`}>{proofFeedback.text}</Text> : null}
          </CardBody>
        </Card>
      )}

      {/* ── Bloc 3 : file de revue des victoires (Hunter) ── */}
      {subjectId && (
        <Card>
          <CardHeader>
            <CardTitle>Recherche assistée et preuves à valider</CardTitle>
            <CardDescription>Hunter (IA) propose des victoires sourcées du prospect vs un rival. Chaque victoire validée devient une épreuve qui compte dans le score.</CardDescription>
          </CardHeader>
          <CardBody>
            <div className="mb-4 flex flex-wrap items-center gap-2">
              {/* Rival LIÉ aux marques placées (audit 2026-07-16,
                  `rival-place-jamais-lie`) : le texte libre laissait
                  rivalStrategyId=null → épreuves « vs unknown » alors que les
                  concurrents venaient d'être placés avec leur strategyId. */}
              {placed.length > 1 ? (
                <select
                  value={rivalName}
                  onChange={(e) => setRivalName(e.target.value)}
                  className="max-w-xs rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground"
                >
                  <option value="">Choisir le rival…</option>
                  {placed.filter((p) => p.strategyId !== subjectId).map((p) => (
                    <option key={p.strategyId} value={p.name}>{p.name}</option>
                  ))}
                </select>
              ) : (
                <Input placeholder="Nom du rival à comparer" value={rivalName} onChange={(e) => setRivalName(e.target.value)} className="max-w-xs" />
              )}
              <Button
                variant="outline"
                disabled={hunt.isPending || !rivalName.trim()}
                onClick={async () => {
                  setErr(null);
                  try {
                    const rivalStrategyId = placed.find((p) => p.name === rivalName.trim())?.strategyId ?? null;
                    const r = await hunt.mutateAsync({ subjectStrategyId: subjectId, rivalName: rivalName.trim(), rivalStrategyId });
                    if (r.deferred) setReviewFeedback({ error: true, text: "Recherche assistée indisponible ou sans source exploitable : aucune victoire proposée. Vous pouvez enregistrer une observation sourcée." });
                    await utils.scoreur.listCandidates.invalidate();
                  } catch (e) { setReviewFeedback({ error: true, text: e instanceof Error ? e.message : String(e) }); }
                }}
              >
                {hunt.isPending ? <><Spinner size="sm" /> Chasse…</> : "Chasser des victoires"}
              </Button>
              {hunt.data && !hunt.data.deferred ? <Text className="text-sm text-foreground-muted">{hunt.data.pending} en attente · {hunt.data.autoRejected} sans source (rejetées)</Text> : null}
            </div>

            {reviewFeedback ? <Text role={reviewFeedback.error ? "alert" : "status"} className={`mb-3 text-sm ${reviewFeedback.error ? "text-error" : "text-success"}`}>{reviewFeedback.text}</Text> : null}

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
                      {!c.rivalStrategyId && !c.rivalBrandRefId ? <Select aria-label={`Rival identifié pour ${c.rivalName}`} value={rivalLinks[c.id] ?? ""} onChange={(e) => setRivalLinks((value) => ({ ...value, [c.id]: e.target.value }))}>
                        <option value="">Identifier le rival avant validation…</option>
                        {(dossiers.data ?? []).filter((s) => s.id !== subjectId).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                      </Select> : null}
                    </div>
                    <div className="flex gap-2">
                      <Input type="date" aria-label={`Date d’observation contre ${c.rivalName}`} value={proofDates[c.id] ?? ""} onChange={(e) => setProofDates((value) => ({ ...value, [c.id]: e.target.value }))} />
                      <Button size="sm" disabled={decide.isPending || !proofDates[c.id] || !c.sourceUrl || (!c.rivalStrategyId && !c.rivalBrandRefId && !rivalLinks[c.id])}
                        onClick={() => decideProof(c.id, "APPROVE")}>
                        Valider
                      </Button>
                      <Button size="sm" variant="outline" disabled={decide.isPending}
                        onClick={() => decideProof(c.id, "REJECT")}>
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
