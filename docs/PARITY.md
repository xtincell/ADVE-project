# MATRICE DE PARITÉ — legacy → v7 (contrat de complétion)

> Générée mécaniquement le 2026-07-02. **Règle : le rebuild n'est FINI que quand chaque ligne est PORTÉ, FUSIONNÉ (équivalent v7 à autre URL) ou OBSOLÈTE (justifié).** Chaque agent qui porte met à jour ses lignes dans sa PR. Board : docs/REBUILD-PLAN.md.

Legacy : 253 pages · 112 routers tRPC · 115 services — v7 au 2026-07-02 : 36 pages.

| Route legacy | Groupe | Statut |
|---|---|---|
| //agency | (agency) | À PORTER |
| //agency/campaigns | (agency) | À PORTER |
| //agency/clients | (agency) | À PORTER |
| //agency/clients/[clientId] | (agency) | À PORTER |
| //agency/commissions | (agency) | À PORTER |
| //agency/contracts | (agency) | À PORTER |
| //agency/intake | (agency) | À PORTER |
| //agency/knowledge | (agency) | À PORTER |
| //agency/messages | (agency) | À PORTER |
| //agency/missions | (agency) | À PORTER |
| //agency/revenue | (agency) | À PORTER |
| //agency/signals | (agency) | À PORTER |
| //forgot-password | (auth) | À PORTER |
| //login | (auth) | À PORTER |
| //register | (auth) | À PORTER |
| //reset-password | (auth) | À PORTER |
| //cockpit | (cockpit) | À PORTER |
| //cockpit/brand/assets | (cockpit) | À PORTER (vault BrandAsset — pas de table v7) |
| //cockpit/brand/deliverables | (cockpit) | FUSIONNÉ → /app/exports (hub Deliverable + fraîcheur calculée, WP-016) |
| //cockpit/brand/deliverables/[key] | (cockpit) | FUSIONNÉ → /app/oracle (+ /app/oracle/print — seul kind au registre v7 ; le détail par kind suivra le registre) |
| //cockpit/brand/diagnostic | (cockpit) | FUSIONNÉ → /app/diagnostic (historique BrandScore + delta, breakdown piliers, actions dérivées des manques, WP-016) |
| //cockpit/brand/edit | (cockpit) | FUSIONNÉ → /app/pilier/[key] (éditeur par champ, WP-005) |
| //cockpit/brand/engagement | (cockpit) | FUSIONNÉ → /app/pilier/e (page pilier E, WP-005) |
| //cockpit/brand/guidelines | (cockpit) | À PORTER (guidelines-renderer — pas de table v7) |
| //cockpit/brand/identity | (cockpit) | FUSIONNÉ → /app/pilier/a (page pilier A, WP-005) |
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
| //console/academie | (console) | À PORTER |
| //console/academie/boutique | (console) | À PORTER |
| //console/academie/certifications | (console) | À PORTER |
| //console/academie/content | (console) | À PORTER |
| //console/academie/courses | (console) | À PORTER |
| //console/anubis | (console) | À PORTER |
| //console/anubis/api-billing | (console) | À PORTER |
| //console/anubis/blog | (console) | À PORTER |
| //console/anubis/credentials | (console) | À PORTER |
| //console/anubis/crm | (console) | À PORTER |
| //console/anubis/mcp | (console) | À PORTER |
| //console/anubis/notifications | (console) | À PORTER |
| //console/arene/academie | (console) | À PORTER |
| //console/arene/academie/boutique | (console) | À PORTER |
| //console/arene/academie/certifications | (console) | À PORTER |
| //console/arene/academie/content | (console) | À PORTER |
| //console/arene/academie/courses | (console) | À PORTER |
| //console/arene/club | (console) | À PORTER |
| //console/arene/events | (console) | À PORTER |
| //console/arene/guild | (console) | À PORTER |
| //console/arene/matching | (console) | À PORTER |
| //console/arene/missions-guilde | (console) | À PORTER |
| //console/arene/orgs | (console) | À PORTER |
| //console/arene/social-audit | (console) | À PORTER |
| //console/artemis | (console) | À PORTER |
| //console/artemis/campaigns | (console) | À PORTER |
| //console/artemis/campaigns/[id]/postmortem | (console) | À PORTER |
| //console/artemis/drivers | (console) | À PORTER |
| //console/artemis/interventions | (console) | À PORTER |
| //console/artemis/media | (console) | À PORTER |
| //console/artemis/missions | (console) | À PORTER |
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
| //console/fusee/campaigns | (console) | À PORTER |
| //console/fusee/drivers | (console) | À PORTER |
| //console/fusee/glory | (console) | À PORTER |
| //console/fusee/interventions | (console) | À PORTER |
| //console/fusee/media | (console) | À PORTER |
| //console/fusee/missions | (console) | À PORTER |
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
| //console/operate/africa-portfolio | (console) | À PORTER |
| //console/operate/africa-portfolio/deliverable/[id] | (console) | À PORTER |
| //console/operate/morning-intake | (console) | À PORTER |
| //console/operations | (console) | À PORTER |
| //console/oracle/compilation | (console) | À PORTER |
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
| //creator | (creator) | À PORTER |
| //creator/community/events | (creator) | À PORTER |
| //creator/community/guild | (creator) | À PORTER |
| //creator/earnings/history | (creator) | À PORTER |
| //creator/earnings/invoices | (creator) | À PORTER |
| //creator/earnings/missions | (creator) | À PORTER |
| //creator/earnings/qc | (creator) | À PORTER |
| //creator/learn/adve | (creator) | À PORTER |
| //creator/learn/cases | (creator) | À PORTER |
| //creator/learn/drivers | (creator) | À PORTER |
| //creator/learn/resources | (creator) | À PORTER |
| //creator/messages | (creator) | À PORTER |
| //creator/missions/active | (creator) | À PORTER |
| //creator/missions/available | (creator) | À PORTER |
| //creator/missions/collab | (creator) | À PORTER |
| //creator/profile/drivers | (creator) | À PORTER |
| //creator/profile/portfolio | (creator) | À PORTER |
| //creator/profile/skills | (creator) | À PORTER |
| //creator/progress/metrics | (creator) | À PORTER |
| //creator/progress/path | (creator) | À PORTER |
| //creator/progress/strengths | (creator) | À PORTER |
| //creator/proposals | (creator) | À PORTER |
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
| //score | (intake) | À PORTER |
| / | (marketing) | PORTÉ (mécanique — à confirmer) |
| //agence | (marketing) | PORTÉ (mécanique — à confirmer) |
| //blog | (marketing) | PORTÉ (mécanique — à confirmer) |
| //blog/[slug] | (marketing) | À PORTER |
| //contact | (marketing) | PORTÉ (mécanique — à confirmer) |
| //la-guilde | (marketing) | PORTÉ (mécanique — à confirmer) |
| //lafusee | (marketing) | À PORTER |
| //landingintake | (marketing) | À PORTER |
| //methode | (marketing) | PORTÉ (mécanique — à confirmer) |
| //pricing | (marketing) | À PORTER |
| //realisations | (marketing) | PORTÉ (mécanique — à confirmer) |
| //services | (marketing) | PORTÉ (mécanique — à confirmer) |
| //tarifs | (marketing) | PORTÉ (mécanique — à confirmer) |
| //LaGuilde | (public) | À PORTER |
| //LaGuilde/m/[slug] | (public) | À PORTER |
| //LaGuilde/publier | (public) | À PORTER |
| //LaGuilde/rejoindre | (public) | À PORTER |
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
