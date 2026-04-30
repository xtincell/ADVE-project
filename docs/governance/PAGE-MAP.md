# PAGE-MAP — Toutes les pages mappées sur APOGEE

**165 pages** au total dans `src/app/` (+ pages Ptah Phase 9 à créer : `/cockpit/forges`, `/cockpit/asset-library`, `/console/ptah/kiln`, `/console/ptah/forge-history`). Chacune classée par **Deck** (Mission Control / Cockpit / Crew Quarters / Launchpad / Public) et **Sous-système APOGEE** (Propulsion / Guidance / Telemetry / Sustainment / Operations / Crew Programs / Comms / Admin). Pour le **Governor Neteru** par sous-système, voir [PANTHEON.md](PANTHEON.md).

Statut : `active` (page substantive), `redirect` (legacy renommée — redirige), `placeholder` (UI partielle, à finir cf. REFONTE-PLAN P7).

Source de vérité : `find src/app -name 'page.tsx'`. Mis à jour avec [APOGEE.md](APOGEE.md) §4.

---

## Synthèse globale

| Deck | Mission Tier | Ground Tier | Total |
|---|---|---|---|
| **Mission Control** (Console) | 41 | 32 | 73 |
| **Cockpit** (Founder) | 26 | 4 | 30 |
| **Crew Quarters - Agency** | 6 | 5 | 11 |
| **Crew Quarters - Creator** | 5 | 18 | 23 |
| **Launchpad** (Intake) | — | 7 | 7 |
| **Public/Auth/Misc** | — | 7 | 7 |
| **Redirects (legacy)** | — | — | 14 |
| **TOTAL** | 78 | 73 | **165** |

Note : 14 redirects (fusee→artemis, signal→seshat, academie→arene/academie) ne sont pas comptés en sous-système puisqu'ils n'ont pas de logique. Liste explicite §6.

---

## 1. Mission Control (portail Console)

### 1.1 — Pages racines

| Path | Sous-système | Tier | Statut | Notes |
|---|---|---|---|---|
| `/console/page.tsx` | — | — | active | Dashboard portail, home |

### 1.2 — Oracle (Mission Tier — Guidance)

L'Oracle est le **plan de vol**. Toutes ces pages éditent ou consultent le plan.

| Path | Sous-système | Tier | Statut | Notes |
|---|---|---|---|---|
| `/console/oracle/boot/page.tsx` | Guidance | M | active | Boot session list |
| `/console/oracle/boot/[sessionId]/page.tsx` | Guidance | M | active | Session détail |
| `/console/oracle/brands/page.tsx` | Guidance | M | active | Liste brands |
| `/console/oracle/brands/[strategyId]/page.tsx` | Guidance | M | active | Brand détail Oracle |
| `/console/oracle/brief-ingest/page.tsx` | Guidance | M | active | Ingestion brief PDF |
| `/console/oracle/clients/page.tsx` | Guidance | M | active | Liste clients |
| `/console/oracle/clients/[strategyId]/page.tsx` | Guidance | M | active | Client détail |
| `/console/oracle/diagnostics/page.tsx` | Telemetry | M | active | Diagnostic santé Oracle |
| `/console/governance/oracle-incidents/page.tsx` | Telemetry | M/A/S/T | active | Triage incidents pipeline Oracle (ADR-0014). Cluster par code `ORACLE-NNN` |
| `/console/governance/error-vault/page.tsx` | Telemetry | INFRA | active | Vue runtime errors générique (Phase 11) |
| `/console/governance/design-system/page.tsx` | Admin | INFRA | active | Preview tokens DS (Phase 11 PR-9) |
| `/console/oracle/ingestion/page.tsx` | Guidance | M | active | Ingestion sources |
| `/console/oracle/intake/page.tsx` | Guidance | M | active | Quick intake operator |
| `/console/oracle/proposition/page.tsx` | Guidance | M | placeholder | À porter depuis cockpit (cf. P7) |

### 1.3 — Artemis (Mission Tier — Propulsion)

Artemis pilote les thrusters. Ces pages opèrent les Glory tools, sequences, missions sortantes.

| Path | Sous-système | Tier | Statut | Notes |
|---|---|---|---|---|
| `/console/artemis/page.tsx` | Propulsion | M | active | Hub Artemis |
| `/console/artemis/campaigns/page.tsx` | Propulsion | M | active | Campagnes en vol |
| `/console/artemis/drivers/page.tsx` | Propulsion | M | active | Drivers d'engagement |
| `/console/artemis/interventions/page.tsx` | Propulsion | M | active | Interventions tactiques |
| `/console/artemis/media/page.tsx` | Propulsion | M | active | Media buy/plan |
| `/console/artemis/missions/page.tsx` | Propulsion | M | active | Missions production |
| `/console/artemis/pr/page.tsx` | Propulsion | M | active | RP / publications |
| `/console/artemis/scheduler/page.tsx` | Propulsion | M | active | Calendrier |
| `/console/artemis/skill-tree/page.tsx` | Propulsion | M | active | Sequences (skill tree) |
| `/console/artemis/social/page.tsx` | Propulsion | M | active | Social orchestration |
| `/console/artemis/tools/page.tsx` | Propulsion | M | active | Catalogue Glory tools |
| `/console/artemis/vault/page.tsx` | Propulsion | M | active | Vault assets |

### 1.4 — Mestor (Mission Tier — Guidance)

| Path | Sous-système | Tier | Statut | Notes |
|---|---|---|---|---|
| `/console/mestor/page.tsx` | Guidance | M | active | Mestor chat operator |
| `/console/mestor/insights/page.tsx` | Guidance | M | active | Insights délibération |
| `/console/mestor/plans/page.tsx` | Guidance | M | active | Plans en attente |
| `/console/mestor/recos/page.tsx` | Guidance | M | active | Recommandations |

### 1.5 — Seshat (Mission Tier — Telemetry)

Telemetry processor + Tarsis sensors.

| Path | Sous-système | Tier | Statut | Notes |
|---|---|---|---|---|
| `/console/seshat/attribution/page.tsx` | Telemetry | M | active | Attribution canaux |
| `/console/seshat/intelligence/page.tsx` | Telemetry | M | active | Intelligence sectorielle |
| `/console/seshat/jehuty/page.tsx` | Telemetry | M | active | Jehuty cross-brand feed |
| `/console/seshat/knowledge/page.tsx` | Telemetry | M | active | Knowledge graph |
| `/console/seshat/market/page.tsx` | Telemetry | M | active | Market intel |
| `/console/seshat/search/page.tsx` | Telemetry | M | active | Recherche sémantique cross-strategy |
| `/console/seshat/signals/page.tsx` | Telemetry | M | active | Signaux faibles |
| `/console/seshat/tarsis/page.tsx` | Telemetry | M | active | Tarsis sensor array |

### 1.6 — Socle (Ground Tier — Operations)

L'argent et les contrats. Sans ces pages, UPgraders ne facture pas.

| Path | Sous-système | Tier | Statut | Notes |
|---|---|---|---|---|
| `/console/socle/commissions/page.tsx` | Operations | G | active | Commissions UPgraders/agence/creator |
| `/console/socle/contracts/page.tsx` | Operations | G | active | Contrats |
| `/console/socle/escrow/page.tsx` | Operations | G | active | Escrow paiements |
| `/console/socle/invoices/page.tsx` | Operations | G | active | Factures |
| `/console/socle/pipeline/page.tsx` | Operations | G | active | Pipeline commercial |
| `/console/socle/revenue/page.tsx` | Operations | G | active | Revenu rolling |
| `/console/socle/value-reports/page.tsx` | Operations | G | active | Rapports valeur clients |

### 1.7 — Arène + Académie (Ground Tier — Crew Programs)

Talent + Formation.

| Path | Sous-système | Tier | Statut | Notes |
|---|---|---|---|---|
| `/console/arene/club/page.tsx` | Crew Programs | G | active | Club ambassadeurs |
| `/console/arene/events/page.tsx` | Crew Programs | G | active | Events networking |
| `/console/arene/guild/page.tsx` | Crew Programs | G | active | Guild creators |
| `/console/arene/matching/page.tsx` | Crew Programs | G | active | Matching mission ↔ creator |
| `/console/arene/orgs/page.tsx` | Crew Programs | G | active | Organisations partenaires |
| `/console/arene/academie/page.tsx` | Crew Programs | G | active | Hub académie |
| `/console/arene/academie/boutique/page.tsx` | Crew Programs | G | active | Boutique formation |
| `/console/arene/academie/certifications/page.tsx` | Crew Programs | G | active | Certifications |
| `/console/arene/academie/content/page.tsx` | Crew Programs | G | active | Contenu pédagogique |
| `/console/arene/academie/courses/page.tsx` | Crew Programs | G | active | Cours |

### 1.8 — Ecosystem + Config (Ground Tier — Admin)

Méta : multi-operator admin + configuration système.

| Path | Sous-système | Tier | Statut | Notes |
|---|---|---|---|---|
| `/console/ecosystem/page.tsx` | Admin | G | active | Hub ecosystem |
| `/console/ecosystem/metrics/page.tsx` | Admin | G | active | Métriques flotte |
| `/console/ecosystem/operators/page.tsx` | Admin | G | active | Multi-operator |
| `/console/ecosystem/scoring/page.tsx` | Admin | G | active | Scoring cross-tenant |
| `/console/config/page.tsx` | Admin | G | active | Hub config |
| `/console/config/integrations/page.tsx` | Admin | G | placeholder | TODO: real OAuth (cf. P7) |
| `/console/config/system/page.tsx` | Admin | G | active | System settings |
| `/console/config/templates/page.tsx` | Admin | G | active | Templates |
| `/console/config/thresholds/page.tsx` | Admin | G | active | Thresholds |
| `/console/config/variables/page.tsx` | Admin | G | active | Variables |

### 1.9 — Messages (Ground Tier — Comms)

| Path | Sous-système | Tier | Statut | Notes |
|---|---|---|---|---|
| `/console/messages/page.tsx` | Comms | G | active | Fil messaging operator |

---

## 2. Cockpit (portail Founder — pilote sa propre mission)

### 2.1 — Brand (Mission Tier mixte)

Le founder édite et consulte tous les aspects de sa fusée.

| Path | Sous-système | Tier | Statut | Notes |
|---|---|---|---|---|
| `/cockpit/page.tsx` | — | — | active | Dashboard founder |
| `/cockpit/brand/identity/page.tsx` | Guidance | M | active | Pillar A |
| `/cockpit/brand/positioning/page.tsx` | Guidance | M | active | Pillar D |
| `/cockpit/brand/proposition/page.tsx` | Guidance | M | active | Pillar V |
| `/cockpit/brand/engagement/page.tsx` | Guidance | M | active | Pillar E |
| `/cockpit/brand/diagnostic/page.tsx` | Telemetry | M | active | Pillar R (risque) |
| `/cockpit/brand/market/page.tsx` | Telemetry | M | active | Pillar T (track) |
| `/cockpit/brand/potential/page.tsx` | Guidance | M | active | Pillar I (innovation) |
| `/cockpit/brand/roadmap/page.tsx` | Guidance | M | active | Pillar S (strategy) |
| `/cockpit/brand/edit/page.tsx` | Guidance | M | active | Édition multi-pillar |
| `/cockpit/brand/assets/page.tsx` | Propulsion | M | active | Vault assets brand |
| `/cockpit/brand/deliverables/page.tsx` | Propulsion | M | active | Liste livrables |
| `/cockpit/brand/deliverables/[key]/page.tsx` | Propulsion | M | active | Livrable détail |
| `/cockpit/brand/guidelines/page.tsx` | Propulsion | M | active | Brand guidelines rendered |
| `/cockpit/brand/jehuty/page.tsx` | Telemetry | M | active | Jehuty pour ce founder |
| `/cockpit/brand/notoria/page.tsx` | Propulsion | M | active | Pipeline Notoria |
| `/cockpit/brand/offer/page.tsx` | Guidance | M | active | Offre commerciale |
| `/cockpit/brand/rtis/page.tsx` | Guidance | M | active | RTIS détail |
| `/cockpit/brand/rtis/synthese/page.tsx` | Guidance | M | active | RTIS synthèse |
| `/cockpit/brand/sources/page.tsx` | Guidance | M | active | Sources d'enrichissement |

### 2.2 — Insights (Mission Tier — Telemetry)

Vue télémétrie côté founder.

| Path | Sous-système | Tier | Statut | Notes |
|---|---|---|---|---|
| `/cockpit/insights/attribution/page.tsx` | Telemetry | M | active | Attribution canaux |
| `/cockpit/insights/benchmarks/page.tsx` | Telemetry | M | active | Brand comparables (V5.4) |
| `/cockpit/insights/diagnostics/page.tsx` | Telemetry | M | active | Diagnostics santé |
| `/cockpit/insights/reports/page.tsx` | Telemetry | M | active | Rapports |

### 2.3 — Operate (Mission Tier — Propulsion)

Le founder allume des thrusters.

| Path | Sous-système | Tier | Statut | Notes |
|---|---|---|---|---|
| `/cockpit/operate/briefs/page.tsx` | Propulsion | M | active | Briefs sortants |
| `/cockpit/operate/campaigns/page.tsx` | Propulsion | M | active | Campagnes founder |
| `/cockpit/operate/campaigns/[id]/page.tsx` | Propulsion | M | active | Campagne détail |
| `/cockpit/operate/missions/page.tsx` | Propulsion | M | active | Missions founder |
| `/cockpit/operate/requests/page.tsx` | Propulsion | M | active | Requests partenaires |

### 2.4 — Mestor + New + Messages (mixte)

| Path | Sous-système | Tier | Statut | Notes |
|---|---|---|---|---|
| `/cockpit/mestor/page.tsx` | Guidance | M | active | Mestor chat founder |
| `/cockpit/new/page.tsx` | Operations | G | active | Onboarding 7 steps (acquisition) |
| `/cockpit/messages/page.tsx` | Comms | G | active | Fil messaging |

---

## 3. Crew Quarters — Agency (portail partenaires)

### 3.1 — Pages

| Path | Sous-système | Tier | Statut | Notes |
|---|---|---|---|---|
| `/agency/page.tsx` | — | — | active | Dashboard agence |
| `/agency/campaigns/page.tsx` | Propulsion | M | active | Campagnes en cours |
| `/agency/clients/page.tsx` | Operations | G | active | Clients gérés |
| `/agency/clients/[clientId]/page.tsx` | Operations | G | active | Client détail |
| `/agency/commissions/page.tsx` | Operations | G | active | Commissions agence |
| `/agency/contracts/page.tsx` | Operations | G | active | Contrats |
| `/agency/intake/page.tsx` | Operations | G | active | Intake clients agence |
| `/agency/knowledge/page.tsx` | Telemetry | M | active | Knowledge graph |
| `/agency/messages/page.tsx` | Comms | G | active | Messaging |
| `/agency/missions/page.tsx` | Propulsion | M | active | Missions de l'agence |
| `/agency/revenue/page.tsx` | Operations | G | active | Revenue agence |
| `/agency/signals/page.tsx` | Telemetry | M | active | Signaux pertinents |

---

## 4. Crew Quarters — Creator (portail freelances)

### 4.1 — Pages

| Path | Sous-système | Tier | Statut | Notes |
|---|---|---|---|---|
| `/creator/page.tsx` | — | — | active | Dashboard creator |
| `/creator/community/events/page.tsx` | Crew Programs | G | active | Events |
| `/creator/community/guild/page.tsx` | Crew Programs | G | active | Guild |
| `/creator/earnings/history/page.tsx` | Operations | G | active | Historique paiements |
| `/creator/earnings/invoices/page.tsx` | Operations | G | active | Factures |
| `/creator/earnings/missions/page.tsx` | Operations | G | active | Missions facturées |
| `/creator/earnings/qc/page.tsx` | Operations | G | active | QC pour paiement |
| `/creator/learn/adve/page.tsx` | Crew Programs | G | active | Formation ADVE |
| `/creator/learn/cases/page.tsx` | Crew Programs | G | active | Cases studies |
| `/creator/learn/drivers/page.tsx` | Crew Programs | G | active | Drivers learning |
| `/creator/learn/resources/page.tsx` | Crew Programs | G | active | Ressources |
| `/creator/messages/page.tsx` | Comms | G | active | Messaging |
| `/creator/missions/active/page.tsx` | Propulsion | M | active | Missions actives |
| `/creator/missions/available/page.tsx` | Crew Programs | G | active | Marketplace missions |
| `/creator/missions/collab/page.tsx` | Crew Programs | G | active | Collab missions |
| `/creator/profile/drivers/page.tsx` | Crew Programs | G | active | Drivers profile |
| `/creator/profile/portfolio/page.tsx` | Crew Programs | G | active | Portfolio |
| `/creator/profile/skills/page.tsx` | Crew Programs | G | active | Skills |
| `/creator/progress/metrics/page.tsx` | Telemetry | M | active | Métriques creator |
| `/creator/progress/path/page.tsx` | Crew Programs | G | active | Path APPRENTI→ASSOCIÉ |
| `/creator/progress/strengths/page.tsx` | Telemetry | M | active | Forces creator |
| `/creator/qc/peer/page.tsx` | Crew Programs | G | active | Peer QC |
| `/creator/qc/submitted/page.tsx` | Crew Programs | G | active | Submissions QC |

---

## 5. Launchpad — Intake public

| Path | Sous-système | Tier | Statut | Notes |
|---|---|---|---|---|
| `/intake/page.tsx` | Operations | G | active | Landing intake |
| `/intake/[token]/page.tsx` | Guidance | M | active | Intake principal |
| `/intake/[token]/short/page.tsx` | Guidance | M | active | Variant court |
| `/intake/[token]/ingest/page.tsx` | Guidance | M | active | Ingest brief |
| `/intake/[token]/ingest-plus/page.tsx` | Guidance | M | active | Ingest étendu |
| `/intake/[token]/result/page.tsx` | Telemetry | M | active | Résultat avec score (rev 9) |
| `/score/page.tsx` | Telemetry | M | active | Public score viewer |

---

## 6. Public / Auth / Misc

| Path | Sous-système | Tier | Statut | Notes |
|---|---|---|---|---|
| `/page.tsx` | — | — | active | Landing publique |
| `/unauthorized/page.tsx` | Admin | G | active | 403 page |
| `/login/page.tsx` | Admin | G | active | Auth |
| `/register/page.tsx` | Admin | G | active | Auth |
| `/forgot-password/page.tsx` | Admin | G | active | Auth |
| `/reset-password/page.tsx` | Admin | G | active | Auth |
| `/shared/strategy/[token]/page.tsx` | Telemetry | M | active | Public strategy share link |

---

## 7. Redirects (legacy renames — à supprimer fin P0)

14 pages redirect uniquement, conservées pour back-compat post-renommage. Aucune logique. Candidates à `git rm` après période de grâce.

| Path | Redirect vers | Origine |
|---|---|---|
| `/console/fusee/campaigns` | `/console/artemis/campaigns` | renommage fusee → artemis |
| `/console/fusee/drivers` | `/console/artemis/drivers` | idem |
| `/console/fusee/glory` | `/console/artemis/tools` | idem (glory → tools) |
| `/console/fusee/interventions` | `/console/artemis/interventions` | idem |
| `/console/fusee/media` | `/console/artemis/media` | idem |
| `/console/fusee/missions` | `/console/artemis/missions` | idem |
| `/console/fusee/pr` | `/console/artemis/pr` | idem |
| `/console/fusee/scheduler` | `/console/artemis/scheduler` | idem |
| `/console/fusee/social` | `/console/artemis/social` | idem |
| `/console/signal/attribution` | `/console/seshat/attribution` | renommage signal → seshat |
| `/console/signal/intelligence` | `/console/seshat/intelligence` | idem |
| `/console/signal/knowledge` | `/console/seshat/knowledge` | idem |
| `/console/signal/market` | `/console/seshat/market` | idem |
| `/console/signal/signals` | `/console/seshat/signals` | idem |
| `/console/signal/tarsis` | `/console/seshat/tarsis` | idem |
| `/console/academie/boutique` | `/console/arene/academie/boutique` | renommage academie → arene/academie |
| `/console/academie/certifications` | `/console/arene/academie/certifications` | idem |
| `/console/academie/content` | `/console/arene/academie/content` | idem |
| `/console/academie/courses` | `/console/arene/academie/courses` | idem |
| `/console/academie/page.tsx` | `/console/arene/academie` | idem |

(Note : 20 redirects au total — compté dans le tableau §0 comme 14 lignes uniques. À nettoyer en P0 + lint rule `no-redirect-only-pages`.)

---

## 8. Verdict — orphelins révélés

Aucune page n'est restée orpheline grâce à l'extension du framework. Les ajouts de sous-systèmes ont été directement provoqués par le besoin d'absorber proprement :

| Pages → Révélation framework |
|---|
| `/console/socle/*` (7 pages) → **Sous-système Operations** ajouté au Ground Tier |
| `/console/arene/*`, `/console/academie/*`, `/creator/learn/*`, `/creator/community/*`, `/creator/profile/*`, `/creator/qc/*` → **Sous-système Crew Programs** ajouté |
| `/*/messages/*` (4 pages) → **Sous-système Comms** ajouté (transverse) |
| `/console/config/*`, `/console/ecosystem/*`, `/auth/*`, `/unauthorized` → **Sous-système Admin** ajouté |

C'est l'application stricte du principe : *le framework sert La Fusée, pas l'inverse*. APOGEE absorbe tout ce qui existe.
