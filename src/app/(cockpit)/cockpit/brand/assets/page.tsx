"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { PageHeader } from "@/components/shared/page-header";
import { SearchFilter } from "@/components/shared/search-filter";
import { EmptyState } from "@/components/shared/empty-state";
import { StatCard } from "@/components/shared/stat-card";
import { StatusBadge } from "@/components/shared/status-badge";
import { Modal } from "@/components/shared/modal";
import { FormField } from "@/components/shared/form-field";
import { SkeletonPage } from "@/components/shared/loading-skeleton";
import { PILLAR_KEYS, PILLAR_NAMES, type PillarKey } from "@/lib/types/advertis-vector";
import { PillarContentCard, buildPillarContentMap } from "@/components/shared/pillar-content-card";
import { useCurrentStrategyId } from "@/components/cockpit/strategy-context";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import {
  FolderOpen,
  Grid3X3,
  List,
  Upload,
  FileImage,
  FileText,
  File,
  AlertTriangle,
  ExternalLink,
  Palette,
  Type,
  Image,
  FileIcon,
  Layers,
  Clock,
  X,
  Download,
  Trash2,
} from "lucide-react";

const ASSET_TYPES = [
  { value: "LOGO", label: "Logo", icon: Palette },
  { value: "FONT", label: "Typographie", icon: Type },
  { value: "COLOR", label: "Couleur", icon: Palette },
  { value: "IMAGE", label: "Image", icon: Image },
  { value: "DOCUMENT", label: "Document", icon: FileIcon },
] as const;

type AssetType = (typeof ASSET_TYPES)[number]["value"];

export default function AssetsPage() {
  const strategyId = useCurrentStrategyId();
  const [search, setSearch] = useState("");
  const [pillarFilter, setPillarFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [showUpload, setShowUpload] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<string | null>(null);

  // Upload form state
  const [uploadForm, setUploadForm] = useState({
    name: "",
    type: "IMAGE" as AssetType,
    fileUrl: "",
    pillarTags: {} as Record<string, number>,
  });
  const [uploadMode, setUploadMode] = useState<"file" | "url">("file");
  const [filePreview, setFilePreview] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      alert("Fichier trop volumineux (max 10 MB)");
      return;
    }
    // Auto-fill name if empty
    if (!uploadForm.name.trim()) {
      setUploadForm((prev) => ({ ...prev, name: file.name.replace(/\.[^.]+$/, "") }));
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      setUploadForm((prev) => ({ ...prev, fileUrl: dataUrl }));
      setFilePreview(dataUrl);
    };
    reader.readAsDataURL(file);
  };

  const assetsQuery = trpc.brandVault.list.useQuery(
    {
      strategyId: strategyId!,
      pillar: pillarFilter !== "all" ? pillarFilter : undefined,
    },
    { enabled: !!strategyId },
  );

  const strategies = trpc.strategy.list.useQuery({});
  const pillarContentMap = buildPillarContentMap(strategies.data?.[0]?.pillars as Array<{ key: string; content: unknown }> | undefined);

  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);

  const uploadMutation = trpc.brandVault.create.useMutation({
    onSuccess: () => {
      assetsQuery.refetch();
      setShowUpload(false);
      setUploadForm({ name: "", type: "IMAGE", fileUrl: "", pillarTags: {} });
      setFilePreview(null);
      setUploadMode("file");
    },
  });

  const deleteMutation = trpc.brandVault.delete.useMutation({
    onSuccess: () => {
      assetsQuery.refetch();
      setDeleteTarget(null);
      setSelectedAsset(null);
    },
  });

  if (!strategyId) {
    return <SkeletonPage />;
  }

  const allAssets = assetsQuery.data ?? [];

  // Apply type filter
  const typeFiltered = typeFilter
    ? allAssets.filter((a) => {
        const tags = a.pillarTags as Record<string, unknown> | null;
        return (tags?.assetType as string) === typeFilter;
      })
    : allAssets;

  const assets = typeFiltered.filter(
    (a) => !search || a.name.toLowerCase().includes(search.toLowerCase()),
  );

  // Stats
  const recentCount = allAssets.filter((a) => {
    const created = new Date(a.createdAt as unknown as string);
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    return created > weekAgo;
  }).length;

  const categoryMap = new Map<string, number>();
  for (const a of allAssets) {
    const tags = a.pillarTags as Record<string, unknown> | null;
    const cat = (tags?.assetType as string) ?? "OTHER";
    categoryMap.set(cat, (categoryMap.get(cat) ?? 0) + 1);
  }

  const selectedAssetData = selectedAsset
    ? allAssets.find((a) => a.id === selectedAsset)
    : null;

  const getFileIcon = (name: string) => {
    const ext = name.split(".").pop()?.toLowerCase();
    if (["png", "jpg", "jpeg", "gif", "svg", "webp"].includes(ext ?? ""))
      return FileImage;
    if (["pdf", "doc", "docx", "txt"].includes(ext ?? "")) return FileText;
    return File;
  };

  const getTypeBgColor = (type: string) => {
    switch (type) {
      case "LOGO": return "bg-accent/20";
      case "FONT": return "bg-sky-500/20";
      case "COLOR": return "bg-success/20";
      case "IMAGE": return "bg-warning/20";
      case "DOCUMENT": return "bg-surface-raised";
      default: return "bg-surface-raised";
    }
  };

  const handleUpload = () => {
    if (!uploadForm.name.trim() || !strategyId) return;
    uploadMutation.mutate({
      strategyId,
      name: uploadForm.name,
      fileUrl: uploadForm.fileUrl || undefined,
      pillarTags: {
        ...uploadForm.pillarTags,
        assetType: ASSET_TYPES.findIndex((t) => t.value === uploadForm.type),
      },
    });
  };

  const togglePillarTag = (key: string) => {
    setUploadForm((prev) => {
      const current = prev.pillarTags[key] ?? 0;
      return {
        ...prev,
        pillarTags: { ...prev.pillarTags, [key]: current > 0 ? 0 : 1 },
      };
    });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Assets"
        description="Vos assets de marque organises par pilier ADVE-RTIS."
        breadcrumbs={[
          { label: "Cockpit", href: "/cockpit" },
          { label: "Marque" },
          { label: "Assets" },
        ]}
      >
        <button
          onClick={() => setShowUpload(true)}
          className="flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-medium text-foreground-muted hover:bg-foreground"
        >
          <Upload className="h-4 w-4" />
          Ajouter un asset
        </button>
      </PageHeader>

      {/* Stat cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          title="Total assets"
          value={allAssets.length}
          icon={Layers}
          trend="flat"
          trendValue={`${allAssets.length} fichier${allAssets.length !== 1 ? "s" : ""}`}
        />
        <StatCard
          title="Categories"
          value={categoryMap.size}
          icon={FolderOpen}
          trend="flat"
          trendValue={`${categoryMap.size} type${categoryMap.size !== 1 ? "s" : ""}`}
        />
        <StatCard
          title="Ajoutes recemment"
          value={recentCount}
          icon={Clock}
          trend={recentCount > 0 ? "up" : "flat"}
          trendValue="7 derniers jours"
        />
      </div>

      {/* Pillar filter tabs */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setPillarFilter("all")}
          className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
            pillarFilter === "all"
              ? "bg-white text-foreground-muted"
              : "border border-border bg-background text-foreground-secondary hover:text-white"
          }`}
        >
          Tous
        </button>
        {PILLAR_KEYS.map((key) => (
          <button
            key={key}
            onClick={() => setPillarFilter(key)}
            className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
              pillarFilter === key
                ? "bg-white text-foreground-muted"
                : "border border-border bg-background text-foreground-secondary hover:text-white"
            }`}
          >
            {key.toUpperCase()} - {PILLAR_NAMES[key]}
          </button>
        ))}
      </div>

      {/* Search + type filter + view toggle */}
      <div className="flex items-center gap-3">
        <div className="flex-1">
          <SearchFilter
            placeholder="Rechercher un asset..."
            value={search}
            onChange={setSearch}
            filters={[
              {
                key: "type",
                label: "Type",
                options: ASSET_TYPES.map((t) => ({
                  value: t.value,
                  label: t.label,
                })),
              },
            ]}
            filterValues={{ type: typeFilter }}
            onFilterChange={(key, value) => {
              if (key === "type") setTypeFilter(value);
            }}
          />
        </div>
        <div className="flex rounded-lg border border-border">
          <button
            onClick={() => setViewMode("grid")}
            className={`p-2 ${viewMode === "grid" ? "bg-background text-white" : "text-foreground-muted hover:text-white"}`}
          >
            <Grid3X3 className="h-4 w-4" />
          </button>
          <button
            onClick={() => setViewMode("list")}
            className={`p-2 ${viewMode === "list" ? "bg-background text-white" : "text-foreground-muted hover:text-white"}`}
          >
            <List className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Pillar brand context banner */}
      {pillarFilter !== "all" && pillarContentMap[pillarFilter] && (
        <PillarContentCard
          pillarKey={pillarFilter as PillarKey}
          content={pillarContentMap[pillarFilter]}
          variant="compact"
        />
      )}

      {/* Loading */}
      {assetsQuery.isLoading && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="h-40 animate-pulse rounded-xl bg-background"
            />
          ))}
        </div>
      )}

      {/* Error */}
      {assetsQuery.error && (
        <div className="rounded-xl border border-error/50 bg-error/20 p-6 text-center">
          <AlertTriangle className="mx-auto h-8 w-8 text-error" />
          <p className="mt-2 text-sm text-error">
            {assetsQuery.error.message}
          </p>
        </div>
      )}

      {/* Assets */}
      {!assetsQuery.isLoading && !assetsQuery.error && (
        <>
          {assets.length === 0 ? (
            <EmptyState
              icon={FolderOpen}
              title="Aucun asset"
              description={
                pillarFilter !== "all"
                  ? `Aucun asset associe au pilier ${PILLAR_NAMES[pillarFilter as PillarKey]}.`
                  : "Votre Brand Vault est vide. Ajoutez vos premiers assets."
              }
              action={{ label: "Ajouter un asset", onClick: () => setShowUpload(true) }}
            />
          ) : viewMode === "grid" ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {assets.map((asset) => {
                const tags = asset.pillarTags as Record<string, unknown> | null;
                const level = (tags?.level as string) ?? "production";
                const assetType = (tags?.assetType as string) ?? "";
                const Icon = getFileIcon(asset.name);

                return (
                  <div
                    key={asset.id}
                    className="group relative rounded-xl border border-border bg-background/80 p-4 text-left transition-colors hover:border-border"
                  >
                    {/* Delete button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteTarget({ id: asset.id, name: asset.name });
                      }}
                      className="absolute right-2 top-2 z-10 rounded-lg border border-border bg-background/90 p-1.5 text-foreground-muted opacity-0 transition-opacity hover:bg-error/50 hover:text-error group-hover:opacity-100"
                      title="Supprimer cet asset"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => setSelectedAsset(asset.id)}
                      className="w-full text-left"
                    >
                    {/* Preview area */}
                    <div className={`flex h-24 items-center justify-center rounded-lg ${getTypeBgColor(String(assetType))}`}>
                      {asset.fileUrl ? (
                        <img
                          src={asset.fileUrl}
                          alt={asset.name}
                          className="h-full w-full rounded-lg object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = "none";
                          }}
                        />
                      ) : (
                        <Icon className="h-10 w-10 text-foreground-secondary" />
                      )}
                    </div>

                    <div className="mt-3">
                      <p className="truncate text-sm font-medium text-white">
                        {asset.name}
                      </p>
                      <p className="mt-1 text-xs text-foreground-muted">
                        {new Date(
                          asset.createdAt as unknown as string,
                        ).toLocaleDateString("fr-FR")}
                      </p>
                      <div className="mt-2 flex flex-wrap items-center gap-1.5">
                        <StatusBadge
                          status={level}
                          variantMap={{
                            system: "bg-accent/15 text-accent ring-accent/30",
                            operator: "bg-blue-400/15 text-blue-400 ring-blue-400/30",
                            production: "bg-surface-raised text-foreground-secondary ring-border/30",
                          }}
                        />
                        {tags &&
                          PILLAR_KEYS.filter((k) => (tags[k] as number) > 0.5)
                            .slice(0, 2)
                            .map((k) => (
                              <span
                                key={k}
                                className="rounded bg-background px-1.5 py-0.5 text-[10px] font-medium text-foreground-secondary"
                              >
                                {k.toUpperCase()}
                              </span>
                            ))}
                      </div>
                    </div>
                    </button>
                  </div>
                );
              })}
            </div>
          ) : (
            /* List view */
            <div className="space-y-2">
              {assets.map((asset) => {
                const tags = asset.pillarTags as Record<string, unknown> | null;
                const level = (tags?.level as string) ?? "production";
                const Icon = getFileIcon(asset.name);

                return (
                  <div
                    key={asset.id}
                    className="group flex w-full items-center gap-4 rounded-lg border border-border bg-background/80 px-4 py-3 text-left transition-colors hover:border-border"
                  >
                    <button
                      onClick={() => setSelectedAsset(asset.id)}
                      className="flex flex-1 items-center gap-4"
                    >
                      <Icon className="h-5 w-5 shrink-0 text-foreground-muted" />
                      <div className="flex-1 truncate">
                        <p className="truncate text-sm font-medium text-white">
                          {asset.name}
                        </p>
                      </div>
                      <StatusBadge
                        status={level}
                        variantMap={{
                          system: "bg-accent/15 text-accent ring-accent/30",
                          operator: "bg-blue-400/15 text-blue-400 ring-blue-400/30",
                          production: "bg-surface-raised text-foreground-secondary ring-border/30",
                        }}
                      />
                      <div className="flex gap-1">
                        {tags &&
                          PILLAR_KEYS.filter((k) => (tags[k] as number) > 0.5)
                            .slice(0, 3)
                            .map((k) => (
                              <span
                                key={k}
                                className="rounded bg-background px-1.5 py-0.5 text-[10px] font-medium text-foreground-secondary"
                              >
                                {k.toUpperCase()}
                              </span>
                            ))}
                      </div>
                      <p className="text-xs text-foreground-muted">
                        {new Date(
                          asset.createdAt as unknown as string,
                        ).toLocaleDateString("fr-FR")}
                      </p>
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteTarget({ id: asset.id, name: asset.name });
                      }}
                      className="rounded-lg border border-border bg-background p-1.5 text-foreground-muted opacity-0 transition-opacity hover:bg-error/50 hover:text-error group-hover:opacity-100"
                      title="Supprimer cet asset"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* Upload Modal */}
      <Modal
        open={showUpload}
        onClose={() => setShowUpload(false)}
        title="Ajouter un asset"
        size="lg"
      >
        <div className="space-y-4">
          <FormField label="Nom de l'asset" required>
            <input
              type="text"
              value={uploadForm.name}
              onChange={(e) =>
                setUploadForm({ ...uploadForm, name: e.target.value })
              }
              placeholder="Ex: Logo principal, Charte couleurs..."
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-white placeholder-zinc-500 outline-none focus:border-border-strong focus:ring-1 focus:ring-border"
            />
          </FormField>

          <FormField label="Type d'asset" required>
            <div className="flex flex-wrap gap-2">
              {ASSET_TYPES.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() =>
                    setUploadForm({ ...uploadForm, type: t.value })
                  }
                  className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors ${
                    uploadForm.type === t.value
                      ? "border-white bg-white text-foreground-muted"
                      : "border-border bg-background text-foreground-secondary hover:border-border hover:text-white"
                  }`}
                >
                  <t.icon className="h-4 w-4" />
                  {t.label}
                </button>
              ))}
            </div>
          </FormField>

          <FormField label="Piliers associes">
            <div className="flex flex-wrap gap-2">
              {PILLAR_KEYS.map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => togglePillarTag(key)}
                  className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                    (uploadForm.pillarTags[key] ?? 0) > 0
                      ? "bg-accent text-white"
                      : "border border-border bg-background text-foreground-secondary hover:text-white"
                  }`}
                >
                  {key.toUpperCase()} - {PILLAR_NAMES[key]}
                </button>
              ))}
            </div>
          </FormField>

          <FormField label="Fichier">
            <div className="space-y-3">
              {/* Toggle file vs URL */}
              <div className="flex gap-2">
                <button type="button" onClick={() => setUploadMode("file")}
                  className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${uploadMode === "file" ? "bg-white text-foreground-muted" : "border border-border text-foreground-secondary hover:text-white"}`}>
                  Uploader un fichier
                </button>
                <button type="button" onClick={() => setUploadMode("url")}
                  className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${uploadMode === "url" ? "bg-white text-foreground-muted" : "border border-border text-foreground-secondary hover:text-white"}`}>
                  Lien URL
                </button>
              </div>

              {uploadMode === "file" ? (
                <div>
                  <label className="flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-border bg-background/50 p-6 transition-colors hover:border-border-strong">
                    <Upload className="mb-2 h-8 w-8 text-foreground-muted" />
                    <span className="text-sm text-foreground-secondary">Cliquez ou glissez un fichier ici</span>
                    <span className="mt-1 text-[10px] text-foreground-muted">Max 10 MB — Images, PDF, Documents</span>
                    <input type="file" className="hidden" accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.svg,.mp4"
                      onChange={handleFileChange} />
                  </label>
                  {filePreview && (
                    <div className="mt-3 flex items-center gap-3 rounded-lg border border-border bg-background/50 p-3">
                      {filePreview.startsWith("data:image") ? (
                        <img src={filePreview} alt="preview" className="h-12 w-12 rounded object-cover" />
                      ) : (
                        <FileText className="h-12 w-12 text-foreground-muted" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="truncate text-sm text-white">{uploadForm.name || "Fichier selectionne"}</p>
                        <p className="text-[10px] text-foreground-muted">Pret a uploader</p>
                      </div>
                      <button type="button" onClick={() => { setFilePreview(null); setUploadForm((p) => ({ ...p, fileUrl: "" })); }}
                        className="text-xs text-error hover:text-error">Retirer</button>
                    </div>
                  )}
                </div>
              ) : (
                <input type="url" value={uploadForm.fileUrl}
                  onChange={(e) => setUploadForm({ ...uploadForm, fileUrl: e.target.value })}
                  placeholder="https://..."
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-white placeholder-zinc-500 outline-none focus:border-border-strong focus:ring-1 focus:ring-border" />
              )}
            </div>
          </FormField>

          {uploadMutation.error && (
            <div className="rounded-lg border border-error/50 bg-error/20 p-3 text-sm text-error">
              <AlertTriangle className="mr-2 inline h-4 w-4" />
              {uploadMutation.error.message}
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button
              onClick={() => setShowUpload(false)}
              className="rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium text-foreground-secondary hover:bg-surface-raised"
            >
              Annuler
            </button>
            <button
              onClick={handleUpload}
              disabled={!uploadForm.name.trim() || uploadMutation.isPending}
              className="rounded-lg bg-white px-4 py-2 text-sm font-medium text-foreground-muted hover:bg-foreground disabled:opacity-50"
            >
              {uploadMutation.isPending ? "Envoi..." : "Ajouter"}
            </button>
          </div>
        </div>
      </Modal>

      {/* Asset Detail Modal */}
      <Modal
        open={!!selectedAssetData}
        onClose={() => setSelectedAsset(null)}
        title={selectedAssetData?.name ?? "Detail de l'asset"}
        size="lg"
      >
        {selectedAssetData && (() => {
          const tags = selectedAssetData.pillarTags as Record<string, unknown> | null;
          const level = (tags?.level as string) ?? "production";
          const Icon = getFileIcon(selectedAssetData.name);

          return (
            <div className="space-y-4">
              {/* Preview */}
              <div className="flex h-40 items-center justify-center rounded-lg bg-background/50">
                {selectedAssetData.fileUrl ? (
                  <img
                    src={selectedAssetData.fileUrl}
                    alt={selectedAssetData.name}
                    className="h-full max-w-full rounded-lg object-contain"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = "none";
                    }}
                  />
                ) : (
                  <Icon className="h-16 w-16 text-foreground-muted" />
                )}
              </div>

              {/* Info grid */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-medium text-foreground-muted">Niveau</p>
                  <div className="mt-1">
                    <StatusBadge
                      status={level}
                      variantMap={{
                        system: "bg-accent/15 text-accent ring-accent/30",
                        operator: "bg-blue-400/15 text-blue-400 ring-blue-400/30",
                        production: "bg-surface-raised text-foreground-secondary ring-border/30",
                      }}
                    />
                  </div>
                </div>
                <div>
                  <p className="text-xs font-medium text-foreground-muted">Date d'ajout</p>
                  <p className="mt-1 text-sm text-white">
                    {new Date(
                      selectedAssetData.createdAt as unknown as string,
                    ).toLocaleDateString("fr-FR", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  </p>
                </div>
              </div>

              {/* Pillar tags */}
              <div>
                <p className="text-xs font-medium text-foreground-muted">Piliers associes</p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {tags &&
                    PILLAR_KEYS.filter((k) => (tags[k] as number) > 0.5).map(
                      (k) => (
                        <span
                          key={k}
                          className="rounded-full bg-accent/15 px-2.5 py-1 text-xs font-medium text-accent"
                        >
                          {k.toUpperCase()} - {PILLAR_NAMES[k]}
                        </span>
                      ),
                    )}
                  {(!tags ||
                    PILLAR_KEYS.filter((k) => (tags[k] as number) > 0.5)
                      .length === 0) && (
                    <span className="text-xs text-foreground-muted">
                      Aucun pilier associe
                    </span>
                  )}
                </div>
              </div>

              {/* Download link */}
              {selectedAssetData.fileUrl && (
                <a
                  href={selectedAssetData.fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 rounded-lg bg-white px-4 py-2.5 text-sm font-medium text-foreground-muted hover:bg-foreground"
                >
                  <Download className="h-4 w-4" />
                  Telecharger
                </a>
              )}
            </div>
          );
        })()}
      </Modal>

      {/* Delete confirmation dialog */}
      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (deleteTarget) {
            deleteMutation.mutate({ id: deleteTarget.id });
          }
        }}
        title="Supprimer l'asset"
        message={`Voulez-vous vraiment supprimer "${deleteTarget?.name}" ? Cette action est irreversible.`}
        confirmLabel={deleteMutation.isPending ? "Suppression..." : "Supprimer"}
        variant="danger"
      />
    </div>
  );
}
