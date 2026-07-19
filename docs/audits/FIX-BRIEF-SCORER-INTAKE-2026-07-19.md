# Brief de fix — Scoreur & Intake (prod, 2026-07-19)

**Contexte** : test adversarial de la prod `powerupgraders.com` (niveau API tRPC + HTML servi ; Chromium bloqué par le proxy sandbox donc UI non vue). 6 constats, tous re-vérifiés contre la prod avec preuves. Ce brief est **auto-portant** : chaque fix cite le fichier, les lignes, le comportement attendu, la repro, et le critère de vérification. **Aucune donnée fabriquée (ADR-0046), zéro LLM sur le scoring déterministe, cap APOGEE 7/7 — invariants à préserver.**

Ordre recommandé : **F2 + F3 + F5 ensemble** (honnêteté scorer + accents, rapide, gros gain crédibilité) → **F4** (rate-limit) → **F6** (preuve audience) → **F1** (refactor async intake, le bloquant lourd, à part).

---

## F1 — 🔴 BLOQUANT — Intake chemin court/import : timeout, « Load failed », row bloquée `IN_PROGRESS`

**Preuve prod** : `POST /api/trpc/quickIntake.processShort` avec un vrai texte de ~120 mots → **timeout à 100 s, 0 octet reçu**. La row (`token cmrs6m1qo009y01mt1ne54m1s`) reste `IN_PROGRESS` indéfiniment ; `rawText` et `responses` sont sauvés (l'extraction LLM a tourné) mais `complete()` ne rend jamais la main dans la fenêtre du proxy.

**Cause** : `processShort` / `processIngest` / `processIngestPlus` exécutent **tout le travail lourd de façon synchrone** dans une seule mutation tRPC : `extractFromText` (LLM) → merge → `complete()` (scoring + classification + deal). Le total dépasse le timeout du proxy frontal (Cloudflare ~100 s non-Enterprise ; Traefik `readTimeout`). `maxDuration=300` sur la route est un no-op sous Coolify.
- `src/server/trpc/routers/quick-intake.ts` : `processShort` (~L1012), `processIngest` (~L1069), `processIngestPlus` (~L1215).
- `complete()` : `src/server/services/quick-intake/index.ts:362` (+ `IncompleteIntakeError` L352).
- Dette déjà tracée : `docs/governance/RESIDUAL-DEBT.md` §« Intake processIngest synchrone → Load failed ». **C'est CE fix.**

**Comportement attendu** : l'ack revient immédiatement, le travail lourd s'exécute hors requête, le client suit l'avancement jusqu'à l'état terminal — **jamais** de requête qui dépasse le proxy, **jamais** de row coincée `IN_PROGRESS`.

**Approche recommandée (la moins invasive — le repo fait déjà du fire-and-forget)** :
1. Ajouter un statut `PROCESSING` (ou réutiliser un flag) au modèle `QuickIntake` (vérifier l'enum de statut existant : `IN_PROGRESS`/`COMPLETED`/… dans `prisma/schema.prisma`). Migration additive backfill-safe.
2. Dans les 3 procédures : persister `rawText`/sources + passer la row à `PROCESSING` + **retourner immédiatement** `{ status: "PROCESSING", token }`. Puis lancer le travail lourd en `void (async () => { … })()` — **exactement le pattern déjà utilisé** pour le relevé d'audience de fond du scorer (`src/server/trpc/routers/footprint.ts:172`, `// Fire-and-forget : notre prod est un serveur long-vivant (Coolify), pas du serverless`). À la fin : écrire `COMPLETED` (succès) OU `FAILED` + `failureReason` (catch — `IncompleteIntakeError` → message dédié déjà présent). **Ne jamais** laisser `PROCESSING` sans transition terminale (garde un timeout de sécurité qui bascule en `FAILED` après N min).
3. Côté client : les pages `intake/[token]/ingest`, `/short`, `/ingest-plus` ont déjà la machinerie de sondage/recovering (mitigation en place — le client sonde `getByToken` ~45 s). La brancher sur le statut : `PROCESSING` → écran de traitement (`IntakeProcessingScreen` existe) ; `COMPLETED` → redirige `/result` ; `FAILED` → écran honnête (retry / questionnaire guidé, sans perdre le `rawText`). Option supérieure si le temps le permet : s'abonner au **NSP SSE existant** (`/api/notifications/stream` + hook pattern `useOracleStream`, `src/hooks/use-oracle-stream.ts`, ADR-0072) filtré par token, au lieu du polling.

**Ne PAS** : introduire une vraie file/worker externe (over-engineering ; le serveur Coolify est long-vivant, le `void async` suffit). **Ne PAS** écraser des réponses existantes par un squelette vide (le merge actuel `{...existing, ...new}` est déjà correct — le préserver).

**Vérif** : `processShort` sur un vrai texte → réponse **< 3 s** avec `PROCESSING` ; polling `getByToken` → passe à `COMPLETED` (ou `FAILED` honnête si LLM down) sans jamais rester coincé ; aucun timeout client. Reproduire aussi `processIngest` (base64 docs) et `processIngestPlus`.

---

## F2 — 🔴 BLOQUANT crédibilité — Scoreur fabrique un score social (20/100 + « présence détectée ») sans présence réelle

**Preuve prod** : `POST /api/trpc/footprint.scoreInstant {"brandName":"ZzTestNeferInexistant"}` (marque **inventée, sans site**) → `social: { measured:true, score:20, details:"présence détectée · audience non relevée" }` alors que `facts.socials: []`. **Total 15/100 pour une marque qui n'existe pas — identique à SPAWT scoré sans site.** Double fabrication : 20 points sortis de nulle part + l'affirmation « présence détectée » **fausse**.

**Cause** — `src/server/services/quick-intake/footprint-score.ts` :
- **L59** : `const socialMeasured = f.socials.length > 0 || f.discovery.status === "OK";` → `measured` reste vrai dès que la découverte a tourné, **même vide**.
- **L62** : `… : realCounts.length > 0 || ytSubs > 0 ? 0 : 20; // hints seuls : mi-chemin prudent` → le fallback `: 20` fabrique 20 points quand il n'y a **aucun** compte réel.
- **L69** : `${platforms || "présence détectée"}` → libellé mensonger quand `f.socials` est vide.

**Comportement attendu** (canon « rien n'est inventé, non-mesuré exclu du dénominateur » — comme la dimension `site` le fait déjà, `footprint-score.ts` branche `else` → `measured:false, score:null, details:"aucun site déclaré ni détecté"`) :
- **La dimension social est `measured:true` uniquement si `f.socials.length > 0`** (au moins un profil réellement détecté). Une découverte qui tourne mais ne trouve rien = **`measured:false, score:null, details:"aucun profil social détecté"`** → exclue du dénominateur, jamais 20 points.
- Supprimer le fallback `: 20`. Quand des profils existent mais sans audience relevée, `presence` (basé sur `f.socials.length`) suffit ; `audience=0` est honnête (« audience non relevée »).
- Supprimer le libellé `|| "présence détectée"` (ne peut plus survenir puisque `measured` exige `socials.length>0`, donc `platforms` est non vide).

**Vérif** : marque inventée sans site → social `measured:false, score:null` ; total = agrégat des seules dimensions réellement mesurées (probablement `null`/très bas honnête) ; **jamais 15/100 pour une marque bidon**. Motion19 (vraie, avec site) doit rester ~73/100 inchangé (régression à écarter).

---

## F3 — 🟠 MAJEUR — Presse (et découverte) : faux positifs par match de sous-chaîne

**Preuve prod** : `{"brandName":"a"}` → `press: { measured:true, score:100, details:"5 mention(s) récente(s)" }`, `facts.press` = incendie en Gironde, témoignage cancer, match Espagne-Argentine… **Total 40/100 pour une marque nommée « a ».** Tout nom court/courant (« Go », « Air », « Le ») gonfle presse ET découverte sociale.

**Cause** — `src/server/services/quick-intake/public-enrichment.ts:72-75` : `mentionsBrand` = `normalizeBrandToken(text).includes(brand)` — sous-chaîne pure. « a » est incluse dans « GirondE », « métAstases », etc. Utilisé aussi L204 (hits Brave) et L339 (RSS).

**Comportement attendu** : match sur **frontière de mot**, pas sous-chaîne, + **garde de longueur minimale** sur le token de marque.
- Réécrire `mentionsBrand` : après normalisation, tester la présence du brand comme **mot entier** (ex. `new RegExp(\`(^|\\s)${escaped}(\\s|$)\`)` sur le texte normalisé, ou comparaison token-à-token sur `text.split(" ")`). Pour un brand **multi-mots**, exiger la séquence complète en tokens adjacents.
- **Garde longueur** : si le brand normalisé fait < 3 caractères (ou est un mot ultra-courant), n'accepter qu'un match de mot exact — jamais de sous-chaîne. Un brand mono-lettre ne devrait quasi jamais matcher une brève de presse.
- Appliquer la correction aux 3 usages (L75 définition, et confirmer que L204/L339 en héritent).

**Vérif** : `{"brandName":"a"}` → presse `measured:true, score:0` (ou `measured:false` si tu considères qu'aucune découverte fiable n'est possible) ; **aucun** article sans rapport. Marque réelle avec vraie presse → mentions correctes conservées. Ajouter un test unitaire déterministe `mentionsBrand` (cas « a » ne matche pas « Gironde » ; « Motion19 » matche « … Motion19 … » ; multi-mots).

---

## F4 — 🟠 MAJEUR — Rate-limit inopérant (budget de scan non protégé)

**Preuve prod** : 5 scans frais consécutifs (`refresh:true`, noms distincts) → 5× HTTP 200, aucun 429 (l'agent en avait passé 8 en ~12 s). Chaque scan `refresh` consomme du budget réel (Apify/RDAP/DNS/RSS) + pollue le répertoire.

**Cause** — `src/server/trpc/routers/footprint.ts:46-60` : compteur `Map` **en mémoire par instance**. La prod Coolify a plusieurs workers/répliques → chaque worker a son propre compteur, donc `MAX_PER_WINDOW=6` est multiplié par le nombre de workers. De plus **L109** `x-forwarded-for` derrière Traefik/Cloudflare peut ne pas être l'IP client réelle (vérifier la chaîne d'en-têtes ; peut être `cf-connecting-ip` ou un `x-forwarded-for` multi-valeur dont le premier hop n'est pas le client).

**Comportement attendu** : la limite doit être **partagée entre workers** et keyer sur la vraie IP client.
- Déplacer le limiter vers un **store partagé** : le plus simple sans Redis = une petite table DB (`ScanRateHit { ip, at }` ou réutiliser un compteur existant), requête `count where ip=… and at > now-60s`. Alternative : compter les `BrandFootprintSnapshot` récents par IP si l'IP y est stockée (sinon l'ajouter, additif). **Ne pas** compter les hits de cache (seuls les vrais scans consomment le budget — la logique actuelle rate-limite déjà après le cache-miss, c'est correct, le garder).
- Corriger la résolution d'IP : vérifier l'en-tête réel posé par Traefik/Cloudflare en prod (logger une fois, ou lire la config proxy) et parser en conséquence ; fallback `"anon"` acceptable mais alors un seul seau global — préférer la vraie IP.
- Garder `MAX_PER_WINDOW` raisonnable (6/min/IP) mais **effectif**.

**Vérif** : 7 scans frais rapprochés depuis la même IP → le 7ᵉ renvoie `TOO_MANY_REQUESTS` quel que soit le worker qui répond. **Ne pas** régresser le cache (une marque déjà scorée revient instantanément sans consommer de quota).

---

## F5 — 🟡 MINEUR crédibilité — Accents cassés dans la banque de questions serveur

**Preuve prod** : `quickIntake.getQuestions` → « **Ou** voulez-vous **etre** dans 10 ans ? » ; tooltip « **modele** d'affaires… vous **creez** et **delivrez**… **decrit** ». Le questionnaire du diagnostic (cœur du produit payant) a l'air bâclé. C'est du **contenu serveur** (pas l'UI corrigée en v6.27.219).

**Cause** — `src/server/services/quick-intake/question-bank.ts` : chaînes françaises sans accents (`question`, `tooltip`, `options` labels). Chercher aussi toute autre banque de contenu serveur du funnel (grep large).

**Fix** : restaurer les accents sur **toutes les chaînes rendues** de `question-bank.ts` (et banques sœurs). Pur contenu, zéro logique. Grep de contrôle après : `grep -nE "modele|creez|delivrez|Ou voulez|etre |decrit|reponse|donnees|Strategie" src/server/services/quick-intake/*.ts` doit être vide (hors identifiants de code/commentaires).

**Vérif** : `getQuestions` sur chaque pilier A/D/V/E → toutes les chaînes accentuées correctement.

---

## F6 — 🟡 MINEUR — La preuve chiffrée d'audience n'est pas toujours remontée

**Preuve prod** : Motion19 → social details « 12 123 abonnés mesurés » mais `facts.followerCounts` absent de la projection (le nombre vient probablement des abonnés YouTube, pas des `followerCounts` par plateforme, Apify étant `DEGRADED`). Le rapport magazine promet la **preuve par plateforme** ; ici le chiffre affiché n'a pas de ligne de preuve correspondante.

**Cause** — `src/server/trpc/routers/footprint.ts:212` renvoie `followerCounts: asFollowerCounts(enriched.followerCounts)` (vide si Apify n'a pas tourné), tandis que `totalAudience` (`footprint-score.ts`) inclut `ytSubs`. Discordance : le total inclut YouTube, mais `facts` ne l'expose pas comme ligne de preuve.

**Fix** : s'assurer que **toute source comptée dans `totalAudience` a sa ligne dans `facts`** (si l'audience vient de YouTube, exposer `youtube.subscriberCount` dans `facts` avec le handle/canal). Sinon, si aucune ligne de preuve n'existe pour un chiffre, **ne pas l'afficher comme « mesuré »** (cohérence F2). Priorité basse — ne pas surdimensionner.

**Vérif** : pour toute marque où le social details annonce « N abonnés mesurés », `facts` contient au moins une entrée (plateforme + handle + compte) qui justifie N.

---

## Nettoyage — données de test à purger (base PROD)

Créées pendant l'audit (préfixe `TEST-NEFER` / `Nefer`), à supprimer :
- **QuickIntake** : `cmrs6khnm009l01mt6z3q66h9`, `cmrs6m1qo009y01mt1ne54m1s` (bloquée `IN_PROGRESS`), + 2-3 autres `TEST-NEFER *`. Cibler `contactEmail LIKE 'test-nefer%'` ou `companyName LIKE 'TEST-NEFER%'`.
- **BrandFootprintSnapshot** (répertoire pollué) : `brandKey` de `ZzTestNeferInexistant`, `a`, `NeferRL1..5` (et les `RateLimitProbe*` de l'agent). **Garder** SPAWT et Motion19 (vraies marques).
- Script de purge idempotent recommandé (`deleteMany` ciblé par préfixe), à exécuter contre la base Coolify.

---

## Invariants à ne pas casser (garde-fous NEFER)

- **ADR-0046** : jamais une donnée fabriquée, jamais une absence déguisée — F2/F3/F6 vont exactement dans ce sens, ne pas réintroduire de fallback « prudent » chiffré.
- **Scoring déterministe zéro-LLM** (LOI 9, ADR-0102) : F2/F3 restent purement déterministes.
- **Dénominateur honnête** : une dimension `measured:false` est **exclue** du `measuredWeight` (le total /100 reste sur les seules dimensions réellement mesurées — comportement existant, le préserver).
- **Cap APOGEE 7/7** : aucun nouveau Neter. F1 reste sous Mestor/quick-intake, F2-F6 sous Seshat/quick-intake.
- **Tests** : ajouter au minimum un test unitaire `mentionsBrand` (F3) et un test `computeFootprintScore` cas « découverte vide → social non mesuré » (F2). `npx tsc --noEmit` + `npx vitest run tests/unit` verts avant ship.
- **DS / vocabulaire client** (ADR-0097/0123) si des chaînes UI bougent (F5 est du contenu serveur, mais si un écran d'erreur async F1 est ajouté → skill `nefer-ds` + `nefer-vocab`).

## Repro rapides (copier-coller)

```bash
# F2 : marque inventée → doit NE PLUS être measured social
curl -sS -X POST https://powerupgraders.com/api/trpc/footprint.scoreInstant \
  -H 'content-type: application/json' --data '{"json":{"brandName":"ZzTestNeferInexistant"}}'
# F3 : nom mono-lettre → doit NE PLUS matcher la presse
curl -sS -X POST https://powerupgraders.com/api/trpc/footprint.scoreInstant \
  -H 'content-type: application/json' --data '{"json":{"brandName":"a"}}'
# F1 : short path → doit répondre PROCESSING en <3s (après fix)
#   start (method SHORT) puis processShort {token,text>=100 chars}
# Non-régression F2 : Motion19 doit rester ~73/100
curl -sS -X POST https://powerupgraders.com/api/trpc/footprint.scoreInstant \
  -H 'content-type: application/json' --data '{"json":{"brandName":"Motion19","websiteUrl":"https://motion19.com","countryCode":"CM"}}'
```
