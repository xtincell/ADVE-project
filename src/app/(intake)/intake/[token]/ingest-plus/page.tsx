// ============================================================================
// MODULE M35 — Quick Intake: Ingest Plus Method (Documents + Online Scan)
// Upload files + provide URL → AI extracts + scrapes → ADVE-RTIS → Score
// ROUTE: /intake/[token]/ingest-plus
// ============================================================================

"use client";

import { useState, useEffect, useRef, use } from "react";
import { useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc/client";
import {
  Globe, Upload, FileUp, File, X, ArrowLeft, AlertCircle,
  CheckCircle, Link2, Camera, Users, Briefcase,
} from "lucide-react";
import { AiBadge } from "@/components/shared/ai-badge";
import { IntakeProcessingScreen } from "@/components/intake/intake-processing-screen";
import { useIntakeProcessingWatch, failureReasonKey } from "@/components/intake/use-intake-processing-watch";
import { ReceivedIntakeDocuments, readIntakeFile } from "@/components/intake/received-documents";
import { useT } from "@/lib/i18n/use-t";

const ACCEPTED_EXTENSIONS = ".pdf,.docx,.pptx,.txt";
const MAX_FILE_SIZE = 10 * 1024 * 1024;

interface SelectedFile {
  file: File;
  name: string;
  size: string;
  type: string;
}

export default function IngestPlusIntakePage({ params }: { params: Promise<{ token: string }> }) {
  const { t } = useT();
  const { token } = use(params);
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<SelectedFile[]>([]);
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [socialUrls, setSocialUrls] = useState({
    instagram: "",
    facebook: "",
    linkedin: "",
  });
  const fieldsPrefilledRef = useRef(false);
  const [extraUrls, setExtraUrls] = useState<string[]>([]);
  const [savingSources, setSavingSources] = useState(false);
  const [uploadProgress, setUploadProgress] = useState("");
  const [error, setError] = useState("");
  const [dragActive, setDragActive] = useState(false);

  const { data: intake, isLoading, refetch } = trpc.quickIntake.getByToken.useQuery(
    { token },
    { enabled: !!token }
  );

  useEffect(() => {
    if (!fieldsPrefilledRef.current && intake) {
      fieldsPrefilledRef.current = true;
      setWebsiteUrl(intake.websiteUrl ?? "");
      const links = intake.socialLinksRaw?.split(/\r?\n/).filter(Boolean) ?? [];
      const restored = { instagram: "", facebook: "", linkedin: "" };
      const other: string[] = [];
      for (const link of links) {
        const network = (["instagram", "facebook", "linkedin"] as const).find(key => {
          try { return new URL(link).hostname.replace(/^www\./, "") === `${key}.com`; } catch { return false; }
        });
        if (network && !restored[network]) restored[network] = link;
        else other.push(link);
      }
      setSocialUrls(restored);
      setExtraUrls(other);
    }
  }, [intake]);
  const saveSourcesMutation = trpc.quickIntake.processIngestPlus.useMutation();

  // F1 async : ack immédiat { status: "PROCESSING" }, puis suivi getByToken
  // jusqu'à l'état TERMINAL réel — redirection sur COMPLETED uniquement,
  // message honnête sur FAILED (retry sans rien perdre). Couvre aussi la
  // coupure réseau (row restée IN_PROGRESS = lancement perdu → « timeout »).
  const { watching, stage, startWatching } = useIntakeProcessingWatch(token, (outcome) => {
    if (outcome.status === "COMPLETED") {
      router.push(`/intake/${token}/result`);
      return;
    }
    setError(t(failureReasonKey(outcome.reason)));
  });

  const processIngestPlusMutation = trpc.quickIntake.processIngestPlus.useMutation({
    onSuccess: (data) => {
      if (data.status === "PROCESSING") startWatching();
    },
    onError: (err) => {
      if (isNetworkCut(err.message)) {
        startWatching();
        return;
      }
      setError(err.message);
    },
  });

  // Un retour sur la page pendant qu'un traitement tourne reprend le suivi.
  useEffect(() => {
    if (intake?.status === "PROCESSING" && !watching) startWatching();
  }, [intake?.status, watching, startWatching]);

  if (isLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </main>
    );
  }

  if (!intake) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-background px-5">
        <h1 className="text-2xl font-bold text-destructive">{t("intakeIngest.notFound")}</h1>
      </main>
    );
  }

  if (intake.status === "COMPLETED" || intake.status === "CONVERTED") {
    router.push(`/intake/${token}/result`);
    return null;
  }

  if (processIngestPlusMutation.isPending || watching) {
    return (
      <IntakeProcessingScreen
        companyName={intake.companyName}
        isPending
        stage={stage}
        errorMessage={error || undefined}
      />
    );
  }

  const formatSize = (bytes: number) => {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const addFiles = (fileList: FileList | null) => {
    if (!fileList || savingSources) return;
    setError("");
    const newFiles: SelectedFile[] = [];
    for (const file of Array.from(fileList)) {
      if (file.size > MAX_FILE_SIZE) {
        setError(`${t("intakeIngest.err.tooBig")} ${file.name}`);
        continue;
      }
      if (!file.name.match(/\.(pdf|docx|pptx|txt)$/i)) {
        setError(`${t("intakeIngest.err.format")} ${file.name}. ${t("intakeIngest.err.formatAccepted")}`);
        continue;
      }
      if (files.length + newFiles.length >= 5) { setError(t("intakeIngest.err.maxFiles")); break; }
      newFiles.push({ file, name: file.name, size: formatSize(file.size), type: file.type });
    }
    setFiles((prev) => [...prev, ...newFiles]);
  };

  const removeFile = (index: number) => setFiles((prev) => prev.filter((_, i) => i !== index));

  const hasContent = files.length > 0 || intake.documents.length > 0 || websiteUrl.trim().length > 0
    || Object.values(socialUrls).some(url => url.trim()) || extraUrls.length > 0;

  const handleSubmit = async () => {
    if (savingSources || processIngestPlusMutation.isPending) return;
    if (!hasContent) {
      setError(t("intakeIngest.plus.errEmpty"));
      return;
    }
    setError("");
    setSavingSources(true);
    try {
      const fields = { token, prepareOnly: true, websiteUrl: websiteUrl.trim() || undefined,
        urls: [socialUrls.instagram.trim(), socialUrls.facebook.trim(), socialUrls.linkedin.trim(), ...extraUrls].filter(Boolean) };
      await saveSourcesMutation.mutateAsync({ ...fields, files: [] });
      for (const [index, selected] of files.entries()) {
        setUploadProgress(`${index + 1}/${files.length} · ${selected.name}`);
        await saveSourcesMutation.mutateAsync({ ...fields, files: [{ name: selected.name,
          type: selected.type, content: await readIntakeFile(selected.file) }] });
      }
      setFiles([]);
      await refetch();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("intakeIngest.received.failed"));
      await refetch();
      return;
    } finally {
      setSavingSources(false);
      setUploadProgress("");
    }
    processIngestPlusMutation.mutate({ token, files: [] });
  };

  const inputClass =
    "w-full rounded-xl border border-border bg-background-raised px-4 py-3 text-sm text-foreground outline-none transition-colors placeholder:text-foreground-muted focus:border-primary focus:ring-1 focus:ring-primary";

  return (
    <main className="flex min-h-screen flex-col bg-background">
      <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-5 py-8 sm:px-8">
        {/* Back */}
        <button
          onClick={() => router.push(`/intake/${token}`)}
          className="mb-6 flex items-center gap-1.5 text-sm text-foreground-muted transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          {t("intakeIngest.plus.back")}
        </button>

        {/* Header */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-subtle">
            <Globe className="h-7 w-7 text-primary" />
          </div>
          <h1 className="flex items-center justify-center gap-2 text-2xl font-bold text-foreground sm:text-3xl">
            {t("intakeIngest.plus.title")} <AiBadge />
          </h1>
          <p className="mt-2 text-sm text-foreground-secondary">
            {t("intakeIngest.plus.subBefore")} <span className="font-semibold text-primary">{intake.companyName}</span>{t("intakeIngest.plus.subAfter")}
          </p>
        </div>

        {/* Section 1: Website URL */}
        <div className="mb-6">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
            <Link2 className="h-4 w-4 text-primary" />
            {t("intakeIngest.plus.website")}
          </h3>
          <input
            disabled={savingSources}
            type="url"
            value={websiteUrl}
            onChange={(e) => setWebsiteUrl(e.target.value)}
            className={inputClass}
            placeholder={t("intakeIngest.plus.websitePlaceholder")}
          />
        </div>

        {/* Section 2: Social URLs */}
        <div className="mb-6 space-y-3">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
            {t("intakeIngest.plus.social")} <span className="text-xs font-normal text-foreground-muted">{t("intakeIngest.optionalSuffix")}</span>
          </h3>
          <div className="flex items-center gap-3">
            <Camera className="h-4 w-4 shrink-0 text-foreground-muted" />
            <input
              disabled={savingSources}
            type="url"
              value={socialUrls.instagram}
              onChange={(e) => setSocialUrls({ ...socialUrls, instagram: e.target.value })}
              className={inputClass}
              placeholder={t("intakeIngest.plus.instagramPlaceholder")}
            />
          </div>
          <div className="flex items-center gap-3">
            <Users className="h-4 w-4 shrink-0 text-foreground-muted" />
            <input
              disabled={savingSources}
            type="url"
              value={socialUrls.facebook}
              onChange={(e) => setSocialUrls({ ...socialUrls, facebook: e.target.value })}
              className={inputClass}
              placeholder={t("intakeIngest.plus.facebookPlaceholder")}
            />
          </div>
          <div className="flex items-center gap-3">
            <Briefcase className="h-4 w-4 shrink-0 text-foreground-muted" />
            <input
              disabled={savingSources}
            type="url"
              value={socialUrls.linkedin}
              onChange={(e) => setSocialUrls({ ...socialUrls, linkedin: e.target.value })}
              className={inputClass}
              placeholder={t("intakeIngest.plus.linkedinPlaceholder")}
            />
          </div>
        </div>

        {/* Section 3: File upload */}
        <div className="mb-6">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
            <Upload className="h-4 w-4 text-primary" />
            {t("intakeIngest.plus.docs")} <span className="text-xs font-normal text-foreground-muted">{t("intakeIngest.optionalSuffix")}</span>
          </h3>
          <div
            onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
            onDragLeave={() => setDragActive(false)}
            onDrop={(e) => { e.preventDefault(); setDragActive(false); addFiles(e.dataTransfer.files); }}
            onClick={() => fileInputRef.current?.click()}
            className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-8 transition-all ${
              dragActive ? "border-primary bg-primary-subtle/20" : "border-border bg-background-raised hover:border-foreground-muted/30"
            }`}
          >
            <FileUp className="h-8 w-8 text-foreground-muted" />
            <p className="mt-2 text-sm text-foreground-muted">
              {t("intakeIngest.plus.dropBefore")} <span className="text-primary">{t("intakeIngest.drop.browse")}</span>
            </p>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept={ACCEPTED_EXTENSIONS}
              onChange={(e) => addFiles(e.target.files)}
              className="hidden"
            />
          </div>

          {files.length > 0 && (
            <div className="mt-3 space-y-2">
              {files.map((f, i) => (
                <div key={i} className="flex items-center justify-between rounded-lg border border-border bg-background-raised px-4 py-2.5">
                  <div className="flex items-center gap-2">
                    <File className="h-4 w-4 text-primary" />
                    <span className="text-sm text-foreground">{f.name}</span>
                    <span className="text-xs text-foreground-muted">{f.size}</span>
                  </div>
                  <button onClick={() => removeFile(i)} className="text-foreground-muted hover:text-destructive">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <ReceivedIntakeDocuments documents={intake.documents} />

        {error && (
          <div className="mt-4 flex items-center gap-2 rounded-lg bg-destructive-subtle/30 px-4 py-3 text-sm text-destructive">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {error}
          </div>
        )}

        {/* Submit */}
        <div className="sticky bottom-4 mt-6 sm:static sm:bottom-auto">
          <button
            onClick={handleSubmit}
            disabled={savingSources || processIngestPlusMutation.isPending || !hasContent}
            className="w-full rounded-xl bg-primary px-6 py-4 text-base font-semibold text-primary-foreground shadow-lg transition-all hover:bg-primary-hover disabled:opacity-50 sm:py-3 sm:shadow-none"
          >
            {savingSources || processIngestPlusMutation.isPending ? (
              <span className="flex items-center justify-center gap-2">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                {savingSources ? `${t("intakeIngest.received.saving")} ${uploadProgress}` : t("intakeIngest.plus.pending")}
              </span>
            ) : (
              t("intakeIngest.plus.cta")
            )}
          </button>
        </div>
      </div>
    </main>
  );
}

// Distingue une coupure RÉSEAU / proxy d'une vraie erreur applicative tRPC.
function isNetworkCut(message: string): boolean {
  return /load failed|failed to fetch|networkerror|network error|timed?\s?out|timeout|aborted|fetch failed|err_/i.test(
    message,
  );
}
