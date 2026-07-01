"use client";

/**
 * CampaignTrackerHub — Phase 23 Epic 6 Story 6.5 (UX-DR3 + UX-DR18 + UX-DR20).
 *
 * The pivot-mechanics hub on `/console/governance/campaign-tracker`. A persisted
 * three-way view switcher over the **pivot sub-clusters** (Cluster C Superfan
 * economy + Cluster D culture/Overton — the seven slugs the calibration +
 * lifecycle-promotion Intents act on) :
 *   - B1 "Tableau dense"     (default) — one row per sub-cluster ;
 *   - B2 "Grille de cartes"             — card grid ;
 *   - B3 "Maître-détail"                — list + inline CalibrationReviewPanel.
 *
 * View preference persists in `localStorage` per operator (mirrors the
 * sidebar-collapse pattern, DESIGN-A11Y §4) — routing never resets it. Every view
 * renders the shared `SubClusterStatusCell` (Story 6.6) and opens the shared
 * `CalibrationReviewPanel` (Story 6.4) — dialog from B1/B2, inline in B3.
 *
 * DS rigour : segmented control via the existing `tabs` primitive (NO new
 * primitive — UX-DR3), semantic tokens only, Console `data-density="compact"`
 * (UX-DR18), keyboard-navigable.
 */

import { useEffect, useState } from "react";
import { Table2, LayoutGrid, PanelsTopLeft, FlaskConical } from "lucide-react";
import { trpc } from "@/lib/trpc/client";
import { Tabs, TabsList, TabsTrigger } from "@/components/primitives/tabs";
import {
  SubClusterStatusCell,
  type SubClusterLifecycleState,
} from "@/components/cockpit/governance/sub-cluster-status-cell";
import { CalibrationReviewPanel } from "./calibration-review-panel";
import type { ConnectorResult } from "@/domain/connector-result";

type HubView = "table" | "cards" | "detail";
const STORAGE_KEY = "campaign-tracker-hub-view";

type PivotSlug =
  | "superfan.attribution"
  | "superfan.stickiness"
  | "superfan.crmCapture"
  | "culture.overtonShift"
  | "culture.overtonReadiness"
  | "culture.tarsisBridge"
  | "culture.mcpIngest";

const PIVOT_SLUGS = new Set<string>([
  "superfan.attribution",
  "superfan.stickiness",
  "superfan.crmCapture",
  "culture.overtonShift",
  "culture.overtonReadiness",
  "culture.tarsisBridge",
  "culture.mcpIngest",
]);

interface PivotCapability {
  slug: string;
  lifecycle: string;
  description: string;
  degradationCodes: readonly string[];
}

/**
 * Derive the cell's connector signal from the registry. When the sub-cluster
 * declares `DEFERRED_AWAITING_CREDENTIALS` in its degradation codes (the CRM /
 * Tarsis-backed ones), surface a DEFERRED connector result so the cell renders
 * the "Configurer le connecteur" cross-link. Otherwise omit — no fabricated
 * signal (the live per-sub-cluster ConnectorResult is wired in Epic 7).
 */
function deriveConnectorResult(cap: PivotCapability): ConnectorResult<unknown> | undefined {
  if (cap.degradationCodes.includes("DEFERRED_AWAITING_CREDENTIALS")) {
    return { state: "DEFERRED_AWAITING_CREDENTIALS", connectorId: cap.slug };
  }
  return undefined;
}

export function CampaignTrackerHub({ strategyId }: { strategyId: string }) {
  const [view, setView] = useState<HubView>("table");
  const [dialogSlug, setDialogSlug] = useState<PivotSlug | null>(null);
  const [detailSlug, setDetailSlug] = useState<PivotSlug | null>(null);

  // Per-operator view persistence (localStorage). Read once on mount.
  useEffect(() => {
    const stored = typeof window !== "undefined" ? window.localStorage.getItem(STORAGE_KEY) : null;
    if (stored === "table" || stored === "cards" || stored === "detail") setView(stored);
  }, []);
  function changeView(next: HubView) {
    setView(next);
    if (typeof window !== "undefined") window.localStorage.setItem(STORAGE_KEY, next);
  }

  const { data, isLoading } = trpc.campaignTracker.listClusterCapabilities.useQuery();
  const pivots: PivotCapability[] = (data?.capabilities ?? [])
    .filter((c) => PIVOT_SLUGS.has(c.slug))
    .map((c) => ({
      slug: c.slug,
      lifecycle: c.lifecycle,
      description: c.description,
      degradationCodes: c.degradationCodes,
    }));

  const dialogCap = pivots.find((p) => p.slug === dialogSlug) ?? null;
  const detailCap = pivots.find((p) => p.slug === detailSlug) ?? null;

  const noStrategy = !strategyId;

  return (
    <section className="space-y-3" data-density="compact">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-foreground-secondary">
          <FlaskConical className="h-4 w-4" aria-hidden="true" />
          <span className="text-foreground">
            Mécaniques pivot — calibration & promotion (Phase 23, ADR-0080/0081)
          </span>
        </div>
        <Tabs value={view} onValueChange={(v) => changeView(v as HubView)}>
          <TabsList aria-label="Vue du hub">
            <TabsTrigger value="table">
              <span className="inline-flex items-center gap-1.5">
                <Table2 className="h-4 w-4" aria-hidden="true" /> Tableau
              </span>
            </TabsTrigger>
            <TabsTrigger value="cards">
              <span className="inline-flex items-center gap-1.5">
                <LayoutGrid className="h-4 w-4" aria-hidden="true" /> Cartes
              </span>
            </TabsTrigger>
            <TabsTrigger value="detail">
              <span className="inline-flex items-center gap-1.5">
                <PanelsTopLeft className="h-4 w-4" aria-hidden="true" /> Maître-détail
              </span>
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </header>

      {noStrategy ? (
        <p className="text-xs text-foreground-secondary">
          Sélectionnez une marque pour réviser la calibration des mécaniques pivot.
        </p>
      ) : isLoading ? (
        <p className="text-xs text-foreground-secondary">Chargement des sous-clusters…</p>
      ) : (
        <>
          {view === "table" && (
            <HubTableView pivots={pivots} onReview={setDialogSlug} deriveConnector={deriveConnectorResult} />
          )}
          {view === "cards" && (
            <HubCardView pivots={pivots} onReview={setDialogSlug} deriveConnector={deriveConnectorResult} />
          )}
          {view === "detail" && (
            <HubDetailView
              pivots={pivots}
              strategyId={strategyId}
              selected={detailSlug}
              onSelect={setDetailSlug}
              detailCap={detailCap}
              deriveConnector={deriveConnectorResult}
            />
          )}
        </>
      )}

      {/* Dialog host (B1/B2) */}
      {dialogCap && (
        <CalibrationReviewPanel
          host="dialog"
          open={dialogSlug !== null}
          onOpenChange={(o) => !o && setDialogSlug(null)}
          strategyId={strategyId}
          subClusterSlug={dialogCap.slug as PivotSlug}
          lifecycleState={dialogCap.lifecycle as SubClusterLifecycleState}
        />
      )}
    </section>
  );
}

type ViewProps = {
  pivots: PivotCapability[];
  onReview: (slug: PivotSlug) => void;
  deriveConnector: (cap: PivotCapability) => ConnectorResult<unknown> | undefined;
};

function ReviewButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1.5 rounded-md border border-border bg-surface px-2.5 py-1.5 text-xs font-medium text-foreground hover:bg-surface-secondary"
    >
      <FlaskConical className="h-3.5 w-3.5" aria-hidden="true" /> Réviser la calibration
    </button>
  );
}

function HubTableView({ pivots, onReview, deriveConnector }: ViewProps) {
  return (
    <div className="overflow-hidden rounded-lg ring-1 ring-inset ring-border">
      <table className="w-full text-sm">
        <thead className="bg-surface-secondary text-xs uppercase tracking-wide text-foreground-secondary">
          <tr>
            <th className="px-4 py-2 text-left">Sous-cluster pivot</th>
            <th className="px-4 py-2 text-left">État</th>
            <th className="px-4 py-2 text-right">Action</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {pivots.map((cap) => (
            <tr key={cap.slug} className="bg-surface align-middle">
              <td className="px-4 py-3">
                <SubClusterStatusCell
                  subClusterSlug={cap.slug}
                  lifecycleState={cap.lifecycle as SubClusterLifecycleState}
                  connectorResult={deriveConnector(cap)}
                />
              </td>
              <td className="px-4 py-3 text-xs text-foreground-secondary">{cap.description}</td>
              <td className="px-4 py-3 text-right">
                <ReviewButton onClick={() => onReview(cap.slug as PivotSlug)} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function HubCardView({ pivots, onReview, deriveConnector }: ViewProps) {
  return (
    <div className="@container grid grid-cols-1 gap-3 @md:grid-cols-2 @xl:grid-cols-3">
      {pivots.map((cap) => (
        <div key={cap.slug} className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-4">
          <SubClusterStatusCell
            subClusterSlug={cap.slug}
            lifecycleState={cap.lifecycle as SubClusterLifecycleState}
            connectorResult={deriveConnector(cap)}
          />
          <p className="text-xs text-foreground-secondary">{cap.description}</p>
          <div className="mt-auto">
            <ReviewButton onClick={() => onReview(cap.slug as PivotSlug)} />
          </div>
        </div>
      ))}
    </div>
  );
}

function HubDetailView({
  pivots,
  strategyId,
  selected,
  onSelect,
  detailCap,
  deriveConnector,
}: {
  pivots: PivotCapability[];
  strategyId: string;
  selected: PivotSlug | null;
  onSelect: (slug: PivotSlug) => void;
  detailCap: PivotCapability | null;
  deriveConnector: (cap: PivotCapability) => ConnectorResult<unknown> | undefined;
}) {
  return (
    <div className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,18rem)_1fr]">
      <ul className="overflow-hidden rounded-lg ring-1 ring-inset ring-border" role="listbox" aria-label="Sous-clusters pivot">
        {pivots.map((cap) => {
          const active = cap.slug === selected;
          return (
            <li key={cap.slug} className="border-b border-border last:border-b-0">
              <button
                type="button"
                role="option"
                aria-selected={active}
                onClick={() => onSelect(cap.slug as PivotSlug)}
                className={`w-full px-3 py-3 text-left transition-colors ${
                  active ? "bg-surface-secondary" : "bg-surface hover:bg-surface-secondary"
                }`}
              >
                <SubClusterStatusCell
                  subClusterSlug={cap.slug}
                  lifecycleState={cap.lifecycle as SubClusterLifecycleState}
                  connectorResult={deriveConnector(cap)}
                />
              </button>
            </li>
          );
        })}
      </ul>
      <div>
        {detailCap ? (
          <CalibrationReviewPanel
            host="inline"
            strategyId={strategyId}
            subClusterSlug={detailCap.slug as PivotSlug}
            lifecycleState={detailCap.lifecycle as SubClusterLifecycleState}
          />
        ) : (
          <div className="flex h-full min-h-[8rem] items-center justify-center rounded-lg border border-dashed border-border text-xs text-foreground-secondary">
            Sélectionnez un sous-cluster pour réviser sa calibration.
          </div>
        )}
      </div>
    </div>
  );
}
