# Plan — Langue de travail & moteur de traduction (i18n contenu)

> **Statut : PLANIFIÉ (pas implémenté).** Note de session 2026-06-13. À reprendre
> sur demande explicite. Décisions opérateur intégrées (cf. §Décisions).

## Le problème

Le toggle livré (cookie `lf-locale`) ne change que **la langue de lecture** (chrome UI :
nav, labels, marketing). Il y a en réalité **trois langues distinctes** :

1. **Langue de lecture** (UI) — ✅ faite.
2. **Langue de travail** (opérateur) — ❌ inexistante. Conditionne la langue de
   génération par défaut de l'IA + des ADVERTIS.
3. **Langue de contenu** (par marque, `Strategy.contentLanguage`) — ❌ inexistante.
   La langue dans laquelle l'ADVERTIS / Oracle / briefs d'une marque sont rédigés.
   Aujourd'hui : **toujours FR, en dur dans les prompts**.

Plus : **traduction à la demande** d'un contenu canonique vers une autre langue de lecture.

État du code : `GatewayCallOptions` (`llm-gateway/index.ts`) n'a aucun champ langue ;
~19 services / ~52 fichiers construisent des prompts FR en dur ; `Strategy` n'a pas
de champ langue (seulement `countryCode`/`currencyCode`). **Un service de traduction
existe déjà et n'est pas câblé** : `src/server/services/translation/index.ts` (625 lignes :
`translateContent`, `translateBrief`, registres culturels nouchi/camfranglais/wolof).

## Décisions opérateur (2026-06-13)

- **Réglage séparé** : le toggle = langue d'**affichage** du système uniquement. Une
  **« langue de travail (IA & contenu) »** distincte se définit dans les réglages.
- **Juste le plan** pour l'instant (pas d'implémentation).
- Exigences traduction : **ne pas désynchroniser**, **ne pas coûter une fortune en
  tokens**, idéalement **rien du tout via un moteur interne**. Inquiétude sur le
  scénario chinois (langue de requête ZH → traduire en FR/EN) : gestion DB + qualité.

## Principe anti-désync (le plus important)

**Une seule langue canonique par marque (`contentLanguage`) ; les autres langues sont
des VUES DÉRIVÉES, read-only.** Exactement comme RTIS dérive d'ADVE et n'est jamais
édité à la main. Impossible de désynchroniser s'il n'y a qu'une source de vérité et que
les traductions sont des vues jetables avec *staleness* (pattern `staleAt` déjà connu).

**Traduction au niveau segment, avec hash de source.** Chaque champ porte un
`sourceHash`. Édition d'un champ → seul **ce** segment devient stale → re-traduction
paresseuse de **ce** segment uniquement, jamais du pilier entier. Sync serré + coût minimal.

## Moteur interne en cascade (gratuit → payant, comme Ollama→Anthropic)

- **Tier 0 — Structurel (gratuit, déterministe).** On ne traduit PAS : nombres, dates,
  devises, enums (`PRODUCT`/`SERVICE`), codes (`A1`, `pillar-a-001`), URLs, noms propres
  (marque, Neteru). Couvre une grosse part d'un ADVERTIS structuré.
- **Tier 1 — Glossaire + Translation Memory (gratuit, en base).** Glossaire de domaine
  (les ~300 labels du variable-bible + vocabulaire canon : superfan, Overton, devotion,
  culte, icône…) pré-traduit **une fois** FR/EN/中文. TM : tout segment déjà traduit
  (hash) réutilisé → 0 coût. Garantit aussi la **cohérence terminologique**.
- **Tier 2 — MT locale (quasi-gratuit).** Texte libre résiduel → modèle open-source
  self-hosté **Argos Translate / OPUS-MT** (licences MIT / CC-BY → **OK revente** ;
  éviter LibreTranslate AGPL si modifié), en sidecar ou via Ollama existant. 0 coût/token.
- **Tier 3 — LLM (payant, opt-in, gated).** Seulement livrables à fort enjeu (export
  Oracle, PDF client), MT à faible confiance, ou clic « améliorer ». Seul tier payant ;
  son résultat **ré-alimente le TM** (gratuit ensuite). Le service `translation/index.ts`
  existant (Claude) devient ce Tier 3.

**Réalité « rien du tout »** : Tier 0+1 = 100 % gratuit et en base. Le texte libre
résiduel coûte soit un petit sidecar MT (~free), soit du LLM mis en cache (amorti : 1
fois par langue par version). Sur Vercel free (pas de compute persistant), Tier 0+1
tourne tel quel ; Tier 2 demande le sidecar.

## Scénario chinois (DB + qualité)

Cas général « `contentLanguage` ≠ FR ». Langue de travail = ZH → on **génère nativement
en ZH** (Claude solide en chinois), FR/EN = vues dérivées.
- **DB propre** : un canonique + cache de traduction. Pas d'explosion combinatoire, pas
  de colonnes N-langues. Le canonique est autoritaire ; les vues régénérables/évictables
  → aucune désync possible.
- **Qualité ZH↔FR/EN** : MT locale faiblit, LLM excelle. Glossaire épingle les termes,
  LLM fait la prose, TM met en cache → haute qualité ET amorti. Peu de marques ZH au
  début → coût LLM-ZH marginal.

## Plan d'implémentation (6 phases)

- **A — Réglages.** Toggle de lecture inchangé (affichage seul). **Nouveau réglage
  « Langue de travail (IA & contenu) »** par opérateur. `Strategy.contentLanguage` figée
  à la création depuis la langue de travail, override par marché cible. Helper
  `resolveContentLanguage(strategyId)`.
- **B — Génération suit `contentLanguage`.** `outputLanguage?` dans `GatewayCallOptions`
  + `StructuredLLMOptions` ; **injection centrale** dans `callLLM` +
  `executeStructuredLLMCall` (« valeurs en {langue}, **clés JSON inchangées** ») ;
  **auto-résolution depuis `strategyId`** → quasi tous les ~52 sites multilingues sans
  toucher les prompts.
- **C — Strings.** Diagnostics opérateur (rulers, jauges) → langue de **lecture** ; texte
  livrable déterministe (composers) → langue de **contenu** (catalogue).
- **D — Moteur de traduction en cascade** (Tiers 0→3) + tables `ContentTranslation`
  (segment, hash, engine, confidence), `TranslationGlossary` (termKey, fr, en, zh, locked),
  TM. `translation/index.ts` devient le Tier 3.
- **E — Canon FR canonique** + vues dérivées (démos Oracle EN/中文 via le cache, pas une
  régénération).
- **F — ADR + tests** : clés Zod préservées en génération structurée (**test bloquant** —
  point délicat unique), idempotence du cache, staleness segment-level, parité manual-first.

## Démarrage suggéré

- **A + B** = valeur visible la plus vite (génération qui suit la langue).
- **D** = le moteur interne qui évite la facture de tokens.
