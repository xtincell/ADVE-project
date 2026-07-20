# ADR-0162 — Entity Gate : collecte publique adversariale (désambiguïsation d'entité)

- **Status** : Accepted
- **Date** : 2026-07-20
- **Phase** : post-audit intake (suite ADR-0121 / ADR-0161, fix F3 v6.27.223)
- **Depends on** : ADR-0121 (empreinte web publique), ADR-0046 (no-magic-fallback), ADR-0067 (LLM structuré), ADR-0108 (point d'accès internet Seshat), ADR-0100 (Hunter sous gouvernance — pattern source)
- **Supersedes** : — (durcit la garde `mentionsBrand` de v6.27.223 F3 sans la remplacer)

## Contexte

Incident prod 2026-07-20 : la marque **« Top »** (soda des Brasseries du Cameroun) reçoit un
rapport d'intake pollué — presse, découverte sociale et fiche Maps collectent tout ce qui
contient le mot ordinaire « top » (« le top 10 des plages », « au top »…).

La garde `mentionsBrand` (frontière de mot + longueur ≥ 3, fix F3 2026-07-19) est **lexicale** :
elle présuppose que le nom de marque est un token rare. Pour un nom-mot-du-dictionnaire
(« Top », « Orange », « Total »), un usage ordinaire du mot EST un match de mot entier
légitime. Quatre points d'entrée étaient touchés :

1. **Presse** — requête Google News littéralement `q="Top"` (aucun terme de contexte) +
   filtre lexical aval (`public-enrichment.ts`) ;
2. **Découverte de site** — `discoverOfficialSite` validait un domaine candidat par
   **sous-chaîne** (`hay.includes("top")` matche « desktop ») — plus faible encore que la
   frontière de mot ; risque d'adopter un site homonyme et de scraper SES réseaux/articles ;
3. **Découverte Brave** — hits filtrés au lexical pur ;
4. **Maps (Apify)** — `searchString "Top Cameroun"`, garde lexicale sur `placeName`.

Le moteur n'avait **aucune notion d'entité** : rien ne distinguait la marque Top du mot top,
alors que le secteur et le pays déclarés à l'intake étaient disponibles à chaque requête.

## Décision

Un **gate d'entité** sous Seshat (`src/server/services/seshat/entity-gate/`), pipeline
hunter-like en 3 crans, branché dans l'orchestrateur EXISTANT `enrichPublicFootprint`
(on étend — pas de 2ᵉ orchestrateur, pas de 2ᵉ « Hunter ») :

1. **PLAN (déterministe)** — `assessBrandNameAmbiguity` : un nom dont tous les mots de
   contenu figurent dans un lexique statique de mots communs FR/EN est AMBIGU.
   `buildDiscriminants` : tokens du contexte **déclaré uniquement** (secteur, pays +
   référentiel statique de démonymes/toponymes par ISO-2, slug du domaine déclaré, handles
   sociaux déclarés) — jamais d'invention.
2. **GATE (déterministe)** — `createEntityGate(...).judge(texte)` : mention de marque en
   frontière de mot TOUJOURS exigée ; nom ambigu → **co-occurrence discriminante exigée en
   plus** ; nom distinctif → la mention suffit (discriminants = preuve bonus). Verdict typé
   avec preuves (`matchedDiscriminants`, `rejection`). Appliqué aux 4 points d'entrée ; la
   requête presse est en outre **discriminée à la source** (`"Top" (boissons OR Cameroun)`,
   `brandPressFeedFor` extraTerms) et `discoverOfficialSite` passe de la sous-chaîne au
   verdict complet du gate (`opts.validate`).
3. **RÉFUTATION (LLM optionnel, demote-only)** — `adversarialRefute` : UN appel batché
   (`executeStructuredLLMCall`, ADR-0067) qui tente de RÉFUTER chaque candidat accepté
   (presse, Maps, profils découverts). Contrat strict : ne peut qu'écarter — jamais
   repêcher, jamais ajouter, jamais réécrire ; en doute = refusé ; verdict manquant =
   conservé ; sans provider / timeout / sortie invalide → plancher déterministe et rapport
   honnête `judge: "DETERMINISTIC_ONLY"`. Pattern directement hérité de Hunter ADR-0100
   (« le LLM propose, le déterministe dispose ») et de la boucle verify de deep-research.

**Restitution honnête** : `EnrichedFootprint.entityGate` porte l'ambiguïté détectée, les
discriminants utilisés, le mode de jugement et les comptes d'écartés par source
(`filtered.press/discovery/maps/site/adversarial`). Un candidat écarté est **compté, jamais
remplacé** (ADR-0046). Cas limite assumé : nom ambigu sans AUCUN contexte déclaré →
`discriminants: []` et tout est rejeté — mieux vaut 0 mention qu'une fausse.

**Pourquoi pas une extension de `mentionsBrand` ?** La fonction reste (elle délègue à
`mentionsEntity`, source canonique) mais un booléen lexical ne peut pas porter l'ambiguïté,
les discriminants ni la preuve — il fallait un objet gate construit une fois par collecte.
**Pourquoi pas Hunter lui-même ?** Hunter (Argos) est un producteur de dossiers de
référence, pas un filtre de collecte ; réutiliser son nom brouillerait la table de
discrimination PANTHEON §7. On réutilise son pattern, pas son code.

## Conséquences

- **0 modèle Prisma, 0 Intent kind** — le gate s'exécute dans les flux existants (intake
  `complete()`, rescan `ENRICH_E_FROM_PUBLIC_FOOTPRINT`, scorer prospect via
  `enrichPublicFootprint`). Sub-composant Seshat, **pas un Neter** — cap APOGEE 7/7.
- Zéro LLM dans le chemin déterministe ; le juge adversarial coûte au plus 1 appel batché
  par collecte, time-boxé, `retries: 1`.
- Rétro-compat : `entityGate` optionnel sur `EnrichedFootprint` (webFootprint JSON
  persistés avant le gate restent valides) ; comportement inchangé pour un nom distinctif
  avec contexte (mention = accepté, comme avant F3).
- Tests : `tests/unit/services/entity-gate.test.ts` (cas fondateur « Top » : usage
  ordinaire rejeté, co-occurrence acceptée, état honnête sans discriminants ; noms
  distinctifs inchangés ; déterminisme) + suites footprint existantes vertes.
- Résiduel (tracé RESIDUAL-DEBT) : surfacer `entityGate.filtered` sur la page résultat
  intake (« N mentions écartées — homonymie ») — donnée déjà persistée, UI seule manquante.

## Amendement 2026-07-20 — cascade presse géo-d'abord (test réel « Burger King Abidjan »)

Le test réel en boucle (marque mondiale déclarée sur UN marché : Burger King / Côte
d'Ivoire) a révélé un 2ᵉ type de bruit que l'homonymie ne couvre pas : la requête
nom-seul remonte la presse des gros marchés (5/5 articles France) — même marque,
mauvais marché. Décisions ajoutées, toutes déterministes :

1. **Presse marché-d'abord et marché-SEULEMENT** : pays déclaré → requête unique
   `"Burger King" ("Côte d'Ivoire" OR Abidjan)` (référentiel `COUNTRY_CITIES` exporté
   par l'entity-gate). Résultat mesuré : 5/5 mentions Côte d'Ivoire/Abidjan, 7 items de
   bruit écartés et comptés. Un « rappel large » initialement tenté a été SUPPRIMÉ
   (round 8) : dès qu'il tournait (échec réseau de la passe géo, ou marché sans presse),
   il remplissait les slots avec la presse des gros marchés — non-déterministe et
   trompeur. L'absence de presse locale est un signal honnête, pas un vide à combler ;
   un échec réseau du flux est enregistré (`errors`) et rend EMPTY, jamais un repli
   hors-marché.
2. **`countryCodeGuess` référentiel nom→ISO-2** : le pays intake est du texte libre
   (« Côte d'Ivoire ») — sans mapping, locale presse retombée `gl=CM`, aucun TLD pays
   probé, démonymes absents.
3. **TLD du pays déclaré prioritaire** dans `candidateDomains` (le domaine du marché
   représente LE client ; tous les candidats restent probés en parallèle).
4. **Rétries réseau bornés** (`fetchRssText` 5×, `fetchPublic` 3×, `braveWebSearch` 3×
   + une re-tentative 429, timeout par tentative 3,5 s, backoff progressif) : sur FAI à
   IP round-robin partiellement mortes — le terrain réel du marché cible — un fetch
   single-shot rendait NULL en silence.

## Amendement 2026-07-20 (2ᵉ vague) — clés réelles branchées, rounds 11-15

Le test s'est poursuivi avec les clés réelles (Ollama Cloud deepseek-v4-flash + Brave +
Apify). Le cran 3 (réfutation LLM) a tourné en vrai (`DETERMINISTIC_PLUS_LLM`, 0 faux
rejet sur presse CI légitime). Quatre trous supplémentaires trouvés et fermés :

5. **Profils sociaux découverts = marché déclaré SEULEMENT** : la requête Brave géo
   remontait aussi les comptes France/global/Trinidad de la franchise, et Apify
   comptait les followers des MAUVAIS comptes (1,99 M IG global vs 9 855 FB CI). Quand
   un pays est déclaré, un profil découvert doit porter un signal marché — discriminant
   en frontière de mot dans titre/description, ou en forme compacte dans l'URL/handle
   (`compactTextHasDiscriminant` : `burgerkingcotedivoire` ∋ « ivoire »). Les profils
   issus du site du client (chemin de confiance) ne passent pas par ce filtre. Résultat
   mesuré : 1 seul profil retenu (le bon), 5 écartés comptés, followers du bon compte.
6. **Chemins réservés de plateforme ≠ handles** : `tiktok.com/discover/burger-king-abidjan`
   produisait un profil « discover ». Stoplist élargie dans `detectSocialLinks`.
7. **Apify en pattern async 2 temps** (`startGoogleBusinessRun` tôt →
   `collectGoogleBusinessRun` tard) : le long-poll `run-sync` tenait la connexion
   pendant tout le run de l'actor (30-75 s) et se faisait tuer par les intermédiaires
   qui coupent à ~60 s (NAT FAI mesuré, proxys/edge en prod). L'actor travaille chez
   Apify pendant que le pipeline tourne ; fiche récoltée juste avant la réfutation.
   Résultat mesuré : « Burger King Cocody Abidjan », 3.9★, 2 967 avis. Abort
   best-effort si la fenêtre expire (pas de crédits brûlés pour rien).
8. **Réserve de budget pour le juge** : la fenêtre Apify followers laisse désormais
   ≥ 12 s au reste du pipeline — au round 12 elle mangeait le budget entier et la
   réfutation adversariale (le filet final) ne tournait jamais.

Validation par étage (rounds réels) : presse CI 5/5 + juge LLM (R7/9/11) · socials
marché + followers du bon compte (R13/15) · site accepté (R13) / rejeté honnête
(R1-6) · maps Cocody LIVE + juge (R14) · dégradation honnête réseau mort, zéro
fabrication, erreurs enregistrées (R10/12/14).
