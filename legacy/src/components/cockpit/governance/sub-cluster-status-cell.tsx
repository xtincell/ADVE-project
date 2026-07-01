"use client";

/**
 * SubClusterStatusCell — Phase 23 Epic 6 Story 6.6 (UX-DR6 + UX-DR12).
 *
 * One reusable status cell for a pivot sub-cluster, used by the Console
 * campaign-tracker hub views (B1/B2/B3, Story 6.5), the CalibrationReviewPanel
 * (Story 6.4), and — in Epic 7 — the Cockpit OvertonRadar event surfaces and the
 * Story 4.7 lineage view. It renders a **status triad** : colour (Badge tone) +
 * shape (lucide icon) + text label — colour is never the sole signal carrier
 * (UX-DR12 / DESIGN-A11Y). It surfaces, side by side :
 *   - the lifecycle stage on the STUB → PARTIAL → MVP → PRODUCTION ladder ;
 *   - the connector / signal state derived from `ConnectorResult<T>` ;
 *   - the signal-freshness timestamp.
 *
 * When the connector is `DEFERRED_AWAITING_CREDENTIALS`, the cell renders a
 * "Configurer le connecteur" cross-link to `/console/anubis/credentials`
 * (canonical ownership — the Credentials Vault, ADR-0021). `DEFERRED` uses the
 * **info** tone, never warning/error — ship-without-keys is an expected state
 * (UX-DR12).
 *
 * DS rigour (lives under `src/components/**`) : semantic design tokens only (no
 * raw zinc/violet/emerald classes), status conveyed through the `Badge` primitive
 * (its own CVA tones), keyboard-navigable (the only interactive node is a native
 * link), axe-clean.
 */

import Link from "next/link";
import {
  MinusCircle,
  AlertTriangle,
  CircleDot,
  CheckCircle2,
  Radio,
  PlugZap,
  PauseCircle,
} from "lucide-react";
import { Badge, type BadgeProps } from "@/components/primitives/badge";
import type { ConnectorResult, ConnectorDegradationReason } from "@/domain/connector-result";

export type SubClusterLifecycleState = "STUB" | "PARTIAL" | "MVP" | "PRODUCTION";

type Tone = NonNullable<BadgeProps["tone"]>;
type IconType = typeof MinusCircle;

const LIFECYCLE_PRESENTATION: Record<
  SubClusterLifecycleState,
  { tone: Tone; Icon: IconType; label: string }
> = {
  STUB: { tone: "neutral", Icon: MinusCircle, label: "STUB" },
  PARTIAL: { tone: "warning", Icon: AlertTriangle, label: "PARTIAL" },
  MVP: { tone: "accent", Icon: CircleDot, label: "MVP" },
  PRODUCTION: { tone: "success", Icon: CheckCircle2, label: "PRODUCTION" },
};

const DEGRADATION_LABEL: Record<ConnectorDegradationReason, string> = {
  INSUFFICIENT_DATA: "Signal insuffisant",
  VENDOR_OUTAGE: "Panne fournisseur",
  RATE_LIMITED: "Quota dépassé",
  AUTH_REVOKED: "Accès révoqué",
};

const CREDENTIALS_VAULT_URL = "/console/anubis/credentials";

function formatFreshness(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });
}

export interface SubClusterStatusCellProps {
  /** Pivot sub-cluster slug (e.g. `superfan.attribution`, `culture.overtonShift`). */
  subClusterSlug: string;
  /** Current lifecycle ladder stage. */
  lifecycleState: SubClusterLifecycleState;
  /** Latest connector signal state (`ConnectorResult<unknown>`). Optional — a
   *  sub-cluster with no external connector (e.g. a pure-compute one) omits it. */
  connectorResult?: ConnectorResult<unknown>;
  /** ISO 8601 timestamp of the last observed signal, for the freshness line. */
  lastSignalAt?: string | null;
  className?: string;
}

export function SubClusterStatusCell({
  subClusterSlug,
  lifecycleState,
  connectorResult,
  lastSignalAt,
  className,
}: SubClusterStatusCellProps) {
  const life = LIFECYCLE_PRESENTATION[lifecycleState];
  const LifeIcon = life.Icon;

  // Connector/signal triad — derived exhaustively from the union (no default else).
  let signal: { tone: Tone; Icon: IconType; label: string } | null = null;
  let deferred = false;
  if (connectorResult) {
    switch (connectorResult.state) {
      case "LIVE":
        signal = { tone: "success", Icon: Radio, label: "Signal actif" };
        break;
      case "DEFERRED_AWAITING_CREDENTIALS":
        signal = { tone: "info", Icon: PlugZap, label: "Connecteur à configurer" };
        deferred = true;
        break;
      case "DEGRADED":
        signal = {
          tone: "warning",
          Icon: PauseCircle,
          label: DEGRADATION_LABEL[connectorResult.reason],
        };
        break;
    }
  }

  const freshnessIso =
    lastSignalAt ??
    (connectorResult?.state === "LIVE"
      ? connectorResult.observedAt
      : connectorResult?.state === "DEGRADED"
        ? connectorResult.lastObservedAt
        : null);

  return (
    <div className={["flex flex-col gap-1.5", className].filter(Boolean).join(" ")}>
      <div className="flex flex-wrap items-center gap-2">
        <code className="font-mono text-xs text-foreground">{subClusterSlug}</code>
        <Badge tone={life.tone} className="gap-1">
          <LifeIcon className="h-3 w-3" aria-hidden="true" />
          {life.label}
        </Badge>
        {signal && (
          <Badge tone={signal.tone} className="gap-1">
            <signal.Icon className="h-3 w-3" aria-hidden="true" />
            {signal.label}
          </Badge>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2 text-2xs text-foreground-secondary">
        <span>Signal : {formatFreshness(freshnessIso)}</span>
        {deferred && (
          <Link
            href={CREDENTIALS_VAULT_URL}
            className="inline-flex items-center gap-1 rounded text-accent underline underline-offset-2 hover:text-accent-hover"
          >
            <PlugZap className="h-3 w-3" aria-hidden="true" />
            Configurer le connecteur
          </Link>
        )}
      </div>
    </div>
  );
}
