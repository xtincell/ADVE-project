# ADR-0030 — Intake closure : ADVE 100% par design + gate `actualizeRT` sur RTIS_CASCADE

**Date** : 2026-05-03
**Statut** : proposed
**Phase de refonte** : phase/2-intents
**Précédé par** : ADR-0023 (`OPERATOR_AMEND_PILLAR` voie unique d'édition ADVE), v6.1.18 (fix `rtis-cascade.savePillar` cache reconciliation)
**Auteur** : NEFER (session enquête stepper Notoria, 2026-05-03)

---

## TL;DR

L'intake landing produit aujourd'hui des piliers ADVE **sparse par design** (3-4 champs/pilier, `currentStage = INTAKE` ou `EMPTY`). Le bouton "Enrichir" sur la page pilier plafonne à un % qui exclut les champs `derivable: false` du contrat de maturité. Conséquence : la cascade R+T part de matière incomplète, le stepper Notoria se bloque, l'opérateur ne sait pas où cliquer pour fermer l'écart.

**Décision** : refondre le tunnel intake → vault → cascade en 3 axes coordonnés pour que la chaîne `intake → ADVE 100% → R+T → I → S` soit déterministe et que l'opérateur soit guidé sans deviner.

---

## Contexte (diagnostic NEFER 2026-05-03)

### Symptôme observé

Sur cockpit `/cockpit/brand/identity` (pilier A) d'une marque post-intake :
- **Suffisant 79%** (ENRICHED stage)
- **Complet 81%** (COMPLETE stage)
- **R+T —** (cascade pas consolidée)
- Champs visibles vides : `Accroche`, et plusieurs champs `needsHuman` invisibles côté UI

Le bouton **"Enrichir"** (rouge, ADVE) ne fait pas progresser le score.
Le bouton **"Lancer la veille R+T"** sur Notoria fait avancer R+T mais sur du sable (ADVE incomplet → recos R+T mediocres).

### Chaîne causale (5-WHY)

1. **Stepper Notoria bloqué étape 1** → `dashboard.completionLevels.r === "INCOMPLET"`
2. **R/T en INCOMPLET** → `Pillar.completionLevel` cache pas reconcilié après `actualizeRT` *(fix v6.1.18 `writePillarAndScore` ✓)*
3. **Même après v6.1.18, R/T pas en COMPLET** → `assessPillar` retourne `currentStage = INTAKE` (R/T sparse)
4. **R/T sparse** → cascade RTIS partie de ADVE sparse, LLM produit JSON minimal cohérent avec le manque
5. **ADVE sparse** → intake produit `currentStage = INTAKE` ou `EMPTY` après écriture
6. **Intake produit ADVE sparse** → (a) question-bank ne couvre pas tous les `derivable: false`, (b) AI extraction délibérément conservatrice
7. **Décision design "anti-hallucination"** sans contrepartie compensatoire → champs `needsHuman` jamais saisis

### Chiffrage du gap intake

Source : [pillar-maturity-contracts.ts:20-46](../../../src/lib/types/pillar-maturity-contracts.ts) + [question-bank.ts](../../../src/server/services/quick-intake/question-bank.ts).

| Pilier | Q intake | Champs INTAKE `derivable: false` | Couverts par Q dédiée ? | Couverts par seal canonical ? |
|---|---|---|---|---|
| **A** | 5 (`a_vision`, `a_mission`, `a_origin`, `a_values`, `a_archetype`) | `archetype`, `noyauIdentitaire`, `citationFondatrice` | `archetype` ✓ | aucun |
| **D** | 4 | `positionnement`, `promesseMaitre`, `personas` | aucun direct | `positionnement` partiel (BusinessContext.positioning ≠ `D.positionnement` champ ENRICHED) |
| **V** | 3 | `produitsCatalogue`, `businessModel` | aucun direct | `businessModel` ✓ (déclaré au start) |
| **E** | 9 | (aucun `derivable: false`) | n/a | n/a |

**Verdict** : **5 champs `needsHuman` du contrat INTAKE ne sont jamais demandés à l'utilisateur ni dérivés** : `noyauIdentitaire`, `citationFondatrice`, `D.positionnement` (champ ENRICHED, pas le BusinessContext), `D.promesseMaitre`, `D.personas`, `V.produitsCatalogue`. L'AI extraction peut les deviner si l'utilisateur a lâché du contenu utilisable, sinon ils restent vides → INTAKE échoue → `currentStage = EMPTY`.

### Drift architectural collatéral

[notoria.ts:83-96](../../../src/server/trpc/routers/notoria.ts) : la mutation `actualizeRT` n'a **pas** de `preconditions`. Elle est appelable même si A/D/V/E sont à `INTAKE`. Comparé à [notoria.ts:64](../../../src/server/trpc/routers/notoria.ts) (`generateBatch` qui a `preconditions: ["RTIS_CASCADE"]`), c'est une **incohérence de governance** : deux mutations qui touchent la même cascade obéissent à des règles différentes.

Le gate `RTIS_CASCADE` est défini canoniquement ([pillar-readiness.ts:194-202](../../../src/server/governance/pillar-readiness.ts)) :

```ts
RTIS_CASCADE: verdict(
  (stage === "ENRICHED" || stage === "COMPLETE") && !stale,
  ...
),
```

→ Pour qu'on puisse cascader R/T depuis un pilier ADVE, il faut au minimum `stage === ENRICHED`. `actualizeRT` viole ce contrat aujourd'hui.

### Drift narratif collatéral (NEFER §3 interdit #1)

L'auto-filler [auto-filler.ts:80-83](../../../src/server/services/pillar-maturity/auto-filler.ts) ignore silencieusement les `needsHuman` (`continue;` sur `!req.derivable`), mais **ne remonte rien à l'UI**. Le `pillar-page.tsx` n'affiche jamais `assess.needsHuman[]` à l'utilisateur. Le système connaît exactement ce qui bloque mais le cache. C'est une asymétrie d'information qui force l'opérateur à jouer aux devinettes — exactement ce que NEFER mantra interdit ("avant de coder, je vérifie" → mais ici l'opérateur ne PEUT pas vérifier).

---

## Décision

3 axes coordonnés, séquencés Axe 1 → Axe 3 → Axe 2 (impact croissant, refonte UX → governance → produit).

### Axe 1 — UX `needsHuman` panel (résout l'asymétrie d'information)

**Sur `pillar-page.tsx`, ajouter un panneau encart sous le scoring bar** quand `assess.needsHuman.length > 0`, qui :

1. Liste explicitement les champs manquants (label depuis `variable-bible.BIBLE_X.{path}.label`).
2. Pour chaque champ : un CTA **"Saisir"** qui ouvre `AmendPillarModal` pré-ciblé sur ce champ (mode `PATCH_DIRECT` par défaut, `LLM_REPHRASE` si champ texte qualitatif >50 chars).
3. Précise `derivable: 'human'` vs `derivable: false` dans le contrat → expliquer pourquoi l'auto-fill ne peut pas les remplir.
4. Indicateur visuel : *"X champs essentiels non saisis — Enrichir ne pourra pas atteindre 100% sans ta saisie."*

Modification du bouton **"Enrichir"** : si `needsHuman.length > 0`, tooltip change : *"Enrichir remplit les {N} champs dérivables. {M} autres champs nécessitent ta saisie — voir liste ci-dessous."*. Le bouton fonctionne quand même (utile pour pré-remplir les `derivable: true`).

**Impact** : aucun changement de governance. Pure UI/UX. ~150 lignes dans `pillar-page.tsx` + petite modif `AmendPillarModal` pour pré-cibler un champ via prop `initialField?: string`.

### Axe 2 — Closure intake question-bank (résout la cause racine)

**Compléter [question-bank.ts](../../../src/server/services/quick-intake/question-bank.ts) pour que 100% des `derivable: false` du contrat INTAKE soient adressés** par une question directe ou par un seal canonical existant.

| Champ manquant | Action |
|---|---|
| `A.noyauIdentitaire` | Nouvelle Q `a_noyau` : *"Si vous deviez résumer votre marque en une phrase identitaire de moins de 20 mots, ce serait quoi ?"* — `required: true`, `min_length: 10` |
| `A.citationFondatrice` | Nouvelle Q `a_citation` : *"Quelle citation, maxime ou phrase manifeste résume l'esprit fondateur de votre marque ?"* — `required: false` (peut être laissé pour AI rephrase depuis `a_origin`) mais marqué `derivable: true via cross_pillar` dans le contrat |
| `D.positionnement` | Nouvelle Q `d_positioning_explicit` : *"Comment positionnez-vous explicitement votre marque par rapport à vos 2 principaux concurrents ?"* — `required: true` |
| `D.promesseMaitre` | Nouvelle Q `d_promise` : *"Quelle est votre promesse maître — ce que le client peut attendre de vous, sans condition ?"* — `required: true` |
| `D.personas` | Nouvelle Q `d_persona_principal` : *"Décrivez votre client idéal en 3 traits comportementaux concrets (pas démographiques)"* + Q `d_persona_secondary` optionnelle. Output structuré → array d'1 ou 2 personas. |
| `V.produitsCatalogue` | Nouvelle Q `v_produits` : *"Listez vos 3-5 produits/services principaux avec leur prix indicatif (un par ligne)"* — `required: true`, parser ligne → `{nom, prix}` |

**Bonus mécanique** : changer le contrat A pour rendre `noyauIdentitaire` et `citationFondatrice` `derivable: true` avec `derivationSource: "cross_pillar"` (depuis `a_vision`/`a_mission`/`a_origin`) → fallback gracieux si l'utilisateur les saute. Mais le default reste **demander explicitement**, pas deviner.

**Impact** : changement produit (touche le funnel intake landing user-facing). Tests à ajouter : intake E2E qui finit avec ADVE en `currentStage === "INTAKE"` minimum (gate `assertReadyFor("RTIS_CASCADE")` doit passer).

### Axe 3 — Gate `actualizeRT` sur `RTIS_CASCADE` (anti-drift LOI 1)

**Modifier [notoria.ts:83-96](../../../src/server/trpc/routers/notoria.ts)** pour ajouter `preconditions: ["RTIS_CASCADE"]` au `actualizeRT` operatorProcedure, alignant son comportement sur `generateBatch` (ligne 64).

```ts
actualizeRT: operatorProcedure
  .input(z.object({
    strategyId: z.string(),
    pillars: z.array(z.enum(["R", "T"])).default(["R", "T"]),
  }))
  .preconditions(["RTIS_CASCADE"])  // ← AJOUT
  .mutation(async ({ input }) => { ... }),
```

**Côté UI** : sur `notoria-page.tsx`, le bouton "Lancer la veille R + T" est désactivé (avec tooltip explicatif) si `assess.gates.RTIS_CASCADE.ok === false`. Lien "Compléter ADVE d'abord" qui scroll vers les piliers ADVE non-prêts. Le stepper UI reflète : étape 1 = "ADVE → ENRICHED" au lieu de "Risque + Track" (renumérotation conceptuelle), R+T devient étape 2.

**Impact** : refonte du stepper Notoria à 5 étapes au lieu de 4, mais reflète la réalité de la cascade. Architecturalement clean : zéro chemin contournable.

### Axe 4 (optionnel, hors scope ce ADR) — `auto-filler` retourne `needsHuman` aux mutations

Aujourd'hui [pillar.autoFill](../../../src/server/trpc/routers/pillar.ts) retourne `{ filled, failed, needsHuman, newStage }`. Le client (`handleRegenerate` dans `pillar-page.tsx`) n'utilise que `filled`. À explorer dans un sprint UX ultérieur : surfacer `needsHuman` dans le toast de feedback du bouton Enrichir pour que l'utilisateur soit prévenu **immédiatement** après le clic.

---

## Conséquences

### Avant cet ADR
- Intake produit ADVE sparse → cascade R+T sur du sable → Oracle/SuperAssets construits sur fondations fragiles → la chaîne ADVERTIS est mathématiquement incomplète.
- L'opérateur ne sait pas pourquoi son pilier est à 81% et pas 100%.
- `actualizeRT` peut être invoqué sur ADVE vide → produit du JSON LLM générique.

### Après cet ADR
- Intake produit ADVE en `currentStage === "INTAKE"` minimum (tous champs `derivable: false` couverts).
- Le bouton "Enrichir" peut amener à `ENRICHED` (les champs ENRICHED sont presque tous `derivable: true`).
- Les champs ENRICHED restants `needsHuman` sont **explicitement listés à l'utilisateur** avec CTA direct.
- `actualizeRT` refuse de tourner si ADVE pas prêt → R+T toujours sur matière dense → recos qualité.
- Le stepper Notoria reflète honnêtement les étapes : ADVE → R+T → I → S, pas R+T en premier.

### Compatibilité existant

- **Intakes existants** (Strategy avec content sparse) : pas affectés rétroactivement. Le gate `RTIS_CASCADE` les bloquera sur `actualizeRT` côté UI — il faut soit compléter manuellement via amend, soit relancer l'intake. À documenter dans une note runbook.
- **Strategies seedées** (`seed-spawt-complete.ts`, `seed-wakanda`) : à auditer post-ADR pour s'assurer qu'elles passent `RTIS_CASCADE`. Si non, ajouter du contenu seed pour les `derivable: false` du contrat INTAKE.
- **Schema Zod** ([pillar-schemas.ts](../../../src/lib/types/pillar-schemas.ts)) : aucun changement. Les nouveaux paths intake correspondent à des champs Zod déjà définis (`noyauIdentitaire`, `citationFondatrice`, etc.) — l'ADR ne fait que **les peupler** systématiquement.
- **`OPERATOR_AMEND_PILLAR`** (ADR-0023) : déjà la voie unique d'amendement. Cet ADR-0030 ajoute simplement des CTA UI qui le déclenchent depuis la liste `needsHuman`.

### Tests à ajouter

1. `tests/integration/intake-completes-adve.test.ts` — un intake avec réponses minimales (1 mot par Q) doit produire ADVE A/D/V/E en `currentStage === "INTAKE"` minimum (tous `derivable: false` remplis).
2. `tests/integration/actualize-rt-gated.test.ts` — `actualizeRT` doit throw `ReadinessVetoError` si A est `EMPTY`, et passer si A/D/V/E sont `ENRICHED`.
3. `tests/unit/pillar-page-needs-human-panel.test.tsx` — le panneau `needsHuman` s'affiche correctement et les CTA "Saisir" ouvrent le modal pré-ciblé.

### Audits anti-drift

- Étendre `scripts/audit-mission-drift.ts` (ou créer `scripts/audit-intake-coverage.ts`) qui vérifie : pour chaque pilier ADVE, **chaque champ `derivable: false` du contrat INTAKE doit être couvert** soit par une question dans `question-bank.ts`, soit par un seal canonical, soit par un `derivationSource` non-`ai_generation` (calculation/cross_pillar) — sinon échoue CI. Empêche la régression future.

---

## Plan d'implémentation (séquencé, 3 PRs)

### PR-1 — Axe 1 UX `needsHuman` panel (~150 lignes, 0 risque)
- `pillar-page.tsx` : panneau encart sous scoring bar, conditionnel `assess.needsHuman.length > 0`.
- `amend-pillar-modal.tsx` : prop `initialField?: string` qui pré-sélectionne le dropdown.
- `variable-bible.ts` : ajouter `label` sur les paths qui n'en ont pas (utilisé pour rendre les noms lisibles dans le panel).
- CHANGELOG `feat(cockpit): needsHuman panel + CTA direct sur page pilier`.

### PR-2 — Axe 3 gate `actualizeRT` (anti-drift, ~30 lignes)
- `notoria.ts` : ajouter `preconditions: ["RTIS_CASCADE"]` à `actualizeRT`.
- `notoria-page.tsx` : disable bouton "Lancer la veille R+T" si `gate RTIS_CASCADE` failed + tooltip explicatif + lien "Compléter ADVE".
- `notoria-page.tsx` : refonte stepper 4→5 étapes (ADVE → R+T → I → S, ADVE devient étape 1).
- Test `tests/integration/actualize-rt-gated.test.ts`.
- CHANGELOG `fix(notoria): gate actualizeRT par RTIS_CASCADE + stepper 5-étapes`.

### PR-3 — Axe 2 closure intake question-bank (refonte produit, ~300 lignes)
- `question-bank.ts` : 6 nouvelles questions (cf. tableau §Décision Axe 2).
- `quick-intake/index.ts` : adapter `extractStructuredPillarContent` prompt pour mentionner explicitement les nouveaux paths attendus + parsing personnel/produits.
- `pillar-maturity-contracts.ts` : marquer `noyauIdentitaire`/`citationFondatrice` `derivable: true via cross_pillar` (fallback gracieux).
- `intake/[token]/page.tsx` (UI landing) : rendu adapté aux nouvelles Q (label, tooltip, validation).
- `tests/integration/intake-completes-adve.test.ts`.
- `scripts/audit-intake-coverage.ts` (nouveau) + entry CI.
- CHANGELOG `feat(intake): closure ADVE 100% — questions needsHuman + audit coverage`.

---

## Risques et mitigations

| Risque | Mitigation |
|---|---|
| Allongement du tunnel intake landing (6 Q en plus) → drop-off conversion | Phasage progressif : Q `required: true` minimum (3 nouvelles : `a_noyau`, `d_positioning_explicit`, `v_produits`), les autres en `required: false` avec hint "saute si tu veux passer plus vite, tu pourras compléter dans le cockpit". A/B testable. |
| Strategies existantes en base avec ADVE sparse → bloquées sur `actualizeRT` | Runbook + script `scripts/migrate-existing-strategies-coverage.ts` qui scan les strategies, détecte celles avec `gate RTIS_CASCADE failed`, et soit (a) prévient l'utilisateur via notification, soit (b) auto-amende via LLM extraction depuis `quickIntake.responses` historiques. |
| Stepper 5-étapes trop chargé visuellement | Première étape "ADVE" reste cliquable et expand pour montrer A/D/V/E individuellement (sub-stepper). |
| Audit `scripts/audit-intake-coverage.ts` faux positifs sur futurs ajouts contract | Test invariant + section dédiée dans NEFER §4.5. |

---

## Décisions explicitement REJETÉES

- **Rendre tous les champs `derivable: true` et confier à l'AI** → rejeté. Casse le principe anti-hallucination de l'intake. Les champs identitaires (`noyauIdentitaire`, `citationFondatrice`, `positionnement`, `promesseMaitre`) DOIVENT venir de l'humain — ce sont les fondations de la marque.
- **Forcer 100% à l'intake (refus de soumettre tant qu'incomplet)** → rejeté. Trop de friction landing. La progression intake → cockpit avec amend ultérieur est le bon flow.
- **Supprimer le concept `derivable: false`** → rejeté. C'est une distinction utile pour le moteur. Il faut juste que l'UX en tire les conséquences.
- **Réorganiser les contrats pour mettre tous les `derivable: false` en stage ENRICHED au lieu de INTAKE** → rejeté. INTAKE doit rester le seuil minimal viable de la marque. Si on permet INTAKE sans `noyauIdentitaire`, on permet une marque sans noyau identitaire — c'est absurde au regard de la mission ADVERTIS.

---

## Références

- [ADR-0023](0023-operator-amend-pillar.md) — `OPERATOR_AMEND_PILLAR` : voie unique d'édition ADVE
- [pillar-readiness.ts](../../../src/server/governance/pillar-readiness.ts) — gates canoniques (`DISPLAY_AS_COMPLETE`, `RTIS_CASCADE`, `GLORY_SEQUENCE`, ...)
- [pillar-maturity-contracts.ts](../../../src/lib/types/pillar-maturity-contracts.ts) — contrats INTAKE/ENRICHED/COMPLETE
- [auto-filler.ts](../../../src/server/services/pillar-maturity/auto-filler.ts) — moteur de complétion auto
- [question-bank.ts](../../../src/server/services/quick-intake/question-bank.ts) — bank questions intake landing
- [notoria.ts](../../../src/server/trpc/routers/notoria.ts) — router Notoria (mutations cascade)
- [NEFER.md §3](../NEFER.md) — interdit #1 "Réinventer la roue" + interdit #3 "Drift narratif silencieux"
- v6.1.18 — fix `rtis-cascade.savePillar` cache reconciliation (préalable indispensable à cet ADR)
