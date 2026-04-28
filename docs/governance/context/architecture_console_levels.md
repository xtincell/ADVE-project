---
name: Console architecture levels
description: LaFusée has 3 UI levels — Cockpit (brand), Console Industry (sees all), Console Agence (sees agency brands only). Brand creation happens at Console level, not Cockpit.
type: project
---

LaFusée has 3 distinct UI levels:

- **Cockpit** (`/cockpit`) — brand-level view. Shows one brand's ADVE-RTIS data, superfans, campaigns. No brand creation here.
- **Console Industry** (`/console`) — LaFusée's own console. Sees ALL brands across all agencies. Full ecosystem visibility.
- **Console Agence** — white-label console for agency clients. Sees only brands linked to that agency.

**Why:** The cockpit is a per-brand dashboard, not a management interface. Brand creation requires a wizard (multi-source ingest → Mestor ADVE pre-fill → human verification → RTIS cascade), which is a Console-level operation.

**How to apply:** Never put brand/strategy creation actions in the Cockpit. The "Creer une marque" button lives in Console > Oracle > Clients (`/console/oracle/clients`) and links to `/intake` (the wizard). Agency consoles will also have this intake in their own console.
