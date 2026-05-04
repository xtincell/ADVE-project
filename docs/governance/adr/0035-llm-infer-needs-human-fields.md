# ADR-0035 — LLM-inférence des 7 champs ADVE `needsHuman` à `activateBrand` + tracking certainty per-field

**Date** : 2026-05-03
**Statut** : Accepted
**Phase de refonte** : phase/2-intents (suite ADR-0032 source certainty)
**Auteurs** : NEFER (PR-C)
**Lié** : [ADR-0030](0030-intake-closure-adve-100pct.md) (closure intake), [ADR-0032](0032-source-certainty-and-intake-artifact-persistence.md) (source certainty), pillar-maturity-contracts.

---

## 1. Contexte

`pillar-maturity-contracts.ts` marque 7 champs ADVE comme `derivable: false` :

| Pilier | Champ | Validator |
|---|---|---|
| A | `archetype` | `non_empty` |
| A | `noyauIdentitaire` | `min_length` 10 |
| D | `positionnement` | `min_length` 10 |
| D | `promesseMaitre` | `min_length` 5 |
| D | `personas` | `min_items` 1 |
| V | `produitsCatalogue` | `min_items` 1 |
| V | `businessModel` | `non_empty` |

Le wording UI (`pillar-page.tsx:451`) disait : *"Ces champs forment le socle identitaire de la marque — ils ne peuvent pas être inférés par l'IA. Le bouton Enrichir ne pourra pas atteindre 100% sans ta saisie."*

Constat user (Alexandre) : la friction "champ vide → opérateur doit saisir 7 champs avant que la marque soit utilisable" tue l'adoption. La majorité des marques activées self-serve restent en stage `EMPTY` ou `INTAKE` parce que personne ne remplit ces champs cold. Conséquence : Notoria, Artemis, Ptah tournent à vide et la cascade ADVE→RTIS n'avance jamais.

**Hypothèse opérateur** : *"Préfère un draft pré-rempli imparfait à un formulaire vide. L'humain corrigera ce qui est faux, mais aura déjà 80% du chemin fait par l'IA."*

## 2. Décision

Inverser la règle : **infer ces 7 champs systématiquement à `activateBrand`, marqués avec `certainty="INFERRED"`** (taxonomie ADR-0032). L'opérateur peut ensuite : (a) cliquer **"Valider tel quel"** pour flip à DECLARED (la valeur LLM est jugée correcte, on conserve), (b) **"Saisir"** pour réécrire via le flow amend standard (qui flip aussi à DECLARED implicitement).

Trois invariants :

1. **L'inférence ne bloque jamais l'activation** — fire-and-forget après `pillar.create`, wrapped en try/catch, hard timeout 45s. Si l'LLM crash ou rate, l'opérateur voit l'ancien comportement (champs vides) et fait son boulot manuellement comme avant.
2. **L'inférence ne CRASHE jamais sur un fait déclaré** — si `Pillar.content[archetype]` a déjà une valeur non-vide (parce que le formulaire intake l'a capturée, ou parce qu'un `convert` admin précédent l'a remplie), l'inférence skip ce champ. INFERRED n'overwrite jamais DECLARED/OFFICIAL.
3. **L'opérateur sait toujours d'où vient un champ** — `Pillar.fieldCertainty[fieldPath]` stocke explicitement le marker. UI affiche un badge orange "Inféré IA — à valider" tant que c'est INFERRED. Bouton "Valider tel quel" supprime la clé du mapping (= certainty implicite DECLARED).

## 3. Schema

`prisma/migrations/20260503040000_pillar_field_certainty/migration.sql` :

```sql
ALTER TABLE "Pillar"
  ADD COLUMN "fieldCertainty" JSONB;
```

Structure du payload : `{ "<dot.path>": "OFFICIAL" | "DECLARED" | "INFERRED" | "ARBITRARY" }`. Backfill safe : NULL pour les rows pré-migration = traité comme DECLARED par l'UI (absence de marker explicite INFERRED = présomption opérateur).

## 4. Service `infer-needs-human-fields.ts`

Pure pass orchestrant 4 étapes :

1. **Lecture** : `QuickIntake` (responses + companyName + sector + country + businessModel + positioning + rawText) + 3 `Pillar` rows (a, d, v).
2. **LLM call** : Claude Sonnet 4 via `ai-sdk/anthropic`, system prompt court (~250 mots) + user prompt structuré qui aplatit responses + biz context + rawText. Bloc "FAITS DÉCLARÉS — CONTRAINTE DURE" en tête (cf. ADR-0030 PR-Fix-2 anti-hallucination Wakanda) pour interdire l'invention de nationalité/secteur/business model. Output strict JSON, partiel accepté.
3. **Validation runtime** : strip markdown fence accidentel, `JSON.parse`, vérification shape légère. Réponse partielle OK (chaque champ indépendant).
4. **Merge** : pour chaque pilier (a, d, v), patch `content` + écriture `fieldCertainty[a.archetype] = "INFERRED"`. Skip les champs déjà non-vides (anti-overwrite). Bump `validationStatus` à `AI_PROPOSED` pour signal.

Hard timeout 45s via `AbortController`. Timeout = `result.ok=false`, log warning, l'opérateur voit l'état pré-PR-C.

## 5. Surface API

### Mutation `pillar.confirmInferredField`

```ts
confirmInferredField: protectedProcedure
  .input(z.object({
    strategyId: z.string().min(1),
    pillarKey: z.enum([...8 keys upper+lower]),
    fieldPath: z.string().min(1),
  }))
  .mutation(async ({ ctx, input }) => { ... })
```

Supprime la clé `fieldPath` (qualifiée OU bare) du `Pillar.fieldCertainty` mapping. Idempotent — re-appel sur un champ déjà confirmé retourne `alreadyConfirmed: true` sans erreur. **Ne touche pas `Pillar.content`** — l'opérateur valide la valeur LLM telle quelle ; pour la modifier il passe par le flow amend standard.

### UI panel `pillar-page.tsx`

Nouveau panel "X champs inférés à valider" affiché **seulement** si `pillarQuery.data.pillar.fieldCertainty` contient au moins un INFERRED pour le pilier courant. Couleur orange (distincte de l'amber needsHuman et du blue Notoria recos). Pour chaque champ inféré :
- Label humain (via `getFieldLabel`) + path mono
- Preview tronquée (80 chars) de la valeur LLM
- 2 boutons : **Saisir** (open AmendPillarModal sur le champ) et **Valider tel quel** (mutation `confirmInferredField`)

Wording du panel needsHuman existant ajusté : *"L'IA pré-remplit un draft à l'activation (badge orange ci-dessous), à toi de le valider ou réécrire."* (au lieu de l'ancien wording "ne peuvent pas être inférés par l'IA").

## 6. Pourquoi pas modifier l'assessor

Le LLM remplit `Pillar.content` directement → la valeur passe la validation `non_empty`/`min_length`/`min_items` → l'assessor passe le champ en `satisfied` → il n'apparait plus dans `needsHuman`. **Pas besoin de toucher à `assessor.ts`** — la sémantique se cascade naturellement.

Conséquence subtile : `assess.needsHuman.length` peut tomber à 0 dès que l'inférence réussit, ce qui est correct (le doc est plein). L'opérateur voit le nouveau panel "Champs inférés à valider" qui prend le relais visuel.

## 7. Invocation

```ts
// activateBrand fire-and-forget après pillar.create:
void (async () => {
  try {
    const { inferNeedsHumanFields } = await import("@/server/services/quick-intake/infer-needs-human-fields");
    await inferNeedsHumanFields(intake.id);
  } catch (err) {
    console.warn("[activateBrand] inferNeedsHumanFields crashed:", err);
  }
})();
```

Pas dans un Mestor Intent (l'inférence est un détail d'implémentation interne à `activateBrand`, pas un acte gouvernance). Si on veut l'appeler à la demande plus tard (re-infer button cockpit), on créera un Intent kind à ce moment-là.

## 8. Conséquences

**Positives** :
- Doc plein d'entrée de jeu — friction d'onboarding effondrée.
- Hierarchy de certainty visible : INFERRED (orange) vs DECLARED (default) vs OFFICIAL (vert) vs ARBITRARY (zinc).
- Aucun overwrite des données opérateur — défensif.
- Roll-back facile : si l'inférence pose problème, `void (async () => { ... })()` peut être commenté sans toucher au reste.

**Négatives** :
- Coût LLM par activation (~3-5K tokens par appel = ~$0.015 par marque activée).
- Latence backend +2-5s sur l'activation, masquée par le fire-and-forget mais l'opérateur peut atterrir sur le cockpit avant que les valeurs apparaissent (refresh à faire manuellement les premières secondes).
- L'opérateur peut "valider tel quel" sans relire — risque d'accepter des valeurs LLM hallucinées. Mitigé par le wording explicite + preview tronquée + le marker INFERRED qui reste tant que pas validé.

**Neutres** :
- Pas de rétro-compat à gérer : les Pillars existants ont `fieldCertainty=NULL`, traités comme DECLARED par l'UI. Aucun impact.

## 9. Anti-drift

- Migration idempotente (NULL acceptable, pas de default car le sens est "absence = présomption DECLARED").
- LLM call wrappé en try/catch — ne casse jamais l'activation.
- Pas de Mestor Intent kind ajouté — pas d'extension governance, pas de risque de drift sur `intent-kinds.ts`.
- Skip des champs déjà non-vides — aucun risque d'écrasement de fait DECLARED.

## 10. Suite

- Si usage massif et qualité LLM jugée insuffisante : ajouter un bouton **"Re-inférer ce champ"** (mutation séparée) qui re-call le LLM uniquement pour 1 path, en passant un hint opérateur ("ne pas dire X", "axe sur Y"). Pas dans cette ADR.
- Étendre la même logique aux 5 champs E (`touchpoints`, etc.) qui sont marqués `derivable: true` mais via `ai_generation` — actuellement gérés par le auto-filler post-activation. Pas urgent.
- Persister un trace audit (qui a inféré quoi, quand, modèle utilisé) dans une table `PillarFieldHistory`. Pas dans cette ADR — pour l'instant on a juste le marker.
