"use client";

import { brandAssetPreviewUrl } from "@/lib/brand-asset-preview";

import { sha256 } from "@noble/hashes/sha2.js";
import { ORIGINAL_CHUNK_BYTES, MAX_CHUNKED_ORIGINAL_BYTES } from "@/domain/source-original";
import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { withCockpitContext } from "@/components/navigation/nav-active";
import { AssetDossier } from "@/components/brand/asset-dossier";
import { useBrandWriteAccess } from "@/components/cockpit/use-can-operate";
import { DocumentEditionDialog } from "@/components/brand/document-library";
import { PUBLIC_BRAND_FORMAT, PUBLIC_BRAND_IDENTITY_FORMAT } from "@/domain/public-brand";
import { trpc } from "@/lib/trpc/client";
import { PageHeader } from "@/components/shared/page-header";
import { SearchFilter } from "@/components/shared/search-filter";
import { EmptyState } from "@/components/shared/empty-state";
import { StatCard } from "@/components/shared/stat-card";
import { StatusBadge } from "@/components/shared/status-badge";
import { Modal } from "@/components/shared/modal";
import { useToast } from "@/components/shared/notification-toast";
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

/**
 * BrandAsset.kind → type UI (miroir du KIND_FOR_TYPE serveur). Source de
 * vérité du filtre Type : l'ancien filtre comparait un INDEX numérique stocké
 * à l'upload à une STRING → ne matchait jamais (audit 2026-07-16).
 */
const STATE_LABELS: Record<string, string> = { DRAFT: "Brouillon", CANDIDATE: "À examiner", SELECTED: "Sélectionné", ACTIVE: "En usage", SUPERSEDED: "Édition antérieure", ARCHIVED: "Archivé", REJECTED: "Non retenu" };
const isPublication = (format: string | null) => format === PUBLIC_BRAND_FORMAT || format === PUBLIC_BRAND_IDENTITY_FORMAT;

const TYPE_FOR_KIND: Record<string, AssetType> = {
  LOGO_FINAL: "LOGO",
  LOGO_IDEA: "LOGO",
  TYPOGRAPHY_SYSTEM: "FONT",
  CHROMATIC_STRATEGY: "COLOR",
  KV_VISUAL: "IMAGE",
};
function assetUiType(a: { kind?: string | null; pillarTags?: unknown }): string {
  const byKind = a.kind ? TYPE_FOR_KIND[a.kind] : undefined;
  if (byKind) return byKind;
  const legacy = (a.pillarTags as Record<string, unknown> | null)?.assetType;
  return typeof legacy === "string" ? legacy : "OTHER";
}

export default function AssetsPage() {
  const strategyId = useCurrentStrategyId();
  const router = useRouter();
  const searchParams = useSearchParams();
  const contextHref = (href: string) => withCockpitContext(href, searchParams.toString());
  const { canOperateOnBrand } = useBrandWriteAccess(strategyId);
  const [documentAsset, setDocumentAsset] = useState<{ id: string; fileName: string; retainedAsset: { assetId: string; contentHash: string; strategyId: string } } | null>(null);
  const toast = useToast();
  const [search, setSearch] = useState("");
  const [pillarFilter, setPillarFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("");
  const [familyFilter, setFamilyFilter] = useState<"INTELLECTUAL" | "MATERIAL" | "HYBRID" | "">("");
  const [stateFilter, setStateFilter] = useState<string>("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [showUpload, setShowUpload] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<string | null>(searchParams.get("asset"));
  const selectedOriginal = trpc.brandVault.get.useQuery({ id: selectedAsset ?? "" }, { enabled: !!selectedAsset });
  const documentSources = trpc.ingestion.listSources.useQuery({ strategyId: strategyId ?? "" }, { enabled: !!strategyId && !!documentAsset });

  // Upload form state
  const [uploadForm, setUploadForm] = useState({
    name: "",
    type: "IMAGE" as AssetType,
    fileUrl: "",
    fileName: "",
    autoTag: false,
    pillarTags: {} as Record<string, number>,
  });
  const [uploadMode, setUploadMode] = useState<"file" | "url">("file");
  const [largeFile, setLargeFile] = useState<File | null>(null);
  const [transferProgress, setTransferProgress] = useState<string | null>(null);
  const [transferError, setTransferError] = useState<string | null>(null);
  const [transferring, setTransferring] = useState(false);
  const transferMutation = trpc.brandVault.transfer.useMutation();
  const [filePreview, setFilePreview] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.size || file.size > MAX_CHUNKED_ORIGINAL_BYTES) {
      toast.warning("Choisissez un fichier non vide de 200 Mio maximum.");
      return;
    }
    // Auto-fill name if empty
    if (!uploadForm.name.trim()) {
      setUploadForm((prev) => ({ ...prev, name: file.name.replace(/\.[^.]+$/, "") }));
    }
    setTransferError(null); setTransferProgress(null); setLargeFile(null);
    if (file.size > 10 * 1024 * 1024) {
      setLargeFile(file); setFilePreview(null);
      setUploadForm(prev => ({ ...prev, fileName: file.name, fileUrl: "" }));
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      setUploadForm((prev) => ({ ...prev, fileUrl: dataUrl, fileName: file.name }));
      setFilePreview(dataUrl);
    };
    reader.readAsDataURL(file);
  };

  const utils = trpc.useUtils();
  const assetsQuery = trpc.brandVault.list.useInfiniteQuery(
    {
      strategyId: strategyId!,
      pillar: pillarFilter !== "all" ? pillarFilter : undefined,
      search: search || undefined,
      family: familyFilter || undefined,
      type: (typeFilter || undefined) as AssetType | undefined,
      state: (stateFilter || undefined) as "DRAFT" | "CANDIDATE" | "SELECTED" | "ACTIVE" | "SUPERSEDED" | "ARCHIVED" | "REJECTED" | "ALL" | undefined,
      limit: 50,
    },
    { enabled: !!strategyId, getNextPageParam: (lastPage) => lastPage.length === 50 ? lastPage.at(-1)?.id : undefined },
  );

  const deposits = trpc.brandVault.pendingDeposits.useInfiniteQuery({ strategyId: strategyId ?? "", limit: 20 },
    { enabled: !!strategyId, getNextPageParam: page => page.nextCursor });
  const retryDeposit = trpc.brandVault.retryDeposit.useMutation({
    onSuccess: result => { void deposits.refetch(); void assetsQuery.refetch(); toast.success(`${result.assetIds.length} actif(s) conservé(s), à examiner.`); },
    onError: error => toast.error(error.message),
  });

  const strategies = trpc.strategy.list.useQuery({});
  // Bannière depuis la marque COURANTE — `data[0]` affichait le positionnement
  // d'une AUTRE marque en multi-marques/délégué (audit 2026-07-16).
  const currentStrategy = strategies.data?.find((st) => st.id === strategyId);
  const pillarContentMap = buildPillarContentMap(currentStrategy?.pillars as Array<{ key: string; content: unknown }> | undefined);

  const [activationTarget, setActivationTarget] = useState<{ id: string; name: string } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);

  const afterUpload = () => {
      assetsQuery.refetch();
      // Le dashboard (logo/actifs/vitrine) reflète l'upload immédiatement.
      if (strategyId) {
        utils.cockpitDashboard.getBrandIdentity.invalidate({ strategyId });
        utils.cockpitDashboard.getCampaignShowcase.invalidate({ strategyId });
      }
      setShowUpload(false);
      setUploadForm({ name: "", type: "IMAGE", fileUrl: "", fileName: "", autoTag: false, pillarTags: {} });
      setFilePreview(null);
      setUploadMode("file"); setLargeFile(null); setTransferError(null); setTransferProgress(null);
  };
  const uploadMutation = trpc.brandVault.create.useMutation({ onSuccess: afterUpload });

  const selectMutation = trpc.brandVault.selectFromBatch.useMutation({ onSuccess: () => { void assetsQuery.refetch(); void selectedOriginal.refetch(); } });

  const promoteMutation = trpc.brandVault.promoteToActive.useMutation({
    onSuccess: () => { setActivationTarget(null); void assetsQuery.refetch(); void selectedOriginal.refetch(); toast.success("Cette édition est maintenant en usage."); },
    onError: error => toast.error(error.message),
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

  const allAssets = assetsQuery.data?.pages.flat() ?? [];
  const assets = allAssets; // Filters apply before pagination on the server.

  // Stats
  const recentCount = allAssets.filter((a) => {
    const created = new Date(a.createdAt as unknown as string);
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    return created > weekAgo;
  }).length;

  const categoryMap = new Map<string, number>();
  for (const a of allAssets) {
    const cat = a.kind !== "GENERIC" ? a.kind : assetUiType(a);
    categoryMap.set(cat, (categoryMap.get(cat) ?? 0) + 1);
  }

  const selectedAssetData = selectedAsset
    ? (selectedOriginal.data?.id === selectedAsset ? selectedOriginal.data : allAssets.find((a) => a.id === selectedAsset))
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
      case "FONT": return "bg-info/20";
      case "COLOR": return "bg-success/20";
      case "IMAGE": return "bg-warning/20";
      case "DOCUMENT": return "bg-foreground-muted/20";
      default: return "bg-foreground-muted/20";
    }
  };

  const handleUpload = async () => {
    if (!uploadForm.name.trim() || !strategyId || transferring) return;
    if (uploadMode === "file" && largeFile) {
      setTransferring(true); setTransferError(null);
      try {
        const parts = Math.ceil(largeFile.size / ORIGINAL_CHUNK_BYTES), hash = sha256.create();
        for (let index = 0; index < parts; index++) {
          setTransferProgress(`Vérification du fichier : ${index + 1}/${parts}`);
          hash.update(new Uint8Array(await largeFile.slice(index * ORIGINAL_CHUNK_BYTES, (index + 1) * ORIGINAL_CHUNK_BYTES).arrayBuffer()));
        }
        const contentHash = Array.from(hash.digest(), byte => byte.toString(16).padStart(2, "0")).join("");
        const start = await transferMutation.mutateAsync({ strategyId, transfer: { action: "BEGIN",
          name: uploadForm.name, fileName: largeFile.name, mimeType: largeFile.type || "application/octet-stream",
          contentHash, byteLength: largeFile.size, type: uploadForm.type, pillarTags: uploadForm.pillarTags } });
        if (start.state !== "STORED") {
          for (let index = 0; index < parts; index++) {
            setTransferProgress(`Envoi : ${index + 1}/${parts}`);
            if (start.receivedParts.includes(index)) continue;
            const blob = largeFile.slice(index * ORIGINAL_CHUNK_BYTES, (index + 1) * ORIGINAL_CHUNK_BYTES);
            const content = await new Promise<string>((resolve, reject) => {
              const reader = new FileReader(); reader.onerror = () => reject(new Error("Lecture du fichier impossible."));
              reader.onload = () => resolve(String(reader.result).split(",")[1]!); reader.readAsDataURL(blob);
            });
            await transferMutation.mutateAsync({ strategyId, transfer: { action: "PART", assetId: start.assetId, index, content } });
          }
        }
        setTransferProgress("Vérification de la conservation complète…");
        await transferMutation.mutateAsync({ strategyId, transfer: { action: "FINISH", assetId: start.assetId, autoTag: uploadForm.autoTag } });
        afterUpload();
      } catch (error) {
        setTransferError(`${error instanceof Error ? error.message : "Envoi interrompu."} Reprenez avec le même fichier : les parties reçues seront conservées.`);
      } finally { setTransferring(false); }
      return;
    }
    uploadMutation.mutate({
      strategyId,
      name: uploadForm.name,
      type: uploadForm.type,
      ...(uploadMode === "file" && uploadForm.fileUrl.startsWith("data:") ? {
        file: { name: uploadForm.fileName || uploadForm.name,
          mimeType: uploadForm.fileUrl.slice(5, uploadForm.fileUrl.indexOf(";")),
          content: uploadForm.fileUrl.slice(uploadForm.fileUrl.indexOf(",") + 1) },
      } : { fileUrl: uploadForm.fileUrl || undefined }),
      autoTag: uploadForm.autoTag,
      // `type` → kind canonique côté serveur ; plus d'index numérique
      // assetType (illisible côté filtre, audit 2026-07-16).
      pillarTags: uploadForm.pillarTags,
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
        title="Data Asset Manager"
        description="La banque des actifs de marque : documents de travail, concepts, briefs et médias, avec leurs sources, éditions et usages."
        breadcrumbs={[
          { label: "Cockpit", href: "/cockpit" },
          { label: "Marque" },
          { label: "Data Asset Manager" },
        ]}
      >
        <button
          onClick={() => setShowUpload(true)}
          className="flex items-center gap-2 rounded-lg bg-surface-raised px-4 py-2 text-sm font-medium text-foreground-muted hover:bg-foreground"
        >
          <Upload className="h-4 w-4" />
          Déposer un actif
        </button>
      </PageHeader>

      <section className="rounded-xl border border-border bg-surface-raised p-5">
        <h2 className="font-semibold text-foreground">Gouverné par Mestor</h2>
        <p className="mt-2 text-sm text-foreground-secondary">Mestor gouverne la conservation, la provenance et le cycle de vie des actifs. Artemis orchestre les livrables, Glory prépare les contenus et Ptah produit les médias. Votre équipe choisit les éditions à retenir.</p>
        <nav aria-label="Banques et production" className="mt-4 flex flex-wrap gap-3 text-sm">
          <Link className="rounded-lg border border-border px-3 py-2" href={contextHref("/cockpit/brand/sources")}>Documentation et sources</Link>
          <Link className="rounded-lg border border-border px-3 py-2" href={contextHref("/cockpit/brand/deliverables")}>Livrables</Link>
          <Link className="rounded-lg border border-border px-3 py-2" href={contextHref("/cockpit/brand/deliverables?tab=production")}>Studio de production</Link>
        </nav>
      </section>
      {deposits.error && <p role="alert" className="text-error">Le suivi des dépôts est indisponible : {deposits.error.message}</p>}
      {!!deposits.data?.pages.some(page => page.items.length) && <section className="rounded-xl border border-warning/30 bg-warning/10 p-5">
        <h2 className="font-semibold text-warning">Dépôts à reprendre</h2>
        <p className="mt-2 text-sm text-foreground-secondary">Ces contenus ont été produits, mais leur dépôt dans la banque a échoué. Reprendre conserve la même production, sans nouvel appel IA et sans validation automatique.</p>
        <ul className="mt-3 space-y-3">{deposits.data.pages.flatMap(page => page.items).map(item => <li key={item.id} className="flex flex-wrap items-center justify-between gap-3">
          <span>{item.name}<span className="block text-xs text-foreground-secondary">{new Date(item.createdAt).toLocaleString("fr-FR")}</span></span>
          {canOperateOnBrand && <button type="button" disabled={retryDeposit.isPending} onClick={() => retryDeposit.mutate({ strategyId: strategyId!, gloryOutputId: item.id })} className="rounded-lg border border-border px-3 py-2 disabled:opacity-50">{retryDeposit.isPending && retryDeposit.variables?.gloryOutputId === item.id ? "Dépôt…" : "Reprendre le dépôt"}</button>}
        </li>)}</ul>
        {deposits.hasNextPage && <button type="button" className="mt-3 text-info underline" onClick={() => void deposits.fetchNextPage()} disabled={deposits.isFetchingNextPage}>Afficher les dépôts suivants</button>}
      </section>}

      {/* Stat cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          title="Actifs affichés"
          value={allAssets.length}
          icon={Layers}
          trend="flat"
          trendValue={`${allAssets.length} actif${allAssets.length !== 1 ? "s" : ""}`}
        />
        <StatCard
          title="Catégories affichées"
          value={categoryMap.size}
          icon={FolderOpen}
          trend="flat"
          trendValue={`${categoryMap.size} type${categoryMap.size !== 1 ? "s" : ""}`}
        />
        <StatCard
          title="Récents dans cette sélection"
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
              ? "bg-surface-raised text-foreground-muted"
              : "border border-border bg-background text-foreground-secondary hover:text-foreground"
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
                ? "bg-surface-raised text-foreground-muted"
                : "border border-border bg-background text-foreground-secondary hover:text-foreground"
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
            placeholder="Rechercher un actif…"
            value={search}
            onChange={(value) => setSearch(value.slice(0, 200))}
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
            className={`p-2 ${viewMode === "grid" ? "bg-background text-foreground" : "text-foreground-muted hover:text-foreground"}`}
          >
            <Grid3X3 className="h-4 w-4" />
          </button>
          <button
            onClick={() => setViewMode("list")}
            className={`p-2 ${viewMode === "list" ? "bg-background text-foreground" : "text-foreground-muted hover:text-foreground"}`}
          >
            <List className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-4">
      <label className="flex items-center gap-3 text-sm text-foreground-secondary">Famille
        <select value={familyFilter} onChange={e => setFamilyFilter(e.target.value as typeof familyFilter)} className="rounded-lg border border-border bg-background px-3 py-2 text-foreground">
          <option value="">Toutes les familles</option><option value="INTELLECTUAL">Contenus et concepts</option><option value="MATERIAL">Fichiers et médias</option><option value="HYBRID">Actifs mixtes</option>
        </select>
      </label>
      <label className="flex items-center gap-3 text-sm text-foreground-secondary">
        État
        <select value={stateFilter} onChange={e => setStateFilter(e.target.value)} className="rounded-lg border border-border bg-background px-3 py-2 text-foreground">
          <option value="">Actifs disponibles</option>
          <option value="DRAFT">Brouillons</option><option value="CANDIDATE">À examiner</option><option value="SELECTED">Sélectionnés</option>
          <option value="ACTIVE">En usage</option><option value="SUPERSEDED">Éditions antérieures</option><option value="REJECTED">Non retenus</option><option value="ARCHIVED">Archives</option><option value="ALL">Tous les états</option>
        </select>
      </label>
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
                search || typeFilter || stateFilter
                  ? "Aucun actif ne correspond à ces filtres. Les autres fichiers restent conservés."
                  : pillarFilter !== "all"
                  ? `Aucun asset associe au pilier ${PILLAR_NAMES[pillarFilter as PillarKey]}.`
                  : "Votre Brand Vault est vide. Ajoutez vos premiers assets."
              }
              action={search || typeFilter || familyFilter || stateFilter || pillarFilter !== "all"
                ? { label: "Réinitialiser les filtres", onClick: () => { setSearch(""); setTypeFilter(""); setFamilyFilter(""); setStateFilter(""); setPillarFilter("all"); } }
                : { label: "Ajouter un asset", onClick: () => setShowUpload(true) }}
            />
          ) : viewMode === "grid" ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {assets.map((asset) => {
                const tags = asset.pillarTags as Record<string, unknown> | null;
                const level = (tags?.level as string) ?? "production";
                const assetType = assetUiType(asset);
                const Icon = getFileIcon(asset.name);

                return (
                  <div
                    key={asset.id}
                    className="group relative rounded-xl border border-border bg-background/80 p-4 text-left transition-colors hover:border-border"
                  >
                    {isPublication(asset.format) ? (
                      <Link href="/cockpit/settings/connections" title="Gérer cette publication" aria-label="Gérer cette publication"
                        className="absolute right-2 top-2 z-10 rounded-lg border border-border bg-background p-1.5 text-accent">
                        <ExternalLink className="h-3.5 w-3.5" />
                      </Link>
                    ) : <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteTarget({ id: asset.id, name: asset.name });
                      }}
                      className="absolute right-2 top-2 z-10 rounded-lg border border-border bg-background/90 p-1.5 text-foreground-muted opacity-0 transition-opacity hover:bg-error/50 hover:text-error group-hover:opacity-100"
                      title="Archiver cet actif"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>}
                    <button
                      onClick={() => setSelectedAsset(asset.id)}
                      className="w-full text-left"
                    >
                    {/* Preview area */}
                    <div className={`flex h-24 items-center justify-center rounded-lg ${getTypeBgColor(String(assetType))}`}>
                      {brandAssetPreviewUrl(asset) ? (
                        <img
                          src={brandAssetPreviewUrl(asset)!}
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
                      <p className="truncate text-sm font-medium text-foreground">
                        {asset.name}
                      </p>
                      <p className="mt-1 text-xs text-foreground-muted">
                        {new Date(
                          asset.createdAt as unknown as string,
                        ).toLocaleDateString("fr-FR")}
                      </p>
                      <div className="mt-2 flex flex-wrap items-center gap-1.5">
                        <StatusBadge
                          status={STATE_LABELS[asset.state] ?? level}
                          variantMap={{
                            system: "bg-accent/15 text-accent ring-accent/30",
                            operator: "bg-info/15 text-info ring-info/30",
                            production: "bg-foreground-muted/15 text-foreground-secondary ring-border/30",
                          }}
                        />
                        {PILLAR_KEYS.filter((k) => (tags?.[k] as number) > 0.5 || asset.pillarSource === k.toUpperCase())
                            .slice(0, 2)
                            .map((k) => (
                              <span
                                key={k}
                                className="rounded bg-background px-1.5 py-0.5 text-2xs font-medium text-foreground-secondary"
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
                        <p className="truncate text-sm font-medium text-foreground">
                          {asset.name}
                        </p>
                      </div>
                      <StatusBadge
                        status={STATE_LABELS[asset.state] ?? level}
                        variantMap={{
                          system: "bg-accent/15 text-accent ring-accent/30",
                          operator: "bg-info/15 text-info ring-info/30",
                          production: "bg-foreground-muted/15 text-foreground-secondary ring-border/30",
                        }}
                      />
                      <div className="flex gap-1">
                        {PILLAR_KEYS.filter((k) => (tags?.[k] as number) > 0.5 || asset.pillarSource === k.toUpperCase())
                            .slice(0, 3)
                            .map((k) => (
                              <span
                                key={k}
                                className="rounded bg-background px-1.5 py-0.5 text-2xs font-medium text-foreground-secondary"
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
                    {isPublication(asset.format) ? (
                      <Link href="/cockpit/settings/connections" title="Gérer cette publication" aria-label="Gérer cette publication"
                        className="rounded-lg border border-border bg-background p-1.5 text-accent">
                        <ExternalLink className="h-3.5 w-3.5" />
                      </Link>
                    ) : <button
                        onClick={(e) => { e.stopPropagation(); setDeleteTarget({ id: asset.id, name: asset.name }); }}
                        className="rounded-lg border border-border bg-background p-1.5 text-foreground-muted opacity-0 transition-opacity hover:bg-error/50 hover:text-error group-hover:opacity-100"
                        title="Archiver cet actif">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>}
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {assetsQuery.hasNextPage && <button onClick={() => void assetsQuery.fetchNextPage()} disabled={assetsQuery.isFetchingNextPage}
        className="rounded-lg border border-border bg-background px-4 py-2 text-sm text-foreground disabled:opacity-50">
        {assetsQuery.isFetchingNextPage ? "Chargement…" : "Afficher les suivants"}
      </button>}

      {documentAsset && <DocumentEditionDialog source={documentAsset}
        sources={(documentSources.data ?? []) as unknown as Parameters<typeof DocumentEditionDialog>[0]["sources"]}
        sourcesPending={documentSources.isFetching || documentSources.isLoading} sourcesError={documentSources.error?.message}
        onClose={() => setDocumentAsset(null)} onSaved={sourceId => {
          void utils.ingestion.listSources.invalidate();
          if (sourceId && strategyId) router.push(`/cockpit/brand/sources?strategy=${encodeURIComponent(strategyId)}&source=${encodeURIComponent(sourceId)}`);
        }} />}

      {/* Upload Modal */}
      <Modal
        open={showUpload}
        onClose={() => { if (!transferring) setShowUpload(false); }}
        title="Déposer un actif"
        size="lg"
      >
        <fieldset disabled={transferring} className="space-y-4">
          <p className="text-sm text-foreground-secondary">Le fichier est conservé en privé, à examiner. Son dépôt ne le met pas en usage et ne publie rien.</p>
          <FormField label="Nom de l'asset" required>
            <input
              type="text"
              value={uploadForm.name}
              onChange={(e) =>
                setUploadForm({ ...uploadForm, name: e.target.value })
              }
              placeholder="Ex: Logo principal, Charte couleurs..."
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder-foreground-muted outline-none focus:border-border-strong focus:ring-1 focus:ring-border"
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
                      ? "border-border-strong bg-surface-raised text-foreground-muted"
                      : "border-border bg-background text-foreground-secondary hover:border-border hover:text-foreground"
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
                      ? "bg-accent text-foreground"
                      : "border border-border bg-background text-foreground-secondary hover:text-foreground"
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
                  className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${uploadMode === "file" ? "bg-surface-raised text-foreground-muted" : "border border-border text-foreground-secondary hover:text-foreground"}`}>
                  Uploader un fichier
                </button>
                <button type="button" onClick={() => setUploadMode("url")}
                  className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${uploadMode === "url" ? "bg-surface-raised text-foreground-muted" : "border border-border text-foreground-secondary hover:text-foreground"}`}>
                  Lien URL
                </button>
              </div>

              {uploadMode === "file" ? (
                <div>
                  <label className="flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-border bg-background/50 p-6 transition-colors hover:border-border-strong">
                    <Upload className="mb-2 h-8 w-8 text-foreground-muted" />
                    <span className="text-sm text-foreground-secondary">Cliquez ou glissez un fichier ici</span>
                    <span className="mt-1 text-2xs text-foreground-muted">Max 200 Mio — Reprise avec le même fichier après interruption</span>
                    <input type="file" className="hidden" accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.svg,.mp4,.otf,.ttf,.woff,.woff2,.zip,.ai,.psd,.fig,.apk,.gz,.ppt,.pptx"
                      onChange={handleFileChange} />
                  </label>
                  {(filePreview || largeFile) && (
                    <div className="mt-3 flex items-center gap-3 rounded-lg border border-border bg-background/50 p-3">
                      {/^data:image\/(png|jpeg|gif|webp);/.test(filePreview ?? "") ? (
                        <img src={filePreview!} alt="preview" className="h-12 w-12 rounded object-cover" />
                      ) : (
                        <FileText className="h-12 w-12 text-foreground-muted" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="truncate text-sm text-foreground">{uploadForm.name || "Fichier selectionne"}</p>
                        <p className="text-2xs text-foreground-muted">Pret a uploader</p>
                      </div>
                      <button type="button" onClick={() => { setFilePreview(null); setLargeFile(null); setUploadForm((p) => ({ ...p, fileUrl: "" })); }}
                        className="text-xs text-error hover:text-error">Retirer</button>
                    </div>
                  )}
                </div>
              ) : (
                <input type="url" value={uploadForm.fileUrl}
                  onChange={(e) => setUploadForm({ ...uploadForm, fileUrl: e.target.value })}
                  placeholder="https://..."
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder-foreground-muted outline-none focus:border-border-strong focus:ring-1 focus:ring-border" />
              )}
            </div>
          </FormField>

          <label className="flex items-start gap-2 text-sm text-foreground-secondary">
            <input type="checkbox" checked={uploadForm.autoTag} onChange={e => setUploadForm({ ...uploadForm, autoTag: e.target.checked })} />
            Suggérer automatiquement les piliers à partir du nom et du contexte. Cette option ne lit pas le contenu visuel du fichier.
          </label>

          {transferProgress && <p role="status" aria-live="polite" className="text-sm text-foreground-secondary">{transferProgress}</p>}
          {transferError && <p role="alert" className="text-sm text-error">{transferError}</p>}
          {uploadMutation.error && (
            <div className="rounded-lg border border-error/50 bg-error/20 p-3 text-sm text-error">
              <AlertTriangle className="mr-2 inline h-4 w-4" />
              {uploadMutation.error.message}
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button
              onClick={() => setShowUpload(false)} disabled={transferring}
              className="rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium text-foreground-secondary hover:bg-surface-raised"
            >
              Annuler
            </button>
            <button
              onClick={handleUpload}
              disabled={!uploadForm.name.trim() || (uploadMode === "file" && !uploadForm.fileUrl && !largeFile) || uploadMutation.isPending || transferring}
              className="rounded-lg bg-surface-raised px-4 py-2 text-sm font-medium text-foreground-muted hover:bg-foreground disabled:opacity-50"
            >
              {uploadMutation.isPending || transferring ? "Envoi..." : "Ajouter"}
            </button>
          </div>
        </fieldset>
      </Modal>

      {/* Asset Detail Modal */}
      <Modal
        open={!!selectedAsset}
        onClose={() => setSelectedAsset(null)}
        title={selectedAssetData?.name ?? "Dossier de l’actif"}
        size="lg"
      >
        {!selectedAssetData && selectedOriginal.isFetching && <p role="status">Lecture du dossier…</p>}
        {!selectedAssetData && selectedOriginal.error && <p role="alert" className="text-error">{selectedOriginal.error.message}</p>}
        {selectedAssetData && (() => {
          const tags = selectedAssetData.pillarTags as Record<string, unknown> | null;
          const level = (tags?.level as string) ?? "production";
          const Icon = getFileIcon(selectedAssetData.name);

          return (
            <div className="space-y-4">
              {/* Preview */}
              <div className="flex h-40 items-center justify-center rounded-lg bg-background/50">
                {brandAssetPreviewUrl(selectedAssetData) ? (
                  <img
                    src={brandAssetPreviewUrl(selectedAssetData)!}
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
                        operator: "bg-info/15 text-info ring-info/30",
                        production: "bg-foreground-muted/15 text-foreground-secondary ring-border/30",
                      }}
                    />
                  </div>
                </div>
                <div>
                  <p className="text-xs font-medium text-foreground-muted">Date d'ajout</p>
                  <p className="mt-1 text-sm text-foreground">
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

              <div className="rounded-lg border border-border bg-background p-4 text-sm text-foreground-secondary">
                <p>{STATE_LABELS[selectedAssetData.state] ?? selectedAssetData.state} · Édition {selectedAssetData.version}</p>
                {(() => {
                  const meta = selectedAssetData.metadata as { original?: { state: string; contentHash: string; byteLength: number }; provenance?: { path: string } } | null;
                  return <>
                    {meta?.provenance?.path && <p className="mt-2 break-words">Provenance : {meta.provenance.path}</p>}
                    {meta?.original ? <>
                      <p className="mt-2">Original {meta.original.state === "STORED" ? "conservé et vérifié" : "en cours de conservation"} · {meta.original.byteLength.toLocaleString("fr-FR")} octets</p>
                      <p className="mt-1 break-all font-mono text-xs">SHA-256 : {meta.original.contentHash}</p>
                      {canOperateOnBrand && strategyId && selectedOriginal.data?.documentarySource && <button
                        type="button" className="mt-3 rounded border border-border px-3 py-2 text-foreground"
                        onClick={() => {
                          const source = selectedOriginal.data!.documentarySource!;
                          setSelectedAsset(null);
                          router.push(`/cockpit/brand/sources?strategy=${encodeURIComponent(strategyId)}&source=${encodeURIComponent(source.id)}${source.processingStatus === "FAILED" ? "&mode=edit" : ""}`);
                        }}>{selectedOriginal.data.documentarySource.processingStatus === "FAILED" ? "Compléter la lecture du document" : "Consulter dans le dossier documentaire"}</button>}
                      {canOperateOnBrand && strategyId && !selectedOriginal.data?.documentarySource && meta.original.state === "STORED" && selectedOriginal.data?.originalFileName && /\.(pdf|docx|pptx|txt|md|json|csv|xlsx)$/i.test(selectedOriginal.data.originalFileName) && <button
                        type="button" className="mt-3 rounded border border-border px-3 py-2 text-foreground"
                        onClick={() => {
                          setDocumentAsset({ id: selectedAssetData.id, fileName: selectedOriginal.data!.originalFileName!,
                            retainedAsset: { assetId: selectedAssetData.id, contentHash: meta.original!.contentHash, strategyId } });
                          setSelectedAsset(null);
                        }}>Ajouter au dossier documentaire</button>}
                    </> : <p className="mt-2">Aucun reçu d’original privé pour cet actif.</p>}
                  </>;
                })()}
                {canOperateOnBrand && ((selectedAssetData.state === "CANDIDATE") || (selectedAssetData.state === "ARCHIVED" && selectedAssetData.fileUrl === `/api/brand-assets/${selectedAssetData.id}/original`)) && selectedAssetData.batchId && <button
                  onClick={() => selectMutation.mutate({ batchId: selectedAssetData.batchId!, selectedAssetId: selectedAssetData.id, selectedReason: "Sélection manuelle après examen de l’actif" })}
                  disabled={selectMutation.isPending}
                  className="mt-3 rounded-lg border border-border px-3 py-2 text-foreground disabled:opacity-50">
                  {selectMutation.isPending ? "Sélection…" : selectedAssetData.state === "ARCHIVED" ? "Réutiliser cette édition" : "Retenir cette édition"}
                </button>}
                {canOperateOnBrand && !isPublication(selectedAssetData.format) && ["DRAFT", "SELECTED"].includes(selectedAssetData.state) && <button
                  type="button" onClick={() => setActivationTarget({ id: selectedAssetData.id, name: selectedAssetData.name })}
                  className="mt-3 rounded-lg border border-border px-3 py-2 text-foreground">Mettre cette édition en usage</button>}
                {selectMutation.error && <p className="mt-2 text-error">{selectMutation.error.message}</p>}
              </div>

              {selectedOriginal.isFetching && <p role="status" className="text-foreground-muted">Lecture de la provenance et des usages…</p>}
              {selectedOriginal.error && <p role="alert" className="text-error">{selectedOriginal.error.message}</p>}
              {selectedOriginal.data?.id === selectedAssetData.id && <AssetDossier asset={selectedOriginal.data} onVersion={setSelectedAsset} />}

              {/* Pillar tags */}
              <div>
                <p className="text-xs font-medium text-foreground-muted">Piliers associes</p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {PILLAR_KEYS.filter((k) => (tags?.[k] as number) > 0.5 || selectedAssetData.pillarSource === k.toUpperCase()).map(
                      (k) => (
                        <span
                          key={k}
                          className="rounded-full bg-accent/15 px-2.5 py-1 text-xs font-medium text-accent"
                        >
                          {k.toUpperCase()} - {PILLAR_NAMES[k]}
                        </span>
                      ),
                    )}
                  {(PILLAR_KEYS.filter((k) => (tags?.[k] as number) > 0.5 || selectedAssetData.pillarSource === k.toUpperCase())
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
                  download={selectedAssetData.fileUrl.startsWith("/api/brand-assets/")}
                  target={selectedAssetData.fileUrl.startsWith("/api/brand-assets/") ? undefined : "_blank"}
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 rounded-lg bg-surface-raised px-4 py-2.5 text-sm font-medium text-foreground-muted hover:bg-foreground"
                >
                  <Download className="h-4 w-4" />
                  Telecharger
                </a>
              )}
            </div>
          );
        })()}
      </Modal>

      <ConfirmDialog variant="info" open={!!activationTarget} onClose={() => setActivationTarget(null)}
        onConfirm={() => { if (activationTarget) promoteMutation.mutate({ brandAssetId: activationTarget.id }); }}
        title="Mettre cette édition en usage"
        message={`Après relecture, retenir « ${activationTarget?.name} » pour alimenter les productions de la marque ? Les contrôles de source et de qualité restent appliqués.`}
        confirmLabel={promoteMutation.isPending ? "Vérification…" : "Confirmer la mise en usage"} />

      {/* Delete confirmation dialog */}
      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (deleteTarget) {
            deleteMutation.mutate({ id: deleteTarget.id });
          }
        }}
        title="Archiver l’actif"
        message={`Archiver « ${deleteTarget?.name} » ? Son original et son historique restent conservés et consultables dans Archives.`}
        confirmLabel={deleteMutation.isPending ? "Archivage…" : "Archiver"}
        variant="danger"
      />
    </div>
  );
}
