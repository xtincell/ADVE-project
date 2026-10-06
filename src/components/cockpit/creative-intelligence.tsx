"use client";
import { trpc } from "@/lib/trpc/client";
import { RecipeCards, creativeLabels } from "@/components/creative-intelligence/recipe-cards";

function measuredOutcome(value: unknown): string | null {
  if (!value || typeof value !== "object") return null;
  const outcome = value as { value?: unknown; hit?: unknown };
  return typeof outcome.value === "number" ? `Résultat observé : ${outcome.value} · ${outcome.hit === true ? "cible atteinte" : "cible non atteinte"}. Effet causal non établi.` : null;
}

export function BrandCreativeIntelligence({ strategyId }: { strategyId: string }) {
  const corpus = trpc.argos.intelligence.brandCorpus.useQuery({ strategyId });
  const recipes = trpc.argos.intelligence.brandRecipes.useQuery({ strategyId });
  const applications = trpc.argos.intelligence.applications.useQuery({ strategyId });
  const watchlist = trpc.argos.intelligence.watchlist.useQuery({ strategyId });
  const opportunities = trpc.argos.intelligence.opportunities.useQuery({ strategyId });
  return <section className="space-y-4 rounded-lg border border-border p-4">
    <h2 className="text-lg font-semibold">Intelligence créative et concurrentielle</h2>
    <p className="text-sm text-muted-foreground">{corpus.data?.length ?? "…"} contenus consultables · {watchlist.data?.length ?? "…"} marques suivies. Les données de votre marque restent privées. Votre équipe prépare et valide les essais.</p>
    {(corpus.error || recipes.error || applications.error || watchlist.error) && <p role="alert">Une partie des observations est indisponible. Réessayez plus tard.</p>}
    {recipes.isLoading ? <p className="text-sm text-muted-foreground">Chargement des recettes…</p> : <RecipeCards recipes={recipes.data ?? []} />}
    {opportunities.data?.map(o => <div key={o.recipeId} className="text-sm"><p className="font-medium">{o.pattern.map(p => creativeLabels[p] ?? p).join(" + ")} : {o.suggestion === "TEST_CANDIDATE" ? "piste d'essai" : "collecte à compléter"}</p><p>{o.ownMatchingContents}/{o.ownObservedContents} contenus propres et {o.rivalMatchingContents}/{o.rivalObservedContents} contenus des comptes suivis utilisent cette combinaison. {o.limitation}</p></div>)}
    <h3 className="font-semibold">Essais déclarés</h3>
    {!applications.data?.length && <p className="text-sm text-muted-foreground">Aucun essai déclaré. Une recette revue peut devenir une variante de campagne avec une cible et une échéance.</p>}
    {applications.data?.map(a => <div key={a.id} className="rounded-md border border-border p-3 text-sm">
      <p className="font-medium">{a.hypothesis}</p><p>{a.variant}</p>
      <p>Cible : {a.targetValue} · échéance : {new Date(a.deadline).toLocaleDateString("fr-FR")} · {a.resolvedAt ? "Résultat enregistré" : "Mesure attendue"}</p>
      {measuredOutcome(a.outcome) && <p>{measuredOutcome(a.outcome)}</p>}
    </div>)}
  </section>;
}
