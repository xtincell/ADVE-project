# Audit plateforme — gap intention vs exécution (2026-07-16)

**Mandat opérateur (carte blanche)** : « inspecte profondément le gap entre l'intention et l'exécution, étendu à toute la plateforme, absolument tout ». Méthode : 12 agents d'audit (un par surface) armés de la grille à 6 familles issue du bug /scorer (collecté-mais-jeté · promis-mais-pas-branché · jargon-face-client · état-vide-malhonnête · chaîne-cassée · persistance-perdue), puis contre-vérification adversariale de chaque finding CRITICAL/MAJOR (le vérificateur devait RÉFUTER en suivant la chaîne de code bout en bout). 126 gaps rapportés → **39 confirmés** (5 CRITICAL · 33 MAJOR · 1 MINOR) · 40 MINOR non vérifiés · 1 faux positif écarté.

Remédiation trackée par vagues (V1 funnel-honnêteté #539 → V2 valeur payée/intake #540 → V3 cockpit #541 → V4 leaderboard/oracle #542 — **toutes mergées, 39/39 première passe corrigés**). Deuxième passe de vérification (workflow complet, 98 agents) : **+39 findings confirmés** (§ deuxième passe), remédiation V5+. Statut mis à jour au fil des PRs.

---

## Findings confirmés

### [CRITICAL] `pillar-page-founder-forbidden-actions` — cockpit-dashboard-brand

- **Surface** : Ma marque — pages piliers A/D/V/E (PillarPage : bouton « Enrichir » + panneaux needsHuman/INFERRED « Saisir »)
- **Intention** : Lot 12 audit UX 2026-07-11 : frontière founder/opérateur — « fin du clic→FORBIDDEN (audit [M02-01]) », gestes opérateur jamais rendus au founder ; le code le sait (pillar-page.tsx:114-116 : « Route founders to /cockpit/brand/edit instead of the operator amend modal that would fail with FORBIDDEN »).
- **Exécution** : Seul le bouton « Modifier » du header est branché par canOperate (ligne 421-441). Le bouton « Enrichir » (ligne 470-494) appelle pillar.autoFill qui est operatorProcedure (pillar.ts:782) → founder clique → FORBIDDEN brut dans le toast. Les boutons « Saisir » des panneaux needsHuman (733-740) et champs INFERRED (807-815) ouvrent l'AmendPillarModal opérateur-only sans garde — exactement le modal que le commentaire dit vouloir éviter. Le handler acceptRecos traduit même le FORBIDDEN en « Action reservee aux operateurs » (ligne 174-178), preuve que le cas est connu et subi.
- **Preuve** : src/components/cockpit/pillar-page.tsx:470-494 (Enrichir non gardé), :733-740 et :807-815 (Saisir → openAmendOnField sans canOperate) ; src/server/trpc/routers/pillar.ts:782 `autoFill: operatorProcedure`
- **Fix esquissé** : Même branchement que le header : si !canOperate, « Enrichir » masqué ou remplacé par un lien /cockpit/brand/edit, et « Saisir » route vers l'éditeur founder au lieu du modal OPERATOR_AMEND_PILLAR.
- **Vérification adversariale** : Confirmé bout en bout, et le trou est pire que décrit. (1) « Enrichir » (pillar-page.tsx:470-494) est rendu sans garde canOperate et appelle pillar.autoFill = operatorProcedure (pillar.ts:782) → init.ts:72-77 jette FORBIDDEN pour tout founder ; la bannière pilier-vide (:670-690) dit même au founder de cliquer dessus. (2) Les boutons « Saisir » (:733-740, :807-815) ouvrent AmendPillarModal sans garde ; le modal échoue à l'ouverture car listEditableFields (:1021), previewAmend (:1053) et amend (:1177) sont tous operatorProcedure — exactement le scénario que le commentaire :114-116 dit vouloir év…
- **Statut** : ✅ corrigé — V3 (PR #541, v6.27.177)

### [CRITICAL] `arm-instagram-consumed-without-visual` — cockpit-operate

- **Surface** : Chaîne armer→BrandAction SCHEDULED→cron→publication (Instagram)
- **Intention** : « Armer » planifie les publications (Facebook, Instagram, LinkedIn) — le système les publie automatiquement à la date prévue » (launch-calendar-panel.tsx:146-148) ; doctrine « jamais un faux planifié » (glory.ts:504) et « jamais consommée à vide » (nefer-ops SKILL.md:85, pattern keepWaiting ADR-0133).
- **Exécution** : armLaunchCalendar compte INSTAGRAM comme publiable (glory.ts:542) et émet chaque post IG SANS imageUrl (glory.ts:557-566 — seul `brief` texte est passé). À l'échéance, publishSocialPost exige un visuel pour IG (social-publish.ts:344-352 → state UNSUPPORTED), mais la décision de matérialisation ne garde l'action en attente QUE pour NOT_CONNECTED (social-publish.ts:389-398) : l'action passe mode "PUBLISHED" → status EXECUTED, pending=false. La notification dit « Publication non envoyée » sans raison (UNSUPPORTED exclu de `failed`, social-publish.ts:408, 424-427). Comme la cadence composer met IG à 4-5 posts/sem vs FB 2 (glory-composers.ts:298-300), la MAJORITÉ du calendrier armé est structurellement condamnée à être consommée à vide, marquée EXECUTED dans le Suivi du jour et le Plan d'actions.
- **Preuve** : src/server/trpc/routers/glory.ts:542 `PUBLISHABLE = new Set(["FACEBOOK", "INSTAGRAM", "LINKEDIN"])` + :557-566 (émission sans imageUrl) ; src/server/services/anubis/social-publish.ts:344-352 (IG sans image → UNSUPPORTED), :389-392 `waitingForConnection = !anyPublished && results.some((r) => r.state === "NOT_CONNECTED")` (UNSUPPORTED non couvert → action consommée EXECUTED).
- **Fix esquissé** : Au moment d'armer : soit exclure IG des posts sans visuel (compté « non armé — visuel requis », honnête), soit étendre keepWaiting aux UNSUPPORTED-faute-de-visuel pour que l'action reste SCHEDULED avec motif « visuel à fournir » visible dans le PublicationManagerPanel.
- **Vérification adversariale** : Chaîne vérifiée bout en bout, aucun fix ailleurs. armLaunchCalendar (glory.ts:542) arme INSTAGRAM sans jamais passer imageUrl (:557-566, seul brief texte) ; le cron reconstruit l'input avec imageUrl=null (social-publish.ts:479, route.ts:48) ; publishSocialPost déclare IG sans image UNSUPPORTED (:344-352) ; keepWaiting ne couvre que NOT_CONNECTED (:390-392) → l'action est consommée mode PUBLISHED → status EXECUTED, pending=false, timingEnd=now (:237-238, :394-398), et le filtre cron pending===true (:459) garantit qu'elle ne repartira jamais même après ajout d'image. La notification exclut UNSUP…
- **Statut** : ✅ corrigé — V3 (PR #541, v6.27.177)

### [CRITICAL] `lafusee-fake-live-telemetry` — funnel-marketing

- **Surface** : /lafusee (marketing-hero, marketing-strip, marketing-surveillance)
- **Intention** : MISSION/marketing-finale : « La Fusée signe ses transitions avec des chiffres — pas avec des slides » ; pattern /scorer corrigé v6.27.174 (chiffre inventé face lead = gap d'honnêteté) ; connector-result.ts §3 « No fabricated data »
- **Exécution** : Panneau « TELEMETRY · LIVE » entièrement hardcodé : brand.diagnosed 127, apogee.icone 3 (aucune marque ICONE n'existe), superfans.tracked 142 388, talents.tier_3+ 214, footer « updated: now ». Bandeau header « 47 MARQUES DIAGNOSTIQUÉES · SCORE MOYEN /200 · 142 » (contredit le 127 du même écran). Ticker marketing-strip simule des événements live (« Brief PDF entré · 14h02 », « Cost-gate vert · 47 USD validés »). Radar surveillance affiche « n=412 · 2024-2026 » comme taille d'échantillon d'une étude inexistante. Le compteur RÉEL existe et est déjà servi ailleurs : quickIntake.getCompletedCount (publicProcedure, count COMPLETED/CONVERTED), consommé par la page intake.
- **Preuve** : src/components/landing/marketing-hero.tsx:35,39 (« 47 MARQUES DIAGNOSTIQUÉES », « SCORE MOYEN /200 · 142 »), :89-107 (TELEMETRY · LIVE hardcodé + « updated now ») ; src/components/landing/marketing-strip.tsx:3-13 ; src/components/landing/marketing-surveillance.tsx (footer « n=412 · 2024-2026 ») ; source réelle : src/server/trpc/routers/quick-intake.ts:916-921
- **Fix esquissé** : Brancher le panneau sur des compteurs réels (getCompletedCount + agrégats Seshat) avec état honnête si vide, ou retirer le framing « LIVE / updated now / n=412 » et assumer l'illustratif (« exemple », comme le demo advertis).
- **Vérification adversariale** : Verified end-to-end, refutation failed on every axis. (1) The hardcoded content is exact: marketing-hero.tsx:35/39 ("47 MARQUES DIAGNOSTIQUÉES", "SCORE MOYEN /200 · 142") and :86-108 (TELEMETRY · LIVE panel with static literals 127 / 3 ICONE / 142,388 superfans / 214 talents + footer "updated: now"), self-contradicting 47 vs 127 on the same screen; marketing-strip.tsx:3-13 static ticker simulating live ops events; marketing-surveillance.tsx:114 "n=412 · 2024-2026" fake sample size — zero data source, zero disclaimer, UI actively asserts liveness (pulsing dots, "LIVE", "SWEEP ACTIF"). (2) Users…
- **Statut** : ✅ corrigé — V1 (PR #539, v6.27.175)

### [CRITICAL] `landingintake-fabricated-testimonials` — funnel-marketing

- **Surface** : /landingintake (Hero, Temoignages, Agency)
- **Intention** : Doctrine « Ne jamais combler un trou en inventant des données » (CLAUDE.md Propagation) ; record client réel = data.ts REALISATIONS (Motion19, UMA, Chococam…) et STATS « 30+ marques accompagnées » ; positionnement EFR « mesuré, pas promis »
- **Exécution** : La page affiche « +250 dirigeants accompagnés » + « 4,9/5 de satisfaction » (répété ×3) alors que la homepage canon dit « 30+ marques » depuis 2017 ; trois témoignages nominatifs avec photos stock (Awa Mensah/Zola Apparel, Fatou Diané/Sira Cosmetics, Kwame Boateng/Boateng & Fils) et gains chiffrés « +19/+24/+16 pts » — aucun de ces clients n'existe dans le portefeuille réel (Zola Apparel est aussi la marque fictive du ScoreReport demo). « 8 ans d'expertise terrain » contredit « Depuis 2017 »/« 7 ans » du site UPgraders.
- **Preuve** : src/app/(marketing)/landingintake/page.tsx:120-121 (+250 · 4,9/5), :300-302 (témoignages inventés), :333-335 (stats Agency) ; contre-canon : src/components/upgraders/data.ts:574-609 (REALISATIONS + STATS « 30+ »)
- **Fix esquissé** : Remplacer par la preuve sociale réelle (30+ marques, CLIENT_STRIP, réalisations vérifiables) et supprimer notes/étoiles/gains non mesurés ; si témoignages voulus, en collecter de vrais (Motion19, KOF…).
- **Vérification adversariale** : Confirmé sur HEAD : landingintake/page.tsx affiche « +250 dirigeants accompagnés » + « 4,9/5 » (l.120-121, répété l.311 et l.333-334), trois témoignages nominatifs fabriqués avec photos et gains chiffrés +19/+24/+16 pts (l.300-302 — Zola Apparel n'existe nulle part ailleurs que comme marque fictive du ScoreReport demo de la même page ; Sira Cosmetics et Boateng & Fils absents du repo), et « 250+ marques / 8 ans » dans la section parlant explicitement de la vraie agence UPgraders (l.332-335). Le canon réel (data.ts:574-609) dit REALISATIONS = Motion19/UMA/Chococam… et STATS « 30+ marques accomp…
- **Statut** : ✅ corrigé — V1 (PR #539, v6.27.175)

### [CRITICAL] `oracle-full-paye-jamais-livre` — intake-diagnostic

- **Surface** : Paywall du rapport intake — tier ORACLE_FULL (result page + webhooks paiement)
- **Intention** : pricing-tiers.ts:84-101 : ORACLE_FULL = 199 SPU, « Le livrable conseil dynamique. 35 sections », « Catalogue d'actions priorisé », « Mises à jour pendant 30 jours ». C'est le tier RECOMMANDÉ du result page (result/page.tsx:1488 recommendedTier="ORACLE_FULL"). CLAUDE.md : l'Oracle est LE livrable notable.
- **Exécution** : Payer ORACLE_FULL depuis le result page (result/page.tsx:403-417 → payment.initIntakeReport tierKey ORACLE_FULL) produit EXACTEMENT le même résultat que le tier INTAKE_PDF à 49 SPU : le webhook (stripe/route.ts:135-156, idem cinetpay:106, paypal:133) marque l'IntakePayment PAID et lance premiumReextractAfterPayment — rien d'autre. Aucun ASSEMBLE_ORACLE, aucun lien /shared/strategy, aucun email, aucune alerte opérateur. Le déblocage du PDF (api/intake/[token]/pdf/route.ts:47-51 « any PAID row ») et verifyPayment sont identiques pour les deux tiers. En plus, payment.ts:70,98,137,167 : les 4 db.intakePayment.create du flux intake n'écrivent JAMAIS la colonne tierKey (schema.prisma:3541, elle existe) — même une livraison manuelle ultérieure ne peut pas savoir quel tier a été acheté (seul metadata provider le garde).
- **Preuve** : src/app/api/payment/webhook/stripe/route.ts:153-156 (seul effet du paiement : premiumReextract) ; src/server/trpc/routers/payment.ts:167-176 (create sans tierKey) ; prisma/schema.prisma:3541 (colonne tierKey jamais peuplée sur ce chemin) ; grep ORACLE_FULL : zéro code de fulfillment.
- **Fix esquissé** : Écrire tierKey sur l'IntakePayment dans initIntakeReport, et au webhook PAID sur tierKey=ORACLE_FULL : activer la strategy (réutiliser activateBrand), émettre ASSEMBLE_ORACLE, générer le share-token /shared/strategy et notifier lead + opérateur.
- **Vérification adversariale** : Verified end-to-end and could not refute. (1) The intent exists: pricing-tiers.ts:84-102 sells ORACLE_FULL at 199 SPU with "35 sections", "Catalogue d'actions priorisé", "Mises à jour pendant 30 jours"; result/page.tsx recommends it (lines 1372/1488/1500) and lines 403-417 initiate payment.initIntakeReport with tierKey ORACLE_FULL. (2) Fulfillment is tier-blind: all three webhooks (stripe route.ts:135-156, cinetpay :92-108, paypal :118-136) only mark IntakePayment PAID + fire premiumReextractAfterPayment (quick-intake/index.ts:1377, identical regenerateAnalysis premium for both tiers). Grep of…
- **Statut** : ✅ corrigé — V2 (PR #540, v6.27.176)

### [MAJOR] `guidelines-share-dead-route` — cockpit-dashboard-brand

- **Surface** : Ma marque — /cockpit/brand/guidelines (bouton « Partager »)
- **Intention** : Guidelines « vivantes » partageables au réseau du founder (page header : « Vos guidelines vivantes ») ; le service guidelines-renderer prévoit même un token persisté (guidelinesShareToken).
- **Exécution** : guidelines.shareLink (src/server/trpc/routers/guidelines.ts:65) fabrique `/shared/guidelines/${token}` mais AUCUNE route `/shared/guidelines/[token]` n'existe — seul `/shared/strategy/[token]` est monté (src/app/(shared)/shared/). Le founder copie et envoie un lien qui 404 chez son destinataire. Doublon : le service a sa propre createShareLink DB-backed (guidelines-renderer/index.ts:459,479) jamais branchée au router, qui lui calcule un HMAC sans stockage.
- **Preuve** : src/server/trpc/routers/guidelines.ts:65 `shareUrl: \`/shared/guidelines/${token}\`` + `find src/app -path '*shared*'` → seul shared/strategy/[token] existe ; src/app/(cockpit)/cockpit/brand/guidelines/page.tsx:173-184 copie window.location.origin + shareUrl
- **Fix esquissé** : Créer la route publique /shared/guidelines/[token] (miroir de shared/strategy) et unifier sur UNE implémentation de token (celle du service, persistée).
- **Vérification adversariale** : Confirmé bout en bout : le bouton « Partager » de /cockpit/brand/guidelines (page.tsx l.116/173-184/258-262) appelle guidelines.shareLink qui retourne `/shared/guidelines/${token}` (routers/guidelines.ts:65, token HMAC non stocké), or aucune route ne consomme ce chemin — src/app/(shared)/shared/ ne monte que strategy/[token], aucun catch-all, aucun rewrite next.config/proxy/middleware, aucune route API ; grep global « shared/guidelines » ne trouve que les 2 producteurs + tests, zéro consommateur. Le lien copié 404 chez tout destinataire aujourd'hui. Doublon confirmé : guidelines-renderer getSh…
- **Statut** : ✅ corrigé — V3 (PR #541, v6.27.177)

### [MAJOR] `guidelines-export-html-raw-trpc` — cockpit-dashboard-brand

- **Surface** : Ma marque — /cockpit/brand/guidelines (bouton « Exporter HTML »)
- **Intention** : Exporter le document de guidelines en HTML téléchargeable (le service exportHtml/exportPdf existe : guidelines-renderer/index.ts:283,291).
- **Exécution** : handleExportHtml ouvre `/api/trpc/guidelines.export?input=<JSON brut>` dans un nouvel onglet (guidelines/page.tsx:164-171). Le transformer est superjson (src/server/trpc/init.ts:8) donc l'input non-enveloppé `{"json":…}` échoue à la désérialisation → le founder voit une page d'erreur JSON tRPC ; même en réussissant, ce serait l'enveloppe `{"result":{"data":…}}` en content-type json, jamais un document HTML. exportPdf n'a aucun consommateur (le bouton PDF fait window.print()).
- **Preuve** : src/app/(cockpit)/cockpit/brand/guidelines/page.tsx:166-168 `window.open(\`/api/trpc/guidelines.export?input=${encodeURIComponent(JSON.stringify({ strategyId, format: "html" }))}\`)` vs init.ts:8 `transformer: superjson`
- **Fix esquissé** : Route handler dédié `/api/export/guidelines?strategyId=…` qui renvoie le HTML avec Content-Type text/html + Content-Disposition, ou télécharger côté client via la query tRPC puis Blob.
- **Vérification adversariale** : Confirmé bout en bout : handleExportHtml (page.tsx:166-168) ouvre /api/trpc/guidelines.export avec un input JSON brut ; la route est le fetchRequestHandler standard (aucune interception, proxy.ts n'a qu'un alias de page) ; transformer superjson (init.ts:8) — vérifié par exécution contre le module du repo : superjson.deserialize({strategyId,format}) === undefined → Zod BAD_REQUEST → l'onglet affiche le JSON d'erreur tRPC. Même avec l'enveloppe correcte, la réponse serait {"result":{"data":{"json":…}}} en application/json, jamais un document HTML. exportPdf n'a effectivement aucun autre consomma…
- **Statut** : ✅ corrigé — V3 (PR #541, v6.27.177)

### [MAJOR] `campaign-showcase-404-link` — cockpit-dashboard-brand

- **Surface** : Dashboard cockpit — carte « Campagne du moment » (CampaignShowcase)
- **Intention** : Vague « plus vivant » (v6.27.107) : la vitrine campagne doit mener le founder au suivi de sa campagne (« Suivre la campagne », « Mes campagnes »).
- **Exécution** : Les deux liens pointent `/cockpit/campaigns` qui n'existe pas — la vraie route est `/cockpit/operate/campaigns` et le proxy ne réécrit que `/campaigns` (racine), pas `/cockpit/campaigns`. Clic founder → 404.
- **Preuve** : src/components/cockpit/campaign-showcase.tsx:82,93 `href="/cockpit/campaigns"` ; routes réelles : src/app/(cockpit)/cockpit/operate/campaigns/page.tsx ; src/proxy.ts:47 ne mappe que "/campaigns"
- **Fix esquissé** : Corriger les deux href en /cockpit/operate/campaigns (ou ajouter l'alias 308 dans LEGACY_REDIRECTS).
- **Vérification adversariale** : CONFIRMÉ bout en bout. (1) Les deux liens existent bien : src/components/cockpit/campaign-showcase.tsx:82 et :93 → `href="/cockpit/campaigns"`. (2) Aucune route ne répond : `src/app/(cockpit)/cockpit/` contient brand/insights/intelligence/messages/mestor/new/operate/portfolio/settings — pas de `campaigns/` ; la vraie page est `src/app/(cockpit)/cockpit/operate/campaigns/page.tsx`. (3) Aucun fix ailleurs : `next.config.ts` n'a ni redirects() ni rewrites() ; `src/proxy.ts` LEGACY_REDIRECTS ne mappe que l'exact `/campaigns` (ligne 47) et le préfixe `/campaigns/` — `/cockpit/campaigns` ne matche n…
- **Statut** : ✅ corrigé — V3 (PR #541, v6.27.177)

### [MAJOR] `mestor-insights-internal-jargon` — cockpit-dashboard-brand

- **Surface** : Dashboard cockpit — panneau « Recommandations » (mestor.getInsights)
- **Intention** : ADR-0123 + lot 11 (v6.27.85) : « sweep vocabulaire corps-de-page — Jehuty/Seshat/ADVERTIS/Artemis/GLORY… purgés des chaînes rendues » ; vocabulaire client = business uniquement, jamais de noms mythologiques ni statuts techniques.
- **Exécution** : Le panneau rend l'enum brut `insight.type` (« STALE_PILLAR », « CULT_INDEX », « SLA_RISK »…) en chip visible (page.tsx:555-556), et le service produit des chaînes client avec du jargon interne : « Lancer un diagnostic ARTEMIS sur les piliers faibles », « Utiliser l'outil GLORY 'digital-planner' », « Cult Index faible », « Régression de la Devotion Ladder », « via le Boot Sequence », « Signal Dashboard », « Sous-utilisation des Drivers ». Le test HARD cockpit-vocabulary ne scanne que les littéraux JSX, pas les chaînes serveur — elles passent sous le verrou.
- **Preuve** : src/app/(cockpit)/cockpit/page.tsx:555 `<span className="ck-presc__type">{insight.type}</span>` ; src/server/services/mestor/insights.ts:57 « diagnostic ARTEMIS », :90 « Boot Sequence », :106 « Signal Dashboard », :118 « Cult Index faible », :138 « Régression de la Devotion Ladder », :169 « l'outil GLORY 'digital-planner' »
- **Fix esquissé** : Table de labels client par InsightType côté UI + réécriture des titres/suggestedAction du service en registre business (« Indice d'attachement », « Échelle d'engagement », « votre équipe »…) ; étendre le test HARD aux chaînes de mestor/insights.ts.
- **Vérification adversariale** : Confirmed end-to-end: /cockpit dashboard (founder-facing, "prescriptions" section shown in ALL view modes per showSection page.tsx:320-327) calls trpc.mestor.getInsights — a plain protectedProcedure (mestor-router.ts:10-14) returning generateInsights() output verbatim, with no mapping/sanitization layer. page.tsx:555 renders the raw enum {insight.type} (STALE_PILLAR, CULT_INDEX, SLA_RISK, DRIFT…) as a visible chip, and insights.ts serves founders internal jargon verbatim: « diagnostic ARTEMIS » (:57), « Boot Sequence » (:90), « Signal Dashboard » (:106), « Cult Index faible » (:118), « Régress…
- **Statut** : ✅ corrigé — V3 (PR #541, v6.27.177)

### [MAJOR] `cult-index-fabricated-proxy` — cockpit-dashboard-brand

- **Surface** : Dashboard cockpit — KPI « Indice d'attachement » + sparkline
- **Intention** : Canon « ne jamais combler un trou en inventant des données » (CLAUDE.md PROPAGATION-MAP) — la page l'affirme elle-même : « Honnêteté des données — aucune distribution fabriquée » (page.tsx:219-221). L'indice d'attachement canonique vient de la chaîne cult réelle (calculateAndSnapshot, ADR-0126).
- **Exécution** : Fallback fabriqué : `cultIndex = Math.round(composite / 2)` (page.tsx:216) affiché comme « Indice d'attachement /100 » quand aucun CultIndexSnapshot n'existe (`cultIndexQuery.data?.current ?? cultIndex`, ligne 461) — un score structurel déguisé en métrique d'attachement. Pire : la sparkline est TOUJOURS `scoreTrend/2` (ligne 256), jamais l'historique cult réel, même quand des snapshots existent.
- **Preuve** : src/app/(cockpit)/cockpit/page.tsx:216 `const cultIndex = Math.round(composite / 2)`, :256 `const cultTrend = scoreTrend.map((s) => Math.round(s / 2))`, :461 `{cultIndexQuery.data?.current ?? cultIndex}`
- **Fix esquissé** : Sans snapshot cult : afficher « — » + EmptyState « se mesure dès vos réseaux connectés » ; sparkline branchée sur l'historique CultIndexSnapshot (le router trend l'a déjà en base).
- **Vérification adversariale** : Confirmed end-to-end. (1) Sparkline: page.tsx:256 `cultTrend = scoreTrend.map(s => s/2)` is ALWAYS the halved structural-score history (analytics.getScoreHistory), rendered under "Indice d'attachement" (line 460); the page never calls the existing real `cultIndex.history` endpoint (getCultIndexHistory, cult-index-engine/index.ts:248) — a fabricated attachment-history curve shown even when real CultIndexSnapshot history exists. (2) Numeric fallback page.tsx:216/461 `composite/2` is a structural score disguised as attachment index; nuance: getCultIndexTrend returns current:0 (not null) when no s…
- **Statut** : ✅ corrigé — V3 (PR #541, v6.27.177)

### [MAJOR] `assets-type-filter-index-vs-string` — cockpit-dashboard-brand

- **Surface** : Ma marque — /cockpit/brand/assets (filtre « Type » + couleurs de catégorie)
- **Intention** : Le coffre doit être filtrable par type (Logo/Typo/Couleur/Image/Document) — le SearchFilter expose ce filtre et les stats comptent les « Categories ».
- **Exécution** : À l'upload, `assetType` est stocké comme INDEX numérique (`ASSET_TYPES.findIndex(...)` → 0..4, page.tsx:191) mais relu comme STRING (`(tags?.assetType as string) === typeFilter`, ligne 136 ; ligne 155, 367). Résultat : le filtre Type ne matche JAMAIS un asset uploadé par cette page (2 === "COLOR" est toujours faux), et getTypeBgColor reçoit "0".."4" → tombe toujours en couleur default.
- **Preuve** : src/app/(cockpit)/cockpit/brand/assets/page.tsx:191 `assetType: ASSET_TYPES.findIndex((t) => t.value === uploadForm.type)` vs :136 `(tags?.assetType as string) === typeFilter`
- **Fix esquissé** : Stocker la valeur (`uploadForm.type`) au lieu de l'index — le schéma pillarTags étant z.record(string, number), déplacer assetType hors de pillarTags ou dériver le type du BrandAsset.kind (mapping KIND_FOR_TYPE existe déjà côté serveur).
- **Vérification adversariale** : Confirmé bout en bout. Écriture : page.tsx:191 stocke assetType = ASSET_TYPES.findIndex(...) (nombre 0..4) ; le schéma serveur brand-vault.ts:35 (pillarTags: z.record(z.string(), z.number())) FORCE le nombre (une string serait rejetée par Zod) et persiste verbatim dans le JSON pillarTags sans transformation (lignes 72-76). Lecture : page.tsx:136 compare `(tags?.assetType as string) === typeFilter` — cast compile-time only, `2 === "COLOR"` est toujours false → sélectionner n'importe quel Type affiche « Aucun asset » systématiquement. Aucun autre writer de pillarTags.assetType dans tout src/ (le…
- **Statut** : ✅ corrigé — V3 (PR #541, v6.27.177)

### [MAJOR] `assets-pillar-banner-wrong-brand` — cockpit-dashboard-brand

- **Surface** : Ma marque — /cockpit/brand/assets (bannière de contexte pilier)
- **Intention** : « Pillar brand context banner » : quand on filtre par pilier, montrer le contenu du pilier de LA marque courante pour contextualiser les assets.
- **Exécution** : La page a le strategyId courant (useCurrentStrategyId) mais construit le contexte depuis `strategies.data?.[0]?.pillars` — la PREMIÈRE marque de strategy.list, pas la marque sélectionnée. Founder multi-marques ou collaborateur délégué (ADR-0129) : bannière avec le positionnement/produits d'une AUTRE marque.
- **Preuve** : src/app/(cockpit)/cockpit/brand/assets/page.tsx:98-99 `const strategies = trpc.strategy.list.useQuery({}); buildPillarContentMap(strategies.data?.[0]?.pillars …)` alors que :50 a `strategyId`
- **Fix esquissé** : Remplacer par `strategies.data?.find(s => s.id === strategyId)?.pillars` ou une query pillar.get scoppée sur la marque courante.
- **Vérification adversariale** : CONFIRMÉ après lecture bout-en-bout de la chaîne. (1) Preuve exacte : src/app/(cockpit)/cockpit/brand/assets/page.tsx:98-99 construit `pillarContentMap` depuis `trpc.strategy.list.useQuery({}).data?.[0]?.pillars`, alors que :50 dispose de `strategyId = useCurrentStrategyId()` — et la bannière :317-324 (« Pillar brand context banner », intention explicitement commentée dans le fichier) rend ce contenu quand `pillarFilter !== "all"`. (2) `strategy.list` (src/server/trpc/routers/strategy.ts:474-499) est trié `orderBy: { updatedAt: "desc" }` : `data[0]` = la marque la plus récemment modifiée, pas …
- **Statut** : ✅ corrigé — V3 (PR #541, v6.27.177)

### [MAJOR] `market-feed-cta-dead-end-sector` — cockpit-dashboard-brand

- **Surface** : Dashboard cockpit — « Veille & actualités » EmptyState « Veille non activée »
- **Intention** : ADR-0128 : « chaque état est honnête : secteur/pays absents → CTA pour compléter la fiche » — le founder doit pouvoir débloquer sa veille.
- **Exécution** : Le CTA « Compléter ma fiche marque » route vers /cockpit/brand/fondation… où AUCUN champ secteur/pays n'existe (4 liens piliers + MarketScaleCard échelle/audience/année). Pire : aucune surface cockpit ne permet d'éditer countryCode ni businessContext.sector — strategy.update ne les accepte pas (strategy.ts:248-259) ; ils ne se posent qu'à la création (/cockpit/new) ou à l'intake. Marque existante sans secteur = veille définitivement morte, promesse de déblocage intenable.
- **Preuve** : src/components/cockpit/social/market-feed-card.tsx:56-63 (CTA → /cockpit/brand/fondation) ; src/app/(cockpit)/cockpit/brand/fondation/page.tsx (aucun champ sector/country) ; src/server/trpc/routers/strategy.ts:248-259 (update sans countryCode/businessContext)
- **Fix esquissé** : Ajouter secteur + pays à la MarketScaleCard (ou une carte « Marché » du hub Fondation) et les accepter dans strategy.update (countryCode + businessContext.sector merge).
- **Vérification adversariale** : CONFIRMÉ bout en bout, et le trou est même plus large que le finding. (1) Intention réelle : le header de src/components/cockpit/social/market-feed-card.tsx:4-10 dit explicitement « Chaque état est honnête : secteur/pays absents → CTA pour compléter la fiche » ; le CTA (ligne 62) route vers /cockpit/brand/fondation. (2) La page fondation (src/app/(cockpit)/cockpit/brand/fondation/page.tsx) ne contient que 4 liens piliers + MarketScaleCard ; MarketScaleCard (market-scale-card.tsx) n'a AUCUN champ sector/country (0 occurrence) et sa mutation strategy.update ne porte que marketScale/addressableAu…
- **Statut** : ✅ corrigé — V3 (PR #541, v6.27.177)

### [MAJOR] `pillar-page-technical-statuses-founder` — cockpit-dashboard-brand

- **Surface** : Ma marque — pages piliers (badges Stage/Certainty, chemins de champs bruts)
- **Intention** : ADR-0123 : aucun statut technique ni jargon dans les chaînes rendues au client ; registre business, vouvoiement (lot 11 + nefer-vocab).
- **Exécution** : Rendus founder non gardés : chip « Stage : EMPTY » (ligne 715), badge enum brut currentStage « COMPLETE/ENRICHED/INTAKE » (556), « Certainty : INFERRED » (788), chemins techniques en mono (`a.archetype`, lignes 725, 800), tutoiement mélangé (« à toi de le valider », 711 ; « nécessitent ta saisie », 475) et messages toast techniques (« LLM insuffisant — relance Enrichir », 296/345).
- **Preuve** : src/components/cockpit/pillar-page.tsx:556 `{assess.currentStage}`, :715 `Stage : {assess.currentStage ?? "EMPTY"}`, :788 `Certainty : INFERRED`, :725/:800 chemins mono, :711/:475 tutoiement
- **Fix esquissé** : Labels FR business pour les stages (« À compléter / Suffisant / Complet »), badge « Proposé par l'IA — à valider » à la place de Certainty:INFERRED, masquer les paths mono hors canOperate, uniformiser le vouvoiement ; étendre le test HARD cockpit-vocabulary à ces motifs.
- **Vérification adversariale** : Confirmé bout en bout. Toutes les chaînes citées existent aux lignes citées de src/components/cockpit/pillar-page.tsx (556 badge enum brut currentStage, 715 « Stage : EMPTY », 788 « Certainty : INFERRED », 725/800 chemins de champs en mono, 711/680/475 tutoiement, 296/345 toast « LLM insuffisant — relance Enrichir »). La surface est founder-visible aujourd'hui : PillarPage est monté par les 8 routes /cockpit/brand/* (nav « Ma marque »), sans <OperatorSurface> ; les panneaux needsHuman/INFERRED ne sont gardés que par isAdve, et pillar.assess est protectedProcedure — un founder avec une marque n…
- **Statut** : ✅ corrigé — V3 (PR #541, v6.27.177)

### [MAJOR] `arm-no-duplicate-guard` — cockpit-operate

- **Surface** : glory.armLaunchCalendar (armement J-0)
- **Intention** : Le calendrier unique ADR-0133 (« Aucune 2ᵉ file ») et le mandat d'audit : la chaîne doit être continue avec garde des doublons si on arme 2×.
- **Exécution** : armLaunchCalendar (glory.ts:517-574) n'a AUCUNE garde anti-doublon : chaque émission ANUBIS_PUBLISH_SOCIAL_POST sans brandActionId crée une NOUVELLE BrandAction SCHEDULED (social-publish.ts:246-264). Le bouton « Armer les publications » se ré-active après succès (disabled seulement pendant isPending, launch-calendar-panel.tsx:181) — armer 2× (double-clic, changement de durée, re-visite) duplique tous les posts et le cron publiera chaque texte EN DOUBLE sur la page Facebook réelle de la marque.
- **Preuve** : src/server/trpc/routers/glory.ts:550-571 (boucle emitIntentTyped sans lookup d'existant) ; src/server/services/anubis/social-publish.ts:246 `db.brandAction.create` inconditionnel quand brandActionId absent.
- **Fix esquissé** : Avant émission, requêter les BrandAction SCHEDULED+pending portant metadata.socialPublish de la stratégie et skiper les (plateforme, date, hash du texte) déjà armés ; retourner un compteur `alreadyArmed` affiché par le panel.
- **Vérification adversariale** : Confirmed end-to-end. glory.armLaunchCalendar (glory.ts:517-574) emits ANUBIS_PUBLISH_SOCIAL_POST per post WITHOUT brandActionId, with no lookup of existing SCHEDULED BrandActions and no cancellation of a prior arming. In social-publish.ts, upsertPublishAction's update branch requires input.brandActionId (line 227); without it db.brandAction.create (line 246) runs unconditionally, so each arm run mints a fresh set of SCHEDULED actions. The cron's listDueScheduledPublications (social-publish.ts:452-490) selects ALL due SCHEDULED+pending actions with zero dedup by text/platform/date and publishe…
- **Statut** : ✅ corrigé — V3 (PR #541, v6.27.177)

### [MAJOR] `arm-discards-adve-brand-voice` — cockpit-operate

- **Surface** : Armement + affichage du calendrier de lancement (captions/briefs illustration)
- **Intention** : PROPAGATION-MAP trou H1 (fermé côté composer) : « caption + brief illustration remontent à l'ADVE plutôt que de rester un gabarit libre » — le composer stocke les posts avec la voix de marque du pilier D (glory-composers.ts:321-326 : `deriveDatedPosts(..., brandVoice)`).
- **Exécution** : Dès que le J-0 est ré-ancré, l'armement (glory.ts:535 `deriveDatedPosts(calendar, startISO, weeks)`) ET le panel (launch-calendar-panel.tsx:113-116) re-dérivent les posts SANS le paramètre `brand` (défaut `{}`) : les captions/briefs perdent le lexique et le ton du pilier D (launch-calendar.ts:158-183, accents `lex`/`tone` omis). Les posts stockés ADVE-ancrés en base sont jetés dès que cadenceParCanal est non vide — soit toujours pour les sorties composer (4 canaux hardcodés glory-composers.ts:297-302). Les publications réellement armées partent avec la copy gabarit nue.
- **Preuve** : src/server/trpc/routers/glory.ts:535 (pas de 4ᵉ argument brand) ; src/components/cockpit/launch-calendar-panel.tsx:113-116 (`? deriveDatedPosts(calendar, j0, weeks) : calendar?.posts ?? []` — posts stockés ignorés si cadence présente) ; src/server/services/artemis/tools/glory-composers.ts:326 (le composer, lui, passe brandVoice).
- **Fix esquissé** : Dans armLaunchCalendar, charger la voix pilier D côté serveur (même extraction que composeContentCalendar) et la passer à deriveDatedPosts ; exposer `brandVoice` dans la réponse launchCalendar pour que le panel re-dérive avec.
- **Vérification adversariale** : Confirmé bout en bout. (1) L'intention canon existe : PROPAGATION-MAP.md §6a marque H1 « 🟢 corrigé — branché pilier D », et le composer la respecte (glory-composers.ts:321-326 passe brandVoice={personnalite, lexique} à deriveDatedPosts ; les captions stockées portent l'accent lexical et les briefs le « Ton : … »). (2) armLaunchCalendar (glory.ts:535) re-dérive inconditionnellement via deriveDatedPosts(calendar, startISO, weeks) SANS 4ᵉ argument → brand={} (launch-calendar.ts:290) : les posts stockés ADVE-ancrés ne sont jamais lus, et le texte/brief émis en ANUBIS_PUBLISH_SOCIAL_POST (l.555-565…
- **Statut** : ✅ corrigé — V3 (PR #541, v6.27.177)

### [MAJOR] `autoschedule-stomps-armed-publications` — cockpit-operate

- **Surface** : actions.autoSchedule (Plan d'actions, bouton « Auto-planifier »)
- **Intention** : « Auto + ajustable » : étalement administratif des actions retenues (actions.ts:214-218) ; le calendrier unique porte l'échéance RÉELLE des publications armées que le cron lit sur timingStart (social-publish.ts:455-459).
- **Exécution** : autoSchedule sans `onlyUnscheduled` (checkbox « Garder les dates manuelles » décochée) réécrit timingStart/timingEnd/status de TOUTES les BrandAction selected:true sans filtre de statut ni exclusion des publications sociales (actions.ts:233-251) : les publications armées pending sont silencieusement re-étalées à cadence 14 j (le cron les publiera aux mauvaises dates, rétroplan J-0 détruit), et les publications CANCELLED (cancel garde selected:true, social-publish.ts:568-575) sont ressuscitées en SCHEDULED dans le calendrier.
- **Preuve** : src/server/trpc/routers/actions.ts:233-251 — `where: { strategyId, selected: true, ...(input.onlyUnscheduled ? { timingStart: null } : {}) }` puis `update({ timingStart: s, status: "SCHEDULED" })` sans exclure `metadata.socialPublish` ni status CANCELLED/EXECUTED.
- **Fix esquissé** : Exclure de la requête autoSchedule les actions portant metadata.socialPublish et les statuts CANCELLED/EXECUTED (le spread administratif ne doit toucher que le plan d'actions, jamais les échéances de publication).
- **Vérification adversariale** : Verified end-to-end: autoSchedule (actions.ts:233-251) filters only {strategyId, selected:true} with no status filter and no metadata.socialPublish exclusion. Armed publications are created selected:true/status SCHEDULED/pending:true with timingStart = real publish deadline (social-publish.ts:246-263), and the cron publishes on status SCHEDULED + timingStart<=now + pending:true (455-459). With the "Garder les dates manuelles" checkbox unchecked (roadmap-calendar-panel.tsx:279-286) or the optional param omitted via API, pending publications are silently re-spread (worst case timingStart=today →…
- **Statut** : ✅ corrigé — V3 (PR #541, v6.27.177)

### [MAJOR] `forge-veto-rendered-as-success` — cockpit-operate

- **Surface** : /cockpit/operate/forge — Deliverable Forge (« Forger réellement », ADR-0136)
- **Intention** : ADR-0136 : dispatch « honnête sans clés » ; le composer distingue PREVIEW / DISPATCHED / MISSING_PRECONDITIONS et le commandant mappe MISSING_PRECONDITIONS → VETOED (commandant.ts:649).
- **Exécution** : emitIntent RETOURNE le VETOED comme IntentResult normal (intents.ts:1646-1656, jamais un throw) ; la page forge ne lit jamais `composition.status` : toute réponse rend la carte verte succès « Aperçu de la cascade prêt » avec CheckCircle et active « Forger réellement » (forge/page.tsx:686-711) ; après forge, le header affiche « Livrable lancé » (forge/page.tsx:694) même si le résultat est un veto pré-conditions — le titre contredit le summary. Le summary DEFERRED-sans-clés est lui honnête mais coiffé du même « Livrable lancé ».
- **Preuve** : src/app/(cockpit)/cockpit/operate/forge/page.tsx:686-698 (`{composition && (<section className="... border-success/40 bg-success/5">` + `{forgeLaunched ? "Livrable lancé" : "Aperçu de la cascade prêt"}` — aucun branchement sur composition.status) ; src/server/services/artemis/commandant.ts:647-656 (status VETOED retourné dans output).
- **Fix esquissé** : Brancher l'UI sur intentResult.status : VETOED → carte warning avec la raison et sans bouton Forger ; DISPATCHED-DEFERRED → header « Forge différée » au lieu de « Livrable lancé ».
- **Vérification adversariale** : Verified end-to-end: composer returns MISSING_PRECONDITIONS on incomplete ADVE/manipulationMix (composer.ts:104-112); commandant maps it to status VETOED returned in the IntentResult, never thrown (commandant.ts:647-656); emitIntent returns VETOED as a normal result (intents.ts:1646-1658); the tRPC compose router returns { intentResult } with no status inspection, so the mutation resolves as success; the forge page reads ONLY composition.summary (page.tsx:696, grep confirms no other composition.* access) and renders a green border-success card with CheckCircle2 and header "Livrable lancé"/"Ape…
- **Statut** : ✅ corrigé — V3 (PR #541, v6.27.177)

### [MAJOR] `landingintake-email-jamais-envoye-lead-perdu` — funnel-marketing

- **Surface** : /landingintake (DiagnosticModal)
- **Intention** : Le funnel capture le lead (pattern /api/contact : « la soumission du formulaire vaut prise de contact », CrmContact + CrmMessage) et ne ment jamais sur ce qui s'est passé
- **Exécution** : Après submit, l'écran affirme « Une copie du lien a été envoyée à {email} » alors que submit() ne fait AUCUN appel réseau (validation locale + setDone(true)) : aucun email n'est envoyé, et le lead (nom/email/marque) n'est persisté nulle part — si le prospect ferme la modale au lieu de cliquer « Commencer », le lead est perdu, contrairement au ContactForm qui capture via /api/contact avant d'ouvrir le canal.
- **Preuve** : src/app/(marketing)/landingintake/page.tsx:430-436 (submit sans fetch), :460 (« Une copie du lien a été envoyée à {form.email}. ») ; pattern sain : src/components/upgraders/contact-form.tsx:54-67 + src/app/api/contact/route.ts
- **Fix esquissé** : POSTer le lead vers /api/contact (ou un endpoint intake-lead dédié CrmContact source LANDING) au submit, et soit envoyer réellement le lien par email (Anubis), soit supprimer la phrase.
- **Vérification adversariale** : Confirmé bout en bout : submit() (landingintake/page.tsx:430-436) ne fait que valider localement puis setDone(true) — aucun fetch, aucune persistance ; la ligne 460 affirme « Une copie du lien a été envoyée à {form.email} » alors qu'aucun code du repo n'envoie cet email (occurrence unique, quick-intake ne contient que de l'analyse DNS/MX). Le downstream ne compense pas : /intake ne fait que préremplir le formulaire depuis les query params, la persistance n'arrive qu'à quickIntake.start ; fermer la modale (X/Escape/scrim) perd le lead. L'intention citée existe bien (/api/contact/route.ts « la s…
- **Statut** : ✅ corrigé — V1 (PR #539, v6.27.175)

### [MAJOR] `lafusee-pricing-anchors-morts` — funnel-marketing

- **Surface** : /lafusee section Tarifs (marketing-pricing)
- **Intention** : « le prospect comprend ce qu'on vend et où cliquer » (mandat) ; capture-then-grow : les offres payantes sont le cœur de la conversion
- **Exécution** : Les CTAs des deux offres payantes — Propulsion « Briefer un opérateur → » et Apex « Postuler → » — pointent href="#contact" alors qu'aucun élément id="contact" n'existe sur la page /lafusee (grep vérifié sur tous les composants landing : seuls #manifesto, #methode, #apogee, #intake, #portails, #probleme existent). Le clic ne produit rien.
- **Preuve** : src/components/landing/marketing-pricing.tsx:13,20 (href: "#contact") ; grep id=" sur src/components/landing/* : aucun id="contact"
- **Fix esquissé** : Pointer vers /contact?offre=lafusee-propulsion / lafusee-apex (route réelle avec formulaire CRM), ou ajouter une section contact ancrée sur la page.
- **Vérification adversariale** : Verified end-to-end: marketing-pricing.tsx renders plain <a href="#contact"> for the Propulsion and Apex CTAs (lines 13, 20, 82-89), and no element with id="contact" exists anywhere in the 14 components composed by src/app/(marketing)/lafusee/page.tsx (only ids: intake, probleme, apogee, tarifs, portails, manifesto, methode, faq, gouverneurs) nor in the marketing layout. No hash interceptor, smooth-scroll handler, or dynamic id injection exists. The click is a dead no-op on a publicly served page; the intended target is clearly the existing /contact route. Downgraded to MAJOR: the capture-then…
- **Statut** : ✅ corrigé — V1 (PR #539, v6.27.175)

### [MAJOR] `lafusee-offre-contradictoire-vs-pricing` — funnel-marketing

- **Surface** : /lafusee (#tarifs + FAQ) vs /pricing réel
- **Intention** : Doctrine pricing capture-then-grow : « un prix clair par palier… prix mensuel affiché » (data.ts PRODUCTS), « jamais une fourchette, jamais “sur devis” » (lafusee-tier-prices.tsx header, constat opérateur) ; ADR-0092 grille publique localisée
- **Exécution** : La même page vend « Propulsion — Sur devis » et la FAQ affirme « pas une grille tarifaire publique parce que la complexité varie », deux lignes au-dessus du lien « Voir la grille complète par zone (FCFA/EUR/USD) → » vers /pricing qui affiche des prix mensuels fixes par palier. Les trois « RAMPES » (Diagnostic/Propulsion/Apex) ne correspondent à aucun tier réel (INTAKE_PDF/ORACLE_FULL/COCKPIT_MONTHLY/RETAINER_*). Promesse « décollage en 48h » sans équivalent produit.
- **Preuve** : src/components/landing/marketing-pricing.tsx:10-22,36,41-43 ; src/components/landing/marketing-faq.tsx:27-28 ; contre-canon : src/components/upgraders/data.ts:295-303 + src/components/upgraders/lafusee-tier-prices.tsx:4-15 + src/server/trpc/routers/payment.ts:213-241
- **Fix esquissé** : Réécrire la section tarifs /lafusee depuis la même source getTierGrid (comme /tarifs le fait via LaFuseeTierPrices) et aligner la réponse FAQ sur les prix publics affichés.
- **Vérification adversariale** : CONFIRMÉ après lecture bout en bout — la contradiction est réelle, publique et non corrigée ailleurs. (1) /lafusee est une route publique live (route group (marketing), absente de PROTECTED_ROUTES dans src/proxy.ts:84-97) et linkée depuis la carte produit /tarifs (data.ts:304 « Découvrir l'OS » → /lafusee). (2) marketing-pricing.tsx:11 vend « Propulsion — Sur devis — pricing par palier visé » et marketing-faq.tsx:28 affirme « pas une grille tarifaire publique parce que la complexité varie » — alors que la MÊME page (marketing-pricing.tsx:41-43) linke « Voir la grille complète par zone (FCFA/EU…
- **Statut** : ✅ corrigé — V1 (PR #539, v6.27.175)

### [MAJOR] `pricing-promesse-stripe-bouton-whatsapp` — funnel-marketing

- **Surface** : /pricing (PricingGrid)
- **Intention** : ADR-0092 : abonnements deux-rails — Stripe recurring pour devises carte, cycles mobile money FCFA ; copy /pricing : « carte (Stripe/PayPal) à l'international », « International : abonnement récurrent Stripe, annulable à tout moment »
- **Exécution** : handleSubscribe appelle uniquement payment.initManualSubscription (→ redirection WhatsApp +237, Subscription pending_manual) pour TOUTES les zones, y compris FR/US où la copy promet Stripe. Le rail Stripe shippé (payment.initSubscription, branche wantsStripe + initStripeSubscription) n'est jamais câblé à la grille publique — seul le funnel intake result l'appelle (via monetization). Un prospect européen qui veut payer par carte est envoyé sur un wa.me camerounais.
- **Preuve** : src/components/marketing/pricing-grid.tsx:47,57-62 (initManualSubscription only), :83-84 + :211-213 (promesse Stripe/PayPal) ; rail non câblé : src/server/trpc/routers/payment.ts:250-350 (initSubscription Stripe)
- **Fix esquissé** : Router handleSubscribe vers initSubscription (AUTO) quand la zone est carte + STRIPE_SECRET_KEY présent, fallback WhatsApp sinon ; ou corriger la copy tant que Stripe n'est pas branché.
- **Vérification adversariale** : Confirmé bout-en-bout : pricing-grid.tsx:47,57-62 n'appelle que payment.initManualSubscription pour TOUTES les zones (dont FR/US) → wa.me/237694171799 + Subscription pending_manual, tandis que la copy de la même page (l.83-84, 211-214) promet « carte (Stripe/PayPal) à l'international » et « abonnement récurrent Stripe, annulable à tout moment ». Le rail Stripe deux-rails ADR-0092 (payment.initSubscription, payment.ts:250-350, branche wantsStripe→initStripeSubscription) existe mais n'a AUCUN caller frontend — seul le funnel intake appelle monetization.initSubscription (chemin distinct), et /coc…
- **Statut** : ✅ corrigé — V1 (PR #539, v6.27.175)

### [MAJOR] `contact-param-offre-jete` — funnel-marketing

- **Surface** : /contact + ContactForm ← CTAs /tarifs, /pricing, catalogue
- **Intention** : Le catalogue UPgraders route l'intention d'offre dans l'URL (« Demander un devis » → /contact?offre=strategie-marketing, audit-adve, audit-financier, etudes-rapports, charte-graphique, production-graphique, production-audiovisuelle, marque-blanche, lafusee-enterprise) pour que l'opérateur reçoive un lead qualifié
- **Exécution** : Ni la page /contact ni ContactForm ne lisent searchParams : le select « Votre besoin » retombe sur « Audit ADVE » par défaut et sa liste NEEDS ne contient même pas la plupart des offres passées en param (pas de Stratégie marketing, Études, Audit financier, Charte, Enterprise). L'intention captée par 9+ CTAs est jetée avant d'atteindre le CRM (CrmContact.tags reçoit le mauvais besoin).
- **Preuve** : CTAs : src/components/upgraders/data.ts:325,343,361,378,398,415,432,451 + src/components/marketing/pricing-grid.tsx:179 ; drop : src/components/upgraders/contact-form.tsx:7-14 (NEEDS sans ces offres, aucun useSearchParams) ; src/app/(marketing)/contact/page.tsx (aucune lecture searchParams)
- **Fix esquissé** : Lire ?offre= dans ContactForm (useSearchParams), mapper vers un NEEDS élargi aligné sur le catalogue PRODUCTS, et pré-sélectionner le besoin transmis au CRM.
- **Vérification adversariale** : Vérifié bout en bout : les 9 CTAs (data.ts:325-451 rendus via product-catalog.tsx:52 sur /tarifs + pricing-grid.tsx:179 sur /pricing) émettent bien /contact?offre=<slug>, mais la page contact (src/app/(marketing)/contact/page.tsx) ne déclare aucune prop searchParams et ContactForm (contact-form.tsx) n'a ni props ni useSearchParams (grep zéro hit sur tout src/components/upgraders/) ; le select retombe sur NEEDS[0]="Audit ADVE" et la liste NEEDS (l.7-14) omet stratégie-marketing, audit-financier, etudes-rapports, charte-graphique, production-graphique et enterprise. L'effet atteint le CRM : /api…
- **Statut** : ✅ corrigé — V1 (PR #539, v6.27.175)

### [MAJOR] `lafusee-jargon-hors-verrou-adr0123` — funnel-marketing

- **Surface** : /lafusee (gouverneurs, strip, diagnostic, FAQ) — hors périmètre du test HARD
- **Intention** : CLAUDE.md/KB §3 : « Vocabulaire client : business uniquement ; les noms mythologiques (Neteru, Mestor…) sont des alias internes, jamais exposés au client » ; ADR-0123 §Portée : le funnel public « n'est PAS traité ici — tracé en dette » ; PR #447 : « funnel public aligné ADR-0123 + verrou CI étendu » (mais seulement (intake))
- **Exécution** : La landing produit rend au prospect : les 7 noms Neteru + « Notoria · 12 recommandations » (strip), « Tarsis · weak signals », « Jehuty · intelligence feed », « Cascade ADVERTIS » (gouverneurs), pseudo-outils « Mestor.scan / Artemis.diff / Seshat.tone / Ptah.brand / Thot.audit » (diagnostic), « Thot (verrou financier) » (FAQ) — tous dans la liste FORBIDDEN du test cockpit-vocabulary. Le test HARD scanne (cockpit)+(intake)+pricing-tiers mais PAS src/app/(marketing) ni src/components/landing|upgraders : la plus grosse surface lead est sans verrou. (Le header de gouverneurs documente une doctrine « religion cosmétique » pour les NOMS en accent — mais Notoria/Tarsis/Jehuty/ADVERTIS/faux noms d'outils la dépassent.)
- **Preuve** : tests/unit/governance/cockpit-vocabulary.test.ts:28-44 (SCAN_DIRS sans marketing/landing) ; src/components/landing/marketing-strip.tsx:7 ; marketing-gouverneurs.tsx:27,42-43 ; marketing-diagnostic.tsx:6-15 ; marketing-faq.tsx:12 ; docs/governance/adr/0123-…md:5
- **Fix esquissé** : Étendre SCAN_DIRS à (marketing)+components/landing+upgraders avec une allowlist explicite pour la décision « noms en accent typographique », et purger Notoria/Tarsis/Jehuty/ADVERTIS/pseudo-outils des chaînes rendues.
- **Vérification adversariale** : Confirmed end-to-end. (1) Surface is live: src/app/(marketing)/lafusee/page.tsx renders MarketingStrip/Gouverneurs/Diagnostic/Faq; /lafusee is absent from proxy.ts PROTECTED_ROUTES (public), listed in sitemap.ts:14, and linked from the root marketing page, site-nav, /tarifs, /methode, /services — prospects see it today. (2) Strings verified verbatim: marketing-strip.tsx:7 "Notoria · 12 recommandations"; marketing-gouverneurs.tsx renders the 7 Neteru names as tags plus "Cascade ADVERTIS", "Tarsis · weak signals", "Jehuty · intelligence feed"; marketing-diagnostic.tsx:6-15 pseudo-tools Mestor.sc…
- **Statut** : ✅ corrigé — V1 (PR #539, v6.27.175)

### [MAJOR] `apogee-bandes-score-contredisent-canon` — funnel-marketing

- **Surface** : /lafusee (marketing-apogee) + / et /methode (PALIERS data.ts)
- **Intention** : ADR-0102/ADR-0126 + classifyTier canon : LATENT ≤40, FRAGILE 41–80, ORDINAIRE 81–120, FORTE 121–160, CULTE 161–180, ICONE >180 (src/domain/brand-tier.ts) ; doc-truth 2026-07-11 « KB score-cibles = seuils d'entrée de bande classifyTier »
- **Exécution** : L'échelle affichée sur /lafusee est fausse : LATENT « Score < 80 », FRAGILE « 80–100 », ORDINAIRE « 100–120 ». Un lead à 75 lit LATENT sur la landing mais le produit le classe FRAGILE ; à 90 il lit FRAGILE mais reçoit ORDINAIRE. Ironie : sur la MÊME page, marketing-advertis importe le vrai classifyTier et affiche juste. La homepage/methode (PALIERS : Fragile 80 · Ordinaire 100 · Forte 120 · Culte 160 · Icône 180) mélange bornes hautes et seuils d'entrée (Ordinaire 100 ne correspond à rien dans le canon).
- **Preuve** : src/components/landing/marketing-apogee.tsx:4-7 vs src/domain/brand-tier.ts:44-63 ; src/components/upgraders/data.ts:185-192 ; sain : src/components/landing/marketing-advertis.tsx:4,20-22 (classifyTier réel)
- **Fix esquissé** : Dériver les libellés de bandes de TIER_UPPER_BOUNDS_200 (import domaine, comme marketing-advertis) au lieu de littéraux, et corriger PALIERS en seuils d'entrée canon.
- **Vérification adversariale** : CONFIRMÉ après lecture bout-en-bout. (1) Canon vérifié : src/domain/brand-tier.ts:44-64 (LATENT ≤40, FRAGILE ≤80, ORDINAIRE ≤120, FORTE ≤160, CULTE ≤180, ICONE >180) ; et la KB §9 (UPGRADERS-LAFUSEE-KB.md:232-236) condamne EXPLICITEMENT la table « FRAGILE 80 · ORDINAIRE 100 · FORTE 120 · CULTE 160 · ICONE 180 » comme « l'ancienne table [qui] classifiait un point SOUS le palier promis » — l'intention n'est pas inventée, elle est documentée dans le repo. (2) Chaîne rendue réelle : /lafusee (lafusee/page.tsx:33-34) rend marketing-apogee.tsx (const TIERS locale hardcodée : LATENT <80, FRAGILE 80-1…
- **Statut** : ✅ corrigé — V1 (PR #539, v6.27.175)

### [MAJOR] `email-rappel-fantome` — intake-diagnostic

- **Surface** : Wizard intake — écran « Sauvegarder et quitter »
- **Intention** : Le lien token est le SEUL accès au diagnostic (REQ-9 « resume anytime via token link », REQ-6 shareToken sans auth). L'écran promet au lead qu'il retrouvera son lien par email. Le canon (lafusee-canon.ts:469) liste même « email de livraison » comme touchpoint du rapport.
- **Exécution** : intake/[token]/page.tsx:434-436 affiche « Un email de rappel a ete envoye a votre adresse. » — AUCUN code n'envoie cet email : handleSaveAndQuit (page.tsx:328-347) appelle seulement advance() ; grep sendEmail sur tout le funnel intake = zéro appel (seuls auth.ts reset-password et crm-contacts campagnes utilisent l'email-sender Anubis). Aucun email non plus à la complétion ni après paiement du PDF. Un lead qui ferme l'onglet en se fiant à la promesse perd définitivement son diagnostic (et le rapport payé n'est récupérable que via l'URL).
- **Preuve** : src/app/(intake)/intake/[token]/page.tsx:434-436 (claim) vs src/server/services/quick-intake/index.ts + routers/quick-intake.ts : zéro import de anubis/email-sender ; grep 'rappel|reminder' : aucun cron de relance intake.
- **Fix esquissé** : Soit envoyer réellement l'email (anubis/email-sender, best-effort, avec le lien /intake/[token]) au Save&Quit et à la complétion/paiement, soit retirer la phrase et afficher un bouton « copier le lien ».
- **Vérification adversariale** : Confirmed end-to-end: page.tsx:434-436 unconditionally claims a reminder email was sent, but handleSaveAndQuit only calls advance(); the quick-intake service/router import zero email machinery (its only "email" code is DNS footprint collection); the repo's two email senders are used solely by auth reset-password, crm-contacts campaigns, founder-digest cron and brand-email; no intake reminder cron exists among the 11 cron routes — and the scheduler cron actually EXPIRES IN_PROGRESS intakes after 7 days (scheduler/route.ts:161-171), aggravating the broken promise. No email at completion or post-…
- **Statut** : ✅ corrigé — V2 (PR #540, v6.27.176)

### [MAJOR] `stream-jalons-intake-sans-consommateur` — intake-diagnostic

- **Surface** : Attente de complete() (70-130 s) — wizard GUIDED et écrans de processing
- **Intention** : quick-intake/index.ts:350-354 : « NSP streaming — 5 jalons progressifs pour le commercial-critique… Le founder ne voit plus un spinner 70s, il voit son diagnostic se construire ». stream-events.ts:10-12 affirme : « La page /intake/[token]/result subscribe au canal du même token ».
- **Exécution** : Les 6 emitters (intake_started/extracted/scored/narrative_done/completed/failed) sont émis mais AUCUN composant client ne les consomme (grep : seuls des fichiers serveur référencent ces kinds). Le seul endpoint SSE, /api/notifications/stream/route.ts:22-25, renvoie 401 sans session — un lead intake est anonyme, il ne POURRAIT pas s'y abonner. Résultat réel : le wizard GUIDED montre un bouton figé « Calcul du score... » (page.tsx:682-686) pendant 70-130 s ; le chemin ingest montre IntakeProcessingScreen dont la progression est un simple minuteur simulé (startsAt hardcodés, intake-processing-screen.tsx:28-36) déconnecté des vrais jalons — l'échec d'un jalon réel n'y apparaît jamais.
- **Preuve** : src/server/services/quick-intake/stream-events.ts:10-12 (doc-comment mensonger) ; src/app/api/notifications/stream/route.ts:22-25 (401 anonyme) ; src/app/(intake)/intake/[token]/page.tsx:682 (spinner statique) ; src/components/intake/intake-processing-screen.tsx:111-127 (progression setInterval).
- **Fix esquissé** : Exposer un endpoint SSE public scoped par intakeToken (le canal existe déjà côté publish) et brancher IntakeProcessingScreen + le wizard dessus ; à défaut, corriger le doc-comment et supprimer les emitters.
- **Vérification adversariale** : Confirmed end-to-end. (1) Intention exists: quick-intake/index.ts:349-354 promises NSP milestone streaming so the founder "ne voit plus un spinner 70s"; stream-events.ts:10-12 claims /intake/[token]/result subscribes. (2) Grep proves the 6 intake_* event kinds are referenced only by 3 server files — no client component, and the result page has zero EventSource/useNsp/polling code. (3) The only SSE route (/api/notifications/stream) 401s anonymous leads AND subscribes only to the session userId channel while intake events publish to the intakeToken channel — dead code by two independent mechanis…
- **Statut** : ✅ corrigé — V2 (PR #540, v6.27.176)

### [MAJOR] `recos-notoria-et-plan-deterministe-jetes` — intake-diagnostic

- **Surface** : Result page + PDF — recommandations calculées à chaque intake
- **Intention** : Le quick-win vendu inclut un « plan d'action » (landingintake:197 « Du brief au plan d'action ») ; routers/quick-intake.ts:317-321 : getRecosByToken « Returns a preview (free, 2 recos) or full set (paid). Used by the result page paywall » ; generateDiagnostic produit 2 forces avec insight + 2 recommandations avec 3 actions concrètes chacune, persistées dans diagnostic.
- **Exécution** : Doublement collecté-mais-jeté : (1) getRecosByToken n'a ZÉRO consommateur client (grep : seul le router le définit) — les Recommendation rows Notoria (impact/confidence, générées par FILL_ADVE à index.ts:668-695 et comptées dans diagnostic.notoriaPreview) ne sont jamais montrées au lead ; (2) le result page ne lit que classification/summary/narrativeReport/brandLevel (interface Diagnostic, result/page.tsx:97-102) — les strengths/weaknesses/recommendations déterministes de generateDiagnostic (index.ts:1689-1704, actions à index.ts:1760+) n'apparaissent ni sur la page ni dans le PDF, alors qu'ils seraient le filet parfait quand le bloc recommendation V3 est absent.
- **Preuve** : src/server/trpc/routers/quick-intake.ts:322 (procédure orpheline, commentaire « Used by the result page » faux) ; src/app/(intake)/intake/[token]/result/page.tsx:97-102 (Diagnostic n'expose ni recommendations ni strengths ni notoriaPreview) ; src/server/services/quick-intake/index.ts:1080 (tout est persisté dans diagnostic).
- **Fix esquissé** : Rendre diagnostic.recommendations (actions concrètes) comme section « Plan d'action » du result page/PDF, et brancher getRecosByToken (2 recos gratuites / toutes payées) comme prévu par son commentaire.
- **Vérification adversariale** : Verified end-to-end. (1) getRecosByToken (quick-intake.ts:322) has zero client consumers repo-wide — its comment 'Used by the result page paywall' is false; the Notoria Recommendation rows counted into diagnostic.notoriaPreview are never surfaced to the lead. (2) generateDiagnostic's deterministic strengths (with insight) and recommendations (2 weak pillars x diagnostic + 3 concrete actions, index.ts:1689-1704/1760+) are persisted into diagnostic (index.ts:1080) but the result page's Diagnostic interface (result/page.tsx:97-102) reads only classification/summary/narrativeReport/brandLevel, and…
- **Statut** : ✅ corrigé — V2 (PR #540, v6.27.176)

### [MAJOR] `plan-action-90j-promis-au-tier-pdf-absent-en-v1` — intake-diagnostic

- **Surface** : PDF payant INTAKE_PDF — inclusion « Plan d'action 90 jours »
- **Intention** : pricing-tiers.ts:73-79 : le tier INTAKE_PDF vendu 49 SPU inclut explicitement « Plan d'action 90 jours » + « Score détaillé par pilier ».
- **Exécution** : Le bloc roadmap90d/recommendation n'existe que si ModelPolicy[final-report].pipelineVersion === "V3" (result/page.tsx:52-53 « V3 only » ; index.ts:824). Le défaut codé est V1 (model-policy/index.ts:53) et le flip est un réglage DB manuel. Sous V1/V2 — et TOUJOURS sous le composer déterministe LLM-down (report-composer.ts:128-141, aucun plan) — le payeur reçoit un PDF sans plan d'action 90 jours, alors que le plan déterministe existe en base (cf. gap recos-notoria) et n'est pas utilisé comme fallback.
- **Preuve** : src/server/services/monetization/pricing-tiers.ts:77 (promesse) ; src/server/services/model-policy/index.ts:53 (pipelineVersion V1 par défaut) ; src/app/(intake)/intake/[token]/result/page.tsx:1095 (rendu conditionnel report?.recommendation).
- **Fix esquissé** : Fallback : quand report.recommendation est absent, rendre le plan déterministe diagnostic.recommendations (déjà calculé) dans la section PDF « Plan d'action » — la promesse du tier devient inconditionnelle.
- **Vérification adversariale** : Verified end-to-end. Promise confirmed (pricing-tiers.ts:77 « Plan d'action 90 jours » in the 49-SPU INTAKE_PDF tier). The paid PDF is a puppeteer render of the result page (api/intake/[token]/pdf/route.ts), and the only 90-day plan on that page renders behind {report?.recommendation && ...} (page.tsx:1095, roadmap90d at 1162-1170). Only the V3 pipeline emits a recommendation block (quick-intake/index.ts:824); grep confirms narrative-report.ts (V1) and narrative-report-v2.ts contain zero references to recommendation. The code default is V1 (model-policy/index.ts:53) and nothing in any deploy p…
- **Statut** : ✅ corrigé — V2 (PR #540, v6.27.176)

### [MAJOR] `promesse-score-200-radar-8-vs-livraison-100-sans-radar` — intake-diagnostic

- **Surface** : /score (page publique de référence) + en-têtes REQ du module vs rapport livré
- **Intention** : score/page.tsx:83-89 vend au lead « Score de marque /200… 8 piliers » avec CTA « Mesurer votre marque gratuitement » → /intake ; CGV/trust-center parlent de « score /200 » ; quick-intake/index.ts:14,21 coche « [x] REQ-4 Score /200 (composite across 8 pillars) » et « [x] REQ-11 Radar 8 piliers visualization data (vector has all 8 scores) ».
- **Exécution** : Le diagnostic livré est un composite /100 sur 4 piliers ADVE seulement (index.ts:628-630), les RTIS ne sont jamais scorés à l'intake, le vector n'a PAS les 8 scores (REQ-11 faux), et AUCUN radar n'est rendu sur le result page ni dans le PDF alors que le composant AdvertisRadar existe et sert partout ailleurs (cockpit/insights/diagnostics:153, creator:152…). Les fourchettes de /score (0-80 Latent… sur /200, 5 tiers sans FRAGILE) contredisent la classification réellement affichée (6 niveaux, seuils /100, classifyIntakeBrand index.ts:44-51). Le même lead voit deux échelles incompatibles dans le même funnel.
- **Preuve** : src/app/(intake)/score/page.tsx:84,157 (/200, formule 8 piliers) vs src/server/services/quick-intake/index.ts:628-633 (composite /100 ADVE) et src/app/(intake)/intake/[token]/result/page.tsx:523-525,579 (Score X/100, aucun <AdvertisRadar>).
- **Fix esquissé** : Rendre l'AdvertisRadar 4-piliers (maxScore 25) sur le result page/PDF, et aligner /score : soit le distinguer explicitement (« le diagnostic gratuit couvre l'ADVE /100, le /200 vient avec les RTIS payants »), soit harmoniser les tiers/seuils.
- **Vérification adversariale** : Verified end-to-end: /score (public, in sitemap.ts:36) promises « Score /200, 8 piliers » with CTA « Mesurer votre marque gratuitement » → /intake (page.tsx:84,157,165), and CGV/trust-center contractualize the /200 (cgv:84,107). But intake writes ADVE pillars only (quick-intake/index.ts:509 `pillars = [...ADVE_STORAGE_KEYS]`; r/t/i/s answers explicitly never become Pillar.content), overwrites composite to ADVE-only /100 (628-633), and the result page shows « Score X/100 » (result/page.tsx:579,688) with a 6-level ladder (FRAGILE included, grid-cols-6) — incompatible with /score's 5-tier /200 ra…
- **Statut** : ✅ corrigé — V2 (PR #540, v6.27.176)

### [MAJOR] `valeurs-extraites-fuient-champs-internes-et-json` — intake-diagnostic

- **Surface** : Result page + PDF payant — blocs « Valeurs extraites » par pilier
- **Intention** : ADR-0138 (« fin du dump JSON », export lisible) + ADR-0123 (zéro jargon interne face client). Le composer déterministe matérialise l'intention : report-composer.ts:30-36 masque explicitement narrativePreview/narrativeFull/webPresence/footprintScore/fieldCertainty du rendu verbatim.
- **Exécution** : Le result page n'a PAS ce filtre : flattenContent (result/page.tsx:219-223) rend TOUTES les clés de Pillar.content — donc « Narrative full » (le paragraphe LLM entier, dupliqué avec la section Lecture stratégique juste en dessous), « Web presence » (objet profond → flattenValue depth>1 fait JSON.stringify, result/page.tsx:206 → JSON brut dans le PDF payant, dupliqué avec la FootprintSection), « Financial anchors », « Unit economics »… Ces champs sont écrits dans content par index.ts:923-947 (narrativeFull/Preview MERGE_DEEP) et mergeEnrichedFootprintIntoPillarE (webPresence).
- **Preuve** : src/app/(intake)/intake/[token]/result/page.tsx:205-206 (depth>1 → JSON.stringify) et 219-223 (aucun HIDDEN_FIELDS) vs src/server/services/quick-intake/report-composer.ts:30-36 (la liste existe déjà côté composer).
- **Fix esquissé** : Extraire la HIDDEN_FIELDS du composer dans un module partagé et l'appliquer dans flattenContent (+ remplacer le JSON.stringify profond par le humanizeValue du composer).
- **Vérification adversariale** : Confirmed end-to-end. (1) Pillar.content really carries the meta fields: quick-intake/index.ts:919-942 persists narrativeFull/narrativePreview via writePillar MERGE_DEEP, and mergeEnrichedFootprintIntoPillarE (public-enrichment.ts:504-569) writes the deep webPresence object (socials/press/maps/domain/perf/ads + footprintScore) into pillar E. (2) getPillarsByToken (src/server/trpc/routers/quick-intake.ts:353-373) returns Pillar.content raw, no filtering. (3) flattenContent (result/page.tsx:219-223) renders ALL keys with no HIDDEN_FIELDS, and flattenValue depth>1 does JSON.stringify (line 206) —…
- **Statut** : ✅ corrigé — V2 (PR #540, v6.27.176)

### [MAJOR] `cockpit-new-ignore-l-intake` — intake-diagnostic

- **Surface** : Conversion abonnement : result page → /cockpit/new
- **Intention** : CLAUDE.md V8 : « funnel CTA vérifié bout-en-bout (landing → intake → paywall → PDF → /cockpit/new ignition) ». Le result page vend l'activation : « Votre marque X est creee dans le systeme… La cascade strategique est lancee » (result/page.tsx:1425-1430) ; PROPAGATION-MAP : l'intake est l'entrée n°1 de la valeur.
- **Exécution** : Pour COCKPIT_MONTHLY/RETAINER_*, handleSelectTier envoie le lead vers /cockpit/new (returnUrl result/page.tsx:436, fallback :447 avec ?tier=&intake=token). Or /cockpit/new/page.tsx n'utilise AUCUN searchParam (pas de useSearchParams) : l'abonné re-saisit à la main nom de marque, secteur, pays, modèle, positionnement — toutes données déjà dans QuickIntake — et sa Strategy naît VIDE (createStrategy) : les 4 piliers extraits, le diagnostic, le narratif et l'empreinte enrichie ADR-0121 ne suivent pas. Le chemin qui porte tout ça (activateBrand) n'est offert que sur le flux one-shot isPaid (result/page.tsx:1410).
- **Preuve** : src/app/(intake)/intake/[token]/result/page.tsx:436,447 (redirige avec tier+intake) vs src/app/(cockpit)/cockpit/new/page.tsx:60-139 (aucune lecture de query params, createStrategy from scratch).
- **Fix esquissé** : Dans /cockpit/new, lire ?intake= : si présent et email de session = contactEmail, appeler quickIntake.activateBrand (ou pré-remplir le wizard depuis getByToken) au lieu de repartir de zéro.
- **Vérification adversariale** : Confirmed end-to-end. For COCKPIT_MONTHLY/RETAINER_* the result page's handleSelectTier calls monetization.initSubscription with returnUrl = bare `/cockpit/new` (result/page.tsx:436 — the token-carrying URL at :447 is only the init-failure fallback, and nothing consumes it anyway). initSubscription (monetization.ts:289-323) never receives the intake token (metadata strategyId=""), the Stripe webhook subscription branch (webhook/stripe/route.ts:103-126, 163-205) only upserts a Subscription row and never touches QuickIntake (premiumReextractAfterPayment runs only on one-shot payments :153-155). …
- **Statut** : ✅ corrigé — V2 (PR #540, v6.27.176)

### [MAJOR] `leaderboard-palmares-jete` — leaderboard-scoreur

- **Surface** : /leaderboard (public) + scoreur router
- **Intention** : ADR-0149 §6 « Verdict = le palmarès — rendu par arène θ±RD + wins/losses/count + couverture % + gates », types.ts:54 « chaque chiffre trace à ses épreuves » ; mandat : « chaque score publié avec sa couverture ET ses épreuves sourcées » ; lede de la page elle-même : « Chaque score se lit avec sa couverture d'épreuves ».
- **Exécution** : Tout le palmarès est persisté (ScoreVerdict.arenas JSON = ArenaEstimate[] avec θ/RD/wins/losses/epreuveCount par arène, gates, epreuveCount — prisma/schema.prisma:3092-3095) et le registre Epreuve porte les sources (dont claims Hunter sourcés URL). Mais la page publique ne projette que force/tier/coverage%/coherence nus (src/app/leaderboard/page.tsx:48-60 drop arenas/gates/epreuveCount, table 112-140 : 6 colonnes, zéro drill-down, marque non cliquable). Le router fait pareil : `scoreur.leaderboard` jette arenas/gates/epreuveCount de sa projection (scoreur.ts:264-276), et `scoreur.verdict` (le palmarès complet, publicProcedure, scoreur.ts:280-287) n'est consommé par AUCUNE surface (grep `scoreur.verdict` = 0 hit). C'est exactement le pattern /scorer d'hier : backend riche → projection nue → un prospect voit un « 41/200 » sans une seule épreuve derrière.
- **Preuve** : src/app/leaderboard/page.tsx:48-60 (Row omet arenas/gates/epreuveCount) + :112-140 (table nue) ; src/server/trpc/routers/scoreur.ts:264-276 (projection leaderboard sans arenas/gates) et :280-287 (`verdict` publicProcedure sans consommateur) ; docs/governance/adr/0149-scoreur-force-revelee.md:66-68.
- **Fix esquissé** : Rendre chaque ligne dépliable (ou page /leaderboard/[subject]) consommant ScoreVerdict.arenas + gates + epreuveCount déjà persistés : par arène wins/losses/±RD et la liste des épreuves sourcées (jointure Epreuve, claim + lien). Le `verdict` publicProcedure existe déjà pour ça.
- **Vérification adversariale** : Confirmed end-to-end: ScoreVerdict persists arenas (ArenaEstimate[] with theta/RD/wins/losses/epreuveCount), gates and epreuveCount (schema.prisma ~3092), but /leaderboard's Row projection (page.tsx:48-60) and scoreur.leaderboard (scoreur.ts:264-276) both drop them; the 6-column table has no drill-down and brands are not clickable; scoreur.verdict (publicProcedure, the full palmarès) has zero consumers in the entire codebase — even operator console pages (prospect-scoring, scoreur-canon) render only force/tier/coverage/coherence. ADR-0149 §6 ("Verdict = le palmarès — rendu déterministe : par a…
- **Statut** : ✅ corrigé — V4 (PR #542, v6.27.178)

### [MAJOR] `victoire-validee-score-jamais-recalcule` — leaderboard-scoreur

- **Surface** : console prospect-scoring → leaderboard public
- **Intention** : La page console promet : « Chaque victoire validée devient une épreuve qui compte dans le score » (page.tsx:222) ; ADR-0154 : le prospect placé « grimpe » via les victoires — le but du flux est de faire bouger le placement public.
- **Exécution** : APPROVE → `decideCandidate` → `recordEpreuve` et s'arrête là (candidates.ts:100-131 ; router scoreur.ts:209-215) : aucun `scoreBrand(persist:true)` derrière. Le ScoreVerdict du leaderboard reste celui d'AVANT la validation — l'épreuve validée ne « compte » nulle part tant que l'opérateur ne re-clique pas « Mesurer et placer » (qui relance aussi le scrape footprint 30 s), et rien dans l'UI ne le dit : le bloc tête-à-tête garde les forces d'avant, le leaderboard public aussi. Le flux produit bout-en-bout (mesurer → chasser → valider → placement qui bouge) se termine sur un score public périmé en silence.
- **Preuve** : src/server/services/seshat/scoreur/candidates.ts:115-130 (recordEpreuve puis update statut, pas de rescore) ; src/server/trpc/routers/scoreur.ts:209-215 ; src/app/(console)/console/signal/prospect-scoring/page.tsx:222 (copy « compte dans le score ») + :263 (onClick APPROVE n'invalide que listCandidates).
- **Fix esquissé** : Après APPROVE, re-scorer le sujet (appel `scoreBrand(subject, {persist:true})` dans le handler decideCandidate ou une mutation `rescore` déclenchée par l'UI) et rafraîchir le tête-à-tête avec la nouvelle force.
- **Vérification adversariale** : Confirmé bout en bout : APPROVE → decideCandidate → recordEpreuve (append Epreuve, candidates.ts:115-130) sans aucun scoreBrand(persist:true) derrière (router scoreur.ts:209-215) ; le leaderboard public lit le dernier ScoreVerdict (scoreur.ts:246-263), écrit uniquement par scoreBrand(persist:true) dont les seuls callers sont scoreProspect (« Mesurer et placer ») et une mutation non câblée sur la page — aucun cron/sweep ne rescoree (grep repo entier). L'onClick APPROVE (page.tsx:263) n'invalide que listCandidates : tête-à-tête et leaderboard restent figés en silence alors que la copy (page.tsx:…
- **Statut** : ✅ corrigé — V4 (PR #542, v6.27.178)

### [MAJOR] `cta-scorer-fausse-promesse-apparition` — leaderboard-scoreur

- **Surface** : /leaderboard (public, face lead)
- **Intention** : ADR-0154 canon des trois scores : /scorer = empreinte /100 « public anonyme, éphémère » ; le leaderboard /200 = « public mérité », on n'y figure « qu'en étant mesuré (engagé) », « placé par l'opérateur ». Les deux scores ne sont jamais fusionnés (D9).
- **Exécution** : Le CTA permanent du leaderboard dit « Où se classe VOTRE marque ? Scorez-la gratuitement en 30 secondes — sans email » → lien /scorer (page.tsx:88-94), et l'état vide promet explicitement « Scorez la vôtre — vous y apparaîtrez avec votre couverture d'épreuves » → /scorer (page.tsx:96-104). Or /scorer n'écrit JAMAIS de ScoreVerdict (c'est le /100 éphémère — src/app/scorer/page.tsx:3-8, aucun writer) : un lead qui suit le CTA ne peut structurellement pas apparaître au classement. Promesse face-lead non branchée, en contradiction directe avec le canon ADR-0154.
- **Preuve** : src/app/leaderboard/page.tsx:88-104 (« vous y apparaîtrez avec votre couverture d'épreuves » → href /scorer) vs docs/governance/adr/0154:26-31 (« on n'y figure qu'en étant mesuré... placé par l'opérateur ») ; /scorer sans écriture ScoreVerdict (src/app/scorer/page.tsx, grep négatif).
- **Fix esquissé** : Corriger la copy (« Scorez votre empreinte /100 — puis demandez votre mesure officielle pour entrer au championnat », CTA secondaire vers l'intake/démo), ou brancher réellement un chemin lead→placement (demande de mesure qui atterrit dans la file opérateur prospect-scoring).
- **Vérification adversariale** : Confirmed end-to-end. The leaderboard reads only ScoreVerdict (leaderboard/page.tsx:38) and the sole ScoreVerdict writer in the codebase is scoreBrand persist (src/server/services/seshat/scoreur/index.ts:96), operator-gated (SESHAT_SCORE_PROSPECT, requireOperator). The /scorer chain (footprint.scoreInstant → enrichPublicFootprint strategyId:null → recordFootprintObservation) never writes ScoreVerdict — a lead following the CTA structurally cannot appear on the leaderboard. ADR-0154:22-30 states the intention exactly as cited (leaderboard = public mérité, placé par l'opérateur ; scores jamais f…
- **Statut** : ✅ corrigé — V4 (PR #542, v6.27.178)

### [MAJOR] `rival-place-jamais-lie-epreuves-unknown` — leaderboard-scoreur

- **Surface** : console prospect-scoring (Hunter) → registre Epreuve → estimateur
- **Intention** : ADR-0154 : victoires DYADIQUES sujet↔rival (« Buffalo Grill #2 vs Burger King CI #1 ») ; toute la chaîne supporte `rivalStrategyId` (victory-hunt.ts:24, EpreuveCandidate.rivalStrategyId, recordEpreuve.opponentStrategyId) pour que l'épreuve relie les deux marques placées.
- **Exécution** : La console place le prospect ET ses concurrents comme Strategies (placeAll), mais le bloc « Chasser des victoires » ne prend qu'un `rivalName` texte libre et n'envoie jamais `rivalStrategyId` (page.tsx:226-237) — alors que les rivaux viennent d'être placés avec leurs strategyId sous ses yeux. Résultat : candidates avec rivalStrategyId=null → recordEpreuve opponent nulls → à la compilation `opponentRef = "unknown"` (index.ts:151) : toutes les victoires validées, tous rivaux confondus, affrontent UN même pseudo-nœud libre anonyme. Le duel n'est jamais dyadique (le rival placé ne prend jamais la défaite miroir, son score ne bouge pas), et le lien épreuve→rival est perdu pour tout affichage futur du palmarès.
- **Preuve** : src/app/(console)/console/signal/prospect-scoring/page.tsx:233 (`hunt.mutateAsync({ subjectStrategyId, rivalName })` sans rivalStrategyId malgré `placed[]`) ; src/server/services/seshat/scoreur/index.ts:151 (`opponentRef: ... ?? "unknown"`).
- **Fix esquissé** : Remplacer le champ texte par un select des marques placées (fallback texte libre) et propager `rivalStrategyId` jusqu'à huntVictories ; optionnellement résoudre rivalName → BrandRef RIVAL sinon.
- **Vérification adversariale** : Confirmé bout en bout. page.tsx:233 envoie uniquement {subjectStrategyId, rivalName} alors que placed[] contient les strategyId des concurrents fraîchement placés ; le routeur (scoreur.ts:181,194) accepte rivalStrategyId mais ne fait aucune résolution par nom ; victory-hunt.ts:97 puis candidates.ts:70 propagent null ; decideCandidate (candidates.ts:117) écrit opponentStrategyId=null ; persistedToCompiled (index.ts:151) retombe sur opponentRef="unknown" — un SEUL nœud libre dans fitBradleyTerry pour TOUS les rivaux. Aucun fix ailleurs (seul caller de huntVictories = cette page ; aucun BrandRef …
- **Statut** : ✅ corrigé — V4 (PR #542, v6.27.178)

### [MAJOR] `oracle-pdf-cuid-title` — oracle-chain

- **Surface** : Export PDF/Markdown de l'Oracle (bouton « Export PDF » cockpit + page publique partagée)
- **Intention** : ADR-0138 « export Oracle lisible (fin du dump JSON) » + ADR-0014 : l'Oracle est LE livrable consulting client. CLAUDE.md : vocabulaire client 100 % business.
- **Exécution** : Le titre du PDF est le CUID brut de la stratégie : `doc.text(`Oracle — ${strategyId}`)` puis `Snapshot ${ensured.snapshotId}` en sous-titre (export-oracle.ts:244,247). Le Markdown fait pareil + « _Généré depuis le snapshot cmxxx (Phase 13 auto-snapshot pre-export)_ » (export-oracle.ts:213-218). La route API charge pourtant `strategy.name` mais ne l'utilise que pour le NOM DE FICHIER (route.ts `select: { id, name }` → `filename`), jamais dans le contenu — donnée collectée puis jetée au moment du rendu.
- **Preuve** : src/server/services/strategy-presentation/export-oracle.ts:244 `doc.text(\`Oracle — ${strategyId}\`, margin, y)` ; :247 `Snapshot ${ensured.snapshotId}` ; :213 `# Oracle — ${strategyId}` ; src/app/api/export/oracle/[strategyId]/pdf/route.ts charge `strategy.name` uniquement pour `filename`
- **Fix esquissé** : Passer `strategy.name` (déjà chargé par la route et dispo dans `doc.meta.brandName`) au titre du PDF/MD ; reléguer le snapshotId en pied de page en vocable business (« Version du {date} ») et supprimer la mention « Phase 13 auto-snapshot ».
- **Vérification adversariale** : Vérifié bout en bout, non réfutable : le bouton « Export PDF » cockpit (proposition/page.tsx:383) ET la page publique partagée (shared/strategy/[token] → presentation-layout.tsx:258,275) appellent /api/export/oracle/[strategyId]/pdf ; la route charge strategy.name mais ne l'utilise que pour le filename (route.ts:47-59) ; exportOracleAsPdf titre le PDF « Oracle — ${strategyId} » (CUID brut, export-oracle.ts:244) + « Snapshot ${snapshotId} » (:247), et le Markdown fait pareil avec en plus le jargon interne « (Phase 13 auto-snapshot pre-export) » (:213-218). Aucun autre builder ni post-processing…
- **Statut** : ✅ corrigé — V4 (PR #542, v6.27.178)

### [MAJOR] `shared-oracle-pdf-401` — oracle-chain

- **Surface** : Page publique /shared/strategy/[token] — boutons « Export PDF » (barre + popover Partager)
- **Intention** : ADR-0016 + page proposition : « Livrable partageable au client » — le lien public est explicitement destiné au client final ; le layout expose Export PDF comme action de premier rang.
- **Exécution** : `pdfHref = /api/export/oracle/${strategyId}/pdf` (presentation-layout.tsx:258, rendu :275 et :284), mais la route exige `auth()` + `canAccessStrategy` (route.ts : 401 Unauthorized / 403 Forbidden). Un lead/client qui tient le lien public (le token EST l'autorisation, cf. resolveShareToken « the token itself is the authorization ») clique Export PDF et reçoit un JSON 401 brut. Le CTA le plus visible du livrable partagé ne marche jamais pour son destinataire.
- **Preuve** : src/components/strategy-presentation/presentation-layout.tsx:258 `const pdfHref = \`/api/export/oracle/${doc.meta.strategyId}/pdf\`` + :275/:284 rendus ; src/app/api/export/oracle/[strategyId]/pdf/route.ts:31-46 `if (!session?.user) return 401` puis `canAccessStrategy` → 403 ; src/app/(shared)/shared/strategy/[token]/page.tsx (page publique, aucune session)
- **Fix esquissé** : Route d'export token-scopée (`/api/export/oracle/shared/[token]/pdf` qui réutilise resolveShareToken comme autorisation), ou masquer le bouton PDF quand le layout est rendu via la page publique.
- **Vérification adversariale** : Confirmed end-to-end. /shared/strategy/[token] is public (absent from PROTECTED_ROUTES in src/proxy.ts; page.tsx does no auth — resolveShareToken comment says "the token itself is the authorization"). PresentationLayout's single import site in the whole repo is that public page, so its Export PDF anchors (presentation-layout.tsx:258 href, rendered :275 top bar and :284 inside the "Lien public" share popover) are shown only to public-link holders. The href targets /api/export/oracle/[strategyId]/pdf whose route.ts returns 401 JSON without a session and 403 without canAccessStrategy; no token is…
- **Statut** : ✅ corrigé — V4 (PR #542, v6.27.178)

### [MINOR] `landingintake-echelle-100-vs-200` — funnel-marketing

- **Surface** : /landingintake (ScoreReport, piliers, modal) → /intake
- **Intention** : Le score de marque canon est /200 (classifyTier, EFR « score cible sur 200 » homepage, /methode « Six paliers, un score /200 », /lafusee « Score ADVE-RTIS /200 ») ; le funnel doit promettre ce que le produit livre
- **Exécution** : Toute la landing vend un score « 78 / 100 » et des piliers notés /100 (« Un diagnostic clair sur 100 ») ; le prospect qui clique arrive sur /intake qui rend un score /200 — la promesse chiffrée ne correspond pas au livrable. Accessoirement, le param `method` (GUIDED/IMPORT) choisi dans la modale est passé à /intake mais jamais consommé (seuls name/email/company/website/social sont préremplis) : le choix « Import IA ~3 min » est silencieusement ignoré.
- **Preuve** : src/app/(marketing)/landingintake/page.tsx:230,245-246 (78/100), :186 (« score clair sur 100 »), :439 (method passé) vs src/app/(intake)/intake/page.tsx:114-129 (method non lu) ; canon /200 : src/domain/brand-tier.ts:40-50, src/app/(marketing)/methode/page.tsx:75-77
- **Fix esquissé** : Passer la landing en /200 avec les mêmes bandes canon, et consommer `method` côté /intake pour présélectionner questionnaire vs import.
- **Vérification adversariale** : Le cœur du finding (promesse /100 vs livrable /200) est RÉFUTÉ par lecture du circuit réel : le funnel intake livre un score ADVE 4 piliers /100 — deduce-adve.ts calcule composite/100 et appelle classifyTier(composite, 100) (bras de normalisation prévu par brand-tier.ts:56-57), et le rapport rendu affiche « Score {composite}/100 » (result/page.tsx:523-525,579,688) ; /intake lui-même promet « un score sur 100 » (page.tsx:223). Les seuls « /200 » du groupe (intake) sont sur /score, page de référence du composite 8 piliers post-conversion, hors du chemin landing→intake→résultat. La promesse chiff…
- **Statut** : ✅ corrigé — V1 (PR #539, v6.27.175)

---

## MINOR non vérifiés (backlog polish)

- `pricing-cles-tier-internes-face-lead` (funnel-marketing) — L'eyebrow de chaque carte rend l'enum brut (« COCKPIT MONTHLY », « RETAINER PRO », « INTAKE PDF » via tier.key.replaceAll('_',' ')) et le message WhatsApp pré-rempli envoyé par le prospect dit « formu…
  - fix : Utiliser tier.label (déjà retourné par getTierGrid) dans l'eyebrow et dans le message WhatsApp.
- `lafusee-compteurs-capacite-perimes` (funnel-marketing) — La landing affiche « 56 outils, 57 séquences, 24 frameworks » (chiffres d'une époque antérieure, jamais re-synchronisés) ; le tag version nav est hardcodé « v6.27 » et la date footer « 2026-07-13 » fi…
  - fix : Sourcer les compteurs des registres (ou les arrondir en « 140+ outils ») et dériver version/date de APP_VERSION/build-time.
- `landingintake-identite-contact-divergente` (funnel-marketing) — Le footer landingintake publie « bonjour@upgraders.pro » (adresse absente du canon, existence non vérifiable) et « Découvrir UPgraders » sort vers https://www.upgraders.pro externe au lieu de « / » — …
  - fix : Importer CONTACT depuis upgraders/data.ts et pointer « Découvrir UPgraders » vers / (ou valider que upgraders.pro et bonjour@ existent et les ajouter au canon).
- `jargon-opus-face-lead` (intake-diagnostic) — Badge rendu à l'écran au lead : « Opus · ancré sur la tension centrale » (result/page.tsx:1106-1108) — nom de modèle LLM interne exposé. Les badges d'action rendent aussi les enums bruts owner="founde…
  - fix : Remplacer par « Recommandation approfondie — ancrée sur votre tension centrale » et mapper owner → libellés français (Vous / Votre équipe La Fusée / Créatif).
- `oracle-teaser-35-vs-21-et-cta-absent` (intake-diagnostic) — Le teaser affiche « 35 sections » en header (oracle-teaser.tsx:36) mais son corps compte 3 + « Plus 18 autres » + « +6 autres » = 21 (ancien canon, oracle-teaser.tsx:147,166) ; et le result page ne pa…
  - fix : Corriger le compte (« Plus 32 autres sections ») et passer onUnlock={() => handleSelectTier("ORACLE_FULL")} pour rendre le CTA.
- `niveau-marque-fallback-taux-de-remplissage` (intake-diagnostic) — Quand evaluateBrandLevel échoue (LLM down), classification retombe sur classifyIntakeBrand(composite) (index.ts:633,995-998) — un seuil sur le TAUX DE REMPLISSAGE du formulaire — mais le result page l…
  - fix : Quand diagnostic.brandLevel est null, afficher un badge « estimation provisoire — fondée sur la complétude du dossier » sous le niveau.
- `epreuve-source-structuree-ecrasee-en-string` (leaderboard-scoreur) — EpreuveCandidate porte sourceUrl/sourceTitle/confidence structurés, mais à l'APPROVE tout est écrasé en une string : `source: "hunter-review:${claim} @${url}"` (candidates.ts:123) — le modèle Epreuve …
  - fix : Champs additifs nullable `sourceUrl`/`sourceTitle` sur Epreuve (migration backfill-safe), remplis par decideCandidate et exposables au drill-down public.
- `score-brand-nowiso-fige-2026-07-15` (leaderboard-scoreur) — `const nowIso = opts.nowIso ?? "2026-07-15T00:00:00.000Z"` (index.ts:176) : ni scoreProspect ni le router ne passent nowIso, donc toute épreuve E compilée en prod portera éternellement occurredAt=2026…
  - fix : Défaut `new Date().toISOString()` (le déterminisme des tests reste garanti en passant nowIso explicite comme le fait déjà seed-scoreur-demo.ts).
- `prospect-shell-collision-client-reel` (leaderboard-scoreur) — Lookup par (operatorId, name) : si l'opérateur score un prospect homonyme d'un client RÉEL existant (ex. re-scorer « Motion19 » depuis la console), le code réutilise ce client et ÉCRASE son `Client.se…
  - fix : Ne renseigner sector que s'il est vide (même règle que scale/pays), et/ou marquer les shells `businessContext.origin=PROSPECT_SCORING` comme seul espace de réutilisation idempotente.
- `preview-brand-cross-tenant` (leaderboard-scoreur) — `previewBrand` est un simple protectedProcedure sans scoping : n'importe quel compte connecté (founder, freelance Guilde) peut re-scorer n'importe quel strategyId d'un autre tenant et lire superfanCou…
  - fix : Passer previewBrand et getCanon en operatorProcedure (cohérent avec listCandidates juste au-dessus).
- `leaderboard-coherence-decimal-tier-enum` (leaderboard-scoreur) — La colonne « Cohérence » affiche le float brut 0..1 (« 0.85 ») sans unité ni explication en ligne (page.tsx:136) ; « Palier » affiche l'enum brut BrandTier en capitales (« ORDINAIRE », « LATENT ») san…
  - fix : Mapper tier → libellés existants (domain/brand-tier) et rendre la cohérence en % avec tooltip/ligne méthode dédiée.
- `dashboard-empty-states-mute-and-raw-signal-types` (cockpit-dashboard-brand) — (1) L'EmptyState devotion dit « l'échelle apparaîtra dès les premières interactions mesurées » sans dire que le déblocage = connecter ses réseaux (la SocialHubCard est pourtant sur la même page, et la…
  - fix : EmptyState avec lien « Connectez vos réseaux » (ancre SocialHubCard) ; table de labels FR par Signal.type avec fallback générique « Activité ».
- `arm-skippedpast-and-anchor-muet` (cockpit-operate) — Le panel ne rend que `armed` et `skippedUnsupported` (launch-calendar-panel.tsx:188-199) : `skippedPast` (posts à échéance passée OU à texte vide, conflatés glory.ts:554-556) et `byPlatform` sont coll…
  - fix : Afficher skippedPast (« N posts à date déjà passée — non armés ») et byPlatform ; préciser que la première semaine démarre le lundi suivant le J-0 (ou ancrer sur J-0 réel).
- `forge-upstream-briefs-promised-not-generated` (cockpit-operate) — Le dispatch réel v1 n'exécute QUE le tool cible : « La génération automatique des briefs upstream MANQUANTS reste tracée (chantier env-avec-clés) » (composer.ts:138-140) — les chips « Générer » et le …
  - fix : Mention explicite à l'étape 3 : « les briefs manquants ne sont pas encore générés automatiquement — le tool cible compose avec l'existant » ; ou retirer les manquants du coût affiché tant que le chant
- `oracle-generated-date-masks-staleness` (oracle-chain) — `meta.generatedAt = new Date().toISOString()` à CHAQUE assemblage : la couverture dit toujours « généré le {aujourd'hui} » même quand le contenu §22-35 provient d'un BrandAsset DRAFT ancien et que tou…
  - fix : Afficher la date du contenu le plus ancien rendu (min des updatedAt BrandAsset utilisés) ou un badge « certaines analyses datent du {date} » quand des sections STALE existent.
- `oracle-snapshot-time-travel-no-surface` (oracle-chain) — Les snapshots s'accumulent à chaque export (idempotence SHA256 OK) mais aucune surface (cockpit ou console) ne liste les snapshots ni n'offre le replay : `snapshotId` n'est alimentable que par le mani…
  - fix : Petite liste « versions du livrable » (date + lien PDF `?snapshotId=`) sur la page proposition ou la console oracle-tracker.
- `presentation-include-unused-relations` (oracle-chain) — `scoreSnapshots` (take 12) et `brandVariables` sont chargés à CHAQUE assemblage (page cockpit pollée toutes les 60 s + page publique + export) mais aucun mapper ne les lit : l'historique de score — ma…
  - fix : Soit rendre la trajectoire de score dans §17 (sparkline/liste datée), soit retirer les deux relations de l'include.
- `proposition-external-blockers-dead-wire` (oracle-chain) — L'état est déclaré et le prop câblé, mais les deux seuls setters font `setExternalBlockers(undefined)` — aucune valeur réelle n'est jamais fournie ; le bloc `externalBlockers.length > 0` de la modal (…
  - fix : Alimenter le state depuis le retour d'échec d'assembleOracle (blockers PILLAR_STALE/veto) ou supprimer le prop et l'état.
- `radar-svg-raw-colors-light-mode` (cockpit-intelligence) — Le plot SVG code en dur des couleurs de thème sombre : gridlines/labels `rgb(82 82 91)`/`rgb(161 161 170)` (zinc), polygones indigo `rgb(129 140 248)` et rose `rgb(244 63 94)` — hors palette UPgraders…
  - fix : Passer les stroke/fill SVG sur var(--color-border)/var(--color-foreground-muted)/tokens Domain (--accent) — currentColor + CSS vars fonctionnent dans les attributs SVG.
- `community-freshness-dropped` (cockpit-intelligence) — Le DTO transporte devotion.measuredAt, devotion.devotionScore et community.measuredAt (community-dashboard/index.ts:31, 42, composés au shaper l.119, 131) mais le panel n'en rend aucun : le founder ne…
  - fix : Afficher « mesuré le {date} » dans les SectionCard santé/échelle (pattern du header radar) et le devotionScore comme sous-titre.
- `system-keys-panel-missing-social-oauth` (console-operator) — `getSystemKeyStatus` couvre 4 groupes (scraping, LLM, paiement, email) mais omet entièrement les clés OAuth sociales (META_OAUTH_CLIENT_ID/META_APP_ID, X_OAUTH_CLIENT_ID, TIKTOK_OAUTH_CLIENT_ID/CLIENT…
  - fix : Ajouter un groupe « Réseaux sociaux (OAuth) » à getSystemKeyStatus avec hasAny() par provider (alias META_APP_ID, TIKTOK_CLIENT_KEY inclus).
- `feedback-unresolved-count-never-consumed` (console-operator) — La procédure existe mais n'a AUCUN consommateur d'affichage : le seul usage repo-wide est l'invalidate dans la page feedback elle-même. Aucun badge nav/console ne l'interroge — une remontée bug reste …
  - fix : Brancher un badge compteur sur l'item nav « Remontées testeurs » (portal-configs / sidebar) consommant feedback.unresolvedCount.
- `feedback-useragent-collected-not-shown` (console-operator) — `userAgent` est soumis, persisté et renvoyé par feedback.list (rows spread), mais l'inbox ne le rend jamais (affiche message, email, pageUrl uniquement). Donnée de triage collectée-mais-jetée à la der…
  - fix : Ajouter le userAgent (tronqué, title=complet) dans la ligne méta sous pageUrl pour les remontées BUG.
- `manual-subscription-reject-reason-never-asked` (console-operator) — L'UI appelle reject.mutate({subscriptionId}) sans jamais demander de motif : rejectedReason est toujours null. Champ promis-mais-pas-branché ; un refus est inexplicable a posteriori (et rien n'est not…
  - fix : ConfirmDialog avec champ motif optionnel avant reject, passé à la mutation.
- `scoreur-nowiso-hardcoded-2026-07-15` (console-operator) — Le DÉFAUT de nowIso est la constante figée "2026-07-15T00:00:00.000Z" et aucun caller de production (scoreProspect, router scoreBrand) ne le passe : chaque épreuve E compilée est estampillée occurredA…
  - fix : Défaut `new Date().toISOString()` ; les tests de reproductibilité passent explicitement leur nowIso fixe.
- `hunt-deferred-conflates-failure-with-missing-key` (console-operator) — huntVictories renvoie le même `{deferred:true}` pour « pas de clé LLM » (l.37) ET pour « appel LLM/Zod échoué » (catch l.84) ; l'UI affiche toujours « Recherche IA indisponible (clé LLM absente) ». Un…
  - fix : Renvoyer `deferredReason: "NO_LLM_KEY" | "LLM_CALL_FAILED"` et différencier le message UI.
- `brand-directory-2000-row-silent-truncation` (console-operator) — listBrandDirectory lit `take: 2000` rows (snapshots, pas marques) puis dédupe par brandKey : dès que l'historique dépasse 2000 observations, les marques dont la dernière observation est plus ancienne …
  - fix : Remplacer par un groupBy/distinct brandKey côté SQL (ou augmenter + signaler `truncated: true` au front).
- `credentials-signal-metrics-fetched-unused` (console-operator) — Les deux champs traversent le réseau à chaque affichage et ne sont jamais rendus : la carte connector montre type/status/lastSync uniquement. L'opérateur ne voit pas si un connecteur ACTIVE produit ré…
  - fix : Afficher « {signalCount} signaux · confiance {avgConfidence} » sous lastSync sur chaque carte connector.
- `no-notification-on-application-decision` (guilde-creator) — ACCEPTED/REJECTED ne déclenche aucune notification (aucun appel notification/NSP/email dans decide, mission-applications.ts:126-176) ; idem publishMission. Le talent ne l'apprend que s'il revisite le …
  - fix : Émettre une notification (center existant Phase 16, + email si adresse) vers applicantId au decide et vers postedByUserId au publish/reject.
- `rejoindre-ignores-existing-membership` (guilde-creator) — `myGuildProfile` n'a aucun consommateur (grep : 0 hit hors router). Un membre déjà inscrit qui revient sur /LaGuilde/rejoindre voit le formulaire d'inscription vierge comme un inconnu (l'upsert évite …
  - fix : Consommer myGuildProfile dans JoinGuildForm : si registered, pré-remplir les champs et afficher un état « Déjà membre — modifier mon profil ».
- `delegated-writezones-label-hardcoded` (guilde-creator) — Le chip cockpit affiche en dur « écriture : calendrier, publications & réseaux » dès que writeZones.length>0 (creator/page.tsx:115) — un COPYWRITER (publications seul) ou MEDIA_PLANNER (calendrier seu…
  - fix : Mapper writeZones→libellés métier (calendar→« calendrier », publications→« publications », social→« réseaux »…) et joindre la liste réelle.
- `compose-deliverable-swallows-tier-gate-denial` (payments-gates) — engine.executeTool retourne le refus comme output ({status:"TIER_GATE_DENIED", reason…}, outputId:"") (engine.ts:127-140). dispatchForge ne vérifie jamais output.status : il rapporte « Livrable X prod…
  - fix : Après executeTool, tester `output.status === "TIER_GATE_DENIED"` (helper isTierGateDenied) et propager un statut DENIED honnête (composer) / recordFailure (oracle-section) au lieu d'un succès.
- `pricing-modal-hardcoded-cm-and-dead-tier-param` (payments-gates) — La modale interroge getTierGrid avec `countryCode: "CM"` en dur (pricing-modal.tsx:48-51) — un founder zone EUR/USD voit des prix FCFA dans son cockpit. Et « Choisir cette formule » push `/pricing?tie…
  - fix : Résoudre le pays depuis la Strategy/le profil (fallback CM), et faire lire `?tier=` par PricingGrid pour scroller/highlighter voire déclencher handleSubscribe.
- `tier-gate-reason-leaks-internal-tier-keys` (payments-gates) — Le reason construit énumère les clés brutes : « Aucune souscription active dans tiers payants (COCKPIT_MONTHLY, RETAINER_BASE, RETAINER_PRO, RETAINER_ENTERPRISE). » (tier-gate.ts:92) et engine.ts fabr…
  - fix : Composer le reason avec TIER_LABELS (subscription-labels.ts) + une variante clientReason sans identifiants techniques ; garder les clés brutes dans un champ debug.
- `publish-cron-cadence-not-runbooked` (social-chain) — Aucun artefact du repo ne câble ni ne documente la cadence publish : pas de vercel.json, ecosystem.config.cjs ne lance que le serveur, et SELF-HOST.md §7 présente les /api/cron/* comme « (Optionnel) C…
  - fix : Ajouter au runbook (et idéalement à ecosystem.config.cjs en 2ᵉ app pm2 « curl loop ») les deux cadences exactes social-sync, en marquant mode=publish comme NON optionnel dès qu'une marque planifie des
- `auth-fail-publish-inbox-no-status-flip` (social-chain) — Les syncs followers/posts flippent bien status=ERROR sur AUTH, mais ni social-publish (échec plateforme → simple result FAILED) ni social-inbox (AUTH pendant fetchCommentsForPost → sawAuthFailure sans…
  - fix : Sur AUTH avéré (401/403 ou code erreur token Meta 190) dans inbox et publish, mettre la connexion en status=ERROR comme le fait le sync followers, pour que le hub propose « Reconnecter » immédiatement
- `prod-finish-lowercase-slug-lookup` (social-chain) — resolveBrand cherche `publicSlug: slugOrName.toLowerCase()` — ne matchera plus jamais un slug `LFA-…` (majuscules) ; seul le fallback `name contains` sauve la résolution (fragile si le nom diverge du …
  - fix : Résoudre via `brandPublicSlug(slugOrName)` (idempotent, gère les deux formes) au lieu du toLowerCase brut.
- `knowledge-seeder-benchmarks-fabriques` (transverse-scan) — generateSectorBenchmarks/generateSectorBusinessModelBenchmarks/generateBriefPatterns fabriquent avgComposite, successRate et des sampleSize en Math.random() (sourceHash « seed-expertise ») ; seshat/re…
  - fix : Soit supprimer le seeder, soit exclure sourceHash=seed-expertise des références servies (ou les marquer « hypothèse maison » dans le titre).
- `glory-quick-actions-orphelin-fire-and-forget` (transverse-scan) — Composant mort (aucun import) qui, s'il était remonté, lancerait executeSequence en boucle sans onSuccess/onError/toast/invalidate ni lien vers le résultat (coût LLM payé, sortie invisible ; rejet de …
  - fix : Supprimer le composant (ou le brancher au registre serveur + feedback NSP/toast + navigation vers le livrable) — en l'état c'est un piège pour le prochain qui le monte.
- `source-insights-router-orphelin` (transverse-scan) — Les deux procédures (list/getSummary) n'ont aucun consommateur UI — les Signals collectés par les crons ne sont visibles par cette voie nulle part ; en prime les procédures sont cross-tenant (même tro…
  - fix : Soit le consommer (page insights founder liste les signaux réels avec provenance), soit le supprimer ; dans les deux cas ajouter la garde canAccessStrategy.


---

## Findings confirmés — deuxième passe (vérification complète, 98 agents, 2026-07-16)

La première passe de vérification adversariale était plafonnée à 40 findings CRITICAL/MAJOR ; le workflow relancé (`resumeFromRunId`) a vérifié les 86 restants. **39 findings supplémentaires confirmés** (15 CRITICAL · 24 MAJOR), consignés ici. Remédiation : vagues V5+.

### [CRITICAL] `devotion-rung-pct-times-100` — cockpit-intelligence

- **Surface** : /cockpit/intelligence/community — échelle d'engagement
- **Intention** : ADR-0126 a corrigé le « bug d'unités devotion→cult (pourcentages 0-100 lus comme fractions) » ; ADR-0134 fixe le canon fractions 0-1 pour CommunitySnapshot et exige « jamais une valeur fabriquée » (community-dashboard/index.ts:37).
- **Exécution** : Le writer DevotionSnapshot stocke des POURCENTAGES 0-100 (devotion-engine/index.ts:233-247, roundPct((count/total)*100)), mais le panel applique le heuristique pct() `v <= 1 ? v*100 : v` (community-panel.tsx:46-49) aux rungs. Avec la forme de donnée réelle qu'ADR-0134 a créée (des milliers de spectateurs, une poignée d'ambassadeurs), tout rung < 1% (ex. 3 ambassadeurs / 4000 → 0.1 stocké) est re-multiplié ×100 et affiché « 10% » voire « 100% » — l'échelle d'engagement du founder est fausse d'un facteur 100 exactement là où la mesure devient réelle.
- **Preuve** : src/components/cockpit/intelligence/community-panel.tsx:46-49 `const n = v <= 1 ? v * 100 : v;` appliqué à devotion.distribution (l.141) ; src/server/services/devotion-engine/index.ts:237-247 stocke `roundPct((finalCounts.x / totalAudience) * 100)` (0-100).
- **Fix esquissé** : Normaliser l'unité au boundary DTO : shapeCommunityDashboard convertit les rungs DevotionSnapshot /100 en fractions canon 0-1, et le panel supprime l'heuristique pct() au profit d'un simple ×100 arrondi.
- **Statut** : ✅ corrigé — V7 cockpit intelligence (v6.27.181)

### [CRITICAL] `metric-card-white-on-bone-light-mode` — cockpit-intelligence

- **Surface** : /cockpit/intelligence/community — 4 KPIs superfans (northstar)
- **Intention** : Mandat opérateur vagues 4-5 (CLAUDE.md v6.27.107) : « mode jour » persisté portail entier ; DS interdit n°2 : aucune classe Tailwind couleur brute hors primitives (DESIGN-SYSTEM.md §4).
- **Exécution** : MetricCard rend la valeur en `text-white` littéral (metric-card.tsx:123) et le trend up en `text-emerald-400` (l.94). Le toggle thème pose `data-theme="light"` sur documentElement (theme-toggle.tsx:52) qui flippe `--color-background` vers bone quasi-blanc (tokens/system.css:57-60). En mode jour, les 4 KPIs superfans (« Superfans actifs », « Prescripteurs », etc.) sont blanc-sur-bone → invisibles pour le founder.
- **Preuve** : src/components/shared/metric-card.tsx:123 `<span className="text-2xl font-bold text-white">` ; src/styles/tokens/system.css:57-60 `[data-theme="light"] { --color-background: var(--ref-bone); ... }` ; consommé par community-panel.tsx:125-132.
- **Fix esquissé** : Remplacer `text-white` par `text-foreground` et `text-emerald-400` par le token succès dans MetricCard (composant partagé — corrige aussi le dashboard).
- **Statut** : ✅ corrigé — V7 cockpit intelligence (v6.27.181)

### [CRITICAL] `overton-deferred-stale-operator-guard` — cockpit-intelligence

- **Surface** : /cockpit/intelligence/overton — radar founder
- **Intention** : Connecteur Tarsis dé-mocké 2026-06-14 (connector.ts:3-25) : « Plus de branche DEFERRED_AWAITING_CREDENTIALS : le socle ne dépend plus d'une clé » — le signal se dérive des digests RSS réels. Phase 23/ADR-0134 : Overton founder-visible avec données réelles, fin du placebo.
- **Exécution** : Le router court-circuite AVANT le connecteur : `if (!strategy.operatorId) return { state: "DEFERRED_AWAITING_CREDENTIALS" }` (cockpit-router.ts:169-172) alors que fetchSectorSignal ignore totalement operatorId (`_operatorId`, connector.ts:64-67). Un founder self-serve (Strategy.operatorId null — strategy.ts:44 le tire de la session, un founder n'en a pas) voit À VIE « Source signal en attente d'activation... Vos équipes UPgraders s'en chargent » (overton-radar.tsx:84-88) — une promesse que personne ne peut tenir puisqu'il n'existe plus aucune credential à activer, pendant que le signal RSS réel dort en base.
- **Preuve** : src/server/trpc/routers/cockpit-router.ts:169-172 (guard) vs src/server/services/seshat/tarsis/connector.ts:24-25 (« Plus de branche DEFERRED... ») et :64 `fetchSectorSignal(_operatorId, ...)`.
- **Fix esquissé** : Supprimer le guard `!strategy.operatorId` (mort post-dé-mock) et appeler fetchSectorSignal inconditionnellement ; retirer la copy DEFERRED du chemin founder ou la réserver au futur enrichissement premium.
- **Statut** : ✅ corrigé — V7 cockpit intelligence (v6.27.181)

### [CRITICAL] `console-orphan-brand-directory-scoreur-canon` — console-operator

- **Surface** : /console/signal/brand-directory + /console/signal/scoreur-canon (nav console)
- **Intention** : ADR-0151 : « Le répertoire est interne (console opérateur /console/signal/brand-directory, lecture seule) » — rendre la base de Seshat visible, « jamais un magasin silencieux ». ADR-0150 : canon du scoreur « éditable par l'opérateur sans redéploiement » (ferme la dette de ratification).
- **Exécution** : Les deux pages existent et fonctionnent mais sont des ORPHELINES : aucune entrée dans portal-configs.ts (la section Seshat liste 11 items, ni brand-directory ni scoreur-canon), aucune entrée command-palette, aucun cross-link depuis prospect-scoring ou /scorer. Un grep repo-wide sur « brand-directory|scoreur-canon » hors des pages elles-mêmes ne retourne QUE le fichier généré app-routes.ts. L'opérateur ne peut y accéder qu'en tapant l'URL de mémoire — la base de marques reste un magasin silencieux en pratique, et l'écran de ratification du canon est introuvable.
- **Preuve** : src/components/navigation/portal-configs.ts:404-421 (section Seshat sans les deux routes) ; src/components/navigation/command-palette.tsx:28-31 (prospect-scoring et manual-subscriptions présents, pas brand-directory/scoreur-canon) ; grep « brand-directory\|scoreur-canon » hors pages = 0 hit hors src/lib/generated/app-routes.ts:173,178
- **Fix esquissé** : Ajouter 2 items à la section Seshat de portal-configs.ts (« Base de marques », « Canon du scoreur ») + 2 entrées command-palette ; ajouter un lien croisé depuis la page prospect-scoring.
- **Statut** : ⬜ à corriger

### [CRITICAL] `creator-active-missions-unscoped-and-deliverable-no-assignee-guard` — guilde-creator

- **Surface** : creator/missions/active + mission.submitDeliverable
- **Intention** : Flux Vague 7 (en-tête mission-applications.ts:1-9) : la mission est ATTRIBUÉE à un talent par décision ; ADR-0144/0129 : les trous d'ownership sur les mutations mission ont été « fermés » (garde enforceStrategyAccess introduite).
- **Exécution** : La page « Missions actives » du talent liste TOUTES les missions IN_PROGRESS de la plateforme (aucun filtre assigneeId — active/page.tsx:29), donc un talent voit et peut « Soumettre livrable » sur les missions des autres. `submitDeliverable` ne vérifie NI que l'appelant est l'assignee NI l'accès à la stratégie (mission.ts:419-437) : n'importe quel compte crée un MissionDeliverable sur n'importe quelle mission et la bascule en REVIEW (mutation d'état d'une mission d'autrui). enforceStrategyAccess n'est câblé que sur mission.start (1 seul usage, mission.ts:219).
- **Preuve** : src/app/(creator)/creator/missions/active/page.tsx:29 (`mission.list({status:"IN_PROGRESS"})` sans assigneeId) ; src/server/trpc/routers/mission.ts:401-437 (submitDeliverable sans guard, auto-transition REVIEW) ; grep enforceStrategyAccess = 1 seul call site (:219)
- **Fix esquissé** : Filtrer la page active sur assigneeId=session.user.id (ou réutiliser strategy.myDelegatedBrands.missions déjà correct) ; dans submitDeliverable, exiger mission.assigneeId === ctx.session.user.id (ou opérateur).
- **Statut** : ✅ corrigé — V5 sécurité/tenancy (v6.27.179)

### [CRITICAL] `guild-brand-no-tracking-surface` — guilde-creator

- **Surface** : LaGuilde dépôt marque → suivi post-dépôt (côté marque)
- **Intention** : ADR-0098 : marketplace Malt-like — la marque dépose, l'opérateur modère (PUBLISH/REJECT motivé), les talents candidatent. Le router documente même « Les missions déposées par la marque connectée + leur état de modération » (laguilde.ts:247) et le success card promet « Une fois approuvée, elle apparaîtra sur le mur et les talents pourront candidater » (post-mission-form.tsx:149-152).
- **Exécution** : La query `laGuilde.myPostedMissions` (id, slug, moderationState PENDING/PUBLISHED/REJECTED, applicationCount) existe côté serveur mais n'a AUCUN consommateur UI (grep repo entier : 0 hit hors router). Après le dépôt, la marque n'a aucune surface pour voir : le statut de modération, le motif de rejet (stocké dans briefData.moderationNote à laguilde.ts:527-531 — même la query ne le projette pas), le nombre de candidatures, ni l'attribution. `publishMission` et `decide` n'émettent aucune notification (aucun appel au notification center Phase 16). La marque dépose dans le vide.
- **Preuve** : src/server/trpc/routers/laguilde.ts:248-283 (`myPostedMissions` — 0 consumer, vérifié grep) ; laguilde.ts:521-536 (moderationNote enfoui dans briefData, jamais projeté) ; src/components/laguilde/post-mission-form.tsx:141-161 (success card sans lien de suivi, seulement « Retour au mur » / « Déposer une autre mission »)
- **Fix esquissé** : Créer une page « Mes missions déposées » (cockpit ou /LaGuilde/mes-missions) consommant myPostedMissions, y projeter moderationNote + applicationCount, et notifier (notification center existant) au PUBLISH/REJECT et à l'attribution.
- **Statut** : ⬜ à corriger

### [CRITICAL] `mission-endpoints-leak-guild-contact-and-premoderation` — guilde-creator

- **Surface** : creator portal missions (mission.list / mission.get) vs projection publique LaGuilde
- **Intention** : ADR-0098 §modèle : « toPublicGuildMission() n'expose JAMAIS contactName / contactEmail / postedByUserId / strategyId… La mise en relation passe toujours par la plateforme » (0098-laguilde-public-guild-portal.md:90-91) ; et D2 : mission visible seulement après PUBLISH opérateur.
- **Exécution** : `mission.list` et `mission.get` sont des protectedProcedure SANS scoping ownership NI filtre guildPublished (mission.ts:351-364, 366-398 — findMany/findUniqueOrThrow renvoient tous les scalaires dont `briefData` brut). N'importe quel compte auto-inscrit (register libre, rôle USER inclus dans CREATOR_ROLES du proxy, proxy.ts:75-82,89) ouvre /creator/missions/available qui liste TOUTES les missions DRAFT de la plateforme — y compris les missions guilde PAS ENCORE MODÉRÉES et les missions internes de toutes les marques — et lit contactEmail/contactName dans briefData via mission.get, court-circuitant l'intermédiation payante de la plateforme. Il peut aussi candidater à une mission non modérée (missionApplication.submit ne vérifie pas guildPublished, mission-applications.ts:39).
- **Preuve** : src/server/trpc/routers/mission.ts:366-398 (list sans where ownership/guildPublished, include briefData) et :351-364 (get idem) ; src/app/(creator)/creator/missions/available/page.tsx:33 (`mission.list({status:"DRAFT"})`) ; src/proxy.ts:75-89 (USER accède /creator) ; contraste : laguilde.ts:39-51 PUBLIC_MISSION_SELECT soigneusement minimal
- **Fix esquissé** : Scoper mission.list/get : opérateur → tout ; talent → missions guildPublished=true OU assignées à lui ; et exclure contactName/contactEmail de briefData hors opérateur (projection dédiée). Ajouter le filtre guildPublished dans APPLY_TO_MISSION pour les missions d'origine guilde.
- **Statut** : ✅ corrigé — V5 sécurité/tenancy (v6.27.179)

### [CRITICAL] `oracle-jargon-neteru-client` — oracle-chain

- **Surface** : Titres et descriptions des 35 sections (grille cockpit proposition, TOC de la page publique, titres de sections du PDF)
- **Intention** : ADR-0123 + CLAUDE.md « les noms mythologiques (Neteru…) sont des alias internes, jamais exposés au client » ; lot 11 audit UX 2026-07-11 : Tarsis/Artemis/ADR-xxxx « purgés des chaînes rendues » + test HARD cockpit-vocabulary.
- **Exécution** : Le livrable phare rend au client : « Crew Program (Imhotep) » (§22), « Plan Comms (Anubis) » (§23), « Tarsis — Signaux faibles sectoriels » (§35) dans SECTION_REGISTRY (titres repris par la grille cockpit, la TOC publique ET les titres du PDF) ; descriptions rendues « gouvernés par Imhotep … — ADR-0010 (pré-réserve) + ADR-0019 (full activation) », « cible APOGEE », « Manipulation Matrix — Peddler / Dealer / Facilitator / Entertainer — comment la marque transforme l'audience en propellant superfan » (persona client incluse). Le test HARD cockpit-vocabulary.test.ts ne scanne NI src/components/strategy-presentation NI src/app/(shared) — la surface la plus client-facing du produit échappe au verrou qui interdit exactement ces mots.
- **Preuve** : src/server/services/strategy-presentation/types.ts:169-170 (`title: "Crew Program (Imhotep)"`, `"Plan Comms (Anubis)"`), :186 (`"Tarsis — Signaux faibles…"`) ; src/components/strategy-presentation/sections/phase13-sections.tsx:908 (« cible APOGEE »), :998 (« ADR-0010 … ADR-0019 »), :661-662 (Manipulation Matrix, personas client), :1025/:1078 (EmptyStates « (ADR-0019) »/« (ADR-0020) ») ; tests/unit/governance/cockpit-vocabulary.test.ts:28-43 SCAN_DIRS sans strategy-presentation/(shared)
- **Fix esquissé** : Renommer les titres/descriptions en vocable business (KB §3 : « Programme équipe », « Plan de diffusion », « Signaux faibles sectoriels ») et étendre SCAN_DIRS du test HARD à components/strategy-presentation + app/(shared).
- **Statut** : ⬜ à corriger

### [CRITICAL] `cancel-manual-wa-routes-to-stripe-and-fails-silently` — payments-gates

- **Surface** : /cockpit/settings/billing — bouton « Annuler à la fin de la période » sur un abonnement WhatsApp
- **Intention** : La page billing existe précisément pour que « le founder puisse voir son abonnement, l'annuler » (en-tête billing/page.tsx:4-9). ADR-0092 : « cancelSubscription (Stripe : annulation provider ; manuel : flag) » (commentaire payment.ts:360).
- **Exécution** : payment.cancelSubscription teste `!sub.providerSubscriptionId.startsWith("manual:")` (payment.ts:366) — un abonnement `manual-wa:` (ou `admin-free:`) passe donc dans la branche Stripe : cancelStripeSubscription("manual-wa:…") throw « STRIPE_SECRET_KEY required » (stripe-subscription.ts:81) ou un 404 Stripe. Côté UI, billing/page.tsx ne rend JAMAIS cancelMutation.error (aucun binding) : le founder clique « Oui, annuler », le bouton fait « Annulation… » puis rien — échec muet, cancelAtPeriodEnd jamais posé. La page elle-même connaît les deux préfixes (`startsWith("manual:") || startsWith("manual-")` ligne 119) — seul le backend a raté le second.
- **Preuve** : src/server/trpc/routers/payment.ts:366-371 + src/server/services/payment-providers/stripe-subscription.ts:80-81 + src/app/(cockpit)/cockpit/settings/billing/page.tsx:35-37 (mutation sans rendu d'erreur) vs page.tsx:119 (l'UI teste `manual-` mais pas le routeur).
- **Fix esquissé** : Dans cancelSubscription, ne router vers Stripe que si le préfixe n'est ni `manual` ni `admin-free` (test partagé avec l'UI), et afficher cancelMutation.error sur la page billing.
- **Statut** : ✅ corrigé — V6 paiements (v6.27.180)

### [CRITICAL] `intake-paywall-env-vars-shown-to-lead-no-manual-fallback` — payments-gates

- **Surface** : Paywall du funnel intake (/intake/[token]/result) — déblocage INTAKE_PDF / ORACLE_FULL
- **Intention** : Mandat capture-then-grow FCFA (CLAUDE.md doctrine pricing) + ADR-0092/PR #258 : « paiement manuel WhatsApp fonctionnel sans clés ». ADR-0123 : zéro jargon interne face client. L'intake PDF est le point de capture n°1 du funnel.
- **Exécution** : En prod sans clés provider, pickProvider throw « No payment provider configured. Set CINETPAY_API_KEY+CINETPAY_SITE_ID, STRIPE_SECRET_KEY, or PAYPAL_CLIENT_ID+PAYPAL_CLIENT_SECRET. » (payment-providers/index.ts:72-74), enveloppé « Aucun provider de paiement disponible. … » (payment.ts:130) et rendu VERBATIM au lead : result/page.tsx:1320-1322 `{initPaymentMutation.error.message}`. Le lead voit des noms de variables d'environnement. Et contrairement aux abonnements, les one-shots n'ont AUCUN fallback WhatsApp manuel : le premier euro/FCFA du funnel est structurellement imprenable sans clés — exactement le pattern /scorer (raison d'infra face lead + valeur perdue).
- **Preuve** : src/server/services/payment-providers/index.ts:72-74 (message env vars) → src/server/trpc/routers/payment.ts:129-131 → src/app/(intake)/intake/[token]/result/page.tsx:1320-1322 (rendu brut). initManualSubscription (payment.ts:386) ne couvre que les 4 tiers mensuels, jamais INTAKE_PDF/ORACLE_FULL.
- **Fix esquissé** : Étendre le chemin manuel WhatsApp aux one-shots (IntakePayment `pending_manual` + validation console) et remplacer le message d'erreur rendu par une copy client (« paiement momentanément indisponible — contactez-nous sur WhatsApp »).
- **Statut** : ✅ corrigé — V6 paiements (v6.27.180)

### [CRITICAL] `manual-wa-subscription-never-expires` — payments-gates

- **Surface** : Abonnement manuel WhatsApp — expiration du cycle 30 j
- **Intention** : ADR-0092 §2.1 « cycle manuel de 30 jours … le client re-paie son cycle pour réactiver » + en-tête ops-sweep : « Abonnements à cycle manuel expirés : active → past_due quand currentPeriodEnd + 3 j de grâce est dépassé » (src/app/api/cron/ops-sweep/route.ts:8-11). approveManualSubscription pose explicitement une période de 30 j.
- **Exécution** : Le sweep quotidien filtre `providerSubscriptionId: { startsWith: "manual:" }` mais la voie de production WhatsApp crée des subscriptions préfixées `manual-wa:` (payment.ts:433) — "manual-wa:".startsWith("manual:") est FAUX. Et checkPaidTier ne vérifie jamais currentPeriodEnd (tier-gate.ts:61-69, seulement status ∈ active/trialing). Résultat : une demande WhatsApp validée une fois reste `active` À VIE — le client garde l'accès payant pour toujours après un seul paiement de 30 j. Aucun autre writer ne repasse jamais un `manual-wa:` en past_due (grep exhaustif : 3 hits, tous dans payment.ts).
- **Preuve** : src/app/api/cron/ops-sweep/route.ts:35-42 `where: { status: "active", providerSubscriptionId: { startsWith: "manual:" }, currentPeriodEnd: { lt: graceCutoff } }` vs src/server/trpc/routers/payment.ts:433 `providerSubscriptionId: \`manual-wa:${reference}\`` ; tier-gate.ts:61-69 ne lit pas currentPeriodEnd. Le test manual-payment-surface.test.ts ne couvre pas l'expiration.
- **Fix esquissé** : Élargir le filtre du sweep à `OR: [{startsWith:"manual:"},{startsWith:"manual-wa:"}]` (voire `admin-free:`), OU ajouter `currentPeriodEnd: { gte: now }` (null-tolerant) dans la clause where de checkPaidTier.
- **Statut** : ✅ corrigé — V6 paiements (v6.27.180)

### [CRITICAL] `b-slug-lfa-regex-404` — social-chain

- **Surface** : /b/[slug] — page publique de marque
- **Intention** : Mandat opérateur go-live (src/domain/brand-slug.ts:4-5) : « les public slug doivent avoir un format standard LFA-<brandshortname> » ; ADR-0132 : pages publiques de marque /b/<slug> vérifiées seeds motion19 + xtincell.
- **Exécution** : Le garde-fou d'entrée de la page rejette TOUT slug au nouveau format : `/^[a-z0-9][a-z0-9-]{1,38}[a-z0-9]$/` (minuscules uniquement) alors que le préfixe canonique est `LFA-` en MAJUSCULES (BRAND_SLUG_RE exige `LFA-`). `LFA-motion19` → notFound() AVANT même la requête DB. Le commit 21ee83b (format LFA- + script scripts/migrate-brand-slugs.ts qui migre les slugs existants) n'a pas touché page.tsx — après migration, 100 % des pages publiques de marque font 404.
- **Preuve** : src/app/(public-brand)/b/[slug]/page.tsx:114 `if (!/^[a-z0-9][a-z0-9-]{1,38}[a-z0-9]$/.test(slug)) notFound();` vs src/domain/brand-slug.ts:16-19 `BRAND_SLUG_PREFIX = "LFA-"` / `BRAND_SLUG_RE = /^LFA-[a-z0-9]+…/`. git : 21ee83b modifie brand-slug.ts + seeds + migrate-brand-slugs.ts mais pas page.tsx.
- **Fix esquissé** : Remplacer le regex ad-hoc par `isBrandPublicSlug(slug)` (le point de vérité domaine existe déjà), éventuellement avec tolérance casse + redirect 308 vers la forme canonique.
- **Statut** : ✅ corrigé — V5 sécurité/tenancy (v6.27.179)

### [CRITICAL] `mcp-brand-scope-unenforced` — social-chain

- **Surface** : Hub Connexions — carte « Connexion à Claude (MCP) » (brandMcp) + /api/mcp
- **Intention** : brand-mcp.ts:2-8 : clés MCP « scopées à SA marque » ; UI connections/page.tsx:257-258 : « Il pourra alors travailler sur VOTRE marque » ; console api-billing affiche « Limitée à la marque X ».
- **Exécution** : La clé founder est créée `server: "*"` (tous les serveurs MCP) avec scopeKind=BRAND, et /api/mcp injecte `__auth` dans les params — mais UN SEUL outil sur ~11 serveurs lit `__auth` (advertis amendPillar). Tous les autres outils (notoria, seshat, intelligence, operations, creative…) acceptent un `strategyId` arbitraire sans vérifier `scopeStrategyId` : une clé « limitée à la marque » lit/opère en réalité N'IMPORTE QUELLE marque (fuite cross-tenant), et la portée affichée en console est décorative.
- **Preuve** : src/server/trpc/routers/brand-mcp.ts:58-63 (`server: "*"`, scopeKind BRAND) ; src/app/api/mcp/route.ts:51-60 (injection __auth) ; grep `__auth` dans src/server/mcp → unique hit src/server/mcp/advertis/index.ts:165-172 ; src/server/mcp/notoria/index.ts:27-31 (handler filtre par strategyId fourni par le client, aucune garde).
- **Fix esquissé** : Faire appliquer la portée dans le dispatcher unifié (mcp-server dispatchTool) : si scopeKind=BRAND, forcer/vérifier tout param strategyId contre scopeStrategyId et refuser les outils sans scoping — fail-closed au niveau du dispatch, pas outil par outil.
- **Statut** : ✅ corrigé — V5 sécurité/tenancy (v6.27.179)

### [CRITICAL] `legacy-read-procedures-cross-tenant` — transverse-scan

- **Surface** : Routers legacy lecture : campaign, mission, devotion-ladder, superfan, source-insights…
- **Intention** : ADR-0129/0131 (CLAUDE.md) : accès par marque « appliqué par le chokepoint canAccessStrategy/scopeStrategies », « trou pré-existant fermé » ; PR #447 résiduel (a) « requireOperator durci 51 sites + 2 gardes d'ownership »
- **Exécution** : Le durcissement a couvert les mutations, pas les lectures : `campaign.get/list` (include strategy, budgets), `mission.get/list` (include commissions avec montants bruts/nets, driver, strategy), `devotionLadder.list/getByStrategy`, `superfan.count/segments/top`, `sourceInsights.list` sont en `protectedProcedure` nu — n'importe quel compte authentifié (freelance Guilde inclus) peut lire les campagnes, missions et commissions de n'importe quelle marque en passant un strategyId arbitraire ; `mission.list` et `campaign.list` sans strategyId retournent TOUT le parc cross-tenant.
- **Preuve** : src/server/trpc/routers/campaign.ts:93-118 (get/list sans garde) ; src/server/trpc/routers/mission.ts:351-399 (get/list + commissions.grossAmount/netAmount) ; src/server/trpc/routers/devotion-ladder.ts:64-81 ; src/server/trpc/routers/superfan.ts:91-119 ; src/server/trpc/init.ts:40-49 (protectedProcedure = session seulement)
- **Fix esquissé** : Passe systématique sur les .query protectedProcedure qui prennent strategyId/id : brancher le chokepoint canAccessStrategy(getOperatorContext) comme dans cockpit-router, et exiger strategyId (ou scopeStrategies) sur les list.
- **Statut** : ✅ corrigé — V5 sécurité/tenancy (v6.27.179)

### [CRITICAL] `ptah-magnific-mock-delivered-as-real` — transverse-scan

- **Surface** : Forge Ptah (founder « Forger réellement ») → dashboard vitrine
- **Intention** : ADR-0021 : « Provider façades retournent DEFERRED_AWAITING_CREDENTIALS si pas de creds — code ship-able sans clés » ; ADR-0136 (CLAUDE.md bloc B) : COMPOSE_DELIVERABLE dispatché « honnête sans clés (DEFERRED) » ; PROPAGATION-MAP : « Ne jamais combler un trou en inventant des données »
- **Exécution** : Sans FREEPIK_API_KEY/MAGNIFIC_API_KEY, le provider magnific ne retourne PAS DEFERRED : il fabrique un task_id mock, programme un faux webhook « status: completed » à 5s et livre picsum.photos (image aléatoire) ou BigBuckBunny.mp4 comme asset. Aucun flag `mocked` en aval : l'AssetVersion est indiscernable d'une vraie forge et remonte dans la vitrine dashboard `getCampaignShowcase` avec le label « Création studio » (cockpit-router.ts:588). Le commentaire assume : « pour démos client ».
- **Preuve** : src/server/services/ptah/providers/magnific.ts:105-121 (mock fallback si !apiKey), :169-188 (fireMockWebhook status completed), :191-207 (picsum/BigBuckBunny) ; src/server/services/ptah/index.ts:84 (« Magnific (mock fallback) reste toujours disponible ») ; src/app/(cockpit)/cockpit/operate/forge/page.tsx:151 (previewOnly:false founder-triggered)
- **Fix esquissé** : Aligner magnific sur ADR-0021 : !apiKey → GenerativeTask DEFERRED_AWAITING_CREDENTIALS (comme le chemin NoAvailableProviderError de index.ts) ; si le mode démo doit survivre, le gater derrière un env explicite + flag `mocked` propagé jusqu'à AssetVersion.metadata et exclu de la vitrine.
- **Statut** : ⬜ à corriger

### [MAJOR] `axis-polity-resolution-dropped-in-ui` — cockpit-intelligence

- **Surface** : /cockpit/intelligence/overton — niveau de résolution d'axe
- **Intention** : ADR-0127 (CLAUDE.md) : « résolution honnête 3 niveaux EXACT/SCALE_ONLY/GLOBAL_FALLBACK surfacée sur le radar founder via OvertonRadarSignal.axisPolityResolution » ; commentaire router : « Le niveau de résolution est surfacé — jamais masqué » (cockpit-router.ts:184-186).
- **Exécution** : Le champ est calculé et posé sur le view-model (cockpit-router.ts:203) mais AUCUN composant ne le lit — grep repo entier : 2 hits seulement (le producteur et la définition domain). Le radar (overton-radar.tsx) ne rend jamais si l'axe affiché est celui de la polity exacte de la marque ou un fallback global — précisément le mensonge par omission qu'ADR-0127 voulait fermer.
- **Preuve** : src/server/trpc/routers/cockpit-router.ts:203 `axisPolityResolution: resolved?.resolution ?? null` ; src/domain/overton-radar-signal.ts:68 ; zéro consommateur dans src/components/** (grep axisPolityResolution).
- **Fix esquissé** : Ajouter un badge de provenance dans le header du radar (« Axe : votre marché » / « échelle » / « référence globale ») lu depuis signal.data.axisPolityResolution.
- **Statut** : ✅ corrigé — V7 cockpit intelligence (v6.27.181)

### [MAJOR] `community-timeseries-and-identities-dropped` — cockpit-intelligence

- **Surface** : /cockpit/intelligence/community — historique & identités
- **Intention** : Copy de la page elle-même : « suivie au fil du temps » (community/page.tsx:26) ; ADR-0134 : collecte QUOTIDIENNE (CommunitySnapshot/DevotionSnapshot/FollowerSnapshot au cron) + annotation Loi 1 `preAudienceBase` (« comparés à référentiel connu, jamais réécrits », devotion-engine/index.ts:322-330) ; le pattern /scorer : « jamais perdu, jamais résumé à un compteur ».
- **Exécution** : La donnée temporelle est persistée chaque jour mais le dashboard ne projette que le DERNIER snapshot + un delta 30j (cockpit-router.ts:257-258 findFirst orderBy desc) : aucun sparkline (MetricCard supporte `data` — jamais passé), getDevotionTrend et son annotation preAudienceBase ont ZÉRO consommateur, et superfan.top/segments (QUI sont les superfans) ne sont branchés nulle part — le founder voit des compteurs nus, jamais ses fans ni la trajectoire.
- **Preuve** : src/server/trpc/routers/cockpit-router.ts:257-258 (findFirst latest only) ; grep getDevotionTrend → seul le manifest le référence ; grep superfan.top/segments → zéro .tsx ; metric-card.tsx:9 prop `data` (sparkline) jamais fournie par community-panel.tsx:124-132.
- **Fix esquissé** : Étendre getCommunityDashboard avec les N derniers snapshots (sparklines MetricCard + trend devotion annoté preAudienceBase) et un bloc « Vos superfans » branché sur superfan.top (tenant-scopé d'abord, cf. gap précédent).
- **Statut** : ✅ corrigé — V7 cockpit intelligence (v6.27.181)

### [MAJOR] `degraded-copy-hides-missing-sector-unlock` — cockpit-intelligence

- **Surface** : /cockpit/intelligence/overton — état vide quand secteur non renseigné
- **Intention** : Grille famille 4 : un EmptyState doit dire COMMENT débloquer ; router : « absent → DEGRADED INSUFFICIENT_DATA (honest, no default sector) » (cockpit-router.ts:122-123).
- **Exécution** : Secteur absent de businessContext → même reason INSUFFICIENT_DATA que « pas assez d'observations » ; le radar affiche « Le secteur n'a pas encore produit assez d'observations... se précisera avec le temps » (overton-radar.tsx:91-94) — on dit au founder d'ATTENDRE alors que le déblocage est une action à sa main (renseigner son secteur). Dead-end permanent maquillé en patience.
- **Preuve** : src/server/trpc/routers/cockpit-router.ts:165-168 (sector absent → DEGRADED INSUFFICIENT_DATA, indistinguable) ; src/components/neteru/overton-radar.tsx:90-95 (copy « avec le temps », aucun CTA).
- **Fix esquissé** : Discriminer la cause (ex. reason dédiée ou champ missingPrerequisite) et rendre un EmptyState actionnable « Renseignez le secteur de votre marque » avec lien vers la fiche marque.
- **Statut** : ✅ corrigé — V7 cockpit intelligence (v6.27.181)

### [MAJOR] `superfan-overton-queries-unscoped-pii` — cockpit-intelligence

- **Surface** : routers superfan.* et overton.brandSignals — tenancy
- **Intention** : FR32 tenant-scope appliqué méticuleusement dans cockpit-router (canAccessStrategy, ADR-0129) ; superfan.ts:81-84 assume que les identités publiques de tiers (PII) exigent operatorProcedure ; ADR-0129 a « fermé le trou pré-existant » d'ownership sur le calendrier.
- **Exécution** : superfan.count / velocity / segments / top et overton.brandSignals sont protectedProcedure SANS aucune garde d'ownership : tout utilisateur connecté peut requêter N'IMPORTE QUEL strategyId. `superfan.top` retourne handles + plateformes + engagementDepth des superfans d'une marque tierce (PII de tiers, la donnée que `candidates` protège soigneusement derrière operatorProcedure).
- **Preuve** : src/server/trpc/routers/superfan.ts:91-119 (count), :122-160 (velocity), :163-190 (segments), :193-216 (top — select handle/platform, aucune vérification userId/canAccessStrategy) ; src/server/trpc/routers/overton.ts:52-55 idem.
- **Fix esquissé** : Appliquer le chokepoint canAccessStrategy(strategyId, opCtx) (ADR-0129) en tête de chaque query superfan.*/overton.brandSignals, comme dans cockpit-router.
- **Statut** : ✅ corrigé — V5 sécurité/tenancy (v6.27.179)

### [MAJOR] `tier-gate-keyed-on-viewer-not-brand` — cockpit-intelligence

- **Surface** : /cockpit/intelligence/overton + /community — gate abonnement
- **Intention** : FR32 : contenu paid-tier-gated sur l'abonnement de LA MARQUE ; ADR-0129/0131 donnent aux collaborateurs délégués (FREELANCE/SOCIAL_MANAGER, ex. Maximus sur Motion19) l'accès cockpit à la marque ; ADR-0134 §B4 : « Fans détectés » = panel à revue humaine OPÉRATEUR.
- **Exécution** : checkPaidTier(ctx.session.user.id) est évalué sur le VIEWER (cockpit-router.ts:135, 220) : un collaborateur délégué ou un opérateur non-god-mode passe canAccessStrategy puis se fait refuser sur SA propre absence d'abonnement (tier-gate.ts:61-94, bypass réservé role ADMIN + email god-mode) et lit « activez votre abonnement » — on demande de payer à la mauvaise personne. Effet cascade : « Fans détectés » n'est monté QUE dans CommunityPanelInner APRÈS ce gate (community-panel.tsx:93-107, 211) → la revue de candidats superfans est inatteignable pour les opérateurs OPERATOR-role, exactement ceux censés cliquer « Suivre ce fan ».
- **Preuve** : src/server/trpc/routers/cockpit-router.ts:135 + 220 `checkPaidTier(ctx.session.user.id)` ; src/server/services/glory-tools/tier-gate.ts:80-89 (bypass ADMIN+god-mode uniquement) ; src/components/cockpit/intelligence/community-panel.tsx:93-107 (gate avant le mount de SuperfanCandidatesPanel l.211, unique mount du repo).
- **Fix esquissé** : Résoudre l'abonnement sur le propriétaire de la Strategy (strategy.userId/operatorId) au lieu du viewer, et exempter les viewers canOperate/collaborateurs ACTIVE du gate (lecture déléguée).
- **Statut** : ✅ corrigé — V5 sécurité/tenancy (v6.27.179)

### [MAJOR] `manual-subscription-reference-hidden` — console-operator

- **Surface** : /console/socle/manual-subscriptions
- **Intention** : PR #258 / en-tête de page : le client envoie sur WhatsApp un message contenant « Réf : {reference} » — la référence est LA clé de corrélation conçue pour rapprocher le paiement WhatsApp de la demande en file (« Confirmez le paiement puis validez »).
- **Exécution** : La référence est générée, envoyée au client dans le message WhatsApp et persistée (`providerSubscriptionId = manual-wa:<ref>`), mais la table console ne l'affiche PAS (colonnes : Formule / Montant / Contact / Demandé le / Statut / Actions). L'opérateur qui reçoit « Réf : ABC123 » sur WhatsApp ne peut pas la retrouver dans la file — il rapproche au nom/email, fragile si plusieurs demandes ou emails différents. Donnée collectée-mais-jetée par la projection UI (la row la contient).
- **Preuve** : src/server/trpc/routers/payment.ts:452-454 (message WhatsApp avec `Réf : ${reference}`) et :433 (`providerSubscriptionId: \`manual-wa:${reference}\``) ; src/app/(console)/console/socle/manual-subscriptions/page.tsx:79-101 (aucune colonne Réf, providerSubscriptionId jamais lu)
- **Fix esquissé** : Ajouter une colonne « Réf » (providerSubscriptionId.replace(/^manual-wa:/, "")) en mono, copiable — la donnée est déjà dans la réponse.
- **Statut** : ✅ corrigé — V6 paiements (v6.27.180)

### [MAJOR] `prospect-scan-facts-lost` — console-operator

- **Surface** : /console/signal/prospect-scoring → scoreur.scoreProspect (seshat/scoreur/prospect.ts)
- **Intention** : Même mandat ADR-0151 (« je ne veux pas que ces données de recherche soient perdues ») + ADR-0154 : le prospect scoring est la voie produit gouvernée de mesure d'une marque externe. Le scan opérateur a un budget 30 s (vs 8 s pour /scorer public) — c'est le scan le plus riche du système.
- **Exécution** : `scoreProspect` appelle `enrichPublicFootprint` (presse, domaine/âge, MX/SPF, maps, perf, YouTube collectés) mais n'en garde QUE `enrichment.apify` pour le statut ; seuls les FollowerSnapshots survivent. Ni `recordFootprintObservation` (la marque scannée n'entre PAS dans la base de marques Seshat — recordFootprintObservation n'est appelé que par footprint.scoreInstant), ni `buildFootprintFacts`, ni writeback pilier E (contrairement au chemin ENRICH_E rerunPublicEnrichmentForStrategy). Les faits coûteux du scan opérateur sont re-payables et perdus, et la base Seshat ne s'enrichit pas des prospects mesurés.
- **Preuve** : src/server/services/seshat/scoreur/prospect.ts:99-112 (`footprintStatus = enriched.enrichment.apify === "DEFERRED" ? ... : "OK"` — enriched jeté ensuite) ; recordFootprintObservation appelé uniquement dans src/server/trpc/routers/footprint.ts:143 ; comparaison : public-enrichment.ts:401-475 persiste tout dans pilier E sur le chemin ENRICH_E
- **Fix esquissé** : Dans scoreProspect, après enrichissement, appeler `recordFootprintObservation({... facts: buildFootprintFacts(enriched), source: "PROSPECT_SCORING"})` — un appel, persiste les faits ET inscrit le prospect au répertoire Seshat.
- **Statut** : ⬜ à corriger

### [MAJOR] `victory-approve-stale-leaderboard` — console-operator

- **Surface** : /console/signal/prospect-scoring bloc « Victoires documentées » → scoreur.decideCandidate
- **Intention** : En-tête de la page + CardDescription rendue à l'opérateur : « Chaque victoire validée devient une épreuve qui compte dans le score ». ADR-0154 : le prospect « apparaît sur le leaderboard public dès que l'opérateur le mesure » — le leaderboard est la vitrine qui crée l'envie.
- **Exécution** : APPROVE → `recordEpreuve` (voie unique, correct) mais AUCUN re-score : `scoreBrand` n'est jamais rappelé (callers = prospect.ts:114 et router scoreBrand/previewBrand seulement, pas de cron). Le `ScoreVerdict` public reste celui d'avant la victoire ; la force affichée sur /leaderboard ne bouge pas tant que l'opérateur ne re-clique pas « Mesurer et placer » (rien dans l'UI ne le lui dit — le tableau tête-à-tête garde aussi la force pré-victoire).
- **Preuve** : src/server/services/seshat/scoreur/candidates.ts:113-131 (APPROVE → recordEpreuve puis update status, pas de scoreBrand) ; grep scoreBrand( → prospect.ts:114, routers/scoreur.ts:80,231 uniquement ; page.tsx:222 (promesse « compte dans le score »)
- **Fix esquissé** : Après recordEpreuve dans decideCandidate, rappeler `scoreBrand(cand.subjectStrategyId, {persist:true})` (best-effort) et renvoyer le nouveau verdict pour rafraîchir le tableau.
- **Statut** : ✅ corrigé — doublon de `victoire-validee-score-jamais-recalcule`, V4 (PR #542, v6.27.178)

### [MAJOR] `agency-role-locked-out-of-application-tracking` — guilde-creator

- **Surface** : Inscription agence (GUILD_REGISTER_ORGANIZATION) → suivi des candidatures
- **Intention** : ADR-0098 usage 3 : inscription agence/boîte de prod pour candidater aux missions du mur (le success card promet « Vous pouvez désormais candidater aux missions du mur », join-guild-form.tsx:119-122).
- **Exécution** : registerOrganization promeut le rôle en AGENCY (laguilde.ts:452-454), mais AGENCY est ABSENT de CREATOR_ROLES du proxy (proxy.ts:75-82) → /creator (seule surface qui consomme missionApplication.listMine et myDelegatedBrands) lui est interdit, et le portail /agency n'a aucune vue candidatures (agency/missions/page.tsx utilise mission.list brut). Une agence candidate depuis le mur public puis ne peut plus JAMAIS voir le statut de sa candidature ni la retirer (au prochain login, le rôle AGENCY prend effet et ferme la porte).
- **Preuve** : src/proxy.ts:75-91 (CREATOR_ROLES sans AGENCY) ; src/server/trpc/routers/laguilde.ts:452-456 (role→AGENCY) ; src/app/(agency)/agency/missions/page.tsx:15 (pas de listMine) ; consumers de listMine : uniquement /creator/missions/available
- **Fix esquissé** : Ajouter AGENCY à CREATOR_ROLES (ou monter une section « Mes candidatures » consommant missionApplication.listMine dans /agency/missions).
- **Statut** : ⬜ à corriger

### [MAJOR] `application-decision-blind-profile-dropped` — guilde-creator

- **Surface** : console/operations — décision des candidatures
- **Intention** : ADR-0098 usage 3 : l'inscription talent crée le TalentProfile canonique (displayName, bio, skills, tier, org, portfolio) « comblait un gap » ; le flux Vague 7 remplace le premier-arrivé par une DÉCISION éclairée de l'opérateur (« soignez votre message », available/page.tsx:334).
- **Exécution** : Au moment de décider, l'opérateur ne voit que name/email/rôle brut + 140 caractères du message + taux (console/operations/page.tsx:68-105). `listPending` n'inclut pas talentProfile (mission-applications.ts:108-120) : tier, skills, bio, spécialisations, organisation, services (ADR-0117) et stats QC — toutes collectées et persistées — sont jetées à l'endroit exact où la valeur du marketplace se joue. Le matching-engine (matchingEngine.suggest, utilisé par listForCreator) n'est pas non plus mobilisé pour classer les candidats.
- **Preuve** : src/server/trpc/routers/mission-applications.ts:107-120 (include: applicant {id,name,email,role} seulement) ; src/app/(console)/console/operations/page.tsx:68-105 (message.slice(0,140), aucune donnée profil) ; profil riche : laguilde.ts:346-385 registerTalent
- **Fix esquissé** : Inclure talentProfile (tier, skills, org, stats) + lien vers le profil dans listPending/listForMission, et afficher un panneau candidat déplié dans la file de décision ; optionnellement injecter le matchScore du matching-engine.
- **Statut** : ⬜ à corriger

### [MAJOR] `creator-dashboard-fabricated-trend-and-unscoped-kpis` — guilde-creator

- **Surface** : /creator (dashboard talent)
- **Intention** : CLAUDE.md PROPAGATION-MAP : « Ne jamais combler un trou en inventant des données » ; le dashboard doit refléter les gains et missions RÉELS du talent.
- **Exécution** : La sparkline « Gains mois » est une série INVENTÉE hardcodée `[180,210,250,280,310,290,340, réel]` (creator/page.tsx:86) — 7 points fabriqués + 1 réel, affichant une tendance ascendante fictive ; le StatCard « Missions dispo. » porte un trend fabriqué `trendValue="+3"` (:234). Par ailleurs les KPIs « En cours »/« Missions en cours » filtrent mission.list NON scopé (:60,70-71) : ils comptent/affichent les missions de TOUTES les marques de la plateforme comme si c'étaient celles du talent.
- **Preuve** : src/app/(creator)/creator/page.tsx:86 (`const earningsTrend = [180, 210, 250, 280, 310, 290, 340, monthlyEarnings / 1000]`), :234 (`trend="up" trendValue="+3"`), :60+70-71 (mission.list sans scope, filtre client)
- **Fix esquissé** : Dériver la sparkline des commissions réelles agrégées par mois (commission.getByCreator existe déjà), supprimer le trendValue fabriqué, et baser les compteurs missions sur assigneeId/myDelegatedBrands.
- **Statut** : ⬜ à corriger

### [MAJOR] `guild-brief-invisible-to-assigned-talent` — guilde-creator

- **Surface** : creator/missions (available détail + active « Voir le brief »)
- **Intention** : Marketing Guilde : « Missions qualifiées, brief structuré » (la-guilde/page.tsx:65-66) ; le brief guilde complet (contexte, livrables, critères QC, contraintes, canaux, budget, échéance) est collecté et persisté dans Mission.briefData/budget/slaDeadline précisément pour cadrer l'exécution.
- **Exécution** : Les modals « Details »/« Brief de la mission » du portail creator ne rendent JAMAIS briefData : ils lisent deadline/budget dans `advertis_vector` (null pour toute mission guilde) et affichent stratégie/driver/mode/livrables soumis (active/page.tsx:75-76,113-115 ; available/page.tsx:68-84,166-168). Le talent attribué ne voit donc ni le budget, ni l'échéance (slaDeadline), ni le contexte, ni les livrables attendus, ni les critères QC du brief pour lequel il a été choisi — sa seule voie est de retrouver l'URL publique /LaGuilde/m/[slug].
- **Preuve** : src/app/(creator)/creator/missions/active/page.tsx:75-76 (`detail?.advertis_vector … deadline`) + 212-292 (modal sans briefData) ; available/page.tsx:166-168 (meta.budget depuis advertis_vector) ; source réelle : laguilde.ts:219-236 (briefData + budget + slaDeadline colonnes)
- **Fix esquissé** : Dans les modals mission du creator, rendre Mission.budget/slaDeadline (colonnes) et, si briefData._kind===GUILD_MISSION_BRIEF, le brief complet via coerceBrief (composant réutilisable avec MissionDetailView).
- **Statut** : ⬜ à corriger

### [MAJOR] `moderation-queue-drops-full-brief` — guilde-creator

- **Surface** : console/arene/missions-guilde — file de modération
- **Intention** : ADR-0098 D2 : décision opérateur PUBLISH/REJECT sur la mission déposée — la marque remplit un brief complet typé Zod (contexte 5000c, livrables, canaux, critères QC, contraintes, cible) précisément pour que la mission soit qualifiée.
- **Exécution** : `listPendingModeration` ne projette que brandName/summary/contactEmail depuis briefData (laguilde.ts:482-498) ; la page modération n'affiche que titre + accroche + secteur/lieu/budget (missions-guilde/page.tsx:55-104). Le modérateur ne peut lire NI le contexte, NI les livrables, NI les contraintes avant de publier — et il n'a aucun autre chemin : getMissionBySlug renvoie null tant que guildPublished=false (laguilde.ts:125). Il publie ou rejette à l'aveugle un brief que la marque a passé 10 minutes à remplir.
- **Preuve** : src/server/trpc/routers/laguilde.ts:461-499 (projection brandName/summary seulement) + :125 (détail public verrouillé pré-publication) ; src/app/(console)/console/arene/missions-guilde/page.tsx:55-104 (aucun rendu du brief complet)
- **Fix esquissé** : Projeter le brief complet (coerceBrief) dans listPendingModeration et rendre un panneau dépliable « brief complet » dans la carte de modération.
- **Statut** : ⬜ à corriger

### [MAJOR] `composer-jargon-intent-kinds` — oracle-chain

- **Surface** : Contenu composé §24 McKinsey 7S (rendu page partagée + PDF + persisté en BrandAsset)
- **Intention** : ADR-0091 : composers = données réelles dans la shape que le CLIENT lit ; ADR-0123 : plomberie (Intent kinds, noms de champs pilier) jamais rendue au client.
- **Exécution** : Les recommandations composées écrivent des Intent kinds et des chemins de champs internes DANS le contenu du livrable : « Compléter s.visionStrategique via SYNTHESIZE_S », « Renseigner a.equipeDirigeante via OPERATOR_AMEND_PILLAR », « Générer le catalogue via GENERATE_I_ACTIONS », « brancher Imhotep crew ». Ces chaînes sont persistées dans le BrandAsset (writeback) puis rendues au client via la section 7S et le PDF.
- **Preuve** : src/server/services/strategy-presentation/deterministic-composers.ts:250 (« via SYNTHESIZE_S »), :256 (« via OPERATOR_AMEND_PILLAR »), :262 (« via GENERATE_I_ACTIONS »), :280 (« brancher Imhotep crew ») — rendus par phase13-sections.tsx Mckinsey7s (dim.recommendation) et par renderValue dans le PDF
- **Fix esquissé** : Réécrire les libellés de gap/recommandation en langage business (« Déclarez votre vision stratégique dans le pilier Stratégie ») ; les codes d'action internes restent en clé `_` strippée si besoin d'audit.
- **Statut** : ⬜ à corriger

### [MAJOR] `oracle-dual-status-truth` — oracle-chain

- **Surface** : Page /cockpit/brand/proposition — héro + grille 35 sections vs panel « Génération progressive » sur la MÊME page
- **Intention** : ADR-0069 (readiness UI parity) : fermer le drift multi-sources sur les statuts — « chip affichait COMPLET alors que le serveur disait STALE » ; une seule vérité de statut.
- **Exécution** : Deux systèmes de statut indépendants coexistent à l'écran : le héro/grille consomment `strategyPresentation.completeness` (dérivé BrandAsset + composers read-time → complete/partial/empty, ignore staleAt) tandis que le panel progressif consomme `oracle.listSections` (OracleSection PENDING/…/STALE). Comme `writePillar` marque TOUTES les sections STALE à chaque écriture pilier (markAllSectionsStale, « conservateur »), le founder voit simultanément « 97 % assemblé / 0 vides » en haut et « 35 périmés » 200px plus bas ; inversement les composers read-time font dire « complete » à des sections que le panel affiche PENDING.
- **Preuve** : src/app/(cockpit)/cockpit/brand/proposition/page.tsx:173-179 (stats depuis completeness) vs src/components/cockpit/oracle/progressive-panel.tsx:90-101 (stats depuis OracleSection.status) ; src/server/services/pillar-gateway/index.ts:619-626 (markAllSectionsStale sur toute écriture) ; src/server/services/strategy-presentation/index.ts:442-503 (checkCompleteness sans lecture d'OracleSection.staleAt)
- **Fix esquissé** : Composer une readiness unique côté serveur (completeness × OracleSection.staleAt/status) consommée par le héro, la grille ET le panel ; a minima afficher le statut « périmé » dans la grille des 35.
- **Statut** : ⬜ à corriger

### [MAJOR] `oracle-llm-payload-dead-end` — oracle-chain

- **Surface** : Génération LLM des sections §22-35 (GENERATE_ORACLE_SECTION runner GLORY_SEQUENCE/FRAMEWORK/GLORY_TOOL)
- **Intention** : ADR-0014 : chaque section est produite par une séquence Artemis (le LLM enrichit le livrable) ; le commentaire du handler lui-même : « générer une section ne changeait rien au livrable délivré — cause racine du 'Oracle pas parfait' ».
- **Exécution** : Quand le runner LLM réussit, son résultat n'est écrit QUE dans OracleSection.payload — colonne qu'aucune surface ne rend (assemblePresentation lit pillars+BrandAssets ; listSections ne renvoie que les statuts). Puis le handler ré-exécute le composeur DÉTERMINISTE qui écrit/écrase le BrandAsset keyé sectionId que le rendu consomme (handler.ts:411-418). Résultat : le coût LLM est payé, le contenu « riche » dort en DB, et le client voit toujours la composition déterministe — collecté-mais-jeté structurel, admis en commentaire mais résolu en écrasant le LLM au lieu de le brancher.
- **Preuve** : src/server/services/oracle-section/handler.ts:403-419 (succès LLM → `composeSectionDeterministic` writeback) ; src/server/services/oracle-section/index.ts:254 (payload persisté, jamais sélectionné pour rendu) ; grep `promoteSectionToBrandAsset` : seul caller = deterministic-composers.ts:740 ; src/server/services/strategy-presentation/index.ts:213-245 (le rendu lit le BrandAsset sectionId-keyé)
- **Fix esquissé** : Écrire le résultat LLM (validé shape par le Zod de la séquence) dans le BrandAsset sectionId-keyé et ne composer déterministe qu'en fallback d'échec ; ou assumer (décision) que §22-35 sont COMPOSE-only et cesser de dispatcher/payer le runner LLM.
- **Statut** : ⬜ à corriger

### [MAJOR] `funnel-monthly-cta-stripe-only-dead-end` — payments-gates

- **Surface** : Funnel intake — CTA d'abonnement mensuel (COCKPIT_MONTHLY/RETAINER_*) sur la page résultat
- **Intention** : ADR-0092 §2.1 deux-rails : Stripe international, cycle manuel mobile money zone FCFA ; PR #258 : la voie de prod sans clés est le WhatsApp manuel. Le funnel (landing → intake → paywall → cockpit) est « vérifié bout-en-bout » (CLAUDE.md V8).
- **Exécution** : handleSelectTier fait un fetch brut vers `monetization.initSubscription` (result/page.tsx:426-440), qui est STRIPE-ONLY (monetization.ts:308 initStripeSubscription, throw sans STRIPE_SECRET_KEY, jamais de rail mobile money ni WhatsApp). Sur échec, redirection silencieuse vers `/cockpit/new?tier=…` (page.tsx:447) : le lead atterrit sur l'ignition SANS qu'aucun paiement n'ait été initié ni proposé — il retombera plus loin sur les cadenas tier-gate. Pendant ce temps le vrai deux-rails `payment.initSubscription` (payment.ts:250) n'est consommé par AUCUNE UI (grep : 0 caller front) — backend shippé, jamais branché.
- **Preuve** : src/app/(intake)/intake/[token]/result/page.tsx:426-448 (fetch monetization.initSubscription + fallback muet) ; src/server/trpc/routers/monetization.ts:289-323 (Stripe-only, publicProcedure) ; grep initSubscription : payment.initSubscription sans consommateur UI.
- **Fix esquissé** : Faire dispatcher le CTA mensuel du funnel vers payment.initManualSubscription (ou payment.initSubscription qui choisit déjà le rail), et remplacer le fallback muet par un état visible (« demande enregistrée / payer via WhatsApp »).
- **Statut** : ✅ corrigé — V6 paiements (v6.27.180)

### [MAJOR] `manual-approval-promised-notification-never-sent` — payments-gates

- **Surface** : Validation opérateur d'une demande manuelle → notification du founder
- **Intention** : Copy client rendue sur /cockpit/settings/billing:99-102 : « vous serez notifié dès l'encaissement confirmé ». Phase 16 : stack notification NSP + email templates existe (ADR-0025).
- **Exécution** : approveManualSubscription (payment.ts:473-502) fait uniquement db.update + audit-trail best-effort. Aucun email, aucun événement notification-center, aucun NSP — grep « notif|sendEmail » dans payment.ts : 0 hit hors notifyUrl webhooks. Le founder qui a payé sur WhatsApp doit deviner que son accès est ouvert en re-visitant la page billing. rejectManualSubscription idem (aucun feedback du refus).
- **Preuve** : src/app/(cockpit)/cockpit/settings/billing/page.tsx:99-102 (promesse) vs src/server/trpc/routers/payment.ts:473-523 (approve/reject : update + auditTrail seulement).
- **Fix esquissé** : Émettre une notification (notification-center + email best-effort) dans approve/reject avec le libellé client du tier — ou retirer la promesse de la copy.
- **Statut** : ✅ corrigé — V6 paiements (v6.27.180)

### [MAJOR] `ig-business-inbox-host-and-scope` — social-chain

- **Surface** : social-inbox (collecte + réponse commentaires Instagram) — chaîne cron ADR-0134
- **Intention** : ADR-0133 « rival Sprout » : commentaires IG Business dans l'inbox, réponse au nom de la marque ; ADR-0128 amendé 2026-07-14 : Instagram passe par son PROPRE provider « Instagram Business Login » (token IG, hôte graph.instagram.com) — arbitrage d'hôte soigneusement fait dans social-connect et social-publish.
- **Exécution** : social-inbox n'arbitre JAMAIS l'hôte : fetchCommentsForPost et replyToInboxItem tapent toujours graph.facebook.com/v21.0 — un token Instagram Business Login y est invalide → collecte de commentaires IG en échec silencieux (OUTAGE→DEGRADED avalé par le cron) pour toute connexion du flow canonique. En plus, replyToInboxItem exige le scope `instagram_manage_comments` alors que le flow instagram accorde `instagram_business_manage_comments` (SOCIAL_SCOPES.instagram) → SCOPE_MISSING permanent avec un conseil trompeur (« reconnectez » ne changera rien). Blast radius : inbox vide → superfans « participants » (superfan-ingest.ts:236) et CommunitySnapshot (community-snapshot-writer.ts:134) dégradés pour IG.
- **Preuve** : src/server/services/anubis/social-inbox.ts:100-102 (hôte fixe graph.facebook.com pour INSTAGRAM), :287 (needed="instagram_manage_comments"), :296-298 (endpoint reply fixe) vs src/server/services/anubis/social-connect.ts:806-807 (arbitrage `provider === "instagram" ? graph.instagram.com : …`) et :103-107 (scopes instagram_business_*).
- **Fix esquissé** : Propager `meta.provider` dans social-inbox comme dans social-connect/publish (hôte graph.instagram.com pour Business Login) et accepter les deux variantes de scope (`instagram_manage_comments` OU `instagram_business_manage_comments`) dans la garde de réponse.
- **Statut** : ⬜ à corriger

### [MAJOR] `public-page-no-founder-surface` — social-chain

- **Surface** : Strategy.publicSlug — page publique /b/<slug> côté cockpit
- **Intention** : ADR-0132 « cockpit qui ramène tout » : pages publiques de marque + hub Connexions où « l'utilisateur autorise/révoque tout » ; brand-slug.ts:7-8 : « tout écriture de Strategy.publicSlug (seeds, admin, FUTURES SURFACES) passe par brandPublicSlug() ».
- **Exécution** : Aucune surface produit ne crée, n'affiche ni ne lie la page publique : les seuls écrivains de Strategy.publicSlug sont les seeds (motion19/xtincell/spawt), scripts/migrate-brand-slugs.ts et /api/admin/seed-brands ; grep `/b/` dans src/app+src/components → zéro lien UI ; le sitemap n'expose que les missions Guilde. Un founder ne peut ni activer sa page ni en connaître l'URL — le livrable est invisible (et, cumulé avec b-slug-lfa-regex-404, mort).
- **Preuve** : grep publicSlug (src) : writers = prisma/seed-*.ts, scripts/migrate-brand-slugs.ts, src/app/api/admin/seed-brands/route.ts:198 ; lecteurs UI : aucun (src/app/sitemap.ts:66-72 = missions seulement ; aucun href /b/ hors la page elle-même).
- **Fix esquissé** : Ajouter au hub Connexions (ou au dashboard) une carte « Page publique » : générer le slug via brandPublicSlug(strategy.name) (Intent gouverné), afficher l'URL + CopyButton + lien, et lister les pages dans le sitemap.
- **Statut** : ⬜ à corriger

### [MAJOR] `publish-failed-shown-as-published` — social-chain

- **Surface** : PublicationManagerPanel (« voir & corriger CHAQUE publication ») + social-publish
- **Intention** : Mandat 2026-07-13 (en-tête du panel) : « l'outil de feedback doit marcher pour CHAQUE publication, pour voir et corriger » ; doctrine états honnêtes (P22-1, jamais de succès fabriqué).
- **Exécution** : Une publication planifiée dont TOUS les envois échouent à l'échéance (erreur plateforme ≠ NOT_CONNECTED, ex. token invalide, image refusée) est matérialisée `status=EXECUTED` (keepWaiting ne couvre que NOT_CONNECTED) → le panel affiche le chip « Publiée » alors que chaque résultat est en échec ; le `detail` persisté (message d'erreur réel de la plateforme) est collecté-mais-jeté (le panel ne rend que RESULT_LABEL « échec ») ; et comme `editable` exige SCHEDULED, il n'y a NI retry NI correction possible depuis le panel. Le vrai motif n'a existé que dans un toast éphémère.
- **Preuve** : src/server/services/anubis/social-publish.ts:389-398 (anyPublished=false + FAILED → mode "PUBLISHED"/EXECUTED) ; src/components/cockpit/social/publication-manager-panel.tsx:25 (EXECUTED→« Publiée »), :145 (`RESULT_LABEL[r.state]` — r.detail jamais rendu), :100 (`editable = p.status === "SCHEDULED"`).
- **Fix esquissé** : Dériver le libellé du chip des `results` (« Échec d'envoi » si 0 PUBLISHED), rendre `r.detail` sous chaque plateforme en échec, et autoriser Modifier/Déclencher sur une action EXECUTED-tout-échec (ou la laisser SCHEDULED pending=false avec motif).
- **Statut** : ⬜ à corriger

### [MAJOR] `footprint-riche-invisible-founder` — transverse-scan

- **Surface** : Empreinte web pilier E → cockpit founder (settings « Sources de données », hub Fondation)
- **Intention** : ADR-0121 « empreinte ENTIÈRE » collectée et persistée dans le pilier E (presse titres+liens, Google Business note+avis, YouTube stats, âge domaine, MX/SPF/DMARC, performance, ads, narratif) — c'est exactement la donnée « jamais perdue » du pattern scorer v6.27.174, et le LEAD la voit richement sur la page résultat intake
- **Exécution** : Une fois le lead devenu FOUNDER payant, le cockpit ne projette que 3 compteurs : `getConnectedSources` réduit webPresence à { siteReachable, socialsDetected: count, pressMentions: count, footprintScore } et la page settings rend « X canal(aux) détecté(s) · Y mention(s) presse ». Les titres/liens presse, avis Google, âge de domaine, infra email ne sont rendus NULLE PART dans le cockpit (grep webPresence en .tsx : settings/page.tsx uniquement) ; webPresence est absent de la variable-bible → le hub pilier E ne l'affiche pas non plus. Le prospect voit plus que le client payant.
- **Preuve** : src/server/trpc/routers/cockpit-router.ts:361-369 (projection compteurs) ; src/app/(cockpit)/cockpit/settings/page.tsx:161-169 ; richesse réelle : src/server/services/quick-intake/footprint-types.ts:21-87 + public-enrichment.ts:517-569 ; surface lead riche : src/app/(intake)/intake/[token]/result/footprint-section.tsx:45-53
- **Fix esquissé** : Étendre getConnectedSources (ou une query dédiée) pour projeter press[], maps, youtube, domain, emailInfra tels quels, et réutiliser le composant footprint-section de l'intake côté cockpit (hub Fondation ou pilier E).
- **Statut** : ✅ corrigé — V7 cockpit intelligence (v6.27.181)

### [MAJOR] `identity-graph-sans-porte-ni-bridge` — transverse-scan

- **Surface** : Identity Graph C1 (ADR-0147) : PersonIdentity / PersonIdentifier
- **Intention** : ADR-0147 : « bridge PAID par email → ferme le double-comptage superfan (arène E) » + réconciliation DECLARED>VERIFIED>INFERRED opérée
- **Exécution** : Le router `identity` (upsertIdentifier/mergePersons/splitPerson, operatorProcedure) n'a aucun consommateur UI, et aucun service interne n'appelle upsertPersonIdentifier (superfan-ingest ne bridge pas, le CRM non plus) — seul le compilateur Scoreur LIT le graphe. En prod le graphe est vide : la déduplication anti double-comptage annoncée ne déduplique rien, silencieusement (l'arène E recompte les doublons).
- **Preuve** : src/server/trpc/routers/identity.ts:28-45 (portes sans UI) ; grep upsertPersonIdentifier hors identity-graph/ : uniquement compilateur (lecture) ; grep trpc.identity. dans app/components : zéro
- **Fix esquissé** : Brancher un writer automatique : superfan-ingest et CRM-ingest émettent upsertIdentifier (email/handle) à chaque naissance/upsert de profil ; à défaut, exposer une UI console et surfacer « graphe vide » dans le verdict Scoreur.
- **Statut** : ⬜ à corriger

### [MAJOR] `superfan-identities-counts-only` — transverse-scan

- **Surface** : Suivi communauté founder (/cockpit/intelligence/community)
- **Intention** : MISSION : superfans = « masse stratégique (ambassadeurs + évangélistes) », pas un compteur ; ADR-0134 collecte les profils réels (handle, displayName, plateforme, interactions, lastActiveAt) depuis l'inbox ; le panneau « Fans détectés » naît les profils un par un
- **Exécution** : Le dashboard communauté founder ne montre QUE des agrégats (total/actifs/prescripteurs/ratio/vélocité) — jamais QUI sont les superfans. La procédure `superfan.top` (handles, segment, interactions, lastActiveAt, protectedProcedure donc pensée founder) existe mais a ZÉRO consommateur UI (grep : aucun .tsx) ; aucune liste superfans côté console non plus. La donnée d'identité collectée quotidiennement est jetée à la projection — le pattern scorer sur la métrique pivot de la mission.
- **Preuve** : src/server/trpc/routers/superfan.ts:193-216 (top orphelin) ; src/components/cockpit/intelligence/community-panel.tsx:125-131 + 214-222 (MetricCards de comptes uniquement) ; src/server/trpc/routers/cockpit-router.ts:246-256 (getCommunityDashboard ne fait que des count())
- **Fix esquissé** : Ajouter une section « Vos ambassadeurs » au CommunityPanel consommant superfan.top (displayName/plateforme/segment/dernière activité), en respectant le lexique T7.
- **Statut** : ✅ corrigé — V7 cockpit intelligence (v6.27.181)

## Faux positifs écartés

- `cockpit-dashboard-procedure-dead-rtis` — Le fait brut est exact (cockpitDashboard.dashboard n'a 0 consommateur — code mort confirmé par grep exhaustif), mais la matérialité MAJOR est réfutée sur les deux branches du critère. (1) Aucun utilisateur ne subit l'effet : le dashboard réel (cockpit/page.tsx via strategy.getWithScore) affiche déjà
