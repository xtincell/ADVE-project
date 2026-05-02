// ============================================================================
// MODULE M35 — Quick Intake: Ingest Plus Method (Documents + Online Scan)
// Upload files + provide URL → AI extracts + scrapes → ADVE-RTIS → Score
// ROUTE: /intake/[token]/ingest-plus
// ============================================================================

"use client";

import { useState, useRef, use } from "react";
import { useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc/client";
import {
  Globe, Upload, FileUp, File, X, ArrowLeft, AlertCircle,
  CheckCircle, Link2, Camera, Users, Briefcase,
} from "lucide-react";
import { AiBadge } from "@/components/shared/ai-badge";

const ACCEPTED_EXTENSIONS = ".pdf,.doc,.docx,.ppt,.pptx,.txt";
const MAX_FILE_SIZE = 10 * 1024 * 1024;

interface SelectedFile {
  file: File;
  name: string;
  size: string;
  type: string;
}

export default function IngestPlusIntakePage({ params }: { params: Promise<{ token: string }> }) {
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
  const [error, setError] = useState("");
  const [dragActive, setDragActive] = useState(false);

  const { data: intake, isLoading } = trpc.quickIntake.getByToken.useQuery(
    { token },
    { enabled: !!token }
  );

  const processIngestPlusMutation = trpc.quickIntake.processIngestPlus.useMutation({
    onSuccess: () => {
      router.push(`/intake/${token}/result`);
    },
    onError: (err) => setError(err.message),
  });

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
        <h1 className="text-2xl font-bold text-destructive">Diagnostic introuvable</h1>
      </main>
    );
  }

  if (intake.status === "COMPLETED" || intake.status === "CONVERTED") {
    router.push(`/intake/${token}/result`);
    return null;
  }

  const formatSize = (bytes: number) => {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const addFiles = (fileList: FileList | null) => {
    if (!fileList) return;
    setError("");
    const newFiles: SelectedFile[] = [];
    for (const file of Array.from(fileList)) {
      if (file.size > MAX_FILE_SIZE) {
        setError(`Fichier trop volumineux : ${file.name}`);
        continue;
      }
      if (files.length + newFiles.length >= 5) break;
      newFiles.push({ file, name: file.name, size: formatSize(file.size), type: file.type });
    }
    setFiles((prev) => [...prev, ...newFiles]);
  };

  const removeFile = (index: number) => setFiles((prev) => prev.filter((_, i) => i !== index));

  const hasContent = files.length > 0 || websiteUrl.trim().length > 5;

  const handleSubmit = async () => {
    if (!hasContent) {
      setError("Ajoutez au moins un fichier ou un lien vers votre site web.");
      return;
    }
    setError("");

    const fileData: Array<{ name: string; content: string; type: string }> = [];
    for (const f of files) {
      const content = await readFileAsBase64(f.file);
      fileData.push({ name: f.name, content, type: f.type });
    }

    const urls = [
      websiteUrl.trim(),
      socialUrls.instagram.trim(),
      socialUrls.facebook.trim(),
      socialUrls.linkedin.trim(),
    ].filter(Boolean);

    processIngestPlusMutation.mutate({
      token,
      files: fileData.length > 0 ? fileData : undefined,
      urls: urls.length > 0 ? urls : undefined,
    });
  };

  const inputClass =
    "w-full rounded-xl border border-border bg-background-raised px-4 py-3 text-sm text-foreground outline-none transition-colors placeholder:text-foreground-muted focus:border-primary focus:ring-1 focus:ring-primary";

  return (
    <main className="flex min-h-screen flex-col bg-background">
      <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-5 py-8 sm:px-8">
        {/* Back */}
        <button
          onClick={() => router.push("/intake")}
          className="mb-6 flex items-center gap-1.5 text-sm text-foreground-muted transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Changer de methode
        </button>

        {/* Header */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-subtle">
            <Globe className="h-7 w-7 text-primary" />
          </div>
          <h1 className="flex items-center justify-center gap-2 text-2xl font-bold text-foreground sm:text-3xl">
            Import + Scan en ligne <AiBadge />
          </h1>
          <p className="mt-2 text-sm text-foreground-secondary">
            Documents + site web + reseaux sociaux pour un diagnostic complet de <span className="font-semibold text-primary">{intake.companyName}</span>.
          </p>
        </div>

        {/* Section 1: Website URL */}
        <div className="mb-6">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
            <Link2 className="h-4 w-4 text-primary" />
            Site web
          </h3>
          <input
            type="url"
            value={websiteUrl}
            onChange={(e) => setWebsiteUrl(e.target.value)}
            className={inputClass}
            placeholder="https://www.votre-marque.com"
          />
        </div>

        {/* Section 2: Social URLs */}
        <div className="mb-6 space-y-3">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
            Reseaux sociaux <span className="text-xs font-normal text-foreground-muted">(optionnel)</span>
          </h3>
          <div className="flex items-center gap-3">
            <Camera className="h-4 w-4 shrink-0 text-foreground-muted" />
            <input
              type="url"
              value={socialUrls.instagram}
              onChange={(e) => setSocialUrls({ ...socialUrls, instagram: e.target.value })}
              className={inputClass}
              placeholder="https://instagram.com/votre-marque"
            />
          </div>
          <div className="flex items-center gap-3">
            <Users className="h-4 w-4 shrink-0 text-foreground-muted" />
            <input
              type="url"
              value={socialUrls.facebook}
              onChange={(e) => setSocialUrls({ ...socialUrls, facebook: e.target.value })}
              className={inputClass}
              placeholder="https://facebook.com/votre-marque"
            />
          </div>
          <div className="flex items-center gap-3">
            <Briefcase className="h-4 w-4 shrink-0 text-foreground-muted" />
            <input
              type="url"
              value={socialUrls.linkedin}
              onChange={(e) => setSocialUrls({ ...socialUrls, linkedin: e.target.value })}
              className={inputClass}
              placeholder="https://linkedin.com/company/votre-marque"
            />
          </div>
        </div>

        {/* Section 3: File upload */}
        <div className="mb-6">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
            <Upload className="h-4 w-4 text-primary" />
            Documents <span className="text-xs font-normal text-foreground-muted">(optionnel)</span>
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
              Glissez vos fichiers ou <span className="text-primary">parcourir</span>
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
            disabled={processIngestPlusMutation.isPending || !hasContent}
            className="w-full rounded-xl bg-primary px-6 py-4 text-base font-semibold text-primary-foreground shadow-lg transition-all hover:bg-primary-hover disabled:opacity-50 sm:py-3 sm:shadow-none"
          >
            {processIngestPlusMutation.isPending ? (
              <span className="flex items-center justify-center gap-2">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                Scan et analyse en cours... (2-3 min)
              </span>
            ) : (
              "Lancer le diagnostic complet"
            )}
          </button>
        </div>
      </div>
    </main>
  );
}

function readFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(",")[1] ?? result;
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
