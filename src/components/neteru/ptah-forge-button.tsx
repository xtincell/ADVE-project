"use client";

/**
 * <PtahForgeButton> — bouton "Forge now" Phase 13 (B8, ADR-0014).
 *
 * Déclenche la matérialisation Ptah à la demande pour une section Oracle.
 * Cascade Glory→Brief→Forge hash-chain f9cd9de complète (oracleEnrichmentMode
 * = false hors enrichissement).
 *
 * APOGEE — Sous-système Propulsion (Mission #1). Loi 3 (carburant) :
 * Thot CHECK_CAPACITY pre-flight via governedProcedure. Pilier 4 (Pre-conditions) :
 * RTIS_CASCADE gate enforced.
 *
 * Design System Phase 11 strict :
 * - Composition primitives (Button + Dialog + Spinner + Toast)
 * - CVA non requis (state simple via React.useState)
 * - I18n FR uniquement pour ce sprint (clé t() à câbler post-merge)
 */

import * as React from "react";
import { trpc } from "@/lib/trpc/client";
import { Button, Dialog, DialogFooter, Spinner, Tag } from "@/components/primitives";
import { useToast } from "@/components/shared/notification-toast";

export interface PtahForgeButtonProps {
  strategyId: string;
  sectionId: string;
  brandAssetKind: string;
  forgeKind: "image" | "video" | "audio" | "icon" | "design";
  providerHint?: "magnific" | "adobe" | "figma" | "canva";
  modelHint?: string;
  manipulationMode?: "peddler" | "dealer" | "facilitator" | "entertainer";
  /** Label custom override pour le bouton (ex: "Forger Portfolio Figma"). */
  label?: string;
}

export function PtahForgeButton({
  strategyId,
  sectionId,
  brandAssetKind,
  forgeKind,
  providerHint,
  modelHint,
  manipulationMode,
  label,
}: PtahForgeButtonProps) {
  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const toast = useToast();

  const forgeMutation = trpc.strategyPresentation.forgeForSection.useMutation({
    onSuccess: (data) => {
      setConfirmOpen(false);
      const variant = data.status === "OK" ? "success" : data.status === "VETOED" ? "warning" : "info";
      toast.toast(`Forge ${data.status}: ${data.summary || data.message}`, variant);
    },
    onError: (err) => {
      setConfirmOpen(false);
      toast.error(`Forge échouée: ${err.message}`);
    },
  });

  const buttonLabel = label ?? `Forger ${forgeKind === "design" ? "deck" : forgeKind} ${providerHint ? `(${providerHint})` : ""}`;

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setConfirmOpen(true)}
        disabled={forgeMutation.isPending}
      >
        {forgeMutation.isPending ? <Spinner size="sm" /> : null}
        {forgeMutation.isPending ? "Forge en cours…" : buttonLabel}
      </Button>

      <Dialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Confirmer la matérialisation Ptah"
        description={`Cette action va déclencher une forge ${forgeKind} via Ptah pour la section ${sectionId}. Le coût sera vérifié par Thot avant exécution (cascade hash-chain Glory→Brief→Forge).`}
      >
        <div className="space-y-2">
          <div className="flex flex-wrap gap-2">
            <Tag>section: {sectionId}</Tag>
            <Tag>kind: {brandAssetKind}</Tag>
            <Tag>forge: {forgeKind}</Tag>
            {providerHint ? <Tag>provider: {providerHint}</Tag> : null}
            {modelHint ? <Tag>model: {modelHint}</Tag> : null}
            {manipulationMode ? <Tag>mode: {manipulationMode}</Tag> : null}
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setConfirmOpen(false)}>
            Annuler
          </Button>
          <Button
            variant="primary"
            onClick={() =>
              forgeMutation.mutate({
                strategyId,
                sectionId,
                brandAssetKind,
                forgeKind,
                providerHint,
                modelHint,
                manipulationMode,
              })
            }
            disabled={forgeMutation.isPending}
          >
            Confirmer la forge
          </Button>
        </DialogFooter>
      </Dialog>
    </>
  );
}
