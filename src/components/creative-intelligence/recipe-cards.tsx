"use client";

import { trpc, type RouterOutputs } from "@/lib/trpc/client";
import { Card, CardBody } from "@/components/primitives/card";
import { Badge } from "@/components/primitives/badge";

export const creativeLabels: Record<string, string> = {
  CURIOSITY: "Curiosité", CONTRARIAN: "À contre-courant", QUESTION: "Question", DEMONSTRATION: "Démonstration", CONFESSION: "Confession", RESULT_FIRST: "Résultat d'abord", OTHER: "Autre",
  PROBLEM_SOLUTION: "Problème puis solution", TRANSFORMATION: "Transformation", CHALLENGE: "Défi", REVELATION: "Révélation", COMPARISON: "Comparaison", LOOP: "Boucle",
  POV: "Vue subjective", TALKING_HEAD: "Face caméra", MACRO: "Gros plan", SPLIT_SCREEN: "Écran partagé", SCREENSHOT: "Capture d'écran", REACTION: "Réaction",
  IDENTITY: "Identification", DEBATE: "Débat", ASPIRATION: "Aspiration", UTILITY: "Utilité", HUMOUR: "Humour", PARTICIPATION: "Participation",
};
export type RecipeCardData = RouterOutputs["argos"]["intelligence"]["publicRecipes"][number];

export function RecipeCards({ recipes }: { recipes: RecipeCardData[] }) {
  if (!recipes.length) return <p className="text-sm text-muted-foreground">Aucune recette disponible dans ce périmètre. La collecte de contenus ordinaires et performants constituera les premières preuves.</p>;
  return <div className="grid gap-3 md:grid-cols-2">{recipes.map(r => <Card key={r.id} surface="raised"><CardBody className="space-y-2">
    <h3 className="font-semibold text-foreground">{[r.context.hook, r.context.narrative, r.context.visual].map(v => creativeLabels[v] ?? v).join(" + ")}</h3>
    <p className="text-sm text-muted-foreground">{r.context.sector} · {r.context.countryCode} · {r.context.platform} · version {r.revision}</p>
    <Badge tone={r.evaluation.status === "OBSERVED" ? "success" : "warning"}>{r.evaluation.status === "OBSERVED" ? "Association observée" : "Hypothèse à documenter"}</Badge>
    <p className="text-sm">{r.evaluation.examples.n} exemples, {r.evaluation.controls.n} contrôles, {r.evaluation.independentAccounts} comptes indépendants.</p>
    <p className="text-sm">Performance médiane : {r.evaluation.examples.medianRatio == null ? "non mesurée" : `${r.evaluation.examples.medianRatio.toFixed(2)}× la référence du compte`} ; contrôles : {r.evaluation.controls.medianRatio == null ? "non mesurés" : `${r.evaluation.controls.medianRatio.toFixed(2)}×`}.</p>
    <p className="text-xs text-muted-foreground">Couverture : {r.evaluation.coverage.normalizedContents}/{r.evaluation.coverage.observedContents} contenus comparables. La causalité et la saturation du marché restent inconnues.</p>
    <p className="text-xs text-muted-foreground">Diffusion sur les deux dernières semaines observées : {r.evaluation.trend.map(t => t.adoptionInObservedCorpus == null ? "non mesurée" : `${Math.round(t.adoptionInObservedCorpus * 100)} % de ${t.annotatedContents} contenus annotés`).join(" → ")}. Validation temporelle : {r.evaluation.holdout.validation.examples.n} exemples.</p>
    <div className="flex flex-wrap gap-2 text-xs">{r.sources.slice(0, 5).map((s, i) => <a key={`${s.url}-${i}`} href={s.url} target="_blank" rel="noopener noreferrer" className="text-accent underline">{s.role === "EXAMPLE" ? "Exemple" : "Contrôle"} {i + 1}</a>)}</div>
  </CardBody></Card>)}</div>;
}

export function PublicCreativeRecipes() {
  const recipes = trpc.argos.intelligence.publicRecipes.useQuery();
  return <section className="my-8 space-y-3"><h2 className="text-xl font-semibold">Recettes créatives documentées</h2>
    <p className="text-sm text-muted-foreground">Mécaniques revues par la rédaction, accompagnées de résultats et de contrôles. Une association observée constitue une piste à tester dans votre contexte.</p>
    {recipes.isLoading ? <p>Chargement des recettes…</p> : recipes.error ? <p role="alert">Les recettes sont temporairement indisponibles.</p> : <RecipeCards recipes={recipes.data ?? []} />}
  </section>;
}
