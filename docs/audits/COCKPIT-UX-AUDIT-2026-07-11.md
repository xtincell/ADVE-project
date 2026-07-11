# Audit UX — Cockpit (portail client / founder) — 2026-07-11 — 2ᵉ passe, module par module

> **Méthode** : 2ᵉ passe UX après l'audit du 2026-06-29 et les 9 lots de remédiation mergés le 30 juin (`c051858`→`ada1960`) + vague E funnel (billing founder `1f4f120`, fuite commissions `361b61b`, 10 juillet). Revue statique des **51 routes** du groupe `(cockpit)` + shell de navigation + `components/cockpit/**`, organisée **module par module** (la v1 était thématique), avec delta vérifié claim par claim. Adjudication vocabulaire : `docs/governance/context/UPGRADERS-LAFUSEE-KB.md §3`. **Commit épinglé : `e2a5538da29a88d57dd1debcf66b7a6c8e142308`** — toutes les réfs `fichier:ligne` sont vraies à ce commit.
>
> Rappel canon : **le Cockpit est ce que voit le client payant. Vocabulaire 100 % business.** Noms mythologiques (Neteru), mécanismes (Glory, Notoria, ADVERTIS, APOGEE), plomberie (ADR, Intent kinds, Lois, enums) : jamais à l'écran. Registre aéronautique (Fusée, Cockpit, Forge, Launchpad) : autorisé.
>
> **Aucune correction implémentée dans cette passe.** La section B (IA de navigation cible) est une **proposition**, pas une implémentation. **Décision Lot 0 (v1) toujours DÉFÉRÉE OPÉRATEUR** : statut client-facing de « ADVE / RTIS / lettres de piliers ». Ce doc est rédigé pour rester valide quelle que soit l'issue (libellés business en primaire, lettre en badge conditionnel).

---

## Verdict v2

Les lots 1–9 ont **réellement porté** : la sidebar est renommée (La Gazette, Recommandations, Assistant), la pire surface v1 (`campaigns/[id]/tracker`) est purgée de tout APOGEE/Thot/Loi/Jaccard, les données fabriquées majeures sont retirées (Devotion Ladder gardée par `hasDevotion`, délivrabilité honnête « — »), le founder a une surface abonnement, l'onboarding a un chemin.

Trois problèmes dominent ce qui reste :

1. **La navigation n'a jamais été restructurée** — 35 items / 11 groupes en liste plate, 5 familles de labels quasi-dupliqués, 12 routes qui n'allument aucun item, un ordre de groupe qui sert un acronyme interne. C'est la cause directe du « c'est confus » remonté par les utilisateurs. → Section B.
2. **Le renommage s'est arrêté à la sidebar** : les **corps de pages** contredisent les libellés de nav (« Jehuty · Sous tutelle Seshat » sous le masthead « La Gazette », « pipeline ADVERTIS » sous l'item « Recommandations », « Lancer Artemis » sous « L'Oracle »). L'incohérence libellé↔contenu est presque pire que la fuite d'origine : le client voit *deux* noms pour chaque chose.
3. **La frontière founder/opérateur reste poreuse** — surfaces d'agence en nav client (Operations Center avec emails d'équipe et SLA), un éditeur JSON brut, et une barre d'actions dashboard qui déclenche des mutations opérateur sans garde — dont une passe réellement côté serveur (flag `requireOperator` **mort** dans `governedProcedure`).

---

## A. Bilan des lots 1–9 — delta vérifié

Statuts : **RÉGLÉ-VÉRIFIÉ** (grep négatif ou relecture à HEAD) · **PARTIEL** (fixé en surface, résidus prouvés) · **RESTÉ OUVERT** · **RÉGRESSION**.

| Lot (commit) | Périmètre annoncé | Constat v2 |
|---|---|---|
| **1** `c051858` + **9** `ada1960` — purge vocabulaire libellés client | Renommage des libellés | **PARTIEL.** Sidebar : ✅ (item « Recommandations » `portal-configs.ts:132`, « La Gazette », footer « La Fusée v5.0 » sans NETERU `sidebar.tsx:234`, page « Assistant » `mestor/page.tsx:202`, « Le Messie »→« Figure fondatrice » `field-renderers.tsx:95`, « Compétences Divines »→« Compétences clés » `pillar-a-fields.tsx:315`). Corps de pages : ❌ résidus massifs → [M04-01], [M04-02], [M05-02], [M05-04], [M09-02], T1. |
| **2** `ebe6fc4` — UI honnête par rôle (fin du clic→FORBIDDEN) | Gardes `useCanOperate` | **RÉGRESSION ponctuelle.** Le pattern est en place sur PillarPage/Notoria/Oracle-panel, mais la `BatchActionsBar` du dashboard n'a aucune garde → clic founder « Enrichir ADVE » = FORBIDDEN serveur → [M02-01]. |
| **3** `fa4a4f2` — gating rôle étendu (Oracle + amend) | Founder routé vers éditeur | **TIENT** (`pillar-page.tsx:434` route le founder vers `/cockpit/brand/edit`)… mais l'éditeur cible est lui-même une surface ingénieur → [M03-04]. |
| **4** `87b7371` — fin des actions no-op | Affichage | **PARTIEL.** Le bouton topbar « Assistant » est toujours un no-op total (`app-shell.tsx:31,36` : état togglé, aucun panneau monté nulle part) → [M01-04]. |
| **5** `935f959` + **7** `9b94c19` — honnêteté des données | Devotion Ladder, résidus | **RÉGLÉ-VÉRIFIÉ.** Dashboard gardé par `hasDevotion` ; « Taux de délivrabilité » affiche « — » (`newsletter/page.tsx:197`) ; marqueurs de synthèse benchmarks v1 introuvables à HEAD. |
| **6** `6632c81` — IDOR exports REST | Sécurité | Non re-testé ici (hors périmètre UX statique). |
| **8** `769bb5e` — onboarding sans cul-de-sac + surface abonnement | `/cockpit/new`, settings | **TIENT structurellement** (EmptyState → « Créer ma marque » `cockpit/page.tsx:143` ; billing `settings/billing/page.tsx` honnête `pending_manual`). Résidus de qualité sur le wizard (jargon + accents) → [M02-04] ; et la nouvelle page billing a introduit une divergence de libellés avec settings → [M11-01]. |
| Chaîne campagne ADR-0120 + vague E (post-v1) | campaign manager 360, macro roadmap, billing | Surfaces **neuves jamais auditées** — couvertes en M6/M7/M11. La purge du tracker campagne est **RÉGLÉ-VÉRIFIÉ** (0 occurrence APOGEE/Thot/Loi/Jaccard sur `operate/campaigns/[id]/tracker/page.tsx`). |

**Enseignement** : les lots ont traité les *libellés pointés par la v1*, pas les *classes de problèmes*. La v2 recommande des verrous de classe (greps CI, section F) plutôt qu'une 3ᵉ chasse manuelle.

---

## B. Proposition d'IA de navigation cible

### B.1 Diagnostic — pourquoi « c'est confus »

Constats mesurés (`src/components/navigation/portal-configs.ts:67-170`) :

1. **Volume** : 35 items / 11 groupes (dont 2 sans titre), liste plate scrollante. Un founder cherche parmi 35 entrées dont ~40 % ne le concernent pas (surfaces de production agence).
2. **Labels quasi-dupliqués — 5 familles** (l'utilisateur ne peut pas prédire la destination) :
   - « Roadmap » (`:87`, calendrier d'actions) vs « Stratégie (S) » qui route vers… `brand/roadmap` (`:134`) ;
   - « Diagnostics » (insights, `:151`) vs « Risque (R) » sous-titré « Diagnostic » (`:129`) ;
   - « Campaign Tracker » (`:105`) vs « Tracking (T) » (pilier) vs « Trend Tracker » (page orpheline) ;
   - « Recommandations » : item nav (`:132`) + dock flottant sur toutes les pages + section dashboard + Assistant ;
   - « Calendrier Lancement » (`:104`) vs « Roadmap / Calendrier des actions » (`:87`) vs pilier S.
3. **Ordre au service d'un acronyme interne** : le groupe « Marque — Stratégie » intercale La Gazette et Recommandations entre T et I pour préserver la lecture R-T-…-I-S (commentaire assumé `portal-configs.ts:122-127`). Le client, qui ne doit PAS connaître « ADVERTIS », voit juste deux intrus au milieu d'une liste.
4. **12 routes sans repère** : `isActive` est un `startsWith` (`sidebar.tsx:59-64`) — sur `/cockpit/new`, `/settings`, `/portfolio`, `/brand/edit`, `/brand/rtis`, `/mestor`, `/insights/apogee-maintenance`, `/intelligence/track`, `/intelligence/market-studies`… aucun item ne s'allume, le « vous êtes ici » disparaît.
5. **Deux tableaux de bord concurrents** : « Tableau de bord » et « Operations Center / Hub quotidien » se disputent le même job sans critère de choix.
6. **Shell** : bouton topbar « Assistant » mort ([M01-04]) ; `Cmd+K` déclenche À LA FOIS la Command Palette (`topbar.tsx:56`) et le sélecteur de marque (`strategy-selector.tsx:44`) ; la marque sélectionnée n'est pas persistée (`strategy-context.tsx:35,55` — un reload retombe sur la 1ʳᵉ marque) alors que l'état replié de la sidebar l'est (`sidebar.tsx:38,45`) ; le footer « Accueil » (`sidebar.tsx:226`, `href="/"`) éjecte le client vers la landing publique.
7. **Mobile** : la tabbar = les 4 premiers items aplatis → « Tableau de bord · Operations Center · La Forge · Brief → Actions » (`mobile-tab-bar.tsx:15`) : 2 surfaces opérateur sur 4 slots, labels non traduits (`:56,88,106`).

### B.2 Principe directeur

Le founder est **consommateur** : « founder Cockpit surfaces have NO mutation buttons (only link/quiet navigation) » (UX-DR16, `_bmad-output/planning-artifacts/epics.md:232`). Ses jobs : **voir ma marque · recevoir mes livrables · suivre mon activité · comprendre mon marché · gérer mon compte**. Tout ce qui *produit* (forge, séquences, matching, charge d'équipe) appartient à la Console ; les routes restent accessibles role-gatées (opérateur en impersonation), jamais en 404.

### B.3 Arbre cible recommandé — 20 items / 6 groupes (−43 % d'items)

```
—             Tableau de bord            /cockpit                                   [tab mobile 1]
MA MARQUE     Fondation                  hub A·D·V·E (Authenticité, Distinction,
                                         Valeur, Engagement en onglets/sous-items)  [tab mobile 2]
              Stratégie                  hub R·T·I·S (Risque, Suivi marché,
                                         Innovation, Plan)
              Recommandations            /cockpit/brand/notoria
              La Gazette                 /cockpit/brand/jehuty
MES LIVRABLES Ma stratégie complète      /cockpit/brand/proposition   (ex-« L'Oracle »)
              Livrables                  /cockpit/brand/deliverables  (+ onglets Guidelines, Assets)
              Sources                    /cockpit/brand/sources       (lecture ; purge role-gatée)
MON ACTIVITÉ  Campagnes                  /cockpit/operate/campaigns   (+ onglet Briefs)  [tab mobile 3]
              Calendrier                 /cockpit/operate/calendar    (absorbe operate/roadmap)
              Résultats                  /cockpit/operate/tracker     (ex-« Campaign Tracker »)
              Newsletter                 /cockpit/operate/newsletter
              Demandes                   /cockpit/operate/requests
MON MARCHÉ    Radar sectoriel            /cockpit/intelligence/overton
              Études de marché           /cockpit/intelligence/market-studies (rattachée)
              Communauté                 /cockpit/intelligence/community
              Rapports & analyses        /cockpit/insights/reports    (+ onglets Santé de marque,
                                         Benchmarks, Attribution)
MON COMPTE    Abonnement                 /cockpit/settings/billing    (rattachée)
              Réglages                   /cockpit/settings            (rattachée)
—             Messages                   /cockpit/messages                            [tab mobile 4]
```

Chaque libellé devient **unique** : « Tracking (T) » → « Suivi marché » ; pilier S → « Plan » (l'item « Stratégie » désigne le hub) ; `insights/diagnostics` → onglet « Santé de marque » de Rapports ; un seul « Calendrier » ; un seul « Recommandations » (le dock flottant devient un raccourci vers l'item, pas une 2ᵉ entrée). Libellés piliers = `PILLAR_METADATA.displayName` (`src/domain/pillars.ts:90-167`), la lettre (A/D/V/E/R/T/I/S) en **badge conditionnel** à la décision Lot 0.

### B.4 Table de mapping (ancienne destination → devenir)

| Actuel | Devenir | Mécanique |
|---|---|---|
| 8 items piliers | 2 hubs « Fondation » / « Stratégie » | **Les 8 URLs ne bougent pas.** Nouveau champ `activePrefixes: string[]` sur `NavItem`, consommé par `isActive` (`sidebar.tsx:59-64`, `mobile-tab-bar.tsx:22-25`) — ~10 lignes, zéro redirect |
| `/brand/strategy` (redirect ADR-0030 → `brand/roadmap`) | réaffecté vers le hub Stratégie | 308, pattern existant `brand/strategy/page.tsx` |
| `/brand/guidelines`, `/brand/assets` | onglets de Livrables | routes conservées + `activePrefixes` |
| `/insights/diagnostics`, `/benchmarks`, `/attribution` | onglets de Rapports & analyses | idem |
| `/operate/roadmap` | fusionné dans Calendrier | redirect 308 → `/operate/calendar` |
| `/operate/briefs` | onglet de Campagnes | route conservée + `activePrefixes` |
| `/intelligence/market-studies` | **rattachée** (copie client déjà propre, `market-studies/page.tsx:110-121`) | item nav |
| `/cockpit/new` | pas d'item — flux EmptyState dashboard (`cockpit/page.tsx:143`) + sélecteur de marque (`strategy-selector.tsx:470`) + retour intake | inchangé ; `activePrefixes` sur Tableau de bord pour le repère |
| `/settings`, `/settings/billing` | items « Mon compte » (aujourd'hui : menu user uniquement) | items nav |
| **Sortis de la nav founder** : `/operate/center` (poste agence), `/operate/forge`, `/operate/sequences`, `/operate/action-brief`, `/operate/missions`, `/portfolio(+slug)`, `/brand/edit`, `/brand/rtis(+synthese)`, `/insights/apogee-maintenance`, `/intelligence/track` | garde rôle + écran « pris en charge par votre équipe UPgraders » pour un founder qui suit un vieux lien ; l'opérateur continue d'y accéder | jamais de 404, jamais de redirect silencieux vers `/console` (fuite d'existence) |
| `/cockpit/mestor` + bouton topbar Assistant | court terme : **retirer le bouton mort** (esprit lot 4) ; moyen terme : monter réellement le panneau puis re-exposer | garde en attendant |

### B.5 Mécaniques & résiduels shell (spécification pour le lot 10)

1. **`activePrefixes`** sur `NavItem` + règle « aucun `href` d'item n'est préfixe d'un autre » (vérifiée dans l'arbre cible).
2. **Tabbar mobile** : flag explicite `mobileTab: true` sur 4 items (Tableau de bord, Fondation, Campagnes, Messages) au lieu de `slice(0,4)` (`mobile-tab-bar.tsx:15`) ; rendu via la résolution i18n (`:56,88,106` affichent les littéraux).
3. **i18n nav** : 25/35 items sans clé (2 `labelKey` + 8 `pillarSlug` seulement) ; les nouveaux groupes naissent avec clés dans les 3 locales.
4. **Persistance de la marque active** : localStorage par user (même pattern que `lf-sidebar-collapsed`, `sidebar.tsx:38,45`) — corrige `strategy-context.tsx:35,55`.
5. **Raccourcis** : `Cmd+K` = palette seule ; sélecteur de marque → `Cmd+O` (ou entrée palette). Corrige la double capture `topbar.tsx:56` / `strategy-selector.tsx:44`.
6. **Footer sidebar** : « Accueil » ne doit pas pointer `/` (landing publique, `sidebar.tsx:226`) — pointer `/cockpit`.
7. **Redirects 308** : liste ci-dessus ; règle « aucune URL ayant existé ne 404 ».

---

## C. Audit module par module

Format : `[Mxx-yy]` **sévérité** · statut delta · lot cible — constat (réfs à HEAD) → reco.
Sévérités (barème v1) : **P0** fuite canon / UX cassée ; **P1** préjudice sérieux ; **P2** cohérence-polish ; **P3** nits.

### M1 — Shell & navigation

*Rôle : orienter le founder. Verdict : **la source du « c'est confus »** — 2 P0, 4 P1. Détail chiffré et cible en section B.*

- **[M01-01] P1 · RESTÉ OUVERT (v1 T2) · Lot 10** — 35 items / 11 groupes en liste plate (`portal-configs.ts:67-170`), 2 groupes sans titre, groupes non repliables. Impact : coût de scan permanent, le founder ne « possède » jamais la carte. → Arbre cible B.3.
- **[M01-02] P1 · NOUVEAU · Lot 10** — 5 familles de labels quasi-dupliqués (B.1.2, réfs `:87,:104,:105,:129,:132,:134,:151`). Impact : navigation par essai-erreur. → Renommages d'unicité B.3.
- **[M01-03] P1 · NOUVEAU · Lot 10** — ordre du groupe « Marque — Stratégie » au service du mnémonique interne, Gazette + Recommandations intercalées entre T et I (`portal-configs.ts:122-136`). → Regrouper piliers dans les hubs ; Gazette/Recommandations deviennent des items pleins.
- **[M01-04] P0 · RESTÉ OUVERT (esprit lot 4) · Lot 10** — bouton topbar « Assistant » **mort** : `app-shell.tsx:31,36` togglent `mestorOpen`, transmis à la topbar (`:56`), mais aucun panneau n'est monté (`MestorPanelFloat` n'est importé nulle part) ; en parallèle `/cockpit/mestor` existe, orpheline stricte. Impact : le client clique, rien ne se passe — sur l'élément le plus visible de la topbar. → Retirer le bouton OU router vers `/cockpit/mestor` en attendant le panneau.
- **[M01-05] P1 · NOUVEAU · Lot 10** — collision `Cmd+K` : Command Palette (`topbar.tsx:56`) ET sélecteur de marque (`strategy-selector.tsx:44`) s'ouvrent ensemble (deux listeners `window`, chacun `preventDefault`). → B.5.5.
- **[M01-06] P1 · NOUVEAU · Lot 10** — sélection de marque non persistée (`strategy-context.tsx:35` `useState(null)`, `:55` fallback `activeStrategies[0]`) : reload/nouvel onglet = retour silencieux à la 1ʳᵉ marque. Contraste : l'état replié de la sidebar EST persisté (`sidebar.tsx:38,45`). → B.5.4.
- **[M01-07] P1 · NOUVEAU · Lot 10** — 12 routes sans item actif (perte du repère, `sidebar.tsx:59-64`), dont 4 orphelines strictes sans aucun lien entrant UI : `/cockpit/mestor`, `/insights/apogee-maintenance`, `/intelligence/track`, `/brand/rtis/synthese` (et `/brand/rtis` n'est liée QUE depuis cette dernière). → Table B.4.
- **[M01-08] P2 · NOUVEAU · Lot 10** — tabbar mobile = `slice(0,4)` → Operations Center et La Forge (surfaces opérateur) occupent 2 des 4 slots ; labels et titres de groupes rendus bruts sans i18n (`mobile-tab-bar.tsx:15,56,88,106`). → B.5.2.
- **[M01-09] P2 · NOUVEAU · Lot 15** — i18n nav : 25/35 items sans clé de traduction (comptage `portal-configs.ts:67-170` : 2 `labelKey`, 8 `pillarSlug`).
- **[M01-10] P2 · NOUVEAU · Lot 10** — footer sidebar « Accueil » → `/` : éjecte le client connecté vers la landing publique (`sidebar.tsx:226`).
- **[M01-11] P3 · Lot 10** — double fil d'Ariane sur le dashboard (fil codé en dur `cockpit/page.tsx:300` + breadcrumb topbar) ; segments conteneurs non cliquables (`breadcrumb.tsx:84`, pas de page index `/cockpit/operate`, `/cockpit/brand`).

*Positif à préserver* : renommages nav lot 1 effectifs (`nav.notoria`/`nav.jehuty` en 3 locales), footer purgé de NETERU (`sidebar.tsx:234`), sélecteur de marque en modal riche (recherche + tuiles scorées), PortalSwitcher propre.

### M2 — Dashboard & Ignition (`/cockpit`, `/cockpit/new`)

*Rôle : « où en est ma marque, que dois-je regarder ». Verdict : bon squelette, mais il **mute** et il **jargonne**.*

- **[M02-01] P0 · RÉGRESSION (lot 2) · Lot 12** — `BatchActionsBar` montée sans aucune garde de rôle (`cockpit/page.tsx:312`, définie `:574-640`, zéro `useCanOperate` dans le fichier) avec 3 chips de mutation :
  - « Enrichir ADVE » → `pillar.autoFillAll` = `operatorProcedure` (`src/server/trpc/routers/pillar.ts:792`) → **clic founder = FORBIDDEN** (exactement le pattern que le lot 2 devait éradiquer) ;
  - « Lancer R + T » → `pillar.cascadeRTIS` (`:632`) et « Sources » → `pillar.enrichAllFromVault` (`:900`), tous deux `governedProcedure`… dont le flag `requireOperator` est **mort** : `src/server/governance/governed-procedure.ts:116` lit `opts.requireOperator === false ? protectedProcedure : protectedProcedure` — les deux branches sont identiques, alors que la JSDoc (`:87-90`) promet « Defaults to true ». **Un founder peut donc réellement déclencher ces mutations opérateur.** Violation UX-DR16 + trou de gouvernance (dépasse l'UX — à traiter aussi côté backend).
  → Garde `useCanOperate` sur la barre + réparer le flag `requireOperator` (ou l'assumer et le retirer de la signature).
- **[M02-02] P1 · RESTÉ OUVERT (v1 T1/T8) · Lot 11** — jargon : KPI « Score ADVE-RTIS » (`cockpit/page.tsx:413`), « Northstar » (`:373`), modes de vue en anglais « Executive / Marketing / Founder / Minimal » (`:66-71`) — « Founder » est un méta-terme (le founder ne se désigne pas lui-même). → Libellés business FR ; le score porte le nom décidé au Lot 0.
- **[M02-03] P2 · NOUVEAU · Lot 14** — « Indice d'attachement » (`:395`) vs « Cult Index » (`mestor/page.tsx:46`, `brand/rtis/synthese/page.tsx:209`) : même métrique, deux noms. → Trancher « Indice d'attachement » (T7).
- **[M02-04] P1 · RESTÉ OUVERT (v1 T5) · Lot 11** — wizard ignition : « Creez une nouvelle fiche de marque **ADVE-RTIS** » (`new/page.tsx:145`) — jargon dès le 1ᵉʳ écran d'un client qui vient de payer ; accents manquants systémiques (« Creez », « Le marche », « Le modele », « Secteur d'activite », « Creer la marque » — `:22,26,83,84,211,255,447`). → Copie business + orthographe.
- **[M02-05] P2 · Lot 14** — erreurs affichées brutes (`{strategyQuery.error.message}` en carte rouge).

*Positif* : EmptyState zéro-marque → « Créer ma marque » (`:143`, lot 8) ; distribution de dévotion gardée par `hasDevotion` (lot 5) ; skeletons systématiques ; modes de vue = bonne idée (le tri des sections par audience), seule l'étiquette fuit.

### M3 — Fondation A·D·V·E (`brand/identity·positioning·offer·engagement` + `brand/edit`)

*Rôle : lire et faire mûrir les 4 piliers fondateurs. Verdict : la surface de lecture est la plus aboutie du portail ; l'édition founder est une surface d'ingénieur.*

- **[M03-01] P1 · RESTÉ OUVERT (v1 1d) · Lot 11** — chemins techniques affichés en mono à côté des champs à saisir/valider : `{path}` → `a.archetype`, `d.tonDeVoix.personnalite` (`pillar-page.tsx:725,800`). Le founder n'a pas besoin de l'adresse interne du champ. → Supprimer côté founder (garder en tooltip opérateur).
- **[M03-02] P1 · RESTÉ OUVERT (v1 1d) · Lot 11** — états bruts : « Stage : {EMPTY|ENRICHED|COMPLETE} » (`pillar-page.tsx:715`), niveau de certitude `INFERRED` exposé tel quel dans le panneau « champs inférés » (`:757-761`), toast d'amendement parlant de piliers « marqués stale ». → Traductions business (« À compléter / Enrichi / Complet », « proposé par l'analyse — à valider », « à rafraîchir »).
- **[M03-03] P2 · NOUVEAU · Lot 15** — hex codés en dur dans les barres de progression (`#34d399`/`#f59e0b`/`#a78bfa`, `pillar-page.tsx:513,519`) — violation DS interdit n°2 (tokens only).
- **[M03-04] P0 · RESTÉ OUVERT (v1 T6) · Lot 12** — `brand/edit` (« Editeur Fiche ADVE », destination officielle du founder depuis `pillar-page.tsx:434`) : édition **JSON brut** en textarea pour les piliers sans formulaire structuré — « Modifiez le contenu JSON ci-dessous » + `JSON.stringify(currentData, null, 2)` (`edit/page.tsx:377,394,472`) ; et **2 liens vers la Console** `/console/fusee/glory` (`:193,200`). Lien inverse : la Console pointe vers cet éditeur (`(console)/console/artemis/tools/page.tsx:611`) — c'est une surface opérateur déguisée. Impact : on route le client payant (lot 3) vers un éditeur qui peut corrompre sa fiche et qui le télétransporte dans le back-office. → Sortir `brand/edit` de la surface founder (role-gate) ; l'édition founder passe par les formulaires structurés de PillarPage, étendus pilier par pilier.
- **[M03-05] P2 · Lot 14** — `AmendPillarModal` (opérateur) : modes bruts `PATCH_DIRECT / LLM_REPHRASE / STRATEGIC_REWRITE`, avertissement `staleAt=now()`, classes couleur brutes — acceptable en interne, à nettoyer par cohérence.

*Positif* : barres « Suffisant/Complet » couplées au stage (pas de 88 % vert sur pilier vide) ; panneau needsHuman guidé ; founder routé vers un éditeur au lieu d'un FORBIDDEN (lots 2/3) — c'est la *destination* qui reste à corriger.

### M4 — Stratégie R·T·I·S + Gazette + Recommandations (`brand/diagnostic·market·potential·roadmap·jehuty·notoria·rtis·rtis/synthese`)

*Rôle : lire le diagnostic, la réalité marché, et consommer les recommandations. Verdict : **le module où le renommage lot 1 s'arrête à la porte** — les deux pages phares contredisent leur libellé de nav.*

- **[M04-01] P0 · RESTÉ OUVERT (v1 1a/1c) · Lot 11** — page « Recommandations » : le diagramme de cascade rend les nœuds littéraux « ADVE → R + T → **Jehuty** ▸ **Notoria** → I → S » (`notoria-page.tsx:56-57`, rendu `:440`) ; CTA « Démarrer le pipeline **ADVERTIS** » (`:324`) ; état-ligne « Lancez la veille R + T pour nourrir **Jehuty** puis **Notoria** » (`:435-436`). L'item de nav dit « Recommandations », le corps re-baptise tout. → Nœuds business (« Fondation → Veille → Gazette ▸ Recommandations → Innovation → Plan ») ; « pipeline ADVERTIS » → « analyse complète ».
- **[M04-02] P0 · RESTÉ OUVERT (v1 1a) · Lot 11** — page « La Gazette » : dateline « **Jehuty** · Sous tutelle **Seshat** » (`jehuty-feed-page.tsx:171`), indicateur « Index **Seshat** · /100 » (`:209`), footer « **Jehuty** · **Telemetry** sous **Seshat** · Les dépêches se rafraîchissent toutes les 30s » (`:323`). → Signature éditoriale business (« La Gazette · votre veille marché »).
- **[M04-03] P1 · NOUVEAU · Lot 11** — cartes de reco : bouton « Générer recos ciblées (**function-calling**) » (`notoria-page.tsx:538`) et message de succès idem (`:118`) ; tooltip « Score pondéré **ADR-0090** — ruler X/100 · impact Y pts composite » (`:650`) ; `{reco.source}` et `{reco.status}` bruts (PENDING/ACCEPTED/APPLIED, `:644,654`). → Vocabulaire résultat (« recommandations ciblées », « score de priorité »), statuts traduits.
- **[M04-04] P1 · RESTÉ OUVERT (v1 T7) · Lot 12** — `brand/rtis` (1 325 l.) + `brand/rtis/synthese` : orphelines strictes (synthese n'a **aucun** lien entrant ; rtis n'est liée que depuis synthese), titre « RTIS — Risk, Track, Implementation, Strategy », « Cult Index » (`rtis/synthese/page.tsx:209`), workflow de validation opérateur. Deux surfaces legacy jamais démontées qui doublonnent PillarPage. → Role-gater ou supprimer après vérification d'usage opérateur.

*Positif* : bannière lecture seule founder honnête sur Recommandations (« préparées et validées par votre équipe UPgraders ») ; stale traduit « à rafraîchir » / « PÉRIMÉ » ; le flux pin/écarter de la Gazette est un bon geste produit.

### M5 — Livrables & Sources + Oracle (`brand/proposition·deliverables(+[key])·guidelines·assets·sources`)

*Rôle : recevoir la contrepartie payée. Verdict : le livrable phare est desservi par une page à trois moteurs et un vocabulaire d'ingénierie.*

- **[M05-01] P0 · RESTÉ OUVERT (dette ADR-0073 connue, ici constat UX) · Lot 13** — **triple surface d'assemblage** sur la même page : bloc legacy « Assembler L'Oracle » + bouton « **Lancer Artemis** » (`proposition/page.tsx:317,348`), `OracleEnrichmentTracker` (`:415`), et `OracleProgressivePanel` avec son **second** bouton « Assembler L'Oracle » (`:443`). Gating incohérent : le panel est gardé founder (`progressive-panel.tsx:108,133`), le bloc legacy ne l'est pas. Impact : deux boutons du même nom aux comportements différents sur la page la plus vendue du produit. → Une seule surface (le panel progressif), legacy retiré de l'UI founder.
- **[M05-02] P0 · RESTÉ OUVERT (v1 1a/1e) · Lot 11** — vocabulaire : « assemblé et réévalué par **Mestor** (méthode ADVE-RTIS) » (`:288`) ; « Lancer **Artemis** » (`:348`) ; console live affichant « **IntentEmission**: {id}… » (`:173`), « ERREUR **ORACLE-101** (governor) » (`:199-208`) et « → Voir **/console/governance/oracle-incidents** pour le triage » (`:210` — chemin back-office montré au client) ; badge « **ADR-0073** » rendu dans le panel (`progressive-panel.tsx:122`). → Copie business (« assemblée par votre équipe », « Générer ma stratégie ») ; codes d'erreur traduits en actions client ; badge ADR supprimé.
- **[M05-03] P1 · Lot 14** — `alert()` natif sur échec d'export PDF et de bible (`proposition/page.tsx:496,523` : « Voir la console. » — la console du navigateur, pour un client). → Toast DS + message actionnable.
- **[M05-04] P0 · RESTÉ OUVERT (v1 1c/1d) · Lot 11** — Livrables : « Lancez des sequences **GLORY** ou le plan de lancement… » (`deliverables/page.tsx:228`), « Issu de la sequence **BRANDBOOK-D** » (`:250`) ; nav « Mes Livrables » vs H1 « Livrables ». → « Générez vos livrables » ; provenance business (« Issu de votre charte de marque »).
- **[M05-05] P1 · RESTÉ OUVERT (v1 T6) · Lot 12** — `brand/sources` en nav founder : actions de purge (« réinitialiser les piliers A/D/V/E »), « Propositions vault », `kind` bruts, pas de gestion d'erreur sur la query (skeleton infini). Surface d'ingestion opérateur. → Lecture seule founder (liste + certitude), actions role-gatées.
- **[M05-06] P2 · Lot 14** — `alert()` taille de fichier sur Assets (`assets/page.tsx:71`) ; « Verifiez la console » sur le détail livrable (`deliverables/[key]/page.tsx:79`).

*Positif* : le paywall proposition (lot 3), l'export PDF/16:9 existants, les 3 cartes de préparation ADVE/RTIS/Oracle (bonne pédagogie de dépendance).

### M6 — Operate I : produire (`operate/center·forge·action-brief·roadmap·sequences`)

*Rôle affiché : « hub quotidien ». Rôle réel : **poste de pilotage agence**. Verdict : la plus grosse fuite de rôle du portail.*

- **[M06-01] P0 · RESTÉ OUVERT (v1 T6) · Lot 12** — Operations Center dans la nav founder expose : « Ma Journée (**SLA** & Actions prioritaires) » (`operations-center.tsx:129`, échéances « SLA : {date} » `:206`), « Gestion de Charge de l'Équipe » avec **emails des opérateurs** (`:362`) et charges « Fluide/Soutenue/Surcharge » (`:344-345`), états campagne bruts `BRIEF_DRAFT/LIVE/PLANNING/PRODUCTION` (`:271-274`), consolidation budgétaire XAF (`:407`). Le client voit la cuisine RH de l'agence. → Sortir de la nav founder (Console) ; s'il faut un « hub du jour » client, c'est un dérivé lecture-seule sans équipe ni SLA.
- **[M06-02] P2 · NOUVEAU · Lot 15** — Operations Center : couleurs brutes massives `bg-zinc-500/text-emerald-400/bg-sky-500/text-amber-400` (`operations-center.tsx:155,271-274,344-345,407`) — violation DS interdit n°2.
- **[M06-03] P1 · RESTÉ OUVERT (v1 T1 partiel) · Lot 12** — La Forge : onglets « S → Projets (La Forge) » / « Livrables (Deliverable Forge) », bannière de confiance affichant `AI_PROPOSED` en mono, « Résolution du **DAG** en cours… », coût estimé en **$** alors que les budgets sont en **XAF**. (Crédit : ADVERTIS/Ptah purgés de cette page — vérifié 0 occurrence.) → Surface opérateur à sortir ; si une vue founder subsiste : « Vos projets de campagne », devise unique.
- **[M06-04] P2 · Lot 12** — `action-brief`, `sequences`, `operate/roadmap` : vocabulaire de production (« Séquences / Livrables IA », « Brief → Actions / Idéation guidée ») — items de nav founder pour des gestes opérateur. → Sortis (B.4) ; leurs *résultats* restent visibles côté Campagnes/Calendrier/Livrables.

### M7 — Operate II : suivre (`operate/campaigns(+[id],+tracker)·briefs·missions·calendar·tracker·newsletter·requests`)

*Rôle : suivre l'exécution. Verdict : le fond a été assaini (crédit lots + ADR-0120), le vocabulaire de mesure reste anglo-technique.*

- **[M07-01] CRÉDIT · RÉGLÉ-VÉRIFIÉ** — la pire surface v1 (`operate/campaigns/[id]/tracker`) est purgée : 0 occurrence APOGEE/Thot/Loi/Jaccard/`LAW_*` à HEAD.
- **[M07-02] P1 · RESTÉ OUVERT (v1 1e) · Lot 11** — « **AARRR** » exposé comme cadre de lecture (« Entonnoir AARRR », colonnes Forge/tracker) ; « Campaign Tracker » (nav `:105`) et titres en anglais. → « Entonnoir d'acquisition→recommandation » ; « Résultats ».
- **[M07-03] P1 · NOUVEAU (surfaces ADR-0120 post-v1) · Lot 12/14** — Missions : « Score **QC** moyen », « Matching Talent — Top candidats », badges « MISSION (GUILDE) » — vocabulaire de sous-traitance agence chez le client ; `mission-activities-panel.tsx:300,424` : `window.alert("Brief invalide : JSON mal formé.")` + `window.confirm` de régénération. → Missions sort de la nav founder (B.4) ; feedback DS.
- **[M07-04] P2 · Lot 14** — Newsletter : `confirm()` natif d'envoi en masse (`newsletter/page.tsx:154`) — action lourde méritant le pattern de confirmation DS (UX-DR14/15). (Crédit : « Taux de délivrabilité » honnête « — », `:197`.)
- **[M07-05] P2 · RESTÉ OUVERT (v1 T2) · Lot 13** — détail campagne toujours monolithique (~2 270 l., 12 onglets) ; deux trackers (« Campaign Tracker » global + tracker par campagne) sans articulation nommée. → Fusion/renommage (B.3 : « Résultats »).

*Positif* : `operate-config` SSOT des 12 états, pipeline stepper, Demandes = bon canal client (reste en nav cible).

### M8 — Insights (`insights/reports·diagnostics·benchmarks·attribution·apogee-maintenance`)

*Rôle : lire la santé de marque. Verdict : sain dans l'ensemble, une orpheline toxique.*

- **[M08-01] P1 · RESTÉ OUVERT (v1 T7) · Lot 12** — `apogee-maintenance`, orpheline stricte : « Maintien d'apogée / **Loi 4 APOGEE** — trois **sentinels** défendent la masse en orbite. Cette page rend leurs runs visibles. » (`apogee-maintenance/page.tsx:84-85`). Doctrine interne intégrale, zéro valeur founder. → Sortir (Console) ou supprimer la route.
- **[M08-02] P2 · Lot 13** — « Diagnostics » (label en collision avec le pilier R, cf. [M01-02]) ; benchmarks/rapports portent des couleurs brutes résiduelles (T5). → Devient l'onglet « Santé de marque » de Rapports & analyses.
- **[M08-03] P2 · NOUVEAU · Lot 14** — Attribution héberge `EvangelistLineageView` qui traduit exemplairement (« Prescripteur »)… mais le dashboard dit « Évangélistes » pour le même palier. → T7, trancher « Prescripteur ».

*Positif* : `EvangelistLineageView` = **la référence du portail** (tier-gate propre « réservée aux abonnements » + états `TENANT_MISMATCH`/`INSUFFISANT` honnêtes + alphabet interne 100 % traduit). À généraliser, pas à retoucher.

### M9 — Intelligence (`intelligence/overton·community·track·market-studies`)

*Rôle : comprendre le marché. Verdict : les deux pages en nav sont les mieux gatées du portail ; deux orphelines à trancher.*

- **[M09-01] CRÉDIT** — Overton + Communauté : tier-gates exemplaires (EmptyState Lock + « Découvrir les formules »), états DEFERRED/DEGRADED honnêtes, zéro donnée fabriquée.
- **[M09-02] P1 · RESTÉ OUVERT (v1 1a) · Lot 11** — le radar rend encore « **Tarsis** » ×3 : « …la source de signal sectoriel (Tarsis) est activée… » (`overton-radar.tsx:87`), « …dès les premières observations Tarsis » (`:201`), provenance « Tarsis · {date} » (`:418`). → « signal sectoriel » / « veille sectorielle · {date} ».
- **[M09-03] P2 · Lot 14** — « Overton sectoriel » en nav sans glose (terme d'initié — le sous-titre de page l'explique, l'item nav non) ; « échelle de **dévotion** » (titre page communauté) vs « échelle d'**engagement** » (carte du panel). → Sous-titre nav ; trancher « engagement » (T7).
- **[M09-04] P1 · NOUVEAU · Lot 10/12** — orphelines : `intelligence/track` (« Trend Tracker — 49 variables / Pilier T canon **ADVE GEN**. », `track/page.tsx:59-72`) → role-gater (surface d'ingestion) ; `intelligence/market-studies` — copie client **déjà propre** (« Injectez une étude (PDF / DOCX / XLSX)… », `market-studies/page.tsx:110-121`) → **rattacher à la nav** (B.3).

### M10 — Portfolio (`portfolio`, `portfolio/[corporateSlug]`)

*Rôle théorique : vue multi-marques d'un groupe. Verdict : surface opérateur brute de fonderie, liée depuis le sélecteur de marque founder (`strategy-selector.tsx:462`).*

- **[M10-01] P1 · RESTÉ OUVERT (v1 T6/T8) · Lot 12** — « Portfolio Brand Tree », « **Operator** : {name} », taxonomie brute « CORPORATE → MASTER_BRAND → … → SKU », **tutoiement** (« marques que tu opères ») vs vouvoiement partout ailleurs, « Loading… », `confirm()`/`alert()` ×3 (`portfolio/[corporateSlug]/page.tsx:59,234,251`). → Role-gater la route ; si un jour une vue founder multi-marques est vendue, elle se conçoit depuis zéro en vocabulaire business.

### M11 — Compte, Messages & Assistant (`settings(+billing)·messages·mestor`)

*Rôle : gérer son abonnement, parler à l'équipe. Verdict : fond honnête (lot 8), forme divergente.*

- **[M11-01] P1 · NOUVEAU (introduit par la vague E) · Lot 14** — `TIER_LABELS` divergents entre les deux pages : settings dit `RETAINER_BASE: "Accompagnement"` + GROWTH/SCALE (`settings/page.tsx:29-35`) ; billing dit `RETAINER_BASE: "Retainer Base"` + PRO/ENTERPRISE (`billing/page.tsx:28-31`) — libellés ET jeux de clés différents pour la même donnée ; `canceled` = « Résilié » (`settings/page.tsx:25`) vs « Annulé » (`billing/page.tsx:24`). → Un seul module de labels partagé (source unique), termes tranchés en T7.
- **[M11-02] P2 · Lot 13** — settings : deux sections « Abonnement » sur la même page (carte lien + carte inline détaillée) ; rôle système affiché brut. → Une seule carte, renvoyant à billing.
- **[M11-03] P2 · Lot 11/10** — page Assistant (orpheline + bouton topbar mort, cf. [M01-04]) : prompt suggéré « ameliorer le **Cult Index** » (`mestor/page.tsx:46`), contexte « ({classification}) » brut (`:363`), accents manquants. → Aligner sur « Indice d'attachement », classification traduite.

*Positif* : billing = état `pending_manual` exemplaire (« En attente de validation opérateur… n'accorde l'accès qu'après validation ») ; sources de données connectées honnêtes dans settings.

---

## D. Chapitres transverses (mesures reproductibles — commandes en annexe G)

- **T1 — Vocabulaire interne (corps de pages)** : **147 occurrences** des motifs mythologie/mécanismes (`Jehuty|Notoria|Mestor|Artemis|Seshat|Ptah|Anubis|Imhotep|Thot|Tarsis|ADVERTIS|APOGEE`) dans `(cockpit)` + `components/cockpit` (code + UI confondus). Rendus à l'écran vérifiés : [M04-01], [M04-02], [M05-02], [M09-02], [M02-04], [M08-01]. Seul ce qui atteint le DOM est P0 ; le reste est dette de nommage (P3). **Cible lot 11 : 0 rendu + test CI regex sur les chaînes JSX.**
- **T2 — Liens cross-portail** : 3 occurrences `"/console/` côté cockpit — `brand/edit:193,200` (liens) + `proposition:210` (chemin affiché dans la console live). Cible : 0.
- **T3 — Enums/plomberie affichés** : `AI_PROPOSED` (Forge), `Stage : EMPTY` (`pillar-page.tsx:715`), `INFERRED`, `{reco.status}` PENDING/ACCEPTED (`notoria-page.tsx:654`), états campagne bruts (`operations-center.tsx:271-274`), chemins `a.archetype` (`pillar-page.tsx:725,800`), « function-calling » (`notoria-page.tsx:118,538`), « DAG » (Forge), « ADR-0073 » (`progressive-panel.tsx:122`), « ADR-0090 » (`notoria-page.tsx:650`), « ORACLE-101 » (`proposition:199-208`), « IntentEmission » (`proposition:173`).
- **T4 — Feedback natif** : **10 occurrences** `alert()`/`confirm()` : `newsletter:154`, `deliverables/[key]:79`, `proposition:496,523`, `assets:71`, `portfolio/[corporateSlug]:59,234,251`, `mission-activities-panel:300,424`. Cible : 0 (ConfirmDialog/toast DS ; les confirmations lourdes suivent UX-DR14/15).
- **T5 — Couleurs brutes (DS interdit n°2)** : **16 occurrences** `text-|bg-(zinc|emerald|sky|amber|red|blue|violet)-N` ou hex dans les TSX cockpit — net progrès vs v1 (109 sur 2 fichiers campagnes, purgés). Top fichiers : `operations-center.tsx`, `pillar-page.tsx`, `operate/missions`, `operate/newsletter`, `deliverables/[key]`, `insights/reports`.
- **T6 — i18n & langue** : 25/35 items nav sans clé ; tabbar mobile rend les littéraux (`mobile-tab-bar.tsx:56,88,106`) ; anglais résiduel dans les titres (« Operations Center », « Campaign Tracker », « Trend Tracker », « Northstar », modes « Executive/Founder », « Loading… » portfolio) ; **accents manquants** en série (`new/page.tsx`, `mestor/page.tsx`, « Verifiez la console »).
- **T7 — Lexique à trancher (le doc propose, l'opérateur dispose)** :

  | Concept | Variantes constatées | Canon proposé |
  |---|---|---|
  | Palier haut de l'échelle | Évangélistes (dashboard) / Prescripteur (`evangelist-lineage-view`) | **Prescripteur** |
  | Échelle communautaire | dévotion (titre page) / engagement (panel, dashboard) | **engagement** |
  | Métrique d'attachement | Indice d'attachement (`cockpit/page.tsx:395`) / Cult Index (`mestor:46`, `rtis/synthese:209`) | **Indice d'attachement** |
  | Fin d'abonnement | Résilié (`settings:25`) / Annulé (`billing:24`) | **Résilié** |
  | Tiers retainer | Accompagnement/Growth/Scale (settings) vs Retainer Base/Pro/Enterprise (billing) | jeu **unique** partagé, libellés business (« Accompagnement… ») |
  | Devises | XAF (budgets) / $ (coût Forge) / FCFA (pricing) | **FCFA** affiché partout côté client |
- **T8 — Gating rôle & tier** : mutations founder-visibles sans garde = `BatchActionsBar` ([M02-01], cas index) + bloc Oracle legacy ([M05-01]) ; flag `requireOperator` mort (`governed-procedure.ts:116`) ; tier-gates propres sur 3 surfaces seulement (Overton, Communauté, Lignée prescripteur) — modèle à généraliser là où le tier s'applique.
- **T9 — Honnêteté des données** : lots 5/7 tenus (dévotion gardée, délivrabilité « — », marqueurs benchmarks v1 introuvables). Aucun nouveau cas de donnée fabriquée détecté dans cette passe.

---

## E. Scoreboard v2 (delta v1 → v2)

| Sévérité | v1 (2026-06-29) | v2 (2026-07-11, dé-dupliqué) | Lecture |
|---|---|---|---|
| **P0** | ~25 | **9** ([M01-04], [M02-01], [M03-04], [M04-01], [M04-02], [M05-01], [M05-02], [M05-04], [M06-01]) | Fuites nav et pire-surface purgées ; restent les corps de pages phares + frontière de rôle |
| **P1** | ~30 | **22** | Dominés par la navigation (M1 : 6) et le vocabulaire résiduel corps-de-page |
| **P2** | ~35 | **17** | Cohérence lexicale, feedback natif, DS résiduel |
| **P3** | ~30 | non re-décomptés individuellement (accents/nits agrégés en T6 + [M01-11]) | |

Pire surface v2 : **`/cockpit/operate/center`** (M06-01 — la cuisine de l'agence dans le portail client). La pire surface v1 (`campaigns/[id]/tracker`) est **réglée**.

---

## F. Roadmap de remédiation — Lots 10–15 (continuité des lots 1–9)

| Lot | Contenu | Findings couverts | Effort |
|---|---|---|---|
| **10 — Refonte IA de navigation** (implémente la section B) | 10a config nav cible + `activePrefixes` + redirects 308 + gardes rôle des sorties ; 10b hubs Fondation/Stratégie + onglets Livrables/Rapports ; 10c tabbar `mobileTab` + i18n nav 3 locales + persistance marque + Cmd+K + footer + bouton Assistant | M01-01→11, M09-04, M11-03 | Le plus gros ; sous-livrable |
| **11 — Sweep vocabulaire corps-de-page + verrou CI** | Gazette, Recommandations, Oracle, radar Tarsis, ignition, deliverables GLORY/sequenceKey, enums traduits ; **test CI regex** interdisant les motifs T1 dans les chaînes rendues de `(cockpit)` | M02-02/04, M03-01/02, M04-01/02/03, M05-02/04, M07-02, M09-02, T1/T3 | Moyen, mécanique |
| **12 — Frontière founder/opérateur** | Sorties de nav + role-gates (center, forge, sequences, action-brief, missions, portfolio, brand/edit, brand/rtis, apogee-maintenance, track) ; garde `BatchActionsBar` ; **fix `requireOperator`** (`governed-procedure.ts:116`) ; sources en lecture founder | M02-01, M03-04, M04-04, M05-05, M06-01/03/04, M07-03, M08-01, M10-01, T8 | Moyen ; inclut 1 fix backend |
| **13 — Consolidation surfaces redondantes** | Oracle : 1 seule surface d'assemblage ; trackers fusion/renommage ; settings 1 section Abonnement ; campagne [id] dé-densifiée | M05-01, M07-05, M08-02, M11-02 | Moyen |
| **14 — Cohérence lexicale & feedback** | Lexique T7 tranché + module `TIER_LABELS` unique ; 10 alert/confirm → DS ; erreurs brutes → messages actionnables | M02-03/05, M05-03/06, M07-04, M08-03, M09-03, M11-01, T4/T7 | Petit |
| **15 — Dette DS & i18n résiduelle** | 16 couleurs brutes → tokens ; hex pillar-page ; clés i18n hors nav ; accents | M02-04 (accents), M03-03, M06-02, T5/T6 | Petit |

Ordre recommandé : **12 (P0 sécurité/rôle) → 10 (le signal utilisateur) → 11 → 13 → 14 → 15**. Décision préalable utile mais non bloquante : **Lot 0** (statut ADVE/RTIS client-facing).

---

## G. Annexes

### G.1 Commandes de mesure (ré-exécutables à la racine du repo)

```bash
# T1 — vocabulaire interne (code+UI)
grep -rn "Jehuty\|Notoria\|Mestor\|Artemis\|Seshat\|Ptah\|Anubis\|Imhotep\|Thot\|Tarsis\|ADVERTIS\|APOGEE" \
  "src/app/(cockpit)" src/components/cockpit --include="*.tsx" | wc -l          # 147 @ e2a5538
# T2 — liens cross-portail
grep -rn '"/console/' "src/app/(cockpit)" src/components/cockpit src/components/pillars
# T4 — feedback natif
grep -rn "window\.alert(\|window\.confirm(\|[^.a-zA-Z]alert(\|[^.a-zA-Z]confirm(" \
  "src/app/(cockpit)" src/components/cockpit | grep -v "Alert\b\|AlertTriangle\|alertes"   # 10
# T5 — couleurs brutes
grep -rEn "text-(zinc|emerald|sky|amber|red|blue|violet)-[0-9]|bg-(zinc|emerald|sky|amber|red|blue|violet)-[0-9]|#[0-9a-fA-F]{6}" \
  "src/app/(cockpit)" src/components/cockpit --include="*.tsx" | wc -l          # 16
# T6 — couverture i18n nav (segment cockpit de portal-configs)
sed -n '67,170p' src/components/navigation/portal-configs.ts | grep -c "href:"      # 35 items
sed -n '67,170p' src/components/navigation/portal-configs.ts | grep -c "labelKey"   # 2
sed -n '67,170p' src/components/navigation/portal-configs.ts | grep -c "pillarSlug" # 8
```

### G.2 Table de couverture — 51 routes × module × statut nav

Statut : **NAV** (item sidebar) · **SIA** (sans item actif — joignable mais aucun item ne s'allume) · **ORPH** (aucun lien entrant UI) · **RED** (redirect).

| Route `/cockpit…` | Module | Statut |
|---|---|---|
| `/` | M2 | NAV |
| `/new` | M2 | SIA (EmptyState, sélecteur, intake) |
| `/mestor` | M11 | ORPH |
| `/messages` | M11 | NAV |
| `/portfolio` · `/portfolio/[slug]` | M10 | SIA (sélecteur de marque) |
| `/settings` · `/settings/billing` | M11 | SIA (menu user) |
| `/operate/center` | M6 | NAV |
| `/operate/forge` | M6 | NAV |
| `/operate/action-brief` | M6 | NAV |
| `/operate/roadmap` | M6 | NAV |
| `/operate/sequences` | M6 | NAV |
| `/operate/campaigns` · `/[id]` · `/[id]/tracker` | M7 | NAV + détails |
| `/operate/briefs` | M7 | NAV |
| `/operate/missions` | M7 | NAV |
| `/operate/calendar` | M7 | NAV |
| `/operate/tracker` | M7 | NAV |
| `/operate/newsletter` | M7 | NAV |
| `/operate/requests` | M7 | NAV |
| `/brand/identity` · `/positioning` · `/offer` · `/engagement` | M3 | NAV ×4 |
| `/brand/edit` | M3 | SIA (PillarPage founder + lien Console entrant) |
| `/brand/diagnostic` · `/market` · `/potential` · `/roadmap` | M4 | NAV ×4 |
| `/brand/jehuty` | M4 | NAV |
| `/brand/notoria` | M4 | NAV |
| `/brand/rtis` | M4 | ORPH (liée uniquement depuis synthese) |
| `/brand/rtis/synthese` | M4 | ORPH |
| `/brand/strategy` | M4 | RED 308 → `/brand/roadmap` |
| `/brand/proposition` | M5 | NAV |
| `/brand/deliverables` · `/[key]` | M5 | NAV + détail |
| `/brand/guidelines` | M5 | NAV |
| `/brand/assets` | M5 | NAV |
| `/brand/sources` | M5 | NAV |
| `/insights/reports` · `/diagnostics` · `/benchmarks` · `/attribution` | M8 | NAV ×4 |
| `/insights/apogee-maintenance` | M8 | ORPH |
| `/intelligence/overton` · `/community` | M9 | NAV ×2 |
| `/intelligence/track` | M9 | ORPH |
| `/intelligence/market-studies` | M9 | ORPH (à rattacher, B.4) |

**Couverture : 51/51 routes statuées.** Shell (M1) audité transversalement : `portal-configs.ts`, `sidebar.tsx`, `topbar.tsx`, `app-shell.tsx`, `mobile-tab-bar.tsx`, `breadcrumb.tsx`, `strategy-selector.tsx`, `strategy-context.tsx`.
