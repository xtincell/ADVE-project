"use client";

/** Existing operator tracker, scoped to the selected brand and original production receipts. */
import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { Badge, Button, Card, CardBody, Dialog, DialogFooter, Spinner, Text } from "@/components/primitives";
import { useT } from "@/lib/i18n/use-t";

const statusKeys: Record<string, string> = { DEFERRED: "deferred", CREATED: "created", IN_PROGRESS: "running",
  COMPLETED: "completed", FAILED: "failed", VETOED: "vetoed", EXPIRED: "expired" };
const kindKeys = new Set(["image", "video", "audio", "icon", "refine", "transform", "classify", "stock", "design"]);

export function PtahKilnTracker({ strategyId }: { strategyId: string }) {
  const { t, locale } = useT();
  const [status, setStatus] = useState<"DEFERRED" | undefined>("DEFERRED");
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ message: string; failed: boolean } | null>(null);
  const tasks = trpc.ptah.listForges.useInfiniteQuery({ strategyId, limit: 20, status }, {
    getNextPageParam: page => page.length === 20 ? { id: page[page.length - 1]!.id, createdAt: page[page.length - 1]!.createdAt } : undefined,
    refetchInterval: 10_000,
  });
  const services = trpc.ptah.listProviderHealth.useQuery(undefined, { refetchInterval: 30_000 });
  const resume = trpc.ptah.materializeBrief.useMutation({
    onSuccess: result => {
      const message = result.submissionUnknown ? t("production.unknownSubmission")
        : result.status === "DEFERRED" ? t("production.stillDeferred") : t("production.resumed");
      setNotice({ message, failed: false }); void tasks.refetch();
    },
    onError: error => { setNotice({ message: error.message || t("production.resumeError"), failed: true }); void tasks.refetch(); },
  });
  const rows = tasks.data?.pages.flat() ?? [];
  const money = (amount: number) => new Intl.NumberFormat(locale, { style: "currency", currency: "USD", maximumFractionDigits: 3 }).format(amount);
  return <Card>
    <CardBody className="space-y-4" data-testid="production-tracker">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><h2 className="text-lg font-semibold text-foreground">{t("production.title")}</h2>
          <Text variant="caption">{t("production.description")}</Text></div>
        <Button variant="outline" size="sm" loading={tasks.isFetching} onClick={() => void tasks.refetch()}>{t("production.refresh")}</Button>
      </div>
      <div className="flex flex-wrap gap-2" role="group" aria-label={t("production.title")}>
        <Button variant={status ? "primary" : "outline"} size="sm" aria-pressed={Boolean(status)} onClick={() => setStatus("DEFERRED")}>{t("production.waiting")}</Button>
        <Button variant={!status ? "primary" : "outline"} size="sm" aria-pressed={!status} onClick={() => setStatus(undefined)}>{t("production.all")}</Button>
      </div>
      {notice && <Text role="status" tone={notice.failed ? "error" : "warning"} className="break-words">{notice.message}</Text>}
      {tasks.isLoading ? <div className="flex items-center gap-2"><Spinner size="sm" /><Text>{t("production.loading")}</Text></div>
        : tasks.isError ? <div role="alert" className="space-y-2"><Text tone="error">{t("production.loadError")}</Text>
          <Button variant="outline" size="sm" onClick={() => void tasks.refetch()}>{t("production.retry")}</Button></div>
        : rows.length === 0 ? <Text tone="muted">{t(status ? "production.emptyWaiting" : "production.empty")}</Text> : <div className="space-y-3">
          {rows.map(task => {
            const missingReceipt = task.status === "COMPLETED" && task.versions.length === 0;
            const unknownSubmission = task.submissionUnknown;
            const tone = missingReceipt || unknownSubmission || task.status === "DEFERRED" ? "warning"
              : task.status === "COMPLETED" ? "success" : ["FAILED", "VETOED", "EXPIRED"].includes(task.status) ? "error" : "info";
            return <div key={task.id} data-task-id={task.id} className="rounded-lg border border-border p-3 space-y-2 min-w-0">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0"><Text className="font-medium break-words">{task.briefTitle ?? task.campaignTitle ?? t("production.task")}</Text>
                  <Text variant="caption">{t("production." + (kindKeys.has(task.forgeKind) ? task.forgeKind : "task"))} · {new Date(task.createdAt).toLocaleString(locale)} · {task.id.slice(-8)}</Text></div>
                <Badge tone={tone}>{t("production." + (missingReceipt || unknownSubmission ? "unknown" : statusKeys[task.status] ?? "unknown"))}</Badge>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <Text variant="caption">{task.provider} · {task.realisedCostUsd !== null ? `${t("production.knownCost")} : ${money(task.realisedCostUsd)}`
                  : task.status !== "DEFERRED" && task.estimatedCostUsd > 0 ? `${t("production.estimate")} : ${money(task.estimatedCostUsd)}` : t("production.costUnknown")}</Text>
                {task.status === "DEFERRED" && <Button variant="outline" size="sm" disabled={resume.isPending} onClick={() => { setNotice(null); setConfirmId(task.id); }}>{t("production.resume")}</Button>}
              </div>
              {task.status === "DEFERRED" && <Text variant="caption" tone="warning">{t("production.configuration")}</Text>}
              {unknownSubmission && <Text variant="caption" tone="warning">{t("production.unknownSubmission")}</Text>}
              {missingReceipt && <Text variant="caption" tone="warning">{t("production.receiptMissing")}</Text>}
              {task.errorMessage && task.status !== "DEFERRED" && <Text variant="caption" tone="error" className="break-words">{task.errorMessage}</Text>}
            </div>;
          })}
          {tasks.hasNextPage && <Button variant="outline" loading={tasks.isFetchingNextPage} onClick={() => void tasks.fetchNextPage()}>{t("production.more")}</Button>}
        </div>}
      <details className="border-t border-border pt-3">
        <summary className="cursor-pointer text-sm text-foreground-secondary">{t("production.services")}</summary>
        {services.isLoading ? <Spinner size="sm" /> : services.isError ? <Text tone="warning">{t("production.healthError")}</Text>
          : <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 mt-3">{services.data?.knownProviders.map(service => {
            const health = services.data.health.find(h => h.provider === service.provider);
            return <div key={service.provider} className="border border-border rounded-lg p-3 space-y-1">
              <div className="flex flex-wrap gap-2 items-center"><Text className="font-medium">{service.provider}</Text>
                <Badge tone={service.available ? "info" : "warning"}>{t("production." + (service.available ? "available" : "unavailable"))}</Badge></div>
              {health && <Text variant="caption">{health.circuitState === "OPEN" ? t("production.circuitOpen") : health.circuitState === "HALF_OPEN" ? t("production.circuitTrial") : ""}
                {` · ${t("production.requests")} : ${health.totalRequests} · ${t("production.failures")} : ${health.totalFailures}`}</Text>}
            </div>;
          })}</div>}
      </details>
    </CardBody>
    <Dialog open={Boolean(confirmId)} onOpenChange={open => { if (!open && !resume.isPending) setConfirmId(null); }}
      dismissible={!resume.isPending} title={t("production.resumeTitle")} description={t("production.resumeMessage")}>
      <DialogFooter><Button variant="ghost" disabled={resume.isPending} onClick={() => setConfirmId(null)}>{t("production.cancel")}</Button>
        <Button loading={resume.isPending} disabled={!confirmId} onClick={() => { if (confirmId) { resume.mutate({ strategyId, resumeTaskId: confirmId }); setConfirmId(null); } }}>{t("production.confirm")}</Button></DialogFooter>
    </Dialog>
  </Card>;
}
