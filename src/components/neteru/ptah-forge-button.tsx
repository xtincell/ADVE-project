"use client";

/**
 * <PtahForgeButton> — bouton "Forge now" Phase 13 (B8 + R3, ADR-0014).
 *
 * Déclenche la matérialisation Ptah à la demande pour une section Oracle.
 * Cascade Glory→Brief→Forge hash-chain f9cd9de complète (oracleEnrichmentMode
 * = false hors enrichissement).
 *
 * Phase 13 R3 — closure résidu : affiche le résultat post-forge (taskId,
 * provider, estimatedCost, status) dans un panneau "Dernière forge"
 * collapsible.
 *
 * APOGEE — Sous-système Propulsion (Mission #1). Loi 3 (carburant) :
 * Thot CHECK_CAPACITY pre-flight via governedProcedure. Pilier 4 (Pre-conditions) :
 * RTIS_CASCADE gate enforced.
 *
 * Design System Phase 11 strict :
 * - Composition primitives (Button + Dialog + Spinner + Toast + Card + Tag + Badge)
 * - CVA non requis (state simple via React.useState)
 * - I18n FR uniquement pour ce sprint (clé t() à câbler post-merge)
 */

import * as React from "react";
import { trpc } from "@/lib/trpc/client";
import {
  Badge,
  Button,
  Card,
  CardBody,
  Dialog,
  DialogFooter,
  Spinner,
  Stack,
  Tag,
  Text,
} from "@/components/primitives";
import { useToast } from "@/components/shared/notification-toast";
// Phase 13 R6 — i18n FR/EN
import { useT } from "@/lib/i18n/use-t";
import { OperatorSurface } from "@/components/cockpit/operator-surface";

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

/**
 * Phase 13 R3 — résultat d'une forge Ptah pour affichage post-mutation.
 * Shape inferred du output `forgeForSection` tRPC (B8) : `result.output` contient
 * le ForgeTaskCreated de Ptah (taskId, provider, providerModel, estimatedCostUsd,
 * status). L'AssetVersion arrive plus tard via PTAH_RECONCILE_TASK webhook.
 */
interface ForgeResultDisplay {
  status: "OK" | "VETOED" | "FAILED" | "DOWNGRADED" | "QUEUED";
  summary: string;
  taskId?: string;
  taskStatus?: string;
  provider?: string;
  providerModel?: string;
  estimatedCostUsd?: number;
  brandAssetId?: string;
  reason?: string | null;
  timestamp: string;
}

function extractForgeResult(data: {
  status: string;
  summary: string;
  reason: string | null;
  output: unknown;
  brandAssetId: string;
  message: string;
}): ForgeResultDisplay {
  const output = (data.output ?? {}) as Record<string, unknown>;
  return {
    status: data.status as ForgeResultDisplay["status"],
    summary: data.summary || data.message,
    taskId: typeof output.taskId === "string" ? output.taskId : undefined,
    taskStatus: typeof output.status === "string" ? output.status : undefined,
    provider: typeof output.provider === "string" ? output.provider : undefined,
    providerModel: typeof output.providerModel === "string" ? output.providerModel : undefined,
    estimatedCostUsd: typeof output.estimatedCostUsd === "number" ? output.estimatedCostUsd : undefined,
    brandAssetId: data.brandAssetId,
    reason: data.reason,
    timestamp: new Date().toISOString(),
  };
}

/** Acknowledging the request never proves that production has run. */
function productionReceipt(result: ForgeResultDisplay, t: (key: string) => string) {
  if (result.status !== "OK") return null;
  const state = result.taskStatus === "DEFERRED" ? "deferred"
    : result.taskStatus === "CREATED" ? "created"
      : result.taskStatus === "IN_PROGRESS" ? "in_progress" : "unknown";
  return {
    label: t(`oracle.forge.result.${state}`),
    note: t(`oracle.forge.result.${state}_note`),
    tone: state === "deferred" ? "warning" as const : "info" as const,
  };
}

function requestLabel(result: ForgeResultDisplay, t: (key: string) => string) {
  const state = result.status === "OK" ? "ok"
    : result.status === "VETOED" ? "vetoed"
      : result.status === "FAILED" ? "failed"
        : result.status === "QUEUED" ? "queued"
          : result.status === "DOWNGRADED" ? "downgraded" : "unknown";
  return t(`oracle.forge.request.${state}`);
}

export function PtahForgeButton(props: PtahForgeButtonProps) {
  return (
    <OperatorSurface>
      <PtahForgeControl {...props} />
    </OperatorSurface>
  );
}

function PtahForgeControl({
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
  const [lastResult, setLastResult] = React.useState<ForgeResultDisplay | null>(null);
  const toast = useToast();
  const { t } = useT();

  const forgeMutation = trpc.strategyPresentation.forgeForSection.useMutation({
    onSuccess: (data) => {
      setConfirmOpen(false);
      const result = extractForgeResult(data);
      const receipt = productionReceipt(result, t);
      const variant = receipt?.tone ?? (data.status === "VETOED" ? "warning" : data.status === "FAILED" ? "error" : "info");
      toast.toast(receipt?.note ?? `${requestLabel(result, t)}: ${data.summary || data.message}`, variant);
      setLastResult(result);
    },
    onError: (err) => {
      setConfirmOpen(false);
      toast.error(`${t("oracle.forge.request.failed")}: ${err.message}`);
      setLastResult({
        status: "FAILED",
        summary: err.message,
        timestamp: new Date().toISOString(),
      });
    },
  });

  // Phase 13 R6 — label via i18n (clé oracle.forge.button.<forgeKind>) ou
  // override custom via prop label (ex: "Forger Portfolio Figma" reste FR
  // hardcoded car spécifique à BCG).
  const buttonLabel =
    label ??
    `${t(`oracle.forge.button.${forgeKind}`)}${providerHint ? ` (${providerHint})` : ""}`;
  const receipt = lastResult ? productionReceipt(lastResult, t) : null;

  return (
    <Stack direction="col" gap={2}>
      <Stack direction="row" justify="end" align="center" gap={2}>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setConfirmOpen(true)}
          disabled={forgeMutation.isPending}
        >
          {forgeMutation.isPending ? <Spinner size="sm" /> : null}
          {forgeMutation.isPending ? t("oracle.forge.button.pending") : buttonLabel}
        </Button>
      </Stack>

      {/* Phase 13 R3 + R6 — panneau "Dernière forge" affiché après une mutation */}
      {lastResult ? (
        <Card surface="outlined" role="status">
          <CardBody>
            <Stack direction="col" gap={2}>
              <Stack direction="row" justify="between" align="center" gap={2}>
                <Text variant="caption" tone="muted">
                  {t("oracle.forge.result.heading")} — {new Date(lastResult.timestamp).toLocaleTimeString("fr-FR")}
                </Text>
                <Badge
                  tone={
                    lastResult.status === "OK"
                      ? "neutral"
                      : lastResult.status === "VETOED"
                        ? "warning"
                        : lastResult.status === "FAILED"
                          ? "error"
                          : "neutral"
                  }
                >
                  {requestLabel(lastResult, t)}
                </Badge>
              </Stack>
              {receipt ? <Badge tone={receipt.tone}>{receipt.label}</Badge> : null}
              <Text variant="body">{receipt?.note ?? lastResult.summary}</Text>
              {lastResult.reason ? (
                <Text variant="caption" tone="muted">
                  {t("oracle.forge.result.reason")} : {lastResult.reason}
                </Text>
              ) : null}
              {lastResult.taskId ||
              lastResult.provider ||
              lastResult.estimatedCostUsd !== undefined ||
              lastResult.brandAssetId ? (
                <Stack direction="row" gap={2}>
                  {lastResult.taskId ? (
                    <Tag>{t("oracle.forge.result.task")} : {lastResult.taskId.slice(0, 12)}…</Tag>
                  ) : null}
                  {lastResult.provider ? <Tag>{lastResult.provider}</Tag> : null}
                  {lastResult.providerModel ? <Tag>{lastResult.providerModel}</Tag> : null}
                  {lastResult.estimatedCostUsd !== undefined && lastResult.taskStatus !== "DEFERRED" ? (
                    <Tag>{t("oracle.forge.result.estimated_cost")} : ${lastResult.estimatedCostUsd.toFixed(3)}</Tag>
                  ) : null}
                  {lastResult.brandAssetId ? (
                    <Tag>{t("oracle.forge.result.source")} : {lastResult.brandAssetId.slice(0, 12)}…</Tag>
                  ) : null}
                </Stack>
              ) : null}
              {lastResult.status === "OK" && lastResult.taskId && ["CREATED", "IN_PROGRESS"].includes(lastResult.taskStatus ?? "") ? (
                <Text variant="caption" tone="muted">
                  {t("oracle.forge.result.async_note")}
                </Text>
              ) : null}
            </Stack>
          </CardBody>
        </Card>
      ) : null}

      <Dialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={t("oracle.forge.dialog.title")}
        description={t("oracle.forge.dialog.description")}
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
            {t("oracle.forge.dialog.cancel")}
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
            {t("oracle.forge.dialog.confirm")}
          </Button>
        </DialogFooter>
      </Dialog>
    </Stack>
  );
}
