// ============================================================================
// MODULE M34 — Console Portal (Fixer)
// Score: 90/100 | Priority: P1 | Status: FUNCTIONAL
// Spec: §5.5 | Division: Fixer Console
// ============================================================================
//
// CdC REQUIREMENTS (V1):
// [x] REQ-1  Ecosystem dashboard: 5 division cards + alerts + quick actions + brand instances
// [x] REQ-2  L'Oracle (6 pages): clients, ingestion, diagnostics, intake, boot, boot/[id]
// [x] REQ-3  Le Signal (6 pages): intelligence, signals, knowledge, market, tarsis, attribution
// [x] REQ-4  L'Arene (5 pages): guild, matching, orgs, club, events
// [x] REQ-5  La Fusee (9 pages): missions, campaigns, drivers, glory, social, pr, media,
//            interventions, scheduler
// [x] REQ-6  Le Socle (7 pages): revenue, commissions, pipeline, value-reports, escrow,
//            contracts, invoices
// [x] REQ-7  L'Academie (5 pages): overview, courses, certifications, boutique, content
// [x] REQ-8  Ecosysteme (4 pages): overview, operators, metrics, scoring
// [x] REQ-9  Config (5 pages): overview, thresholds, templates, system, integrations
// [x] REQ-10 Messages page
// [x] REQ-11 All stub pages wired to real tRPC data where routers exist
// [x] REQ-12 Navigation with division colors and all sections
// [ ] REQ-13 Read-only tabs for Associes (role-based view filtering)
// [ ] REQ-14 Calendar view for scheduler
//
// PAGES: 49 | NAV SECTIONS: 9 | SPEC TARGET: 35+ pages ✓
//
// ============================================================================
// CROSS-MODULE DEPENDENCIES
// ============================================================================
// Ce module depend de :
//   M01 (Pillar Schemas)     — pillar content display in client detail
//   M02 (AdvertisVector)     — score badges, classification, radar chart
//   M03 (Glory Tools)        — glory tools page, execution history
//   M04 (Campaign Manager)   — campaigns page, mission SLA
//   M06 (Drivers)            — drivers page
//   M16 (Quick Intake Engine)— intake pipeline page
//   M17 (Boot Sequence)      — boot sequence pages
//   M26 (MCP Intelligence)   — intelligence page
//   M27 (MCP Operations)     — campaigns/missions data
//   M28 (MCP Creative)       — glory tools, brief generation
//   M29 (MCP Pulse)          — signals, social metrics
//   M35 (Quick Intake Portal)— intake conversion in pipeline
//   M40 (CRM Pipeline)       — pipeline/deals page
//
// Ce module est consomme par :
//   (terminal — pas de dependants directs, c'est le portail admin)
//
// >> INSTRUCTION : A chaque modification d'un module liste ci-dessus,
// >> verifier que les pages console qui en dependent restent fonctionnelles.
// >> Mettre a jour cette section si de nouvelles dependances apparaissent.
// ============================================================================

"use client";

import { AppShell, consoleNavGroups } from "@/components/navigation";
import { Terminal } from "lucide-react";
import { PortalWelcome } from "@/components/shared/portal-welcome";
import { PortalTourHost } from "@/components/shared/portal-tour";

function ConsoleSidebarHeader() {
  return (
    <div className="flex items-center gap-2">
      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-secondary">
        <Terminal className="h-3.5 w-3.5 text-foreground" />
      </div>
      <div className="min-w-0">
        <p className="text-sm font-bold text-foreground">Console</p>
        <p className="text-[10px] text-foreground-muted">FIXER</p>
      </div>
    </div>
  );
}

export default function ConsoleLayout({ children }: { children: React.ReactNode }) {
  return (
    <div data-density="compact" data-portal="console" className="contents">
      <AppShell
        portal="console"
        navGroups={consoleNavGroups}
        portalAccentVar="var(--color-portal-console)"
        sidebarHeader={<ConsoleSidebarHeader />}
      >
        {children}
      </AppShell>
      <PortalWelcome portal="console" />
      <PortalTourHost portal="console" />
    </div>
  );
}
