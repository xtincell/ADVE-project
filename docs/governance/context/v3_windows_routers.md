---
name: v3 missing Windows routers
description: 9 router files exist only on Windows machine — stubs on v3 branch. mestor-router.ts has getInsights endpoint added.
type: project
---

9 routers were imported in router.ts but never pushed from Windows:
- translation.ts
- source-insights.ts
- mestor-router.ts (MODIFIED on v3 — has getInsights endpoint, do NOT overwrite)
- onboarding.ts
- attribution-router.ts
- cohort.ts
- market-pricing.ts
- publication.ts
- cockpit-router.ts

**Why:** Windows push was partial — git add missed these files.
**How to apply:** When Windows access returns (~4-5h from 2026-04-06 14:00), merge real router files into v3. For mestor-router.ts, merge both versions (Windows content + v3 getInsights endpoint).
