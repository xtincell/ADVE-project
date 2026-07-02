# MATRICE DE PARITÉ — legacy → v7 (contrat de complétion)

> Générée mécaniquement le 2026-07-02. **Règle : le rebuild n'est FINI que quand chaque ligne est PORTÉ, FUSIONNÉ (équivalent v7 à autre URL) ou OBSOLÈTE (justifié).** Chaque agent qui porte met à jour ses lignes dans sa PR. Board : docs/REBUILD-PLAN.md.

Legacy : 253 pages · 112 routers tRPC · 115 services — v7 au 2026-07-02 (vague 3) : 74 pages.

| Route legacy | Groupe | Statut |
|---|---|---|
| //agency | (agency) | FUSIONNÉ → /espace-agence (dashboard flotte : compteurs santé + compteurs production vivants, onglets, WP-018) |
| //agency/campaigns | (agency) | FUSIONNÉ → /espace-agence/campagnes (cross-flotte : statuts, marchés, budget = total réel des coûts d'actions PAR DEVISE, « à estimer » compté, WP-018) |
| //agency/clients | (agency) | FUSIONNÉ → /espace-agence/clients (un client = un workspace BRAND de la flotte : score, palier, abonnement dérivé finance.ts, dernière activité AuditLog, WP-018) |
| //agency/clients/[clientId] | (agency) | FUSIONNÉ → /espace-agence/clients/[id] (fiche tenancy-gated : marques, campagnes + budgets, missions en cours, derniers paiements, WP-018) |
| //agency/commissions | (agency) | À PORTER (pas de table Commission v7 — trou affiché en carte « à venir » sur /espace-agence/revenus, zéro chiffre, WP-018) |
| //agency/contracts | (agency) | À PORTER (pas de table contrat v7 — carte « à venir » sur /espace-agence) |
| //agency/intake | (agency) | À PORTER (l'intake v7 est public ; pas de création de client PAR l'agence tant que le rattachement agence→marque reste la membership) |
| //agency/knowledge | (agency) | À PORTER (pas de table base de connaissance v7) |
| //agency/messages | (agency) | À PORTER (pas de table messagerie v7) |
| //agency/missions | (agency) | FUSIONNÉ → /espace-agence/missions (cross-flotte groupée par étape du circuit OPEN→…→VALIDATED, provenance campagne→action, candidatures guilde en attente COMPTÉES depuis MissionApplication ; priorité/SLA legacy sans colonnes v7 = non montrés, WP-018) |
| //agency/revenue | (agency) | FUSIONNÉ → /espace-agence/revenus (paiements `confirmed` réels par mois/devise ventilés par client + MRR simple = paiements encaissés des abos actifs normalisés 30 j, non-dérivable → ligne `unresolved` ; commissions non portées — pas de table, WP-018) |
| //agency/signals | (agency) | À PORTER (pas de table de signaux v7) |
| //forgot-password | (auth) | À PORTER |
| //login | (auth) | À PORTER |
| //register | (auth) | À PORTER |
| //reset-password | (auth) | À PORTER |
| //cockpit | (cockpit) | À PORTER |
| //cockpit/brand/assets | (cockpit) | FUSIONNÉ → /app/vault (coffre `BrandAsset` tranche 4 : logos/couleurs/typos/documents/images STRUCTURÉS — value Json validée Zod par kind, palette rendue, CRUD transactionnel + AuditLog chaîné `vault.asset.*`, archive/restore ; upload binaire = résidu honnête `fileRef`, les liens font foi — WP-019) |
| //cockpit/brand/deliverables | (cockpit) | FUSIONNÉ → /app/exports (hub Deliverable + fraîcheur calculée, WP-016) |
| //cockpit/brand/deliverables/[key] | (cockpit) | FUSIONNÉ → /app/oracle (+ /app/oracle/print — seul kind au registre v7 ; le détail par kind suivra le registre) |
| //cockpit/brand/diagnostic | (cockpit) | FUSIONNÉ → /app/diagnostic (historique BrandScore + delta, breakdown piliers, actions dérivées des manques, WP-016) |
| //cockpit/brand/edit | (cockpit) | FUSIONNÉ → /app/pilier/[key] (éditeur par champ, WP-005) |
| //cockpit/brand/engagement | (cockpit) | FUSIONNÉ → /app/pilier/e (page pilier E, WP-005) |
| //cockpit/brand/guidelines | (cockpit) | FUSIONNÉ → /app/guidelines (charte dérivée DÉTERMINISTE à la lecture — jamais stockée : identité verbale = pilier E réel avec certitude par champ, identité visuelle + usages = coffre réel ; chaque section cite sa source ou déclare son manque, `domain/guidelines` pur testé — WP-019) |
| //cockpit/brand/identity | (cockpit) | FUSIONNÉ → /app/pilier/a (page pilier A, WP-005) + /app/vault (le versant identité VISUELLE — logos, palette, typographies — vit au coffre, WP-019) |
| //cockpit/brand/jehuty | (cockpit) | À PORTER (feed Jehuty — pas de table v7) |
| //cockpit/brand/market | (cockpit) | FUSIONNÉ → /app/pilier/t (page pilier T, WP-005) |
| //cockpit/brand/notoria | (cockpit) | À PORTER (recommandations Notoria — pas de table v7) |
| //cockpit/brand/offer | (cockpit) | FUSIONNÉ → /app/offre (vue thématique V, WP-016) |
| //cockpit/brand/positioning | (cockpit) | FUSIONNÉ → /app/positionnement (vue thématique A+D, WP-016) |
| //cockpit/brand/potential | (cockpit) | FUSIONNÉ → /app/pilier/i (page pilier I, WP-005) |
| //cockpit/brand/proposition | (cockpit) | FUSIONNÉ → /app/proposition (chaîne de promesses, WP-016) + /app/oracle (compilation, WP-006) |
| //cockpit/brand/roadmap | (cockpit) | FUSIONNÉ → /app/pilier/s (page pilier S, WP-005) |
| //cockpit/brand/rtis | (cockpit) | FUSIONNÉ → /app/rtis (dérivés + provenance + re-dérivation, WP-016) |
| //cockpit/brand/rtis/synthese | (cockpit) | FUSIONNÉ → /app/rtis/synthese (composition déterministe des 4 dérivés, WP-016) |
| //cockpit/brand/sources | (cockpit) | FUSIONNÉ → /app/revisions (esprit sources/history : timeline PillarRevision + chaîne de hash vérifiée, WP-016 ; upload de sources = pas de table v7, non porté) |
| //cockpit/brand/strategy | (cockpit) | FUSIONNÉ → /app/pilier/s (le legacy redirigeait déjà vers roadmap) |
| //cockpit/insights/apogee-maintenance | (cockpit) | À PORTER (sentinelles APOGEE — pas de table v7) |
| //cockpit/insights/attribution | (cockpit) | À PORTER (signaux/attribution — pas de table v7) |
| //cockpit/insights/benchmarks | (cockpit) | À PORTER (benchmarks sectoriels — pas de table v7) |
| //cockpit/insights/diagnostics | (cockpit) | FUSIONNÉ → /app/diagnostic (score composite + breakdown par pilier, WP-016) |
| //cockpit/insights/reports | (cockpit) | FUSIONNÉ → /app/diagnostic (historique BrandScore + deltas par pilier — l'essence des value reports, WP-016) |
| //cockpit/intelligence/community | (cockpit) | À PORTER |
| //cockpit/intelligence/market-studies | (cockpit) | À PORTER |
| //cockpit/intelligence/overton | (cockpit) | À PORTER |
| //cockpit/intelligence/track | (cockpit) | À PORTER |
| //cockpit/messages | (cockpit) | À PORTER |
| //cockpit/mestor | (cockpit) | À PORTER |
| //cockpit/new | (cockpit) | À PORTER |
| //cockpit/operate/action-brief | (cockpit) | FUSIONNÉ → gate « transformer en brief » (/campagnes/[id]/action/[actionId], WP-008) |
| //cockpit/operate/briefs | (cockpit) | PORTÉ → /campagnes/[id]/brief/[briefId] (éditeur structuré + gate validation, WP-008) |
| //cockpit/operate/calendar | (cockpit) | À PORTER |
| //cockpit/operate/campaigns | (cockpit) | PORTÉ → /campagnes (WP-008) |
| //cockpit/operate/campaigns/[id] | (cockpit) | PORTÉ → /campagnes/[id] (WP-008) |
| //cockpit/operate/campaigns/[id]/tracker | (cockpit) | À PORTER |
| //cockpit/operate/center | (cockpit) | À PORTER |
| //cockpit/operate/forge | (cockpit) | À PORTER |
| //cockpit/operate/missions | (cockpit) | PORTÉ → /missions (vue circuit) + /campagnes/[id]/mission/[missionId] (gates, WP-008) |
| //cockpit/operate/newsletter | (cockpit) | À PORTER |
| //cockpit/operate/requests | (cockpit) | À PORTER |
| //cockpit/operate/roadmap | (cockpit) | À PORTER |
| //cockpit/operate/sequences | (cockpit) | À PORTER |
| //cockpit/operate/tracker | (cockpit) | À PORTER |
| //cockpit/portfolio | (cockpit) | À PORTER |
| //cockpit/portfolio/[corporateSlug] | (cockpit) | À PORTER |
| //cockpit/settings | (cockpit) | À PORTER |
| //console | (console) | FUSIONNÉ → /admin (vue d'ensemble, 8 compteurs vivants) |
| //console/academie | (console) | FUSIONNÉ → /studio/academie (la page legacy était une pure redirection vers arene/academie — même sort, WP-020) |
| //console/academie/boutique | (console) | À PORTER (pas de table BoutiqueItem v7 — vente de playbooks/templates à re-statuer ; la page legacy redirigeait vers arene) |
| //console/academie/certifications | (console) | À PORTER (pas de table certification/enrollment v7 ; la page legacy redirigeait vers arene) |
| //console/academie/content | (console) | FUSIONNÉ → /blog (« The Upgrade » éditorial : la page legacy n'était qu'un EmptyState à zéro contenu ; l'éditorial réel = 6 articles statiques portés WP-014) |
| //console/academie/courses | (console) | FUSIONNÉ → /studio/academie (les 4 cours réellement seedés deviennent des modules statiques code-first — l'admin CRUD de cours n'a pas de table v7, le contenu s'édite en code, WP-020) |
| //console/anubis | (console) | À PORTER |
| //console/anubis/api-billing | (console) | À PORTER |
| //console/anubis/blog | (console) | À PORTER |
| //console/anubis/credentials | (console) | À PORTER |
| //console/anubis/crm | (console) | À PORTER |
| //console/anubis/mcp | (console) | À PORTER |
| //console/anubis/notifications | (console) | À PORTER |
| //console/arene/academie | (console) | FUSIONNÉ → /studio/academie (hub Académie côté créateur : catalogue réel du seed legacy porté en modules statiques, leçons au corps réel ouvertes, autres « en cours de migration » ; compteurs admin de cours sans table v7 — WP-020) |
| //console/arene/academie/boutique | (console) | À PORTER (pas de table BoutiqueItem v7 — vente de playbooks/templates à re-statuer) |
| //console/arene/academie/certifications | (console) | À PORTER (pas de table certification/enrollment v7 — la certification par pilier reste un thème produit ouvert) |
| //console/arene/academie/content | (console) | FUSIONNÉ → /blog (« The Upgrade » : EmptyState legacy sans table dédiée ; l'éditorial réel vit au blog statique WP-014) |
| //console/arene/academie/courses | (console) | FUSIONNÉ → /studio/academie (le catalogue seedé = 5 modules dont « Études de cas » ; leçons sans corps legacy affichées « à migrer », rien d'inventé — WP-020) |
| //console/arene/club | (console) | À PORTER |
| //console/arene/events | (console) | À PORTER |
| //console/arene/guild | (console) | FUSIONNÉ → /admin/talents (registre RÉEL des TalentProfile cross-flotte : marché, compétences, tarif indicatif, dispo/visibilité, candidatures/missions comptées ; le tier APPRENTI→ASSOCIE et le vecteur ADVERTIS legacy n'ont pas de colonnes v7 — non montrés, WP-020) |
| //console/arene/matching | (console) | FUSIONNÉ → /admin/talents (file des candidatures) + page mission côté marque (WP-011) — le matching v7 est une DÉCISION HUMAINE sur candidatures (doctrine anti premier-arrivé) ; le moteur de matching auto legacy n'est pas reconduit |
| //console/arene/missions-guilde | (console) | FUSIONNÉ → /admin/talents (candidatures cross-flotte) — la modération legacy visait le DÉPÔT PUBLIC de missions, qui n'existe pas en v7 : le mur se publie par la marque (gate openToGuild, WP-011), il n'y a rien à modérer |
| //console/arene/orgs | (console) | À PORTER |
| //console/arene/social-audit | (console) | À PORTER |
| //console/artemis | (console) | À PORTER |
| //console/artemis/campaigns | (console) | FUSIONNÉ → /admin/campagnes (vue cross-workspace réelle : marque, marché, statut, actions dont briefées, missions par étape, budget par devise + « à estimer » compté — WP-020) |
| //console/artemis/campaigns/[id]/postmortem | (console) | À PORTER |
| //console/artemis/drivers | (console) | À PORTER |
| //console/artemis/interventions | (console) | À PORTER |
| //console/artemis/media | (console) | À PORTER |
| //console/artemis/missions | (console) | FUSIONNÉ → /admin/campagnes (missions comptées par étape du circuit, cross-workspace, WP-020) + /espace-agence/missions (vue groupée par étape sur la flotte, WP-018) |
| //console/artemis/oracle-catalog | (console) | À PORTER |
| //console/artemis/pr | (console) | À PORTER |
| //console/artemis/scheduler | (console) | À PORTER |
| //console/artemis/skill-tree | (console) | À PORTER |
| //console/artemis/social | (console) | À PORTER |
| //console/artemis/tools | (console) | À PORTER |
| //console/artemis/vault | (console) | À PORTER |
| //console/audit/campaigns/[id] | (console) | À PORTER |
| //console/config | (console) | À PORTER |
| //console/config/integrations | (console) | À PORTER |
| //console/config/system | (console) | À PORTER |
| //console/config/templates | (console) | À PORTER |
| //console/config/thresholds | (console) | À PORTER |
| //console/config/variables | (console) | À PORTER |
| //console/ecosystem | (console) | À PORTER |
| //console/ecosystem/metrics | (console) | À PORTER |
| //console/ecosystem/operators | (console) | À PORTER |
| //console/ecosystem/scoring | (console) | À PORTER |
| //console/fusee/campaigns | (console) | FUSIONNÉ → /admin/campagnes (doublon legacy du panneau artemis/campaigns — même sort, WP-020) |
| //console/fusee/drivers | (console) | À PORTER |
| //console/fusee/glory | (console) | À PORTER |
| //console/fusee/interventions | (console) | À PORTER |
| //console/fusee/media | (console) | À PORTER |
| //console/fusee/missions | (console) | FUSIONNÉ → /admin/campagnes (doublon legacy du panneau artemis/missions — même sort, WP-020) |
| //console/fusee/pr | (console) | À PORTER |
| //console/fusee/scheduler | (console) | À PORTER |
| //console/fusee/social | (console) | À PORTER |
| //console/governance/accounts | (console) | FUSIONNÉ → /admin/utilisateurs (+ fiche : memberships/rôles, activité via AuditLog ; la promotion de rôle legacy visait User.role global — le rôle v7 est par workspace, édition à venir avec sa mécanique) |
| //console/governance/campaign-tracker | (console) | À PORTER |
| //console/governance/campaign-tracker/overton-delta-manual | (console) | À PORTER |
| //console/governance/canon-sync | (console) | À PORTER |
| //console/governance/design-system | (console) | À PORTER |
| //console/governance/error-vault | (console) | À PORTER |
| //console/governance/intents | (console) | FUSIONNÉ → /admin/audit (l'AuditLog hash-chaîné remplace le bus Intents : journal filtrable action/chaîne/dates + vérification d'intégrité par recalcul des selfHash) |
| //console/governance/markets | (console) | FUSIONNÉ → /admin/referentiels (CRUD Country audité ; le kill-switch freeze/shadowban n'a pas d'équivalent schéma v7 — à re-statuer si le besoin revient) |
| //console/governance/model-policy | (console) | À PORTER |
| //console/governance/oracle-incidents | (console) | À PORTER |
| //console/governance/phase-18-residuals | (console) | À PORTER |
| //console/imhotep | (console) | À PORTER |
| //console/messages | (console) | À PORTER |
| //console/mestor | (console) | À PORTER |
| //console/mestor/insights | (console) | À PORTER |
| //console/mestor/plans | (console) | À PORTER |
| //console/mestor/recos | (console) | À PORTER |
| //console/operate/africa-portfolio | (console) | FUSIONNÉ → /admin/exports (l'essence checklist livrables cross-flotte : statut persisté + fraîcheur RECALCULÉE, sections insuffisantes comptées, couverture marques — la matrice RAG/SKU×pays×langue legacy n'a pas de colonnes v7, non montrée, WP-020) |
| //console/operate/africa-portfolio/deliverable/[id] | (console) | À PORTER |
| //console/operate/morning-intake | (console) | À PORTER |
| //console/operations | (console) | À PORTER |
| //console/oracle/compilation | (console) | FUSIONNÉ → /admin/exports (état de composition cross-flotte ; la composition elle-même reste une action explicite du cockpit /app/oracle, WP-006) |
| //console/seshat/argos | (console) | À PORTER |
| //console/seshat/attribution | (console) | À PORTER |
| //console/seshat/intelligence | (console) | À PORTER |
| //console/seshat/jehuty | (console) | À PORTER |
| //console/seshat/knowledge | (console) | À PORTER |
| //console/seshat/market | (console) | À PORTER |
| //console/seshat/market-research | (console) | À PORTER |
| //console/seshat/market-studies | (console) | À PORTER |
| //console/seshat/marketplace | (console) | À PORTER |
| //console/seshat/search | (console) | À PORTER |
| //console/seshat/signals | (console) | À PORTER |
| //console/seshat/tarsis | (console) | À PORTER |
| //console/signal/attribution | (console) | À PORTER |
| //console/signal/intelligence | (console) | À PORTER |
| //console/signal/knowledge | (console) | À PORTER |
| //console/signal/market | (console) | À PORTER |
| //console/signal/signals | (console) | À PORTER |
| //console/signal/tarsis | (console) | À PORTER |
| //console/socle/commissions | (console) | À PORTER |
| //console/socle/contracts | (console) | À PORTER |
| //console/socle/escrow | (console) | À PORTER |
| //console/socle/invoices | (console) | À PORTER |
| //console/socle/manual-subscriptions | (console) | FUSIONNÉ → /admin/paiements (file Valider/Rejeter, WP-007) + /admin/abonnements (cycle de vie cross-workspace, statuts dérivés finance.ts, filtres/échéances) |
| //console/socle/market-costs | (console) | FUSIONNÉ → /admin/referentiels (familles ZoneIndex cost-of-living & co, éditables, source obligatoire) |
| //console/socle/pipeline | (console) | À PORTER |
| //console/socle/pricing | (console) | FUSIONNÉ → /admin/referentiels (lignes ZoneIndex pricing éditables en base — nouvelle ligne validFrom = nouveau barème, mutation auditée ; remplace le barème seedé) |
| //console/socle/revenue | (console) | À PORTER |
| //console/socle/transactions | (console) | À PORTER |
| //console/socle/value-reports | (console) | À PORTER |
| //console/strategy-operations/boot | (console) | À PORTER |
| //console/strategy-operations/boot/[sessionId] | (console) | À PORTER |
| //console/strategy-operations/brief-ingest | (console) | À PORTER |
| //console/strategy-operations/ingestion | (console) | À PORTER |
| //console/strategy-operations/intake | (console) | À PORTER |
| //console/strategy-portfolio/brands | (console) | À PORTER |
| //console/strategy-portfolio/brands/[strategyId] | (console) | À PORTER |
| //console/strategy-portfolio/clients | (console) | À PORTER |
| //console/strategy-portfolio/clients/[strategyId] | (console) | À PORTER |
| //console/strategy-portfolio/diagnostics | (console) | À PORTER |
| //console/upgraders/economics | (console) | À PORTER |
| //creator | (creator) | FUSIONNÉ → /studio (hub créateur : profil talent, mur des missions, candidatures — WP-011) |
| //creator/community/events | (creator) | À PORTER |
| //creator/community/guild | (creator) | À PORTER |
| //creator/earnings/history | (creator) | À PORTER |
| //creator/earnings/invoices | (creator) | À PORTER |
| //creator/earnings/missions | (creator) | À PORTER |
| //creator/earnings/qc | (creator) | À PORTER |
| //creator/learn/adve | (creator) | PORTÉ → /studio/academie/adve-fondamentaux (8 piliers question+pédagogie portés verbatim ; échelle des paliers RECÂBLÉE sur `domain/scoring` — le legacy affichait 5 paliers, le canon v7 en a 6 avec bornes réelles ; progression localStorage par appareil, WP-020) |
| //creator/learn/cases | (creator) | PORTÉ → /studio/academie/etudes-de-cas (les 3 cas d'école complets — contexte/défi/approche/application/résultats/enseignements — avec mention explicite « chiffres pédagogiques, pas des références client », WP-020) |
| //creator/learn/drivers | (creator) | PORTÉ → /studio/academie/maitriser-drivers (les 13 canaux réels + 4 familles, descriptions portées ; le seed annonçait « 20 canaux » — seuls les 13 documentés existent, rien d'ajouté, WP-020) |
| //creator/learn/resources | (creator) | OBSOLÈTE (hub de LIENS vers des surfaces legacy wipées — Glory tools, QC, séquences, forum ; aucun contenu propre à porter, l'apprentissage réel vit dans les modules Académie WP-020) |
| //creator/messages | (creator) | À PORTER |
| //creator/missions/active | (creator) | FUSIONNÉ → /studio (mes candidatures : acceptée = mission assignée, étape du circuit visible — WP-011) |
| //creator/missions/available | (creator) | FUSIONNÉ → /studio (mur des missions ouvertes à la Guilde, projection sans donnée de marque, candidature par pitch — WP-011) |
| //creator/missions/collab | (creator) | À PORTER |
| //creator/profile/drivers | (creator) | À PORTER |
| //creator/profile/portfolio | (creator) | FUSIONNÉ → /studio (profil talent : lien portfolio — WP-011 ; upload d'assets = pas de table v7, non porté) |
| //creator/profile/skills | (creator) | FUSIONNÉ → /studio (profil talent : compétences normalisées, disponibilité/visibilité, tarif journalier indicatif — WP-011) |
| //creator/progress/metrics | (creator) | À PORTER |
| //creator/progress/path | (creator) | À PORTER |
| //creator/progress/strengths | (creator) | À PORTER |
| //creator/proposals | (creator) | FUSIONNÉ → /studio (candidatures envoyées + décisions envoyée/shortlistée/acceptée/déclinée — WP-011) |
| //creator/qc/peer | (creator) | À PORTER |
| //creator/qc/submitted | (creator) | À PORTER |
| //creator/services | (creator) | À PORTER |
| //intake | (intake) | PORTÉ (mécanique — à confirmer) |
| //intake/[token] | (intake) | À PORTER |
| //intake/[token]/ingest | (intake) | À PORTER |
| //intake/[token]/ingest-plus | (intake) | À PORTER |
| //intake/[token]/result | (intake) | À PORTER |
| //intake/[token]/short | (intake) | À PORTER |
| //launchpad/crew-bootstrap | (intake) | À PORTER |
| //launchpad/portfolio-bulk-import | (intake) | À PORTER |
| //score | (intake) | PORTÉ → /intake/score (référence publique du score recâblée sur les constantes canon v7 : 6 paliers/bornes réelles, formule 15/7/3) + /intake/score/[leadId] (variante PARTAGEABLE du résultat — le modèle le permet : relecture `getLeadDiagnostic` par id, méta OG, zéro coordonnée, lien mort → redirect référence ; lien de partage exposé sur /intake/resultat, WP-017) |
| / | (marketing) | PORTÉ (mécanique — à confirmer) |
| //agence | (marketing) | PORTÉ (mécanique — à confirmer) |
| //blog | (marketing) | PORTÉ (mécanique — à confirmer) |
| //blog/[slug] | (marketing) | À PORTER |
| //contact | (marketing) | PORTÉ (mécanique — à confirmer) |
| //la-guilde | (marketing) | PORTÉ → /la-guilde (vitrine + compte RÉEL des missions ouvertes du mur, nombre seul — WP-011) |
| //lafusee | (marketing) | PORTÉ → /lafusee (vitrine PRODUIT : doctrine superfans×Overton, radar simulateur branché sur le vrai moteur `domain/scoring`, features réelles v7, paliers canon, CTA /intake — les métriques inventées du handoff non reprises, WP-017) |
| //landingintake | (marketing) | PORTÉ → /landingintake (landing d'acquisition courte : hero/constat/3 étapes/protocole ADVE copy réelle legacy + preuve STATS/CLIENT_STRIP canon + formulaire express → /intake — témoignages et compteurs sans source non repris, WP-017) |
| //methode | (marketing) | PORTÉ (mécanique — à confirmer) |
| //pricing | (marketing) | À PORTER |
| //realisations | (marketing) | PORTÉ (mécanique — à confirmer) |
| //services | (marketing) | PORTÉ (mécanique — à confirmer) |
| //tarifs | (marketing) | PORTÉ (mécanique — à confirmer) |
| //LaGuilde | (public) | FUSIONNÉ → /la-guilde (compteur public) + /studio (mur complet, connecté) — doctrine v7 anti-fuite ADR-0098 : pas de détail mission public |
| //LaGuilde/m/[slug] | (public) | À PORTER |
| //LaGuilde/publier | (public) | À PORTER |
| //LaGuilde/rejoindre | (public) | FUSIONNÉ → /studio (création du profil talent : compétences, pays référentiel, tarif indicatif, portfolio — WP-011) |
| //LaGuilde/services | (public) | À PORTER |
| //argos | (public) | PORTÉ (mécanique — à confirmer) |
| //argos/[ref] | (public) | À PORTER |
| //cgu | (public) | PORTÉ (mécanique — à confirmer) |
| //cgv | (public) | PORTÉ (mécanique — à confirmer) |
| //changelog | (public) | PORTÉ (mécanique — à confirmer) |
| //dpa | (public) | PORTÉ (mécanique — à confirmer) |
| //mentions-legales | (public) | PORTÉ (mécanique — à confirmer) |
| //privacy | (public) | PORTÉ (mécanique — à confirmer) |
| //sla | (public) | PORTÉ (mécanique — à confirmer) |
| //status | (public) | PORTÉ (mécanique — à confirmer) |
| //trust-center | (public) | PORTÉ (mécanique — à confirmer) |
| //shared/strategy/[token] | (shared) | À PORTER |
| /portals | root | À PORTER |
| /unauthorized | root | À PORTER |

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
