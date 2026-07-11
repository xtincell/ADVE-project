"use client";

/**
 * ProvenancePopover — Phase 23 Epic 6 Story 6.6 (UX-DR7).
 *
 * The one-hop "où est-ce que ça vient ?" pattern. A thin composition over the
 * `popover` primitive (no new primitive) used at four call sites : the hub
 * status grid (Story 6.5), the CalibrationReviewPanel (Story 6.4), the
 * OvertonRadar events (Epic 7), and the Cockpit lineage scores (Story 4.7).
 *
 * It reaches the signal source or the calibration snapshot in **one hop** — a
 * link to `refUrl`, never a full navigation flow. The trigger is a small native
 * button (keyboard-focusable, `aria-haspopup` handled by the primitive) so the
 * pattern is axe-clean and screen-reader-navigable.
 *
 * DS rigour : semantic design tokens only, composes `Popover` + `Badge`
 * primitives, no raw colour classes.
 */

import Link from "next/link";
import { Info, ExternalLink, Radio, Users, FlaskConical, PencilLine } from "lucide-react";
import { Popover } from "@/components/primitives/popover";

export type ProvenanceSource =
  | "tarsis-signal"
  | "crm-signal"
  | "calibration-snapshot"
  | "manual-entry";

const SOURCE_PRESENTATION: Record<
  ProvenanceSource,
  { label: string; Icon: typeof Info; linkLabel: string }
> = {
  "tarsis-signal": { label: "Signal de veille sectorielle", Icon: Radio, linkLabel: "Voir la source du signal" },
  "crm-signal": { label: "Signal CRM", Icon: Users, linkLabel: "Voir la source CRM" },
  "calibration-snapshot": {
    label: "Snapshot de calibration",
    Icon: FlaskConical,
    linkLabel: "Voir le snapshot",
  },
  "manual-entry": {
    label: "Saisie manuelle opérateur",
    Icon: PencilLine,
    linkLabel: "Voir l'entrée manuelle",
  },
};

export interface ProvenancePopoverProps {
  /** Where the surfaced value came from — drives the label + icon. */
  source: ProvenanceSource;
  /** One-hop link to the source (signal page, snapshot, manual-entry audit row). */
  refUrl: string;
  /** Accessible label for the trigger. Defaults to "Provenance". */
  triggerLabel?: string;
  className?: string;
}

export function ProvenancePopover({
  source,
  refUrl,
  triggerLabel = "Provenance",
  className,
}: ProvenancePopoverProps) {
  const meta = SOURCE_PRESENTATION[source];
  const SourceIcon = meta.Icon;

  return (
    <Popover
      side="top"
      align="start"
      className={["w-64", className].filter(Boolean).join(" ")}
      trigger={
        <button
          type="button"
          aria-label={triggerLabel}
          className="inline-flex h-5 w-5 items-center justify-center rounded text-foreground-secondary hover:text-foreground"
        >
          <Info className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
      }
    >
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
          <SourceIcon className="h-3.5 w-3.5 text-accent" aria-hidden="true" />
          {meta.label}
        </div>
        <Link
          href={refUrl}
          className="inline-flex items-center gap-1.5 text-xs text-accent underline underline-offset-2 hover:text-accent-hover"
        >
          <ExternalLink className="h-3 w-3" aria-hidden="true" />
          {meta.linkLabel}
        </Link>
      </div>
    </Popover>
  );
}
