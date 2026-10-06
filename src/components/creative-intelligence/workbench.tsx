"use client";
import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { Button } from "@/components/primitives/button";
import { Input } from "@/components/primitives/input";
import { Textarea } from "@/components/primitives/textarea";
import { Select } from "@/components/primitives/select";
import { Label } from "@/components/primitives/label";
import { Card, CardBody } from "@/components/primitives/card";
import { specimenInputSchema, metricInputSchema, analysisInputSchema, recipeInputSchema, annotationSchema, watchlistSchema } from "@/domain/creative-intelligence";
import { RecipeCards, creativeLabels } from "./recipe-cards";
import { CreativeSourceAcquisition } from "./source-acquisition";
import { AssistedCreativeObservation } from "./assisted-observation";

function Picker({ label, options, value, change }: { label: string; options: readonly string[]; value: string; change: (v: string) => void }) {
  return <Label className="flex flex-col gap-1">{label}<Select value={value} onChange={e => change(e.target.value)}>{options.map(o => <option key={o} value={o}>{creativeLabels[o] ?? o}</option>)}</Select></Label>;
}
function TextField({ label, value, change, type = "text" }: { label: string; value: string; change: (v: string) => void; type?: string }) {
  return <Label className="flex flex-col gap-1">{label}<Input type={type} value={value} onChange={e => change(e.target.value)} /></Label>;
}

export function CreativeWorkbench() {
  const utils = trpc.useUtils();
  const [strategyId, setStrategyId] = useState("");
  const scope = strategyId ? { strategyId } : {};
  const corpus = trpc.argos.intelligence.corpus.useQuery(scope);
  const recipes = trpc.argos.intelligence.recipes.useQuery(scope);
  const apps = trpc.argos.intelligence.applications.useQuery({ strategyId }, { enabled: !!strategyId });
  const refs = trpc.argos.intelligence.brandRefs.useQuery();
  const watches = trpc.argos.intelligence.watchlist.useQuery({ strategyId }, { enabled: !!strategyId });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const invalidate = () => { void utils.argos.intelligence.invalidate(); setSuccess("Enregistré."); setError(""); };
  const onError = (e: { message: string }) => { setError(e.message); setSuccess(""); };
  const imp = trpc.argos.intelligence.importSpecimen.useMutation({ onSuccess: invalidate, onError });
  const measure = trpc.argos.intelligence.recordMetric.useMutation({ onSuccess: invalidate, onError });
  const annotate = trpc.argos.intelligence.annotate.useMutation({ onSuccess: invalidate, onError });
  const discover = trpc.argos.intelligence.discover.useMutation({ onSuccess: invalidate, onError });
  const review = trpc.argos.intelligence.review.useMutation({ onSuccess: invalidate, onError });
  const apply = trpc.argos.intelligence.startTrial.useMutation({ onSuccess: invalidate, onError });
  const resolve = trpc.argos.intelligence.resolve.useMutation({ onSuccess: invalidate, onError });
  const saveWatch = trpc.argos.intelligence.saveWatchlist.useMutation({ onSuccess: invalidate, onError });
  const [form, setForm] = useState({ platform: "TIKTOK", accountId: "", externalId: "", sourceUrl: "", mediaUrl: "", publishedAt: "", sector: "", countryCode: "CI", format: "SHORT_VIDEO" });
  const field = (key: keyof typeof form, value: string) => setForm(f => ({ ...f, [key]: value }));
  const [specimenId, setSpecimenId] = useState("");
  const [measurement, setMeasurement] = useState({ value: "", observedAt: "", metric: "views", paidStatus: "UNKNOWN", sourceUrl: "" });
  const [tags, setTags] = useState({ hook: "RESULT_FIRST", narrative: "TRANSFORMATION", visual: "MACRO", socialDriver: "UTILITY" });
  const [proof, setProof] = useState({ hook: "", narrative: "", visual: "", socialDriver: "" });
  const [observedText, setObservedText] = useState("");
  const [trial, setTrial] = useState({ recipeId: "", hypothesis: "", variant: "", baseline: "", target: "", deadline: "", assetId: "", actionId: "" });
  const [watchJson, setWatchJson] = useState("[]");
  const [rival, setRival] = useState({ name: "", positioning: "", source: "", studyId: "" });
  const competitors = trpc.analytics.getCompetitors.useQuery({ ...scope, sector: form.sector, countryCode: form.countryCode }, { enabled: !!form.sector && /^[A-Z]{2}$/.test(form.countryCode) });
  const recordCompetitor = trpc.analytics.recordCompetitor.useMutation({ onSuccess: () => { invalidate(); void utils.analytics.getCompetitors.invalidate(); }, onError });
  const run = async (fn: () => void | Promise<void>) => { try { setError(""); setSuccess(""); await fn(); } catch (e) { setError(e instanceof Error ? e.message : "Saisie invalide."); } };
  const selected = corpus.data?.find(s => s.id === specimenId);
  return <section className="space-y-4">
    <h2 className="text-xl font-semibold">Atelier d'intelligence créative et concurrentielle</h2>
    <p className="text-sm text-muted-foreground">Sources collectées, observations manuelles ou assistées à revoir, recettes empiriques et essais. Chaque fournisseur affiche son état réel. La bibliothèque documentaire canonique reste dans Argos-studio.</p>
    <TextField label="Identifiant de la marque (vide : corpus public opérateur)" value={strategyId} change={v => { setStrategyId(v); setSpecimenId(""); }} />
    {error && <p role="alert" className="text-sm text-error">{error}</p>}{success && <p role="status" className="text-sm text-success">{success}</p>}
    {(corpus.error || recipes.error) && <p role="alert">Corpus indisponible ou accès refusé.</p>}
    <CreativeSourceAcquisition strategyId={strategyId} sector={form.sector} countryCode={form.countryCode} />
    <div className="grid gap-4 lg:grid-cols-2"><Card><CardBody className="space-y-3">
      <h3 className="font-semibold">1. Importer un contenu {strategyId ? "privé" : "public"}</h3>
      <Picker label="Plateforme" options={specimenInputSchema.shape.platform.options} value={form.platform} change={v => field("platform", v)} />
      <Picker label="Format" options={specimenInputSchema.shape.format.options} value={form.format} change={v => field("format", v)} />
      {(["accountId", "externalId", "sourceUrl", "sector", "countryCode"] as const).map(k => <TextField key={k} label={{ accountId: "Compte natif", externalId: "Identifiant natif du contenu", sourceUrl: "Source HTTPS", sector: "Secteur", countryCode: "Pays ISO-2" }[k]} value={form[k]} change={v => field(k, v)} />)}
      <TextField label="Date de publication" type="datetime-local" value={form.publishedAt} change={v => field("publishedAt", v)} />
      <TextField label="Média HTTPS autorisé pour analyse (facultatif)" value={form.mediaUrl} change={v => field("mediaUrl", v)} />
      <Button loading={imp.isPending} onClick={() => void run(() => { imp.mutate(specimenInputSchema.parse({ ...form, mediaUrl: form.mediaUrl || undefined, ...scope, visibility: strategyId ? "BRAND" : "PUBLIC", source: "MANUAL_SOURCE", publishedAt: new Date(form.publishedAt) })); })}>Importer</Button>
    </CardBody></Card><Card><CardBody className="space-y-3">
      <h3 className="font-semibold">2. Mesurer et annoter</h3>
      <Label>Contenu<Select value={specimenId} onChange={e => setSpecimenId(e.target.value)}><option value="">Choisir un contenu</option>{corpus.data?.map(s => <option key={s.id} value={s.id}>{s.platform} · {s.accountId} · {s.externalId}</option>)}</Select></Label>
      {selected && <p className="text-xs">{selected.performance.ratio == null ? "Surperformance non calculable" : `${selected.performance.ratio.toFixed(2)}× la référence`} · {selected.metrics.length} observations · {selected.analyses.length ? "annoté" : "à annoter"}</p>}
      <Picker label="Mesure" options={["views", "reach", "likes", "comments", "shares"]} value={measurement.metric} change={v => setMeasurement(m => ({ ...m, metric: v }))} />
      <TextField label="Valeur observée (vide = inconnue)" type="number" value={measurement.value} change={v => setMeasurement(m => ({ ...m, value: v }))} />
      <TextField label="Date de la mesure" type="datetime-local" value={measurement.observedAt} change={v => setMeasurement(m => ({ ...m, observedAt: v }))} />
      <Picker label="Exposition publicitaire" options={["UNKNOWN", "ORGANIC", "PAID"]} value={measurement.paidStatus} change={v => setMeasurement(m => ({ ...m, paidStatus: v }))} />
      <TextField label="Source HTTPS de la mesure" value={measurement.sourceUrl} change={v => setMeasurement(m => ({ ...m, sourceUrl: v }))} />
      <Button disabled={!selected || !measurement.value} loading={measure.isPending} onClick={() => void run(() => { measure.mutate(metricInputSchema.parse({ ...scope, specimenId, [measurement.metric]: Number(measurement.value), observedAt: new Date(measurement.observedAt), paidStatus: measurement.paidStatus, source: "MANUAL_SOURCE", sourceUrl: measurement.sourceUrl })); })}>Ajouter la mesure</Button>
      {(["hook", "narrative", "visual", "socialDriver"] as const).map(k => <div key={k} className="space-y-1"><Picker label={{ hook: "Accroche", narrative: "Récit", visual: "Image", socialDriver: "Mécanique sociale" }[k]} options={annotationSchema.shape[k].options} value={tags[k]} change={v => setTags(t => ({ ...t, [k]: v }))} /><Textarea aria-label={`Observation ${k}`} placeholder="Observation précise et repère temporel éventuel" value={proof[k]} onChange={e => setProof(p => ({ ...p, [k]: e.target.value }))} /></div>)}
      <Label>Texte ou transcription effectivement observé<Textarea value={observedText} onChange={e => setObservedText(e.target.value)} /></Label>
      {selected?.strategyId === strategyId && <AssistedCreativeObservation key={`${strategyId}:${specimenId}`} strategyId={strategyId} specimenId={specimenId} observedText={observedText} />}
      <Button disabled={!selected || !observedText.trim()} loading={annotate.isPending} onClick={() => void run(async () => {
        const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(observedText));
        const contentHash = [...new Uint8Array(bytes)].map(b => b.toString(16).padStart(2, "0")).join("");
        annotate.mutate(analysisInputSchema.parse({ ...scope, specimenId, contentHash, annotation: { ...tags, evidence: Object.entries(proof).map(([field, observation]) => ({ field, observation, confidence: "MEDIUM" })), caveats: ["Annotation manuelle de la source observée."] } }));
      })}>Conserver l'annotation</Button>
    </CardBody></Card></div>
    <Card><CardBody className="space-y-3"><h3 className="font-semibold">3. Vérifier une combinaison</h3>
      <p className="text-sm text-muted-foreground">Le secteur, le pays, le format et la plateforme viennent du formulaire d'import ; la combinaison vient des trois premières annotations. Incluez des contenus ordinaires pour constituer les contrôles.</p>
      <Button loading={discover.isPending} onClick={() => void run(() => { discover.mutate(recipeInputSchema.parse({ ...scope, sector: form.sector, countryCode: form.countryCode, platform: form.platform, format: form.format, hook: tags.hook, narrative: tags.narrative, visual: tags.visual, metric: measurement.metric === "reach" ? "reach" : "views", asOf: new Date() })); })}>Évaluer la combinaison</Button>
      {recipes.isLoading ? <p className="text-sm text-muted-foreground">Chargement des recettes…</p> : <RecipeCards recipes={recipes.data ?? []} />}
      {recipes.data?.map(r => <div key={r.id} className="flex flex-wrap gap-2"><span className="text-sm">Version {r.revision} · {r.context.hook}</span><Button size="sm" loading={review.isPending} onClick={() => review.mutate({ ...scope, recipeId: r.id, publish: false })}>Valider pour essais privés</Button>{!strategyId && <Button size="sm" disabled={r.evaluation.status !== "OBSERVED"} loading={review.isPending} onClick={() => review.mutate({ recipeId: r.id, publish: !r.published })}>{r.published ? "Retirer de la publication" : "Publier dans Argos"}</Button>}<Button size="sm" onClick={() => setTrial(t => ({ ...t, recipeId: r.id }))}>Préparer un essai</Button></div>)}
    </CardBody></Card>
    {!!strategyId && <Card><CardBody className="space-y-3"><h3 className="font-semibold">4. Appliquer et mesurer</h3>
      {(["recipeId", "hypothesis", "variant", "baseline", "target", "assetId", "actionId"] as const).map(k => <TextField key={k} label={{ recipeId: "Recette", hypothesis: "Hypothèse", variant: "Variante adaptée à la marque", baseline: "Mesure de référence", target: "Cible", assetId: "Actif existant (facultatif)", actionId: "Action de campagne existante (facultatif)" }[k]} value={trial[k]} change={v => setTrial(t => ({ ...t, [k]: v }))} />)}
      <TextField label="Échéance" type="datetime-local" value={trial.deadline} change={v => setTrial(t => ({ ...t, deadline: v }))} />
      <Button loading={apply.isPending} onClick={() => void run(() => {
        if (!trial.baseline.trim() || !trial.target.trim() || !trial.deadline) throw new Error("Renseignez référence, cible et échéance.");
        apply.mutate({ strategyId, recipeId: trial.recipeId, applicationKey: crypto.randomUUID(), hypothesis: trial.hypothesis, variant: trial.variant, primaryMetric: measurement.metric as "views" | "reach" | "likes" | "comments" | "shares", baselineValue: Number(trial.baseline), targetValue: Number(trial.target), deadline: new Date(trial.deadline), assetId: trial.assetId || undefined, actionId: trial.actionId || undefined });
      })}>Déclarer l'essai</Button>
      {apps.data?.map(a => <div key={a.id} className="space-y-2 border-t border-border py-2"><p>{a.hypothesis} — {a.resolvedAt ? "Résultat enregistré" : "Mesure attendue"}</p>{a.outcome != null && <pre className="overflow-x-auto text-xs">{JSON.stringify(a.outcome, null, 2)}</pre>}{!a.resolvedAt && <Button size="sm" disabled={!selected?.metrics[0]} loading={resolve.isPending} onClick={() => resolve.mutate({ strategyId, applicationId: a.id, specimenId, metricId: selected!.metrics[0]!.id })}>Rattacher la mesure sélectionnée</Button>}</div>)}
    </CardBody></Card>}
    {!!strategyId && <Card><CardBody className="space-y-3"><h3 className="font-semibold">5. Périmètre concurrentiel</h3>
      <p className="text-sm text-muted-foreground">Trois relations distinctes : concurrents commerciaux, concurrents d'attention, inspirations. Les comptes natifs sont déclarés explicitement, sans modifier le pilier de marque.</p>
      <p className="text-xs">Références disponibles : {refs.data?.map(r => `${r.name} (${r.id})`).join(" · ") || "aucune"}</p>
      <p className="text-xs">Suivi actuel : {watches.data?.length ?? 0} marques.</p>
      <Button size="sm" onClick={() => setWatchJson(JSON.stringify(watches.data ?? [], null, 2))}>Charger le suivi actuel dans l'éditeur</Button>
      <Label>Liste structurée (brandRefId, relationship, accounts : platform, accountId, url)<Textarea value={watchJson} onChange={e => setWatchJson(e.target.value)} /></Label>
      <Button loading={saveWatch.isPending} onClick={() => void run(() => { saveWatch.mutate({ strategyId, watchlist: watchlistSchema.parse(JSON.parse(watchJson)) }); })}>Enregistrer la veille</Button>
    </CardBody></Card>}
    <Card><CardBody className="space-y-3"><h3 className="font-semibold">Observations concurrentielles du marché</h3>
      <p className="text-sm text-muted-foreground">Secteur et pays du formulaire d'import. {strategyId ? "Les observations enregistrées ici appartiennent à cette marque." : "Sans marque sélectionnée, seuls des faits explicitement publics peuvent être enregistrés."} Les anciennes données sans provenance restent exclues.</p>
      <TextField label="Nom du concurrent observé" value={rival.name} change={v => setRival(r => ({ ...r, name: v }))} />
      <TextField label="Positionnement observé" value={rival.positioning} change={v => setRival(r => ({ ...r, positioning: v }))} />
      <TextField label="Source HTTPS du fait concurrentiel" value={rival.source} change={v => setRival(r => ({ ...r, source: v }))} />
      {!!strategyId && <TextField label="Étude source de cette marque (facultatif)" value={rival.studyId} change={v => setRival(r => ({ ...r, studyId: v }))} />}
      <Button loading={recordCompetitor.isPending} disabled={!rival.name.trim() || !rival.source.trim() || !form.sector.trim()} onClick={() => recordCompetitor.mutate({ ...scope, name: rival.name, positioning: rival.positioning || undefined, source: rival.source, sector: form.sector, countryCode: form.countryCode, market: form.countryCode, visibility: strategyId ? "BRAND" : "PUBLIC", studyId: strategyId && rival.studyId ? rival.studyId : undefined })}>Enregistrer le fait sourcé</Button>
      {competitors.error && <p role="alert">Les observations concurrentielles sont indisponibles.</p>}
      {competitors.data?.map(c => <div key={c.id} className="border-t border-border py-2 text-sm"><p className="font-medium">{c.name}</p><p>{c.positioning ?? "Positionnement non renseigné"}</p>{c.source?.startsWith("https:") && <a href={c.source} target="_blank" rel="noopener noreferrer" className="text-accent underline">Source · {new Date(c.measuredAt).toLocaleDateString("fr-FR")}</a>}</div>)}
    </CardBody></Card>
  </section>;
}
