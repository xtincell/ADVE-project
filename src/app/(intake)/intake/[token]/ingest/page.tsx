// ============================================================================
// MODULE M35 — Quick Intake: Ingest Method (Document Upload)
// Upload PDF/Word/PowerPoint → AI extracts ADVE-RTIS data → Score
// ROUTE: /intake/[token]/ingest
// ============================================================================

"use client";

import { useState, useRef, use } from "react";
import { useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc/client";
import { Upload, FileUp, File, X, ArrowLeft, AlertCircle, CheckCircle } from "lucide-react";
import { AiBadge } from "@/components/shared/ai-badge";

const ACCEPTED_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "text/plain",
];
const ACCEPTED_EXTENSIONS = ".pdf,.doc,.docx,.ppt,.pptx,.txt";
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

interface SelectedFile {
  file: File;
  name: string;
  size: string;
  type: string;
}

export default function IngestIntakePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<SelectedFile[]>([]);
  const [rawText, setRawText] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [error, setError] = useState("");
  const [dragActive, setDragActive] = useState(false);

  const { data: intake, isLoading } = trpc.quickIntake.getByToken.useQuery(
    { token },
    { enabled: !!token }
  );

  const processIngestMutation = trpc.quickIntake.processIngest.useMutation({
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
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const addFiles = (fileList: FileList | null) => {
    if (!fileList) return;
    setError("");
    const newFiles: SelectedFile[] = [];

    for (const file of Array.from(fileList)) {
      if (!ACCEPTED_TYPES.includes(file.type) && !file.name.match(/\.(pdf|docx?|pptx?|txt)$/i)) {
        setError(`Format non supporte : ${file.name}. Formats acceptes : PDF, Word, PowerPoint, TXT.`);
        continue;
      }
      if (file.size > MAX_FILE_SIZE) {
        setError(`Fichier trop volumineux : ${file.name} (max 10 MB).`);
        continue;
      }
      if (files.length + newFiles.length >= 5) {
        setError("Maximum 5 fichiers.");
        break;
      }
      newFiles.push({
        file,
        name: file.name,
        size: formatSize(file.size),
        type: file.type,
      });
    }

    setFiles((prev) => [...prev, ...newFiles]);
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (files.length === 0 && !rawText.trim() && !websiteUrl.trim()) {
      setError("Fournissez au moins un element : texte, document, ou URL.");
      return;
    }
    setError("");

    // Read files as base64 and send to backend
    const fileData: Array<{ name: string; content: string; type: string }> = [];
    for (const f of files) {
      const content = await readFileAsBase64(f.file);
      fileData.push({ name: f.name, content, type: f.type });
    }

    processIngestMutation.mutate({
      token,
      files: fileData,
      rawText: rawText.trim() || undefined,
      websiteUrl: websiteUrl.trim() || undefined,
    });
  };

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
            <Upload className="h-7 w-7 text-primary" />
          </div>
          <h1 className="flex items-center justify-center gap-2 text-2xl font-bold text-foreground sm:text-3xl">
            Decrivez votre marque <AiBadge />
          </h1>
          <p className="mt-2 text-sm text-foreground-secondary">
            Partagez ce que vous avez sur <span className="font-semibold text-primary">{intake.companyName}</span> — texte, documents, ou lien web. L'IA extraira les donnees ADVE.
          </p>
        </div>

        {/* Text input */}
        <div className="mb-6">
          <label htmlFor="rawText" className="mb-2 block text-sm font-medium text-foreground">
            Decrivez votre marque
          </label>
          <textarea
            id="rawText"
            value={rawText}
            onChange={(e) => setRawText(e.target.value)}
            rows={6}
            className="w-full rounded-xl border border-border bg-background-raised px-4 py-3 text-base text-foreground outline-none transition-colors placeholder:text-foreground-muted focus:border-primary focus:ring-1 focus:ring-primary resize-y"
            placeholder="Collez ici votre pitch, page 'A propos', brief marketing, description de votre marque... Tout texte qui decrit qui vous etes, ce qui vous differencie, et comment vous engagez vos clients."
          />
          <p className="mt-1 text-xs text-foreground-muted">
            {rawText.length > 0 ? `${rawText.length} caracteres` : "Optionnel — mais recommande pour un meilleur diagnostic"}
          </p>
        </div>

        {/* Website URL */}
        <div className="mb-6">
          <label htmlFor="websiteUrl" className="mb-2 block text-sm font-medium text-foreground">
            Site web (optionnel)
          </label>
          <input
            id="websiteUrl"
            type="url"
            value={websiteUrl}
            onChange={(e) => setWebsiteUrl(e.target.value)}
            className="w-full rounded-xl border border-border bg-background-raised px-4 py-3 text-base text-foreground outline-none transition-colors placeholder:text-foreground-muted focus:border-primary focus:ring-1 focus:ring-primary"
            placeholder="https://www.votremarque.com"
          />
        </div>

        {/* Documents — Drop zone */}
        <label className="mb-2 block text-sm font-medium text-foreground">
          Documents (optionnel)
        </label>
        <div
          onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
          onDragLeave={() => setDragActive(false)}
          onDrop={(e) => { e.preventDefault(); setDragActive(false); addFiles(e.dataTransfer.files); }}
          onClick={() => fileInputRef.current?.click()}
          className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-12 transition-all ${
            dragActive
              ? "border-primary bg-primary-subtle/20"
              : "border-border bg-background-raised hover:border-foreground-muted/30"
          }`}
        >
          <FileUp className={`h-10 w-10 ${dragActive ? "text-primary" : "text-foreground-muted"}`} />
          <p className="mt-3 text-sm font-medium text-foreground">
            Glissez vos fichiers ici ou <span className="text-primary">parcourir</span>
          </p>
          <p className="mt-1 text-xs text-foreground-muted">
            PDF, Word, PowerPoint, TXT — Max 10 MB par fichier — 5 fichiers max
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

        {/* File list */}
        {files.length > 0 && (
          <div className="mt-4 space-y-2">
            {files.map((f, i) => (
              <div key={i} className="flex items-center justify-between rounded-lg border border-border bg-background-raised px-4 py-3">
                <div className="flex items-center gap-3">
                  <File className="h-5 w-5 text-primary" />
                  <div>
                    <p className="text-sm font-medium text-foreground">{f.name}</p>
                    <p className="text-xs text-foreground-muted">{f.size}</p>
                  </div>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); removeFile(i); }}
                  className="rounded-lg p-1.5 text-foreground-muted transition-colors hover:bg-destructive-subtle hover:text-destructive"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Info */}
        <div className="mt-6 rounded-xl border border-border bg-background-raised p-4">
          <p className="mb-2 text-sm font-semibold text-foreground">Documents recommandes</p>
          <ul className="space-y-1 text-sm text-foreground-secondary">
            <li className="flex items-center gap-2"><CheckCircle className="h-3.5 w-3.5 text-success" /> Business plan ou pitch deck</li>
            <li className="flex items-center gap-2"><CheckCircle className="h-3.5 w-3.5 text-success" /> Brand book ou charte graphique</li>
            <li className="flex items-center gap-2"><CheckCircle className="h-3.5 w-3.5 text-success" /> Plan marketing ou brief creatif</li>
            <li className="flex items-center gap-2"><CheckCircle className="h-3.5 w-3.5 text-success" /> Description de l'entreprise (page A propos)</li>
          </ul>
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
            disabled={processIngestMutation.isPending || (files.length === 0 && !rawText.trim() && !websiteUrl.trim())}
            className="w-full rounded-xl bg-primary px-6 py-4 text-base font-semibold text-primary-foreground shadow-lg transition-all hover:bg-primary-hover disabled:opacity-50 sm:py-3 sm:shadow-none"
          >
            {processIngestMutation.isPending ? (
              <span className="flex items-center justify-center gap-2">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                Analyse en cours...
              </span>
            ) : (
              "Lancer le diagnostic ADVE"
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
      // Strip the data:... prefix
      const base64 = result.split(",")[1] ?? result;
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
