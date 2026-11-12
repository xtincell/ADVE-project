"use client";

import { Download, FileCheck } from "lucide-react";
import { useT } from "@/lib/i18n/use-t";
import type { sourceOriginalSummary } from "@/domain/source-original";

type ReceivedDocument = {
  id: string;
  name: string;
  originalUrl: string;
  original: ReturnType<typeof sourceOriginalSummary>;
};

/** Receipt of bytes only: an original received is not an approved brand fact. */
export function ReceivedIntakeDocuments({ documents }: { documents: ReceivedDocument[] }) {
  const { t } = useT();
  if (!documents.length) return null;
  return (
    <section className="my-4 space-y-2" aria-label={t("intakeIngest.received.title")}>
      <h2 className="text-sm font-semibold text-foreground">{t("intakeIngest.received.title")}</h2>
      {documents.map(document => (
        <div key={document.id} className="flex items-center justify-between gap-3 rounded-lg border border-border bg-background-raised px-4 py-3">
          <div className="flex min-w-0 items-center gap-3">
            <FileCheck className="h-5 w-5 shrink-0 text-primary" />
            <div className="min-w-0">
              <p className="break-words text-sm font-medium text-foreground">{document.name}</p>
              <p className="text-xs text-foreground-muted">
                {t(document.original?.state === "STORED" ? "intakeIngest.received.stored" : "intakeIngest.received.pending")}
              </p>
            </div>
          </div>
          {document.original?.state === "STORED" && (
            <a href={document.originalUrl} download rel="noreferrer" className="shrink-0 text-sm font-medium text-primary hover:underline">
              <Download className="mr-1 inline h-4 w-4" />{t("intakeIngest.received.download")}
            </a>
          )}
        </div>
      ))}
    </section>
  );
}

/** One received file per request keeps the 10 MB bound below the HTTP limit. */
export function readIntakeFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(",")[1] ?? "");
    reader.onerror = () => reject(reader.error ?? new Error(file.name));
    reader.onabort = () => reject(new Error(file.name));
    reader.readAsDataURL(file);
  });
}
