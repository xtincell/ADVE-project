# MATRICE DE PARITÉ — legacy → v7 (contrat de complétion)

> Générée mécaniquement le 2026-07-02. **Règle : le rebuild n'est FINI que quand chaque ligne est PORTÉ, FUSIONNÉ (équivalent v7 à autre URL) ou OBSOLÈTE (justifié).** Chaque agent qui porte met à jour ses lignes dans sa PR. Board : docs/REBUILD-PLAN.md.

Legacy : 253 pages · 112 routers tRPC · 115 services — v7 au 2026-07-02 (vague 3) : 74 pages.

| Route legacy | Groupe | Statut |
|---|---|---|
| //agency | (agency) | FUSIONNÉ → /espace-agence (dashboard flotte : compteurs santé + compteurs production vivants, onglets, WP-018) |
| //agency/campaigns | (agency) | FUSIONNÉ → /espace-agence/campagnes (cross-flotte : statuts, marchés, budget = total réel des coûts d'actions PAR DEVISE, « à estimer » compté, WP-018) |
| //agency/clients | (agency) | FUSIONNÉ → /espace-agence/clients (un client = un workspace BRAND de la flotte : score, palier, abonnement dérivé finance.ts, dernière activité AuditLog, WP-018) |
| //agency/clients/[clientId] | (agency) | FUSIONNÉ → /espace-agence/clients/[id] (fiche tenancy-gated : marques, campagnes + budgets, missions en cours, derniers paiements, WP-018) |
| //agency/commissions | (agency) | FUSIONNÉ → /espace-agence/revenus § « Commissions talents » (ordres `TalentPayout` RÉELS générés par les missions Guilde validées de la flotte : compteurs par statut, commissions générées/encaissées et net talents dû PAR DEVISE — jamais additionnées ; la génération est automatique à la validation et le paiement est opérateur → /admin/commissions, WP-024) |
| //agency/contracts | (agency) | À PORTER (P3 — suivi des contrats clients de la flotte ; pas de table v7) |
| //agency/intake | (agency) | OBSOLÈTE — la création de clients PAR l'agence contredit le modèle v7 (intake public + rattachement par membership) ; la file des leads vit sur /admin/leads |
| //agency/knowledge | (agency) | À PORTER (P3 — base de connaissance marché ; pas de table v7) |
| //agency/messages | (agency) | À PORTER (P2 — messagerie interne vue agence ; pas de table v7, WhatsApp-first en attendant) |
| //agency/missions | (agency) | FUSIONNÉ → /espace-agence/missions (cross-flotte groupée par étape du circuit OPEN→…→VALIDATED, provenance campagne→action, candidatures guilde en attente COMPTÉES depuis MissionApplication ; priorité/SLA legacy sans colonnes v7 = non montrés, WP-018) |
| //agency/revenue | (agency) | FUSIONNÉ → /espace-agence/revenus (paiements `confirmed` réels par mois/devise ventilés par client + MRR simple = paiements encaissés des abos actifs normalisés 30 j, non-dérivable → ligne `unresolved`, WP-018 ; commissions talents RÉELLES depuis WP-024 — cf. ligne //agency/commissions) |
| //agency/signals | (agency) | À PORTER (P3 — signaux marché vue flotte ; pas de table Signal v7) |
| //forgot-password | (auth) | PORTÉ → /mot-de-passe-oublie (demande par email, réponse identique compte existant ou non — anti-énumération ; SANS provider email v7 le comportement est honnête : lien généré (token SHA-256 en base, TTL 1 h, usage unique) TRANSMIS PAR L'OPÉRATEUR — file + émission manuelle du lien une-seule-fois dans /admin/utilisateurs, CTA WhatsApp côté demandeur ; OUTBOUND_EMAIL env-gated = résidu documenté, aucun fake envoi — WP-022) |
| //login | (auth) | FUSIONNÉ → /connexion (credentials + redirect ?next=, WP-003 ; le bouton Google legacy = post-launch) |
| //register | (auth) | FUSIONNÉ → /inscription (préremplissage lead ?lead= + conversion du diagnostic en socle ADVE, WP-004) |
| //reset-password | (auth) | PORTÉ → /reinitialiser/[token] (vérification hash/TTL/usage-unique, consommation ATOMIQUE anti-course, bcrypt 12, AuditLog chaîné `user.password_reset.*` ; le stockage legacy du token EN CLAIR sur User n'est pas reconduit ; invalidation des sessions ouvertes = résidu documenté — pas de rotation de version de session en v7, dit en clair dans l'UI — WP-022) |
| //cockpit | (cockpit) | FUSIONNÉ → /app (tableau de bord marque : score /200 + palier + bento 8 piliers + dérivation RTIS, WP-005 ; le feed de recos Mestor du Cult Dashboard est wipé) |
| //cockpit/brand/assets | (cockpit) | FUSIONNÉ → /app/vault (coffre `BrandAsset` tranche 4 : logos/couleurs/typos/documents/images STRUCTURÉS — value Json validée Zod par kind, palette rendue, CRUD transactionnel + AuditLog chaîné `vault.asset.*`, archive/restore ; upload binaire = résidu honnête `fileRef`, les liens font foi — WP-019) |
| //cockpit/brand/deliverables | (cockpit) | FUSIONNÉ → /app/exports (hub Deliverable + fraîcheur calculée, WP-016) |
| //cockpit/brand/deliverables/[key] | (cockpit) | FUSIONNÉ → /app/oracle (+ /app/oracle/print — seul kind au registre v7 ; le détail par kind suivra le registre) |
| //cockpit/brand/diagnostic | (cockpit) | FUSIONNÉ → /app/diagnostic (historique BrandScore + delta, breakdown piliers, actions dérivées des manques, WP-016) |
| //cockpit/brand/edit | (cockpit) | FUSIONNÉ → /app/pilier/[key] (éditeur par champ, WP-005) |
| //cockpit/brand/engagement | (cockpit) | FUSIONNÉ → /app/pilier/e (page pilier E, WP-005) |
| //cockpit/brand/guidelines | (cockpit) | FUSIONNÉ → /app/guidelines (charte dérivée DÉTERMINISTE à la lecture — jamais stockée : identité verbale = pilier E réel avec certitude par champ, identité visuelle + usages = coffre réel ; chaque section cite sa source ou déclare son manque, `domain/guidelines` pur testé — WP-019) |
| //cockpit/brand/identity | (cockpit) | FUSIONNÉ → /app/pilier/a (page pilier A, WP-005) + /app/vault (le versant identité VISUELLE — logos, palette, typographies — vit au coffre, WP-019) |
| //cockpit/brand/jehuty | (cockpit) | À PORTER (P3 — gazette stratégique éditorialisée des signaux ; dépend d'une future table Signal) |
| //cockpit/brand/market | (cockpit) | FUSIONNÉ → /app/pilier/t (page pilier T, WP-005) |
| //cockpit/brand/notoria | (cockpit) | FUSIONNÉ → /app/diagnostic (prochaines actions dérivées des manques, WP-016 ; le moteur de recos NETERU/batch derrière Notoria est wipé) |
| //cockpit/brand/offer | (cockpit) | FUSIONNÉ → /app/offre (vue thématique V, WP-016) |
| //cockpit/brand/positioning | (cockpit) | FUSIONNÉ → /app/positionnement (vue thématique A+D, WP-016) |
| //cockpit/brand/potential | (cockpit) | FUSIONNÉ → /app/pilier/i (page pilier I, WP-005) |
| //cockpit/brand/proposition | (cockpit) | FUSIONNÉ → /app/proposition (chaîne de promesses, WP-016) + /app/oracle (compilation, WP-006) |
| //cockpit/brand/roadmap | (cockpit) | FUSIONNÉ → /app/pilier/s (page pilier S, WP-005) |
| //cockpit/brand/rtis | (cockpit) | FUSIONNÉ → /app/rtis (dérivés + provenance + re-dérivation, WP-016) |
| //cockpit/brand/rtis/synthese | (cockpit) | FUSIONNÉ → /app/rtis/synthese (composition déterministe des 4 dérivés, WP-016) |
| //cockpit/brand/sources | (cockpit) | FUSIONNÉ → /app/revisions (esprit sources/history : timeline PillarRevision + chaîne de hash vérifiée, WP-016 ; upload de sources = pas de table v7, non porté) |
| //cockpit/brand/strategy | (cockpit) | FUSIONNÉ → /app/pilier/s (le legacy redirigeait déjà vers roadmap) |
| //cockpit/insights/apogee-maintenance | (cockpit) | OBSOLÈTE — vitrine des sentinelles/telemetry interne (Loi 4 APOGEE, cron sentinels) : échafaudage wipé |
| //cockpit/insights/attribution | (cockpit) | À PORTER (P3 — attribution signaux→actions côté marque ; pas de table Signal v7) |
| //cockpit/insights/benchmarks | (cockpit) | À PORTER (P1 — benchmarks sectoriels comparés à la marque ; pas de table v7) |
| //cockpit/insights/diagnostics | (cockpit) | FUSIONNÉ → /app/diagnostic (score composite + breakdown par pilier, WP-016) |
| //cockpit/insights/reports | (cockpit) | FUSIONNÉ → /app/diagnostic (historique BrandScore + deltas par pilier — l'essence des value reports, WP-016) |
| //cockpit/intelligence/community | (cockpit) | À PORTER (P1 — suivi superfans et santé communauté — cœur de la doctrine ; pas de table v7) |
| //cockpit/intelligence/market-studies | (cockpit) | À PORTER (P2 — ingestion d'études de marché tierces par la marque ; pas de table v7) |
| //cockpit/intelligence/overton | (cockpit) | À PORTER (P1 — état de la fenêtre d'Overton sectorielle — cœur de la doctrine ; pas de table v7) |
| //cockpit/intelligence/track | (cockpit) | À PORTER (P2 — trend tracker des 49 variables alimenté par les études ingérées) |
| //cockpit/messages | (cockpit) | À PORTER (P2 — messagerie interne marque↔agence ; pas de table v7, WhatsApp-first en attendant) |
| //cockpit/mestor | (cockpit) | OBSOLÈTE — feed de recommandations du Neteru Mestor : échafaudage de gouvernance wipé |
| //cockpit/new | (cockpit) | À PORTER (P2 — créer une marque supplémentaire dans le workspace ; le schéma v7 le permet (Workspace 1-N Brand), l'UI manque ; la boot sequence legacy est wipée) |
| //cockpit/operate/action-brief | (cockpit) | FUSIONNÉ → gate « transformer en brief » (/campagnes/[id]/action/[actionId], WP-008) |
| //cockpit/operate/briefs | (cockpit) | PORTÉ → /campagnes/[id]/brief/[briefId] (éditeur structuré + gate validation, WP-008) |
| //cockpit/operate/calendar | (cockpit) | OBSOLÈTE — projection calendrier des GloryOutputs (launch-timeline/content-calendar) : machinerie Glory wipée ; la planification réelle est statuée sur la ligne roadmap |
| //cockpit/operate/campaigns | (cockpit) | PORTÉ → /campagnes (WP-008) |
| //cockpit/operate/campaigns/[id] | (cockpit) | PORTÉ → /campagnes/[id] (WP-008) |
| //cockpit/operate/campaigns/[id]/tracker | (cockpit) | FUSIONNÉ → /campagnes/[id] (statuts d'actions + coûts réels par devise, WP-008 ; la télémétrie burn/tier/kill-state ADR-0052 est wipée) |
| //cockpit/operate/center | (cockpit) | FUSIONNÉ → /campagnes + /missions (production par marque : pipeline à gates + vue circuit, WP-008) |
| //cockpit/operate/forge | (cockpit) | FUSIONNÉ → /campagnes (la forge actions→projets/livrables = gates « transformer en brief » / « éclater en missions » / ouverture guilde, WP-008/011 ; la compose Oracle = /app/oracle) |
| //cockpit/operate/missions | (cockpit) | PORTÉ → /missions (vue circuit) + /campagnes/[id]/mission/[missionId] (gates, WP-008) |
| //cockpit/operate/newsletter | (cockpit) | À PORTER (P3 — newsletter de la marque : abonnés, envois, stats ; pas de table v7) |
| //cockpit/operate/requests | (cockpit) | À PORTER (P2 — demandes d'intervention client→agence avec SLA ; pas de table v7) |
| //cockpit/operate/roadmap | (cockpit) | À PORTER (P2 — timeline auto + ajustable des actions retenues (zéro LLM) ; à re-poser sur CampaignAction) |
| //cockpit/operate/sequences | (cockpit) | OBSOLÈTE — lanceur de séquences Glory (arm/execute gouverné) : machinerie Artemis wipée |
| //cockpit/operate/tracker | (cockpit) | FUSIONNÉ → /campagnes (+ /missions vue circuit) — le suivi opérationnel vit sur les pages campagne/mission v7, WP-008 |
| //cockpit/portfolio | (cockpit) | OBSOLÈTE — arbre BrandNode Phase 18 (hiérarchies corporate) : échafaudage wipé, la flotte v7 à plat workspace→marques couvre le besoin |
| //cockpit/portfolio/[corporateSlug] | (cockpit) | OBSOLÈTE — détail d'un nœud de l'arbre BrandNode Phase 18 wipé (cf. ligne portfolio) |
| //cockpit/settings | (cockpit) | FUSIONNÉ → /reglages (nom, email re-vérifié par mot de passe, mot de passe bcrypt 12, espaces & rôles réels, session — mutations auditées `user.profile.update`/`user.email.change`/`user.password.change` ; « déconnexion partout » = résidu honnête affiché (JWT stateless, pas de rotation de version de session), WP-022) |
| //console | (console) | FUSIONNÉ → /admin (vue d'ensemble, 8 compteurs vivants) |
| //console/academie | (console) | FUSIONNÉ → /studio/academie (la page legacy était une pure redirection vers arene/academie — même sort, WP-020) |
| //console/academie/boutique | (console) | OBSOLÈTE — stub de redirection vers /console/arene/academie/boutique (alias sans fonction propre ; la fonction est statuée sur la ligne arene) |
| //console/academie/certifications | (console) | OBSOLÈTE — stub de redirection vers /console/arene/academie/certifications (alias sans fonction propre ; la fonction est statuée sur la ligne arene) |
| //console/academie/content | (console) | FUSIONNÉ → /blog (« The Upgrade » éditorial : la page legacy n'était qu'un EmptyState à zéro contenu ; l'éditorial réel = 6 articles statiques portés WP-014) |
| //console/academie/courses | (console) | FUSIONNÉ → /studio/academie (les 4 cours réellement seedés deviennent des modules statiques code-first — l'admin CRUD de cours n'a pas de table v7, le contenu s'édite en code, WP-020) |
| //console/anubis | (console) | OBSOLÈTE — hub du Neteru Anubis (liens + compteurs) ; les fonctions réelles sont statuées sur leurs lignes propres |
| //console/anubis/api-billing | (console) | OBSOLÈTE — facturation des clés API MCP externes : infra MCP wipée, v7 n'expose pas d'API externe |
| //console/anubis/blog | (console) | À PORTER (P3 — CMS du blog en base (créer/publier/dépublier) ; v7 sert 6 articles statiques, WP-014) |
| //console/anubis/credentials | (console) | OBSOLÈTE — UI de credentials/connecteurs : doctrine v7 = secrets uniquement en variables d'environnement |
| //console/anubis/crm | (console) | À PORTER (P2 — CRM contacts : tags, opt-in, relances ; pas de table v7) |
| //console/anubis/mcp | (console) | OBSOLÈTE — gestion des serveurs MCP inbound/outbound + manifest agrégé : infra wipée |
| //console/anubis/notifications | (console) | À PORTER (P3 — notifications produit et préférences par canal ; pas de table v7) |
| //console/arene/academie | (console) | FUSIONNÉ → /studio/academie (hub Académie côté créateur : catalogue réel du seed legacy porté en modules statiques, leçons au corps réel ouvertes, autres « en cours de migration » ; compteurs admin de cours sans table v7 — WP-020) |
| //console/arene/academie/boutique | (console) | À PORTER (P3 — boutique académie : vente de playbooks/templates ; pas de table BoutiqueItem v7) |
| //console/arene/academie/certifications | (console) | À PORTER (P3 — certifications ADVE des talents ; pas de table certification/enrollment v7) |
| //console/arene/academie/content | (console) | FUSIONNÉ → /blog (« The Upgrade » : EmptyState legacy sans table dédiée ; l'éditorial réel vit au blog statique WP-014) |
| //console/arene/academie/courses | (console) | FUSIONNÉ → /studio/academie (le catalogue seedé = 5 modules dont « Études de cas » ; leçons sans corps legacy affichées « à migrer », rien d'inventé — WP-020) |
| //console/arene/club | (console) | À PORTER (P3 — club de fidélité des marques clientes ; pas de table v7) |
| //console/arene/events | (console) | À PORTER (P3 — gestion des événements communauté ; pas de table v7) |
| //console/arene/guild | (console) | FUSIONNÉ → /admin/talents (registre RÉEL des TalentProfile cross-flotte : marché, compétences, tarif indicatif, dispo/visibilité, candidatures/missions comptées ; le tier APPRENTI→ASSOCIE et le vecteur ADVERTIS legacy n'ont pas de colonnes v7 — non montrés, WP-020) |
| //console/arene/matching | (console) | FUSIONNÉ → /admin/talents (file des candidatures) + page mission côté marque (WP-011) — le matching v7 est une DÉCISION HUMAINE sur candidatures (doctrine anti premier-arrivé) ; le moteur de matching auto legacy n'est pas reconduit |
| //console/arene/missions-guilde | (console) | FUSIONNÉ → /admin/talents (candidatures cross-flotte) — la modération legacy visait le DÉPÔT PUBLIC de missions, qui n'existe pas en v7 : le mur se publie par la marque (gate openToGuild, WP-011), il n'y a rien à modérer |
| //console/arene/orgs | (console) | À PORTER (P3 — collectifs/studios de talents ; pas de table v7) |
| //console/arene/social-audit | (console) | À PORTER (P1 — relevés followers + connecteurs sociaux : la donnée qui alimente le suivi superfans ; pas de table v7) |
| //console/artemis | (console) | OBSOLÈTE — hub du Neteru Artemis ; sections statuées sur leurs lignes propres |
| //console/artemis/campaigns | (console) | FUSIONNÉ → /admin/campagnes (vue cross-workspace réelle : marque, marché, statut, actions dont briefées, missions par étape, budget par devise + « à estimer » compté — WP-020) |
| //console/artemis/campaigns/[id]/postmortem | (console) | À PORTER (P3 — postmortem structuré 12 questions d'une campagne close) |
| //console/artemis/drivers | (console) | À PORTER (P3 — activation des canaux (drivers) par marque ; pas de table v7) |
| //console/artemis/interventions | (console) | À PORTER (P2 — file admin des demandes d'intervention ; même table à créer que cockpit/operate/requests) |
| //console/artemis/media | (console) | À PORTER (P3 — suivi achat média par marque ; pas de table v7) |
| //console/artemis/missions | (console) | FUSIONNÉ → /admin/campagnes (missions comptées par étape du circuit, cross-workspace, WP-020) + /espace-agence/missions (vue groupée par étape sur la flotte, WP-018) |
| //console/artemis/oracle-catalog | (console) | OBSOLÈTE — catalogue « quelle séquence Glory produit quelle section Oracle » : machinerie Glory wipée, le registre v7 des kinds vit au code (WP-006) |
| //console/artemis/pr | (console) | FUSIONNÉ → /app/vault (les assets presse sont des documents structurés du coffre, WP-019) |
| //console/artemis/scheduler | (console) | OBSOLÈTE — scheduler de process internes (start/pause/stop) : échafaudage wipé |
| //console/artemis/skill-tree | (console) | OBSOLÈTE — arbre des 40 séquences Glory/Artemis (tiers, combos, prérequis) : machinerie wipée |
| //console/artemis/social | (console) | À PORTER (P2 — performance sociale par marque : tendances followers ; même socle de données que social-audit) |
| //console/artemis/tools | (console) | OBSOLÈTE — exécuteur des 46 Glory tools : machinerie wipée |
| //console/artemis/vault | (console) | OBSOLÈTE — revue accept/reject des outputs de séquences Glory wipées |
| //console/audit/campaigns/[id] | (console) | OBSOLÈTE — audit compliance + negative-space cross-Neteru (manifests, IntentEmission) : échafaudage wipé |
| //console/config | (console) | OBSOLÈTE — hub de liens config ; sections statuées sur leurs lignes propres |
| //console/config/integrations | (console) | OBSOLÈTE — registre d'intégrations stocké en McpServerConfig : wipé ; v7 = secrets env, rails momo = WP post-launch |
| //console/config/system | (console) | OBSOLÈTE — config système via table MCP wipée ; santé/journal = /admin/audit, paramètres = env |
| //console/config/templates | (console) | OBSOLÈTE — coquille statique (4 catégories à 0 template, aucune donnée) ; les briefs v7 sont structurés par l'éditeur (WP-008) |
| //console/config/thresholds | (console) | À PORTER (P3 — seuils métier éditables (alertes ADVE, SLA, promotion) ; à seeder en référentiel, jamais en dur) |
| //console/config/variables | (console) | À PORTER (P3 — annuaire documentaire des 47 variables de la bible ; l'éditeur /app/pilier/[key] affiche déjà labels et aides) |
| //console/ecosystem | (console) | FUSIONNÉ → /admin (compteurs vivants cross-workspace, WP-007/015) |
| //console/ecosystem/metrics | (console) | FUSIONNÉ → /admin (8 compteurs vivants ; talents/candidatures = /admin/talents) |
| //console/ecosystem/operators | (console) | OBSOLÈTE — réseau d'opérateurs licenciés : modèle multi-opérateur legacy sans objet v7 (une flotte = memberships) |
| //console/ecosystem/scoring | (console) | FUSIONNÉ → /admin/marques (score + palier par marque, cross-workspace) |
| //console/fusee/campaigns | (console) | FUSIONNÉ → /admin/campagnes (doublon legacy du panneau artemis/campaigns — même sort, WP-020) |
| //console/fusee/drivers | (console) | OBSOLÈTE — stub de redirection vers /console/artemis/drivers (alias sans fonction propre) |
| //console/fusee/glory | (console) | OBSOLÈTE — stub de redirection vers /console/artemis/tools (alias sans fonction propre) |
| //console/fusee/interventions | (console) | OBSOLÈTE — stub de redirection vers /console/artemis/interventions (alias sans fonction propre) |
| //console/fusee/media | (console) | OBSOLÈTE — stub de redirection vers /console/artemis/media (alias sans fonction propre) |
| //console/fusee/missions | (console) | FUSIONNÉ → /admin/campagnes (doublon legacy du panneau artemis/missions — même sort, WP-020) |
| //console/fusee/pr | (console) | OBSOLÈTE — stub de redirection vers /console/artemis/pr (alias sans fonction propre) |
| //console/fusee/scheduler | (console) | OBSOLÈTE — stub de redirection vers /console/artemis/scheduler (alias sans fonction propre) |
| //console/fusee/social | (console) | OBSOLÈTE — stub de redirection vers /console/artemis/social (alias sans fonction propre) |
| //console/governance/accounts | (console) | FUSIONNÉ → /admin/utilisateurs (+ fiche : memberships/rôles, activité via AuditLog ; la promotion de rôle legacy visait User.role global — le rôle v7 est par workspace, édition à venir avec sa mécanique) |
| //console/governance/campaign-tracker | (console) | OBSOLÈTE — registre des capability-states/lifecycles des clusters ADR-0052 : méta-gouvernance du chantier legacy wipée |
| //console/governance/campaign-tracker/overton-delta-manual | (console) | À PORTER (P2 — saisie manuelle du delta Overton par action de campagne ; colonne à ajouter à CampaignAction, manual-first conservé — le bus Intents derrière est wipé) |
| //console/governance/canon-sync | (console) | OBSOLÈTE — rustine de sync du canon UPgraders vers la prod via Pillar Gateway ; v7 édite les piliers en base directement |
| //console/governance/design-system | (console) | OBSOLÈTE — préviz DS interne + statut de drift : outillage anti-drift narratif wipé |
| //console/governance/error-vault | (console) | OBSOLÈTE — collecteur d'erreurs runtime interne : telemetry interne wipée, l'observabilité v7 vit hors app (Coolify/logs) |
| //console/governance/intents | (console) | FUSIONNÉ → /admin/audit (l'AuditLog hash-chaîné remplace le bus Intents : journal filtrable action/chaîne/dates + vérification d'intégrité par recalcul des selfHash) |
| //console/governance/markets | (console) | FUSIONNÉ → /admin/referentiels (CRUD Country audité ; le kill-switch freeze/shadowban n'a pas d'équivalent schéma v7 — à re-statuer si le besoin revient) |
| //console/governance/model-policy | (console) | OBSOLÈTE — registre gouverné purpose→model chaîné aux IntentEmission : bus wipé, v7 configure ses providers par env (WP-010) |
| //console/governance/oracle-incidents | (console) | OBSOLÈTE — moniteur d'incidents groupés par gouverneur Neteru : échafaudage wipé |
| //console/governance/phase-18-residuals | (console) | OBSOLÈTE — formulaire des résidus du chantier Phase 18 legacy : sans objet en v7 |
| //console/imhotep | (console) | FUSIONNÉ → /admin/talents (compteurs et liste talents/candidatures ; QC et formation statués sur leurs lignes propres) |
| //console/messages | (console) | À PORTER (P2 — messagerie interne vue opérateur ; pas de table v7) |
| //console/mestor | (console) | OBSOLÈTE — hub du Neteru Mestor (gouvernance) : échafaudage wipé |
| //console/mestor/insights | (console) | OBSOLÈTE — insights générés par le bus Mestor wipé |
| //console/mestor/plans | (console) | OBSOLÈTE — plans générés par le bus Mestor wipé |
| //console/mestor/recos | (console) | OBSOLÈTE — recommandations du bus Mestor wipé |
| //console/operate/africa-portfolio | (console) | FUSIONNÉ → /admin/exports (l'essence checklist livrables cross-flotte : statut persisté + fraîcheur RECALCULÉE, sections insuffisantes comptées, couverture marques — la matrice RAG/SKU×pays×langue legacy n'a pas de colonnes v7, non montrée, WP-020) |
| //console/operate/africa-portfolio/deliverable/[id] | (console) | À PORTER (P3 — détail livrable + tickets de modification (change requests) ; la vue liste est fusionnée vers /admin/exports) |
| //console/operate/morning-intake | (console) | À PORTER (P3 — extraction LLM du flux entrant matinal (mails/slack/whatsapp) vers drafts validés champ par champ) |
| //console/operations | (console) | FUSIONNÉ → /espace-agence/missions (missions cross-flotte + candidatures comptées, WP-018 ; décisions sur /campagnes/[id]/mission/[missionId], WP-011) |
| //console/oracle/compilation | (console) | FUSIONNÉ → /admin/exports (état de composition cross-flotte ; la composition elle-même reste une action explicite du cockpit /app/oracle, WP-006) |
| //console/seshat/argos | (console) | À PORTER (P3 — récolte et revue des dossiers de référence Argos ; /argos public v7 reste un teaser honnête) |
| //console/seshat/attribution | (console) | À PORTER (P3 — attribution et cohortes ; pas de table Signal v7) |
| //console/seshat/intelligence | (console) | À PORTER (P2 — veille signaux marché par sévérité ; pas de table Signal v7) |
| //console/seshat/jehuty | (console) | À PORTER (P3 — gazette stratégique mode agence ; même fonction que la ligne cockpit/brand/jehuty) |
| //console/seshat/knowledge | (console) | À PORTER (P3 — base de connaissance : benchmarks + patterns de briefs ; pas de table v7) |
| //console/seshat/market | (console) | À PORTER (P2 — études de marché + benchmarks sectoriels, vue opérateur ; pas de table v7) |
| //console/seshat/market-research | (console) | À PORTER (P2 — recherche marché LLM sourcée (URLs → étude structurée persistée)) |
| //console/seshat/market-studies | (console) | À PORTER (P2 — registre des études ingérées + ré-extraction ; pas de table v7) |
| //console/seshat/marketplace | (console) | À PORTER (P3 — bureau d'études : vagues, marges d'erreur, provenance des sources) |
| //console/seshat/search | (console) | À PORTER (P3 — recherche sémantique cross-marques) |
| //console/seshat/signals | (console) | À PORTER (P2 — ingestion et retraitement des signaux marché ; pas de table Signal v7) |
| //console/seshat/tarsis | (console) | À PORTER (P2 — veille concurrentielle par marque ; pas de table v7) |
| //console/signal/attribution | (console) | OBSOLÈTE — stub de redirection vers /console/seshat/attribution (alias sans fonction propre) |
| //console/signal/intelligence | (console) | OBSOLÈTE — stub de redirection vers /console/seshat/intelligence (alias sans fonction propre) |
| //console/signal/knowledge | (console) | OBSOLÈTE — stub de redirection vers /console/seshat/knowledge (alias sans fonction propre) |
| //console/signal/market | (console) | OBSOLÈTE — stub de redirection vers /console/seshat/market (alias sans fonction propre) |
| //console/signal/signals | (console) | OBSOLÈTE — stub de redirection vers /console/seshat/signals (alias sans fonction propre) |
| //console/signal/tarsis | (console) | OBSOLÈTE — stub de redirection vers /console/seshat/tarsis (alias sans fonction propre) |
| //console/socle/commissions | (console) | PORTÉ → /admin/commissions (table `TalentPayout` tranche 5, missionId UNIQUE : l'ordre naît À LA VALIDATION de la mission Guilde, dans la MÊME transaction que le flip DELIVERED→VALIDATED — brut = montant saisi par la marque au formulaire sinon dailyRate × jours dérivé (sinon refus honnête AMOUNT_REQUIRED), taux JAMAIS en dur : ZoneIndex famille "commission" clé guild.rate, seed 0.15 `placeholder-operator-to-confirm` (legacy n'avait AUCUN taux plat : commission-engine 25–40 % par tier talent, Hub-Escrow 20 %→8 %), brut/commission/net FIGÉS à la création ; file PENDING→APPROVED→PAID : l'opérateur paie en momo et saisit la référence (pattern /admin/paiements), totaux PAR DEVISE, flips atomiques, audit `payout.create|approve|reject|pay` chaîné dans le workspace payeur — WP-024) |
| //console/socle/contracts | (console) | À PORTER (P3 — contrats : création, suivi, échéances ; pas de table v7) |
| //console/socle/escrow | (console) | À PORTER (P3 — séquestre des missions guilde + arbitrage (essence ADR-0116 legacy) ; pas de table v7) |
| //console/socle/invoices | (console) | À PORTER (P3 — projection factures des commissions talents ; la table `TalentPayout` existe depuis WP-024, reste la projection facture/justificatif) |
| //console/socle/manual-subscriptions | (console) | FUSIONNÉ → /admin/paiements (file Valider/Rejeter, WP-007) + /admin/abonnements (cycle de vie cross-workspace, statuts dérivés finance.ts, filtres/échéances) |
| //console/socle/market-costs | (console) | FUSIONNÉ → /admin/referentiels (familles ZoneIndex cost-of-living & co, éditables, source obligatoire) |
| //console/socle/pipeline | (console) | À PORTER (P2 — pipeline commercial : conversion + prévision de revenus ; pas de table CRM v7) |
| //console/socle/pricing | (console) | FUSIONNÉ → /admin/referentiels (lignes ZoneIndex pricing éditables en base — nouvelle ligne validFrom = nouveau barème, mutation auditée ; remplace le barème seedé) |
| //console/socle/revenue | (console) | FUSIONNÉ → /espace-agence/revenus (paiements confirmés par mois/devise + MRR simple, WP-018) |
| //console/socle/transactions | (console) | FUSIONNÉ → /admin/paiements (file de validation + historique cross-workspace, WP-007/015) |
| //console/socle/value-reports | (console) | FUSIONNÉ → /app/diagnostic (historique BrandScore + deltas — essence des value reports, même statut que insights/reports, WP-016) |
| //console/strategy-operations/boot | (console) | OBSOLÈTE — boot sequence du « strategy vector » (pipeline LLM legacy) : wipé, la conversion v7 seed les piliers directement (WP-004) |
| //console/strategy-operations/boot/[sessionId] | (console) | OBSOLÈTE — suivi d'une session de boot sequence wipée (cf. ligne boot) |
| //console/strategy-operations/brief-ingest | (console) | À PORTER (P2 — créer une marque depuis un brief uploadé : extraction IA → preview → confirm ; l'exécution « hyperviseur » legacy est wipée) |
| //console/strategy-operations/ingestion | (console) | À PORTER (P2 — ingestion de sources (fichiers/texte) → propositions de piliers validées champ par champ) |
| //console/strategy-operations/intake | (console) | FUSIONNÉ → /admin/leads (file des leads + page résultat ; conversion via /inscription?lead=, WP-004/007 ; les onglets ingest/sources sont statués sur leurs lignes) |
| //console/strategy-portfolio/brands | (console) | FUSIONNÉ → /admin/marques (liste cross-workspace score/palier ; leads en attente = /admin/leads ; l'archivage n'a pas d'équivalent v7) |
| //console/strategy-portfolio/brands/[strategyId] | (console) | FUSIONNÉ → /admin/workspaces/[id] (fiche : marques, membres, abonnements, paiements, audit, WP-015) |
| //console/strategy-portfolio/clients | (console) | FUSIONNÉ → /admin/workspaces (le « client » v7 = workspace : liste + compteurs, WP-015) |
| //console/strategy-portfolio/clients/[strategyId] | (console) | FUSIONNÉ → /admin/workspaces/[id] (fiche workspace complète, WP-015) |
| //console/strategy-portfolio/diagnostics | (console) | FUSIONNÉ → /admin/marques (score + palier cross-marques ; le détail des piliers faibles vit sur /app/diagnostic) |
| //console/upgraders/economics | (console) | À PORTER (P3 — marges anonymisées par type d'activité + saturation équipe ; l'instrumentation ADR-0052 sous-jacente est wipée) |
| //creator | (creator) | FUSIONNÉ → /studio (hub créateur : profil talent, mur des missions, candidatures — WP-011) |
| //creator/community/events | (creator) | À PORTER (P3 — inscription des talents aux événements ; pas de table v7) |
| //creator/community/guild | (creator) | À PORTER (P3 — annuaire des membres de la guilde côté talent) |
| //creator/earnings/history | (creator) | FUSIONNÉ → /studio § « Mes gains » (ordres réels par statut : brut, commission Guilde au taux du référentiel, net, référence momo une fois payé, échéance « paiement manuel sous 72 h ouvrées » ; le groupement PAR MOIS du legacy viendra avec le volume — WP-024) |
| //creator/earnings/invoices | (creator) | À PORTER (P3 — factures/justificatifs des commissions payées) |
| //creator/earnings/missions | (creator) | FUSIONNÉ → /studio § « Mes gains » (une ligne par mission validée : titre, brut/commission/net, statut du circuit, référence de paiement — WP-024) |
| //creator/earnings/qc | (creator) | À PORTER (P3 — rémunération des revues QC effectuées) |
| //creator/learn/adve | (creator) | PORTÉ → /studio/academie/adve-fondamentaux (8 piliers question+pédagogie portés verbatim ; échelle des paliers RECÂBLÉE sur `domain/scoring` — le legacy affichait 5 paliers, le canon v7 en a 6 avec bornes réelles ; progression localStorage par appareil, WP-020) |
| //creator/learn/cases | (creator) | PORTÉ → /studio/academie/etudes-de-cas (les 3 cas d'école complets — contexte/défi/approche/application/résultats/enseignements — avec mention explicite « chiffres pédagogiques, pas des références client », WP-020) |
| //creator/learn/drivers | (creator) | PORTÉ → /studio/academie/maitriser-drivers (les 13 canaux réels + 4 familles, descriptions portées ; le seed annonçait « 20 canaux » — seuls les 13 documentés existent, rien d'ajouté, WP-020) |
| //creator/learn/resources | (creator) | OBSOLÈTE (hub de LIENS vers des surfaces legacy wipées — Glory tools, QC, séquences, forum ; aucun contenu propre à porter, l'apprentissage réel vit dans les modules Académie WP-020) |
| //creator/messages | (creator) | À PORTER (P2 — messagerie interne côté talent ; pas de table v7) |
| //creator/missions/active | (creator) | FUSIONNÉ → /studio (mes candidatures : acceptée = mission assignée, étape du circuit visible — WP-011) |
| //creator/missions/available | (creator) | FUSIONNÉ → /studio (mur des missions ouvertes à la Guilde, projection sans donnée de marque, candidature par pitch — WP-011) |
| //creator/missions/collab | (creator) | À PORTER (P3 — espace de collaboration d'équipe sur mission ; le legacy affichait des données simulées) |
| //creator/profile/drivers | (creator) | FUSIONNÉ → /studio (profil talent : compétences/canaux normalisés, WP-011) |
| //creator/profile/portfolio | (creator) | FUSIONNÉ → /studio (profil talent : lien portfolio — WP-011 ; upload d'assets = pas de table v7, non porté) |
| //creator/profile/skills | (creator) | FUSIONNÉ → /studio (profil talent : compétences normalisées, disponibilité/visibilité, tarif journalier indicatif — WP-011) |
| //creator/progress/metrics | (creator) | À PORTER (P3 — métriques de progression du talent ; dépend des revues QC) |
| //creator/progress/path | (creator) | À PORTER (P3 — parcours et paliers de promotion du talent) |
| //creator/progress/strengths | (creator) | À PORTER (P3 — forces par pilier dérivées des revues) |
| //creator/proposals | (creator) | FUSIONNÉ → /studio (candidatures envoyées + décisions envoyée/shortlistée/acceptée/déclinée — WP-011) |
| //creator/qc/peer | (creator) | À PORTER (P2 — revue qualité par les pairs des livrables de mission ; pas de table v7) |
| //creator/qc/submitted | (creator) | À PORTER (P3 — verdicts QC de mes livrables soumis) |
| //creator/services | (creator) | À PORTER (P3 — offres de services du talent (gigs) avec prix indicatif) |
| //intake | (intake) | PORTÉ (mécanique — à confirmer) |
| //intake/[token] | (intake) | À PORTER (P2 — questionnaire long par lien token avec reprise de session ; l'intake public v7 couvre le tronc, WP-004) |
| //intake/[token]/ingest | (intake) | À PORTER (P1 — diagnostic depuis documents uploadés : extraction IA → score, fallback questionnaire jamais bloquant) |
| //intake/[token]/ingest-plus | (intake) | À PORTER (P2 — variante documents + scan d'URL en ligne) |
| //intake/[token]/result | (intake) | PORTÉ → /intake/rapport/[token] (rapport ADVE complet : score global + par pilier, constat CHAMP PAR CHAMP (déclaré vs vide) sur les seules données du lead, 3 actions, méthode expliquée depuis les constantes canon `domain/scoring`, CTA conversion ; même page imprimable print CSS pattern /app/oracle/print — le narratif LLM legacy n'est PAS reconduit (doctrine déterministe) ; token JWT jose HS256 AUTH_SECRET 30 j scope `share.rapport`, lien « Voir le rapport complet » exposé sur /intake/resultat, lien mort → page morte propre, noindex — WP-023) |
| //intake/[token]/short | (intake) | À PORTER (P2 — diagnostic depuis texte collé (extraction IA)) |
| //launchpad/crew-bootstrap | (intake) | OBSOLÈTE — stub J10 Phase 18 : bootstrap d'une équipe nommée en dur ; la création réelle passait déjà par l'auth standard |
| //launchpad/portfolio-bulk-import | (intake) | OBSOLÈTE — wizard d'import CSV du Brand Tree Phase 18 wipé (cf. lignes portfolio) |
| //score | (intake) | PORTÉ → /intake/score (référence publique du score recâblée sur les constantes canon v7 : 6 paliers/bornes réelles, formule 15/7/3) + /intake/score/[leadId] (variante PARTAGEABLE du résultat — le modèle le permet : relecture `getLeadDiagnostic` par id, méta OG, zéro coordonnée, lien mort → redirect référence ; lien de partage exposé sur /intake/resultat, WP-017) |
| / | (marketing) | PORTÉ (mécanique — à confirmer) |
| //agence | (marketing) | PORTÉ (mécanique — à confirmer) |
| //blog | (marketing) | PORTÉ (mécanique — à confirmer) |
| //blog/[slug] | (marketing) | FUSIONNÉ → /blog/[slug] (article statique rendu markdown-lite XSS-safe, WP-014) |
| //contact | (marketing) | PORTÉ (mécanique — à confirmer) |
| //la-guilde | (marketing) | PORTÉ → /la-guilde (vitrine + compte RÉEL des missions ouvertes du mur, nombre seul — WP-011) |
| //lafusee | (marketing) | PORTÉ → /lafusee (vitrine PRODUIT : doctrine superfans×Overton, radar simulateur branché sur le vrai moteur `domain/scoring`, features réelles v7, paliers canon, CTA /intake — les métriques inventées du handoff non reprises, WP-017) |
| //landingintake | (marketing) | PORTÉ → /landingintake (landing d'acquisition courte : hero/constat/3 étapes/protocole ADVE copy réelle legacy + preuve STATS/CLIENT_STRIP canon + formulaire express → /intake — témoignages et compteurs sans source non repris, WP-017) |
| //methode | (marketing) | PORTÉ (mécanique — à confirmer) |
| //pricing | (marketing) | FUSIONNÉ → /tarifs (même grille par zone, source ZoneIndex ; le double habillage La Fusée/UPgraders n'est pas repris) |
| //realisations | (marketing) | PORTÉ (mécanique — à confirmer) |
| //services | (marketing) | PORTÉ (mécanique — à confirmer) |
| //tarifs | (marketing) | PORTÉ (mécanique — à confirmer) |
| //LaGuilde | (public) | FUSIONNÉ → /la-guilde (compteur public) + /studio (mur complet, connecté) — doctrine v7 anti-fuite ADR-0098 : pas de détail mission public |
| //LaGuilde/m/[slug] | (public) | OBSOLÈTE — détail public d'une mission : contredit la doctrine anti-fuite v7 (ADR-0098) déjà actée sur la ligne LaGuilde |
| //LaGuilde/publier | (public) | OBSOLÈTE — dépôt public de mission par une marque : remplacé par l'ouverture au mur depuis le workspace (WP-011), plus rien à modérer |
| //LaGuilde/rejoindre | (public) | FUSIONNÉ → /studio (création du profil talent : compétences, pays référentiel, tarif indicatif, portfolio — WP-011) |
| //LaGuilde/services | (public) | À PORTER (P3 — mur public des services/gigs des talents ; dépend de la ligne creator/services) |
| //argos | (public) | PORTÉ (mécanique — à confirmer) |
| //argos/[ref] | (public) | À PORTER (P3 — mur + détail des dossiers de référence Argos ; /argos v7 est un teaser honnête) |
| //cgu | (public) | PORTÉ (mécanique — à confirmer) |
| //cgv | (public) | PORTÉ (mécanique — à confirmer) |
| //changelog | (public) | PORTÉ (mécanique — à confirmer) |
| //dpa | (public) | PORTÉ (mécanique — à confirmer) |
| //mentions-legales | (public) | PORTÉ (mécanique — à confirmer) |
| //privacy | (public) | PORTÉ (mécanique — à confirmer) |
| //sla | (public) | PORTÉ (mécanique — à confirmer) |
| //status | (public) | PORTÉ (mécanique — à confirmer) |
| //trust-center | (public) | PORTÉ (mécanique — à confirmer) |
| //shared/strategy/[token] | (shared) | PORTÉ → /partage/oracle/[token] (partage public de l'Oracle : bouton « Partager » sur /app/oracle → token JWT jose HS256 AUTH_SECRET 30 j scope `share.oracle` {deliverableId, brandId} + AuditLog `deliverable.share` à chaque génération ; page read-only bandeau « Oracle partagé par <marque> · généré avec La Fusée », noindex, token expiré/falsifié → page morte propre ; le lien montre la DERNIÈRE composition (Deliverable upserté). Écart assumé vs legacy « révocable » : stateless sans table ⇒ NON révocable pendant 30 j, dit en clair dans l'UI du bouton — la révocation = nonce persistable, tranche future — WP-023) |
| /portals | root | FUSIONNÉ → /portails (hub role-aware des 3 espaces + console, session requise, WP-020) |
| /unauthorized | root | OBSOLÈTE — page 403 dédiée : le middleware v7 redirige (/connexion ou /app) et chaque espace rend son refus en page |

## Services & routers legacy (à statuer par cluster au fil des vagues)

```
advertis-connectors advertis-scorer ai-cost-tracker anubis approval-workflow artemis asset-tagger 
audit-trail auto-promotion board-export boot-sequence brand-node brand-vault brief-ingest 
budget-allocator bureau-etudes campaign-budget-engine campaign-canon campaign-change-request 
campaign-deliverable campaign-manager campaign-plan-generator campaign-tracker canon collab-doc 
commission-engine community-dashboard consulting country-registry creative-proposal crm-engine 
cross-validator cult-index-engine data-export deliverable-orchestrator demo-data devotion-engine 
diagnostic-engine driver-engine ecosystem-engine email error-vault escrow-arbitration feedback-loop 
feedback-processor financial-brain financial-engine financial-reconciliation founder-psychology 
glory-tools guidelines-renderer imhotep implementation-generator ingestion-pipeline intention 
jehuty knowledge-aggregator knowledge-capture knowledge-seeder llm-gateway market-cost 
market-intelligence market-lifecycle market-visibility matching-engine media-perf media-plan mestor 
mfa mission-quote mission-templates mobile-money model-policy monetization morning-batch 
neteru-shared notoria nsp oauth-integrations operator-action operator-isolation oracle-section 
payment-providers pillar-gateway pillar-maturity pillar-normalizer pillar-versioning 
pipeline-orchestrator playbook-capitalization process-scheduler production prompt-registry ptah 
qc-router quick-intake rtis-protocols sector-intelligence sentinel-handlers sequence-vault seshat 
seshat-bridge sla-tracker source-classifier staleness-propagator strategy-archive 
strategy-presentation talent-engine talent-services team-allocator tier-evaluator translation 
upsell-detector utils value-report-generator vault-enrichment 
```
## Synthèse triage 2026-07-02 (WP-021)

Triage exhaustif des 184 lignes restées « À PORTER » après les vagues 1-3 — dont 19 statuées en
parallèle par WP-020 (académie, /admin/talents·campagnes·exports) pendant le triage, et 3 couvertes
par WP-022 livré dans l'arbre (forgot/reset-password statuées PORTÉ par WP-022 vers
/mot-de-passe-oublie et /reinitialiser/[token] ; cockpit/settings fusionnée vers /reglages).
**253 lignes, zéro perte.** Doctrine appliquée : OBSOLÈTE = la page pilotait l'échafaudage wipé
(bus Intents/Neteru, Glory/séquences/skill-tree, Brand Tree Phase 18, telemetry interne, stubs de
redirection, multi-opérateurs licenciés…) ou duplique une capacité v7 sous un autre angle — jamais
« pas encore fait ». Toute fonction réelle manquante reste À PORTER, priorisée P1/P2/P3.

| Statut | Lignes |
|---|---|
| PORTÉ | 32 |
| FUSIONNÉ (équivalent v7 à autre URL) | 85 |
| OBSOLÈTE (justifié ligne par ligne) | 57 |
| À PORTER — P1 (valeur client directe) | 8 |
| À PORTER — P2 (opérations) | 28 |
| À PORTER — P3 (confort) | 43 |
| **Total** | **253** |

### Top 10 À PORTER (les 8 P1, puis les 2 P2 de tête — ordonnés)

> Post-triage : les n°1 et n°2 ont été **PORTÉS par WP-023**, le n°3 **PORTÉ par WP-024**
> (2026-07-02) — voir leurs lignes re-statuées ci-dessus. WP-024 a aussi FUSIONNÉ
> //agency/commissions et //creator/earnings/{history,missions}. Compte courant : PORTÉ 35 ·
> FUSIONNÉ 88 · À PORTER P1 5 (n°4-8) · P2 26 · P3 42. Le reste du top inchangé.

1. ~~**//shared/strategy/[token]** (P1)~~ — **PORTÉ (WP-023)** → /partage/oracle/[token].
2. ~~**//intake/[token]/result** (P1)~~ — **PORTÉ (WP-023)** → /intake/rapport/[token].
3. ~~**//console/socle/commissions** (P1)~~ — **PORTÉ (WP-024)** → /admin/commissions : la boucle guilde→mobile money est fermée (`TalentPayout` à la validation, taux du référentiel, file momo + référence).
4. **//cockpit/intelligence/community** (P1) — suivi superfans & santé communauté : le cœur de la doctrine (accumulation de superfans).
5. **//console/arene/social-audit** (P1) — relevés followers + connecteurs sociaux : la donnée qui alimente le n°4.
6. **//cockpit/intelligence/overton** (P1) — état de la fenêtre d'Overton sectorielle : l'autre moitié de la doctrine.
7. **//intake/[token]/ingest** (P1) — diagnostic depuis documents uploadés (extraction IA, fallback questionnaire) : accélérateur d'acquisition.
8. **//cockpit/insights/benchmarks** (P1) — benchmarks sectoriels comparés à la marque.
9. **//console/governance/campaign-tracker/overton-delta-manual** (P2, tête de file) — saisie manuelle du delta Overton par action : la mesure du KPI doctrinal, manual-first.
10. **//cockpit/operate/roadmap** (P2, tête de file) — timeline auto + ajustable des actions retenues : la réponse client à « on fait quoi, quand ».
