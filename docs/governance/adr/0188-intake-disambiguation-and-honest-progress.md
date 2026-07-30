# ADR-0188 — Le rapport d'intake ne contient plus l'entreprise d'un autre

- **Statut** : Accepted
- **Date** : 2026-07-30
- **Portée** : `/intake` (funnel payant) · `quick-intake` (router + service) · `seshat/entity-gate` · `quick-intake/web-footprint` (partagé avec le /scorer)
- **Gouverneur** : SESHAT (collecte publique + gate d'entité) — **aucun nouveau Neter, cap APOGEE 7/7 préservé**
- **LLM ajouté** : aucun. L'extraction existante rend deux champs de plus dans le **même** appel ; un appel Brave non gaté est **supprimé**.

## Contexte

Question opérateur : *« ce process est flawless ? »* — sur `/intake/[token]/ingest`, avec une saisie réelle : marque « Irawo », 117 caractères de texte libre (« plateforme qui développe les talents africains »), ni site, ni documents, ni secteur, ni pays.

Recette E2E de ce cas exact, en production, avant d'écrire une ligne :

```
COMPLETED en 264 s
pilier E → webPresence.maps = { placeName: "Irawo Studio",
                                rating: 4.3,
                                address: "Osborne Rd, Ikoyi, Lagos, Nigeria" }
           avis affiché : « I've bought two pieces from them already… »
           touchpoints : irawostudio.com · instagram.com/irawostudio · tiktok.com/@irawostudio
force /200 = 19.1 (LATENT), unique arène mesurée = E — alimentée par l'homonyme
```

**Le rapport livré au prospect décrivait une boutique de mode de Lagos.** L'extraction ADVE, elle, était honnête : 5 champs, tous marqués `SOURCE`, fidèles au texte. Le poison venait entièrement de la **collecte d'empreinte**.

Quatre causes en chaîne :

1. Secteur et pays sont **optionnels** et absents dans ce flux → `createEntityGate` sans aucun discriminant.
2. Le texte du prospect **n'alimentait jamais la collecte**. Il contenait pourtant les discriminants (« plateforme », « talents africains ») : ils étaient extraits par le LLM… puis jamais réinjectés. `complete()` appelait `enrichPublicFootprint({ sector: null, country: null })`.
3. La garde de candidature site acceptait tout host **contenant** le slug : `irawostudio` ⊇ `irawo`. Même mécanique mesurée le même jour sur le /scorer : « Dovv » adoptait `dovvstudio.com`.
4. Sans discriminant, la **mention seule** suffisait au gate pour un nom hors-dictionnaire — et « Irawo Studio » mentionne bel et bien « Irawo ».

## Décision

### 1. Le texte du prospect arme le gate (cause racine)

`extractFromText` rend désormais un bloc `_meta { sector, country }` **dans le même appel LLM** — zéro coût supplémentaire. Après le merge des réponses, `applyExtractedMeta` remplit les colonnes `sector`/`country` **uniquement si le prospect n'a rien déclaré** : la déclaration prime toujours sur l'inférence. `complete()` relit la row → l'entity-gate reçoit de vrais discriminants, et toute la mécanique marché existante (ADR-0162) s'applique sans autre plomberie.

`_meta` est retiré avant le filtre `hasSubstantiveAnswer` : c'est un canal de contexte, jamais une réponse — il ne peut pas marquer une phase comme répondue.

### 2. Une extension de nom n'est pas la marque

Nouveau verdict pur `assessNameExtension(candidat, marque)` dans l'entity-gate :

| verdict | exemple | traitement |
|---|---|---|
| `exact` | « Irawo » | accepté sur la mention |
| `benign` | « Chococam SA », « Groupe Dovv » | accepté sur la mention (forme juridique) |
| `extended` | « Irawo Studio », « Burger King Abidjan » | **exige un discriminant** |
| `unrelated` | « Boutique Mode Lagos » | rejeté |

Appliqué à trois endroits, tous par la même règle : **une extension n'est décidable qu'avec un discriminant, jamais devinée.**

- **Fiche Maps** : `extended` + 0 discriminant → `NOT_FOUND` honnête (`filtered.maps` trace le rejet). C'est ce qui aurait suffi à écarter « Irawo Studio ».
- **Candidats site** (`officialSiteCandidatesFromHits`) : un host dont aucun label ne vaut exactement le slug n'est candidat que si son hit porte un discriminant (`hostLabelMatchesSlug`).
- **Piste du proposeur LLM** : un host superset n'est même pas testé sans discriminants, et sa page doit en co-mentionner un.

Burger King Abidjan — extension **avec** discriminants — reste accepté : c'est le cas de test qui prouve que la règle discrimine au lieu d'interdire.

### 3. L'extraction ne lit que ce que le prospect a fourni

`fetchDigitalPresenceBlock` est **supprimée**. Elle injectait dans le prompt d'extraction des hits Brave **sans aucun entity-gate**, remontés par une requête logiquement cassée (`"X" OR site:twitter.com OR …` — qui ramène n'importe quelle page de ces plateformes), en **doublon** de l'appel Brave que l'empreinte fait déjà. Du bruit homonyme injecté au cœur du LLM.

La présence digitale n'entre plus dans le rapport que par `enrichPublicFootprint` (gate-validée), via `mergeFootprintIntoPillarE`.

Le préambule du prompt est corrigé au passage : il annonçait *« la documentation fondatrice de La Fusée »* alors que le texte source est celui du **prospect** — vestige copié d'un prompt d'ingestion interne, contexte trompeur pour le modèle.

### 4. SSRF fermé

`fetchUrlAsText` (utilisée par `processIngest` **et** `processIngestPlus`) faisait un `fetch()` nu sur une URL fournie par l'utilisateur, or `z.string().url()` accepte `http://10.x.x.x/…` — depuis le conteneur, cela atteint le réseau docker interne. Elle passe par `ssrfSafeFetch`, la garde déjà utilisée par le /scorer (IP privées refusées, redirections re-validées).

### 5. L'attente montre le chemin réel

Les emitters NSP `intake_*` existent depuis 2026-05-12 mais **aucun client ne peut les lire** : le seul endpoint SSE exige une session et répond 401 à un lead anonyme (leur propre en-tête le documente). L'écran affichait donc une progression **simulée** — 7 étapes pilotées par un chronomètre client (`startsAt` : 0 → 46 s) pour un traitement **mesuré à 264 s**. Le prospect voyait « Synthèse du rapport » au bout de 46 secondes, puis restait dessus trois minutes. Les étapes nommées d'après les piliers (Authenticité, Distinction…) ne correspondaient à aucune phase réelle : les 4 piliers sortent d'un seul appel.

Colonne `QuickIntake.processingStage` (migration additive, nullable) écrite à chaque jalon réel de `complete()` — `started` → `footprint` → `extracted` → `scored` → `narrative`. `getByToken`, déjà sondé par le client, la porte sans nouvel endpoint ni session. La barre suit l'étape atteinte et **plafonne à 90 %** tant que la fin n'est pas lue (même doctrine que le `ScanProgress` du /scorer). Jalon inconnu → libellé générique, jamais une étape inventée.

## Conséquences

- Les rapports d'intake perdent des signaux quand la marque est indiscernable de son homonyme. **C'est le but** : ces signaux étaient faux. Un vide honnête vaut mieux que les avis clients d'une autre entreprise.
- Le /scorer bénéficie du même durcissement (`web-footprint` est partagé) : `dovvstudio.com` pour « Dovv » doit tomber — vérifié en recette.
- Une marque qui déclare son secteur/pays, ou dont le texte permet de les inférer, **gagne** en couverture : le gate discrimine au lieu de tout rejeter.
- Un appel Brave de moins par intake.

## Alternatives écartées

- **Rendre secteur/pays obligatoires au formulaire** : ajoute deux champs au haut de funnel pour résoudre un problème que le texte déjà fourni permet de trancher. Coût de conversion pour rien.
- **Filtrer les homonymes par un LLM juge** : le juge adversarial existe déjà (ADR-0162, demote-only) et n'avait pas tranché ce cas — « Irawo Studio » mentionne authentiquement « Irawo ». Le défaut était déterministe, le remède devait l'être.
- **Poser un endpoint SSE public token-scopé** pour les jalons : surface d'attaque et travail réels pour un besoin que la colonne couvre, sur un canal (`getByToken`) déjà sondé.

## Vérification

- `tests/unit/services/entity-gate.test.ts` — verdict d'extension (exact / benign / extended / unrelated, y compris « Irawopolis » qui n'est pas une extension).
- `tests/unit/services/footprint-discovery.test.ts` — host superset rejeté sans discriminant / retenu avec ; label exact jamais soumis à discriminant.
- Recette E2E live : rejouer le cas Irawo texte-identique → aucun signal « Irawo Studio » ; re-scan Chococam (non-régression) et Dovv (perte attendue de `dovvstudio.com`).
- Boucle adversariale sur 5 marques distinctes avant clôture (mandat opérateur) : chaque signal jugé sur son appartenance réelle à la marque.
