"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { trpc } from "@/lib/trpc/client";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { SkeletonPage } from "@/components/shared/loading-skeleton";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { PILLAR_NAMES, type PillarKey } from "@/lib/types/advertis-vector";
import { PILLAR_TAG_BG } from "@/components/shared/pillar-content-card";
import { useCurrentStrategyId } from "@/components/cockpit/strategy-context";
import {
  BookOpen,
  Download,
  RefreshCw,
  Share2,
  Copy,
  Check,
  AlertTriangle,
  ExternalLink,
  ChevronRight,
  Sparkles,
  Eye,
  Palette,
  Type,
  Camera,
  MessageSquare,
  Layout,
  ThumbsUp,
  ThumbsDown,
  History,
  CheckCircle2,
  Circle,
} from "lucide-react";

/* ---- section definitions ---- */

interface GuidelineSection {
  id: string;
  label: string;
  icon: React.ElementType;
  pillarSource?: PillarKey;
  htmlSelector?: string;
}

const SECTIONS: GuidelineSection[] = [
  { id: "brand-story", label: "Brand Story", icon: Sparkles, pillarSource: "a" },
  { id: "mission-vision", label: "Mission & Vision", icon: Eye, pillarSource: "s" },
  { id: "logo", label: "Logo", icon: Layout, pillarSource: "d" },
  { id: "colors", label: "Couleurs", icon: Palette, pillarSource: "d" },
  { id: "typography", label: "Typographie", icon: Type, pillarSource: "d" },
  { id: "photography", label: "Photographie", icon: Camera, pillarSource: "v" },
  { id: "voice", label: "Ton de voix", icon: MessageSquare, pillarSource: "e" },
  { id: "applications", label: "Applications", icon: Layout, pillarSource: "i" },
  { id: "dos-donts", label: "Do's & Don'ts", icon: ThumbsUp, pillarSource: "t" },
];

/* ---- helpers ---- */

function extractSectionContent(
  htmlContent: string,
  sectionId: string,
): string | null {
  // Try to match h2/h3 headings that correspond to sections
  const sectionMap: Record<string, string[]> = {
    "brand-story": ["brand story", "histoire de la marque", "notre histoire"],
    "mission-vision": ["mission", "vision", "mission et vision", "mission & vision"],
    logo: ["logo", "logotype"],
    colors: ["couleur", "color", "palette"],
    typography: ["typograph", "police", "font"],
    photography: ["photo", "imagerie", "image"],
    voice: ["ton", "voix", "voice", "tone"],
    applications: ["application", "usage", "utilisation"],
    "dos-donts": ["do", "don't", "a faire", "a eviter", "regles"],
  };

  const keywords = sectionMap[sectionId] ?? [];
  const parser = new DOMParser();
  const doc = parser.parseFromString(htmlContent, "text/html");
  const headings = doc.querySelectorAll("h1, h2, h3");

  for (const heading of headings) {
    const text = heading.textContent?.toLowerCase() ?? "";
    if (keywords.some((kw) => text.includes(kw))) {
      let content = "";
      let sibling = heading.nextElementSibling;
      while (sibling && !["H1", "H2", "H3"].includes(sibling.tagName)) {
        content += sibling.outerHTML;
        sibling = sibling.nextElementSibling;
      }
      return content || null;
    }
  }
  return null;
}

/* ---- main ---- */

export default function GuidelinesPage() {
  const strategyId = useCurrentStrategyId();
  const [copied, setCopied] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<string>("brand-story");
  const [showRegenerateConfirm, setShowRegenerateConfirm] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  const guidelinesQuery = trpc.guidelines.get.useQuery(
    { strategyId: strategyId! },
    { enabled: !!strategyId },
  );

  const generateMutation = trpc.guidelines.generate.useMutation({
    onSuccess: () => guidelinesQuery.refetch(),
  });

  const shareMutation = trpc.guidelines.shareLink.useMutation({
    onSuccess: (data) => setShareUrl(data.shareUrl),
  });

  if (!strategyId) {
    return <SkeletonPage />;
  }

  const guidelines = guidelinesQuery.data;
  const htmlContent =
    typeof guidelines === "string"
      ? guidelines
      : (guidelines as unknown as Record<string, unknown>)?.html as string | undefined;

  // Compute section fill status
  const sectionFilled = useMemo(() => {
    const filled: Record<string, boolean> = {};
    if (!htmlContent) return filled;
    for (const s of SECTIONS) {
      try {
        filled[s.id] = !!extractSectionContent(htmlContent, s.id);
      } catch {
        filled[s.id] = false;
      }
    }
    return filled;
  }, [htmlContent]);

  const filledCount = Object.values(sectionFilled).filter(Boolean).length;
  const completionPct = SECTIONS.length > 0 ? Math.round((filledCount / SECTIONS.length) * 100) : 0;

  // Generated date from query data
  const generatedDate = (guidelines as unknown as Record<string, unknown>)?.generatedAt as string | undefined;

  const handleGenerate = () => {
    if (!strategyId) return;
    generateMutation.mutate({ strategyId });
  };

  const handleExportPdf = () => {
    if (strategyId) {
      window.print();
    }
  };

  const handleExportHtml = () => {
    if (strategyId) {
      window.open(
        `/api/trpc/guidelines.export?input=${encodeURIComponent(JSON.stringify({ strategyId, format: "html" }))}`,
        "_blank",
      );
    }
  };

  const handleShare = () => {
    if (!strategyId) return;
    shareMutation.mutate({ strategyId });
  };

  const handleCopyLink = () => {
    if (shareUrl) {
      navigator.clipboard.writeText(window.location.origin + shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const scrollToSection = (sectionId: string) => {
    setActiveSection(sectionId);
    // Try scrolling to matching heading in the rendered content
    if (contentRef.current) {
      const headings = contentRef.current.querySelectorAll("h1, h2, h3");
      const sectionDef = SECTIONS.find((s) => s.id === sectionId);
      if (!sectionDef) return;
      const keywords: Record<string, string[]> = {
        "brand-story": ["brand story", "histoire"],
        "mission-vision": ["mission", "vision"],
        logo: ["logo"],
        colors: ["couleur", "color"],
        typography: ["typograph", "police"],
        photography: ["photo", "image"],
        voice: ["ton", "voix", "voice"],
        applications: ["application", "usage"],
        "dos-donts": ["do", "don't", "a faire"],
      };
      const kw = keywords[sectionId] ?? [];
      for (const h of headings) {
        const text = h.textContent?.toLowerCase() ?? "";
        if (kw.some((k) => text.includes(k))) {
          h.scrollIntoView({ behavior: "smooth", block: "start" });
          return;
        }
      }
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Guidelines de marque"
        description="Vos guidelines vivantes, generees a partir de votre profil ADVE-RTIS."
        breadcrumbs={[
          { label: "Cockpit", href: "/cockpit" },
          { label: "Marque" },
          { label: "Guidelines" },
        ]}
      >
        <button
          onClick={() => {
            if (htmlContent) {
              setShowRegenerateConfirm(true);
            } else {
              handleGenerate();
            }
          }}
          disabled={generateMutation.isPending}
          className="flex items-center gap-2 rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium text-foreground-secondary hover:bg-surface-raised disabled:opacity-50"
        >
          <RefreshCw
            className={`h-4 w-4 ${generateMutation.isPending ? "animate-spin" : ""}`}
          />
          {generateMutation.isPending ? "Generation..." : "Regenerer"}
        </button>
        <button
          onClick={handleExportPdf}
          className="flex items-center gap-2 rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium text-foreground-secondary hover:bg-surface-raised"
        >
          <Download className="h-4 w-4" />
          Exporter PDF
        </button>
        <button
          onClick={handleExportHtml}
          className="flex items-center gap-2 rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium text-foreground-secondary hover:bg-surface-raised"
        >
          <Download className="h-4 w-4" />
          Exporter HTML
        </button>
        <button
          onClick={handleShare}
          disabled={shareMutation.isPending}
          className="flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-medium text-foreground-muted hover:bg-foreground disabled:opacity-50"
        >
          <Share2 className="h-4 w-4" />
          Partager
        </button>
      </PageHeader>

      {/* Share URL banner */}
      {shareUrl && (
        <div className="flex items-center justify-between rounded-xl border border-border bg-background/80 px-4 py-3">
          <div className="flex items-center gap-2 text-sm text-foreground-secondary">
            <ExternalLink className="h-4 w-4 text-foreground-muted" />
            <code className="rounded bg-background px-2 py-0.5 text-xs">
              {window.location.origin + shareUrl}
            </code>
          </div>
          <button
            onClick={handleCopyLink}
            className="flex items-center gap-1 rounded-lg bg-background px-3 py-1.5 text-xs font-medium text-foreground-secondary hover:bg-surface-raised"
          >
            {copied ? (
              <>
                <Check className="h-3 w-3 text-success" /> Copie
              </>
            ) : (
              <>
                <Copy className="h-3 w-3" /> Copier
              </>
            )}
          </button>
        </div>
      )}

      {/* Completion indicator + last generated */}
      {htmlContent && (
        <div className="flex items-center justify-between rounded-xl border border-border bg-background/80 px-5 py-3">
          <div className="flex items-center gap-4">
            <div>
              <p className="text-xs font-medium text-foreground-muted">Completion</p>
              <p className="text-sm font-semibold text-white">{completionPct}%</p>
            </div>
            <div className="h-2 w-40 rounded-full bg-background">
              <div
                className="h-full rounded-full bg-accent transition-all"
                style={{ width: `${completionPct}%` }}
              />
            </div>
            <span className="text-xs text-foreground-muted">
              {filledCount}/{SECTIONS.length} sections
            </span>
          </div>
          {generatedDate && (
            <div className="flex items-center gap-2 text-xs text-foreground-muted">
              <History className="h-3.5 w-3.5" />
              Genere le{" "}
              {new Date(generatedDate).toLocaleDateString("fr-FR", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
            </div>
          )}
        </div>
      )}

      {/* Error state */}
      {guidelinesQuery.error && (
        <div className="rounded-xl border border-error/50 bg-error/20 p-6 text-center">
          <AlertTriangle className="mx-auto h-8 w-8 text-error" />
          <p className="mt-2 text-sm text-error">
            {guidelinesQuery.error.message}
          </p>
          <button
            onClick={handleGenerate}
            className="mt-3 rounded-lg bg-background px-4 py-2 text-sm text-white hover:bg-surface-raised"
          >
            Generer les guidelines
          </button>
        </div>
      )}

      {/* Loading */}
      {guidelinesQuery.isLoading && (
        <div className="space-y-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-20 animate-pulse rounded-xl bg-background" />
          ))}
        </div>
      )}

      {/* Main content with sidebar */}
      {!guidelinesQuery.isLoading && !guidelinesQuery.error && (
        <>
          {htmlContent ? (
            <div className="flex gap-6">
              {/* Section navigation sidebar */}
              <nav className="hidden lg:block w-56 shrink-0 space-y-1">
                <p className="mb-3 text-[10px] font-semibold uppercase tracking-wider text-foreground-muted">
                  Sections
                </p>
                {SECTIONS.map((section) => {
                  const Icon = section.icon;
                  const isFilled = sectionFilled[section.id];
                  const isActive = activeSection === section.id;
                  return (
                    <button
                      key={section.id}
                      onClick={() => scrollToSection(section.id)}
                      className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs transition-colors ${
                        isActive
                          ? "bg-background text-white"
                          : "text-foreground-secondary hover:text-foreground-secondary hover:bg-background/50"
                      }`}
                    >
                      <Icon className="h-3.5 w-3.5 shrink-0" />
                      <span className="flex-1 truncate">{section.label}</span>
                      {isFilled ? (
                        <CheckCircle2 className="h-3 w-3 shrink-0 text-success" />
                      ) : (
                        <Circle className="h-3 w-3 shrink-0 text-foreground-muted" />
                      )}
                    </button>
                  );
                })}

                {/* Pillar source legend */}
                <div className="mt-6 space-y-1 border-t border-border pt-4">
                  <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-foreground-muted">
                    Sources piliers
                  </p>
                  {SECTIONS.filter((s) => s.pillarSource).map((s) => (
                    <div key={s.id} className="flex items-center gap-1.5 text-[10px]">
                      <span
                        className={`rounded-full px-1.5 py-0.5 font-bold ${PILLAR_TAG_BG[s.pillarSource!]}`}
                      >
                        {s.pillarSource!.toUpperCase()}
                      </span>
                      <span className="text-foreground-muted">{s.label}</span>
                    </div>
                  ))}
                </div>
              </nav>

              {/* Content area */}
              <div className="flex-1 min-w-0">
                {/* Section cards rendered from HTML */}
                <div className="space-y-4">
                  {SECTIONS.map((section) => {
                    const Icon = section.icon;
                    let sectionHtml: string | null = null;
                    try {
                      sectionHtml = extractSectionContent(htmlContent, section.id);
                    } catch {
                      /* ignore parse errors */
                    }

                    return (
                      <div
                        key={section.id}
                        id={`section-${section.id}`}
                        className="rounded-xl border border-border bg-background/80 p-6"
                      >
                        <div className="mb-4 flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-background">
                              <Icon className="h-4 w-4 text-foreground-secondary" />
                            </div>
                            <h3 className="text-sm font-semibold text-white">{section.label}</h3>
                          </div>
                          {section.pillarSource && (
                            <span
                              className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${PILLAR_TAG_BG[section.pillarSource]}`}
                            >
                              Source: Pilier {section.pillarSource.toUpperCase()} &mdash;{" "}
                              {PILLAR_NAMES[section.pillarSource]}
                            </span>
                          )}
                        </div>
                        {sectionHtml ? (
                          <div
                            className="prose prose-invert prose-sm max-w-none prose-headings:text-white prose-p:text-foreground-secondary prose-a:text-accent prose-strong:text-white prose-code:text-foreground-secondary"
                            dangerouslySetInnerHTML={{ __html: sectionHtml }}
                          />
                        ) : (
                          <div className="flex items-center gap-2 rounded-lg border border-dashed border-border bg-background/30 p-4">
                            <Circle className="h-4 w-4 text-foreground-muted" />
                            <p className="text-xs text-foreground-muted">
                              Cette section n'est pas encore renseignee. Regenerez les guidelines pour la remplir.
                            </p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Full raw render fallback */}
                <details className="mt-6">
                  <summary className="cursor-pointer text-xs text-foreground-muted hover:text-foreground-secondary">
                    Voir le rendu complet
                  </summary>
                  <div
                    ref={contentRef}
                    className="mt-4 rounded-xl border border-border bg-background/80 p-8 prose prose-invert prose-sm max-w-none prose-headings:text-white prose-p:text-foreground-secondary prose-a:text-accent prose-strong:text-white prose-code:text-foreground-secondary"
                    dangerouslySetInnerHTML={{ __html: htmlContent }}
                  />
                </details>
              </div>
            </div>
          ) : (
            <EmptyState
              icon={BookOpen}
              title="Aucun guideline genere"
              description="Cliquez sur Regenerer pour generer vos guidelines de marque."
              action={{ label: "Generer", onClick: handleGenerate }}
            />
          )}
        </>
      )}

      <ConfirmDialog
        open={showRegenerateConfirm}
        onClose={() => setShowRegenerateConfirm(false)}
        onConfirm={() => {
          setShowRegenerateConfirm(false);
          handleGenerate();
        }}
        title="Regenerer les guidelines ?"
        message="La regeneration va remplacer la version actuelle de vos guidelines. Cette action est irreversible."
        confirmLabel="Regenerer"
        variant="warning"
      />
    </div>
  );
}
