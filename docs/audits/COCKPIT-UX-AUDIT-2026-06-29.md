# Audit UX — Cockpit (portail client / founder) — 2026-06-29

> Méthode : revue statique exhaustive des **50 pages** du groupe de routes `(cockpit)` (~19 000 lignes TSX) + shell de navigation + composants `components/cockpit/**`, répartie en 8 clusters audités en parallèle contre une grille à 10 dimensions. Adjudication des fuites de vocabulaire calée sur `docs/governance/context/UPGRADERS-LAFUSEE-KB.md §3` (lexique business / alias internes).
>
> Rappel canon : **le Cockpit est ce que voit le client payant. Le vocabulaire client doit être 100 % business. Les noms mythologiques (Neteru), les noms de mécanismes (Glory, Notoria, ADVERTIS, APOGEE) et la plomberie d'ingénierie (ADR, Intent kinds, Lois, enums) ne doivent JAMAIS apparaître.** Le registre aéronautique (Fusée, Cockpit, Forge, Launchpad) est autorisé — c'est la signature produit.

---

## Verdict

Le cockpit est **fonctionnellement riche et techniquement solide** (bons squelettes de chargement, `EmptyState` partagé, garde-fous destructifs, états de disponibilité honnêtes sur les surfaces récentes). Mais il souffre de **quatre problèmes systémiques** qui le rendent impropre à être montré tel quel à un client payant :

1. **Fuite massive et systémique du vocabulaire interne** (≈ 25 problèmes P0 distincts, des dizaines de fichiers). Le client voit le panthéon entier : Mestor, Notoria, Jehuty, Seshat, Artemis, Ptah, Anubis, Imhotep, Thot, Tarsis, « Glory », « ADVERTIS », « APOGEE », « NETERU », « Le Messie », des refs ADR, des Intent kinds, des enums bruts. **Notoria et Jehuty sont des items de navigation.** C'est le problème n°1.
2. **Surcharge cognitive** — exactement la densité que tu signales. ~30 destinations / 11 groupes dans la sidebar ; page détail campagne = 2326 lignes / 12 onglets ; page RTIS = 1324 lignes ; Oracle = mur de 35 sections sans regroupement.
3. **Architecture redondante** — pas de taxonomie claire. 4 surfaces « livrables » qui se chevauchent, 4 éditeurs de piliers, 4 surfaces « actions », 2 trackers indifférenciés, Demandes vs Messages.
4. **États de données malhonnêtes** — données fabriquées présentées comme réelles (viole le canon « ne jamais combler un trou en inventant des données »).

Plus : onboarding premier-run cassé, fuite de surfaces opérateur/agence dans le portail client, routes orphelines, et une longue traîne de dette de cohérence (tokens DS, accents FR, mix FR/EN).

---

## Scoreboard

| Sévérité | Définition | Volume (dé-dupliqué) |
|---|---|---|
| **P0** | Fuite de jargon canon vers le client, OU UX cassée / cul-de-sac | **~25 problèmes distincts** sur des dizaines de fichiers |
| **P1** | Préjudice UX sérieux (densité, IA confuse, état manquant, donnée fabriquée) | **~30** |
| **P2** | Cohérence / polish / redondance modérée | **~35** |
| **P3** | Nits (accents, hovers morts, a11y mineure) | **~30** |

Pire surface unique : **`/cockpit/operate/campaigns/[id]/tracker`** — se lit comme un dashboard d'ingénierie interne livré à un client payant (APOGEE, Thot, Seshat, Loi 1/3, `LAW_1_SILENT_REGRESSION`, `THOT_PAUSE_CAMPAIGN_FLAME_OUT`, refs ADR, « Jaccard MVP »).

---

## THÈME 1 — Fuite systémique du vocabulaire interne (P0)

### 1a. Noms mythologiques dans la navigation et comme identité de page
- **Notoria** — item de nav (`portal-configs.ts:132`, hardcodé dans les 3 locales `fr.ts:179`/`en.ts:178`/`zh.ts:177`) + **dock flottant monté sur CHAQUE page cockpit** (`layout.tsx:51`, `notoria-status-dock.tsx:88,106,123`) + H1 de page (`notoria-page.tsx:451`) + boutons « Voir dans Notoria » sur les pages piliers (`pillar-page.tsx:861,949`).
- **Jehuty** — item de nav (`portal-configs.ts:131`, 3 locales) + masthead `<h1>Jehuty.</h1>` (`jehuty-feed-page.tsx:181`) + select/prompt campagnes (`canon-campaigns-panel.tsx:23,86,140`).
- **Mestor** — bouton topbar `aria-label="Ouvrir Mestor AI"` (`topbar.tsx:143`) + page dédiée « Mestor AI » (`mestor/page.tsx:202,234,377`) + « Prescriptions Mestor » sur le dashboard (`page.tsx:440,479`) + breadcrumb (`breadcrumb.tsx:27`).
- **Artemis** — CTA primaire « Lancer Artemis maintenant » (`artemis-launch-modal.tsx:200,226,442`) + Oracle (`proposition/page.tsx:288,347`) + RTIS cascade modal (`rtis-cascade-modal.tsx:264`).
- **Tarsis** — radar Overton (dashboard + page) (`overton-radar.tsx:87,202,418`) + market-studies (`market-studies/page.tsx:112`) + provenance popover (`provenance-popover.tsx:34`).
- **Seshat / Ptah / Anubis / Imhotep / Thot** — Jehuty page « Sous tutelle Seshat » (`jehuty-feed-page.tsx:171,323`) ; forge « le forge Ptah final » (`forge/page.tsx:566`) + portal-welcome (`portal-welcome.tsx:50`) ; newsletter « via Anubis » / « Anubis Delivery » (`newsletter/page.tsx:171,200`) ; titres Oracle « Crew Program (Imhotep) » / « Plan Comms (Anubis) » (`strategy-presentation/types.ts:168,169`) ; tracker « Loi 3 — Thot » (`campaigns/[id]/tracker/page.tsx:211`).

### 1b. La pire chaîne unique : registre religieux comme libellés de champs
- **« Le Messie »** et **« Compétences Divines »** sont les libellés affichés au founder qui édite le pilier A (`field-renderers.tsx:95`, `pillars/pillar-a-fields.tsx:313,315`).
- **« Cult Dashboard »** = H1 du tableau de bord (`page.tsx:135,277`) ; **« Cult Index »** = KPI (`page.tsx:371`).

### 1c. Noms de mécanismes
- **Glory / GLORY** (12 fichiers) — nav « Séquences Glory » (`portal-configs.ts:88`) ; pilier D « Direction artistique (GLORY) » (`pillar-d-fields.tsx:247`) ; deliverables « sequences GLORY » (`deliverables/page.tsx:228`) ; sequence launcher (`sequence-launcher-panel.tsx:98,104`) ; badge `sourceType=GLORY` (`deliverables/[key]/page.tsx:13-20,170`).
- **ADVERTIS** — forge (`forge/page.tsx:340,383`) + CTA « Démarrer le pipeline ADVERTIS » (`notoria-page.tsx:319`).
- **APOGEE** — tracker (`campaigns/[id]/tracker/page.tsx:332`) + route+page `apogee-maintenance` (`apogee-maintenance-dashboard.tsx:110`) + tiers benchmarks.
- **NETERU** — footer sidebar « La Fusée v5.0 — NETERU » (`sidebar.tsx:235`) + « Centre de Commandement des Recommandations NETERU » (`notoria-page.tsx`).

### 1d. Enums bruts & clés internes affichés au client
- `BrandAsset.kind` brut : `BIG_IDEA`, `CREATIVE_BRIEF`, `MANIFESTO`, `POSITIONING` — sources (`sources/page.tsx:296`), forge (`forge/page.tsx:545,600`), deliverables.
- `sequenceKey` brut : « Issu de la sequence **BRANDBOOK-D** », `MCK-7S`, `BCG-PORTFOLIO` (`deliverables/page.tsx:159,197,250`).
- Badges `sourceType` : `ARTEMIS`/`SESHAT`/`MESTOR`/`GLORY`/`PILLAR`/`CALC` (`deliverables/[key]/page.tsx:150,170`).
- Chemins de champs en mono : `a.archetype`, `d.tonDeVoix.personnalite` (`pillar-page.tsx:708,783`).
- Enums d'état bruts partout : exec states `IN_PRODUCTION`, rôles `ACCOUNT_DIRECTOR`, plateformes `FACEBOOK`/`OOH`, `Certainty: INFERRED`, `Stage: EMPTY/ENRICHED` (`campaigns/[id]/page.tsx:647,713,2043`; `pillar-page.tsx:539,698`).

### 1e. Scaffolding d'ingénierie / gouvernance visible
- Refs ADR : « (ADR-0049) » (`briefs/page.tsx:674,707`), « ADR-0052 v2 », « ADR-0046 » (`campaigns/[id]/tracker/page.tsx`), « ADR-0090 » (`notoria-page.tsx`).
- Intent kinds & Lois : `OPERATOR_AMEND_PILLAR` (`pillar-page.tsx:420`), `THOT_PAUSE_CAMPAIGN_FLAME_OUT`, `LAW_1_SILENT_REGRESSION`, « Loi 1/3/4 », « Cluster A/B », « L2 Instrumental Phase 19 », « Jaccard MVP » (`campaigns/[id]/tracker/page.tsx`).
- **Deep-links vers `/console/**` depuis des pages client** : `/console/fusee/glory` (`edit/page.tsx:193,199`) ; « Voir /console/governance/oracle-incidents pour le triage » dans un log d'erreur client (`proposition/page.tsx:210`).
- Langage dev : « Phase 17 mode PREVIEW … viendra dans un commit ultérieur » montré au client (`forge/page.tsx:643-646`) ; « persistée hash-chained dans IntentEmission » (`forge/page.tsx:644`) ; « DAG résolu », « les LLM tools manquants » (`forge/page.tsx:560,565`) ; « sha256 match » (`market-studies/page.tsx:217`).
- Empreinte OS sur le livrable lui-même : « Document genere par LaFusee Industry OS » (`deliverables/[key]/page.tsx:202`) — l'OS est censé être invisible.

> **Décision canon requise (borderline) :** `ADVE` / `RTIS` / lettres de piliers (A–S) sont omniprésents (`rtis/page.tsx:526` titre « RTIS — Risk, Track, Implementation, Strategy », `edit/page.tsx:123` « Editeur Fiche ADVE », `diagnostics/page.tsx:113`). C'est la *méthode vendue* — soit (a) on l'approuve comme vocabulaire client et on la glose une fois, soit (b) on mappe tout vers les noms business. Aujourd'hui c'est incohérent : `PILLAR_METADATA` a des noms FR (Risque/Tracking) mais les pages affichent les lettres brutes + de l'anglais. **« Overton »** = concept réel → gloser (P2). **Tiers APOGEE** (Latent…Culte/Icône) → « Culte » est le registre religieux à gloser.

---

## THÈME 2 — Surcharge cognitive / densité (P1)

- **Navigation** : ~30 destinations sur 11 groupes dans la sidebar (`portal-configs.ts:67-170`). Trop pour un founder.
- **Détail campagne** (`campaigns/[id]/page.tsx`, 2326 lignes) : **12 onglets à plat** (Vue d'ensemble, Actions, Exécutions, Équipe, Jalons, Budget, Briefs, Assets, AARRR, Terrain, Media, Rapports). L'onglet AARRR seul empile ~8 panneaux + 2 modales géantes (`:1310-1540`). Aucun regroupement, aucune divulgation progressive. **De plus, le stepper de pipeline 12 états le plus riche (`CampaignPipeline`) n'est PAS sur cette page** — il vit dans une modale de la liste ; la page de détail n'affiche qu'un `StateBadge` + des boutons à libellés bruts « READY TO LAUNCH ».
- **RTIS** (`rtis/page.tsx`, 1324 lignes) : workflow 5 phases + 4 panneaux détaillés (SWOT, TAM/SAM/SOM, matrice prob/impact, KPI dashboards, Overton, roadmap, sprint) sur une seule route.
- **Oracle** (`proposition/page.tsx`) : les 35 sections rendues en **un mur de grille non groupé** (`:445-472`), en plus du hero + 3 cartes de readiness + console d'assemblage + panel progressif + share + PDF.
- **Dashboard** (`page.tsx`) : ~7 sections empilées, aucun point focal, vue par défaut « MARKETING » qui montre tout (`:75,260`).
- **`CampaignDetailModal` morte** (~320 lignes) jamais rendue (`campaigns/page.tsx:73,336`) — surface dupliquée qui ne peut s'afficher.

---

## THÈME 3 — Architecture redondante / pas de taxonomie (P1)

- **4 surfaces « livrables » qui se chevauchent** : L'Oracle / Mes Livrables / Guidelines / Assets (+ Sources). « Mes Livrables » re-pointe vers Guidelines+Assets+Calendar comme « Raccourcis » et duplique le rôle PDF/share de l'Oracle (`deliverables/page.tsx:232-260`).
- **4 éditeurs de piliers** : `/rtis` (workflow + renderers inline) + `/brand/{diagnostic,market,potential,roadmap}` (composant `PillarPage`) + `/edit` (textarea **JSON brut** pour V/E/R/T/I/S — `edit/page.tsx:374-405`) + `/synthese`.
- **4 surfaces « actions »** : La Forge / Brief → Actions / Séquences / Campagnes — verbes qui se recoupent (forge onglet-2 duplique l'intention « armer un livrable » de Séquences).
- **2 trackers indifférenciés** : `operate/tracker` (global, AARRR terrain) vs `campaigns/[id]/tracker` (par campagne, trajectoire) — mêmes noms, aucun cross-link, pas de breadcrumb retour.
- **Demandes vs Messages** : périmètres flous + « Demandes » porte 3 noms (nav « Demandes », header « Demandes d'intervention », breadcrumb « Interventions »).

---

## THÈME 4 — États de données fabriqués / malhonnêtes (P1) — viole le canon « ne jamais inventer de données »

- **Dashboard** : Devotion Ladder affiche des pourcentages codés en dur 35/25/20/12/5/3 % quand il n'y a pas de données (`page.tsx:162-169`).
- **Benchmarks** : vecteurs par pilier synthétisés depuis une formule sur les codes de caractères (`benchmarks/page.tsx:93,102`) + distribution de classification codée en dur (`:113-122`). Pour une marque neuve = faux benchmarks confiants.
- **Diagnostics** : marque neuve → état alarmant « 8 piliers faibles » / radar effondré au centre au lieu d'un état vide (`diagnostics/page.tsx:84-96,244`).
- **Newsletter** : « Taux de délivrabilité = 100 % » codé en dur (`newsletter/page.tsx:196-201`).
- **Operations Center** : KPI hero « Campagnes Actives » toujours `trend="up"` (`operations-center.tsx:105`).
- **Forge** : checklist de validation stratégique tout-en-vert quelle que soit la réalité (`forge/page.tsx:351-364`).

---

## THÈME 5 — Onboarding / premier-run cassé (P1)

- **Cul-de-sac squelette perpétuel** : un founder sans aucune marque atterrit sur un `<SkeletonPage />` infini ; le dashboard retourne le skeleton quand `strategyId` est null (`page.tsx:128-130`) et le layout n'a aucun garde / redirect onboarding (`layout.tsx:33-55`). Aucun CTA « Créez votre première marque ».
- **Jargon dès le premier contact** : `/cockpit/new` montre « fiche de marque ADVE-RTIS » / « 8 piliers ADVE-RTIS » (`new/page.tsx:143,386`) + « Boot Sequence » (`:386`).
- **Le tour & la modale de bienvenue fuient** Mestor / Artemis / Ptah / « cascade ADVE→RTIS » (`portal-tour.tsx:51,63-65` ; `portal-welcome.tsx:50`).

---

## THÈME 6 — Fuite de rôle : surfaces opérateur/agence dans le portail client (P1)

- **Missions** expose au founder (le *client*) : commissions exécutants brut/net (`missions/page.tsx:828-835,1245-1270`), verdicts QC par pilier (`:874-882`), moteur de matching talents avec scores candidats (`:1477-1575`), « un reviewer sera automatiquement assigné selon le tier » (`:1587`). Ça ressemble à une surface Console/Crew.
- **Sources** expose la gouvernance : purge + re-ingest, niveaux de certitude OFFICIAL/DECLARED/INFERRED, « réinitialiser les piliers A/D/V/E » (`sources/page.tsx:837,910-913`).
- **Pages piliers** : « Action reservee aux operateurs », tooltips Intent kinds, « Recalculer » opérateur (`pillar-page.tsx:265,420`).

---

## THÈME 7 — Routes orphelines / promesses fausses (P0–P1)

- **Orphelines** (live, joignables par URL, absentes de la nav, liées de nulle part) : `insights/apogee-maintenance`, `intelligence/track`, `intelligence/market-studies` ; `campaigns/[id]/tracker` (pas de breadcrumb retour).
- **`apogee-maintenance`** rend en plus le `last.summary` brut du handler contenant des tokens de debug `drift=-7` directement au client (`apogee-maintenance-dashboard.tsx:166`, `apogee-maintenance/page.tsx:44`).
- **Promesses fausses** : boutons « PDF » des Rapports qui produisent du `.txt`/`.html` (`reports/page.tsx:264-274`) ; bouton « Lancer la production » de la Forge qui ne fait qu'un PREVIEW jamais dispatché (`forge/page.tsx:643-646`).
- **Settings** quasi cul-de-sac : nom/email/rôle + langue + déconnexion seulement ; pas de billing/abonnement, pas de prefs notif (`settings/page.tsx:32-98`).

> **NB — aucun des « stubs » de 3–7 lignes n'est mort.** Les 8 pages piliers, jehuty, notoria, calendar, action-brief, roadmap, sequences délèguent toutes à de vrais composants. `/brand/strategy` est un redirect 308 → roadmap. Les seuls vrais cul-de-sac sont les routes orphelines ci-dessus + le squelette d'onboarding.

---

## THÈME 8 — Cohérence & polish (P2/P3, omniprésent)

- **Tokens DS violés** (interdit #2) : classes Tailwind couleur brutes (`bg-white`, `text-white`, `bg-emerald-400`, `border-zinc-500`, `text-[9px]`) — **109 occurrences rien que dans les 2 fichiers campagnes** ; aussi operations-center (×8), hex codés en dur (`pillar-page.tsx:496,502`), sources, assets, guidelines, newsletter, tracker, reports.
- **Mix FR/EN** : « Operations Center », « Campaign Tracker », « Dashboard », « Boot Sequence », « Brand OS », « Guild OS », « KPI Dashboard », « Mission Statement », « Origin Myth », libellés métriques « Clicks/Reach/Views/Engagements ».
- **Accents FR manquants** — aléatoire par fichier : command-palette, map breadcrumb, `/new`, missions, requests, messages, insights = dé-accentués (« Parametres », « Deconnexion », « Metriques », « Genere », « Selectionner ») ; settings/notoria/artemis = accentués.
- **CTA primaires basse lisibilité** : pattern `bg-white text-foreground-muted hover:bg-foreground` (texte gris atténué sur fond blanc) omniprésent (`campaigns/page.tsx:201`, `briefs/page.tsx:469`, `assets/page.tsx:210`…).
- **`confirm()`/`alert()` natifs** au lieu des dialogs DS (`newsletter/page.tsx:154`, `proposition/page.tsx:496`, `portfolio/[corporateSlug]/page.tsx:59`).
- **Saisie d'ID bruts** au lieu de pickers : « coller un User ID » (`campaigns/[id]/page.tsx:751`), « ID Campagne » (`missions/page.tsx:1378`).
- **Hovers morts** : `hover:border-border` = identique à la base (`campaigns/page.tsx:337`, `reports/page.tsx:197,220`).
- **a11y** : statut par couleur seule, boutons icône-only sans `aria-label`, onglets sans rôles ARIA tablist (`campaigns/[id]/page.tsx:186`), emoji comme libellés sémantiques (`portfolio/[corporateSlug]/page.tsx:284`).
- **Devises incohérentes** dans un même workflow : `XAF` vs `FCFA` vs `$`/USD (`forge/page.tsx:487,622` ; `roadmap-calendar-panel.tsx:132`).
- **Liens internes en `<a href>`** (rechargement complet) au lieu de `<Link>` (`page.tsx:491`, `strategy-context.tsx:98`).

---

## Ce qui est déjà bon (à préserver / généraliser)

- `EmptyState` partagé réutilisé (18 pages) avec icône/titre/CTA.
- **États de readiness honnêtes** sur les surfaces récentes : `OvertonPanel`/`CommunityPanel` (TIER_GATE_DENIED + CTA upgrade + garde `hasAnyData` anti-faux-zéro), `overton-radar.tsx` (a11y exemplaire : `role="img"` + `<title>`/`<desc>` + table `sr-only`).
- `operate-config.ts` = source unique des 12 états (labels FR, couleurs, gates, step index) — **le bon pattern** (le bug = la page détail le bypasse).
- `CampaignPipeline` = excellent stepper (état courant + prérequis gate + confirmation) — à promouvoir sur la page détail.
- Garde-fous destructifs forts : taper le nom de la marque pour confirmer une purge (`sources/page.tsx:897`), `ConfirmDialog`.
- Squelettes de chargement réels partout (pas de flashs blancs).
- Parité manual-first / DEFERRED honnête quand l'IA est indisponible (panels brief/roadmap/sequences récents).

---

## Roadmap de remédiation (proposée, par ROI)

**Lot 0 — Décision canon (bloquant, ~30 min de ta part)**
Trancher : (a) `ADVE`/`RTIS`/lettres de piliers — vocabulaire client approuvé (à gloser) OU interne (à mapper) ? (b) Tiers APOGEE (« Culte »/« Icône ») — gardés ou glosés ? (c) « Overton » — gardé avec gloss ?

**Lot 1 — Sweep anti-fuite (P0, le plus gros impact)**
1. Couche de mapping « code → libellé client » centralisée pour : noms de gouverneurs (Mestor→« Assistant », Notoria/Jehuty→« Recommandations »/« La Gazette », Tarsis→« veille sectorielle », Ptah/Anubis/Imhotep/Seshat→rôles métier), `BrandAsset.kind`, `sequenceKey`, `sourceType`, enums d'état.
2. Renommer les 2 items de nav (Notoria, Jehuty) + le dock global + breadcrumb map + command-palette sections + portal-switcher + tour + welcome.
3. Purger : « Le Messie »/« Compétences Divines », « (GLORY) », « NETERU » footer, refs ADR, Intent kinds, « Loi N », deep-links `/console/**`, langage dev (PREVIEW/DAG/hash-chained/sha256).
4. Réécrire entièrement `campaigns/[id]/tracker` (pire surface) en registre client, ou la gater.

**Lot 2 — Densité & IA**
5. Regrouper les 12 onglets campagne en 3–4 buckets + divulgation progressive ; remonter `CampaignPipeline` en tête. 6. Grouper les 35 sections Oracle par tier/accordéon. 7. Consolider la taxonomie : 1 hub Livrables, 1 surface pilier canonique (démôter les autres ou les scoper opérateur), clarifier le flux Brief→Actions→Forge→Campagne. 8. Alléger le dashboard (point focal + « prochaine action »).

**Lot 3 — Honnêteté des données & onboarding**
9. Remplacer toutes les données fabriquées par des `EmptyState` honnêtes (devotion, benchmarks, diagnostics, délivrabilité, trend, checklist forge). 10. Garde zéro-strategy → CTA « Créez votre première marque ». 11. Gater les surfaces opérateur/agence hors du cockpit (commissions, QC, matching, purge/gouvernance).

**Lot 4 — Routes & polish**
12. Câbler ou supprimer les routes orphelines ; corriger les promesses fausses (PDF, forge dispatch). 13. Étoffer Settings (billing/abonnement/notifs). 14. Dette de cohérence : codemod tokens DS, passe d'accents FR, FR/EN, pickers au lieu d'ID bruts, dialogs DS au lieu de natifs, `<Link>`.

---

## Annexe — Couverture

8 clusters audités, 50 pages + shell + composants `components/cockpit/**` lus intégralement (pages lourdes : campaigns/[id] 2326, missions 1844, rtis 1324, sources 973, briefs 864, campaigns 841, assets 752, forge 702, dashboard 639). Audit statique (UX/contenu/IA) — pas d'exécution de l'app, pas de revue de correction de code. Les concerns de gouvernance/rôle serveur sont signalés comme risques à vérifier côté backend.
