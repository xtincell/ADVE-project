"use client";

import { useState } from "react";
import { Image, Plus, Trash2, Eye, Tag } from "lucide-react";
import { trpc } from "@/lib/trpc/client";
import { PageHeader } from "@/components/shared/page-header";
import { Modal } from "@/components/shared/modal";
import { FormField } from "@/components/shared/form-field";
import { EmptyState } from "@/components/shared/empty-state";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { SkeletonPage } from "@/components/shared/loading-skeleton";
import { PILLAR_NAMES, type PillarKey } from "@/lib/types/advertis-vector";

export default function PortfolioPage() {
  const [addModal, setAddModal] = useState(false);
  const [viewItem, setViewItem] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [fileUrl, setFileUrl] = useState("");
  const [thumbnailUrl, setThumbnailUrl] = useState("");
  const [selectedPillars, setSelectedPillars] = useState<Record<string, number>>({});

  const profile = trpc.guilde.getMyProfile.useQuery();
  const addItem = trpc.guilde.addPortfolioItem.useMutation({
    onSuccess: () => {
      profile.refetch();
      setAddModal(false);
      resetForm();
    },
  });
  const removeItem = trpc.guilde.removePortfolioItem.useMutation({
    onSuccess: () => {
      profile.refetch();
      setDeleteConfirm(null);
    },
  });

  if (profile.isLoading) return <SkeletonPage />;

  const portfolioItems = profile.data?.portfolioItems ?? [];

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setFileUrl("");
    setThumbnailUrl("");
    setSelectedPillars({});
  };

  const togglePillar = (key: string) => {
    setSelectedPillars((prev) => {
      const next = { ...prev };
      if (key in next) {
        delete next[key];
      } else {
        next[key] = 1;
      }
      return next;
    });
  };

  const handleAdd = () => {
    if (!title) return;
    addItem.mutate({
      title,
      description: description || undefined,
      fileUrl: fileUrl || undefined,
      thumbnailUrl: thumbnailUrl || undefined,
      pillarTags: Object.keys(selectedPillars).length > 0 ? selectedPillars : undefined,
    });
  };

  const selectedItem = portfolioItems.find((i) => i.id === viewItem);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Portfolio"
        description={`${portfolioItems.length} element(s) dans votre portfolio`}
        breadcrumbs={[
          { label: "Dashboard", href: "/creator" },
          { label: "Profil" },
          { label: "Portfolio" },
        ]}
      >
        <button
          onClick={() => setAddModal(true)}
          className="flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-medium text-foreground-muted transition-colors hover:bg-foreground"
        >
          <Plus className="h-4 w-4" />
          Ajouter
        </button>
      </PageHeader>

      {portfolioItems.length === 0 ? (
        <EmptyState
          icon={Image}
          title="Portfolio vide"
          description="Ajoutez vos meilleurs travaux pour montrer votre expertise."
          action={{
            label: "Ajouter un element",
            onClick: () => setAddModal(true),
          }}
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {portfolioItems.map((item) => {
            const pillarTags = item.pillarTags as Record<string, number> | null;

            return (
              <div
                key={item.id}
                className="group rounded-xl border border-border bg-background/80 overflow-hidden transition-colors hover:border-border"
              >
                {/* Thumbnail */}
                <div className="relative aspect-video bg-background">
                  {item.thumbnailUrl ? (
                    <img
                      src={item.thumbnailUrl}
                      alt={item.title}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center">
                      <Image className="h-8 w-8 text-foreground-muted" />
                    </div>
                  )}
                  <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/60 opacity-0 transition-opacity group-hover:opacity-100">
                    <button
                      onClick={() => setViewItem(item.id)}
                      className="rounded-lg bg-white/20 p-2 text-white backdrop-blur-sm transition-colors hover:bg-white/30"
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => setDeleteConfirm(item.id)}
                      className="rounded-lg bg-error/20 p-2 text-error backdrop-blur-sm transition-colors hover:bg-error/30"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* Info */}
                <div className="p-4">
                  <h3 className="text-sm font-semibold text-white">{item.title}</h3>
                  {item.description && (
                    <p className="mt-1 text-xs text-foreground-muted line-clamp-2">
                      {item.description}
                    </p>
                  )}
                  {pillarTags && Object.keys(pillarTags).length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {Object.entries(pillarTags).map(([key, value]) => (
                        <span
                          key={key}
                          className="rounded-full bg-background px-2 py-0.5 text-[10px] text-foreground-secondary"
                        >
                          {key.toUpperCase()}: {value}
                        </span>
                      ))}
                    </div>
                  )}
                  <p className="mt-2 text-[10px] text-foreground-muted">
                    {new Date(item.createdAt).toLocaleDateString("fr-FR")}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add modal */}
      <Modal
        open={addModal}
        onClose={() => {
          setAddModal(false);
          resetForm();
        }}
        title="Ajouter un element au portfolio"
      >
        <div className="space-y-4">
          <FormField label="Titre" required>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Campagne Instagram CIMENCAM"
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-white placeholder-zinc-500 outline-none focus:border-border-strong focus:ring-1 focus:ring-border"
            />
          </FormField>

          <FormField label="Description">
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="Decrivez le projet..."
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-white placeholder-zinc-500 outline-none focus:border-border-strong focus:ring-1 focus:ring-border"
            />
          </FormField>

          <FormField label="URL du fichier" helpText="Lien vers le travail (Google Drive, Behance...)">
            <input
              type="text"
              value={fileUrl}
              onChange={(e) => setFileUrl(e.target.value)}
              placeholder="https://..."
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-white placeholder-zinc-500 outline-none focus:border-border-strong focus:ring-1 focus:ring-border"
            />
          </FormField>

          <FormField label="URL miniature" helpText="Image de preview">
            <input
              type="text"
              value={thumbnailUrl}
              onChange={(e) => setThumbnailUrl(e.target.value)}
              placeholder="https://..."
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-white placeholder-zinc-500 outline-none focus:border-border-strong focus:ring-1 focus:ring-border"
            />
          </FormField>

          <FormField label="Piliers ADVE" helpText="Selectionnez les piliers pertinents">
            <div className="flex flex-wrap gap-2">
              {(Object.entries(PILLAR_NAMES) as [PillarKey, string][]).map(([key, label]) => {
                const isSelected = key in selectedPillars;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => togglePillar(key)}
                    className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                      isSelected
                        ? "bg-blue-400/20 text-blue-400 ring-1 ring-inset ring-blue-400/40"
                        : "border border-dashed border-border text-foreground-muted hover:border-border-strong hover:text-foreground-secondary"
                    }`}
                  >
                    {isSelected ? key.toUpperCase() + " - " + label : "+ " + label}
                  </button>
                );
              })}
            </div>
          </FormField>

          <div className="flex gap-3 pt-2">
            <button
              onClick={() => {
                setAddModal(false);
                resetForm();
              }}
              className="flex-1 rounded-lg border border-border bg-background px-4 py-2.5 text-sm font-medium text-foreground-secondary transition-colors hover:bg-surface-raised"
            >
              Annuler
            </button>
            <button
              onClick={handleAdd}
              disabled={!title || addItem.isPending}
              className="flex-1 rounded-lg bg-white px-4 py-2.5 text-sm font-medium text-foreground-muted transition-colors hover:bg-foreground disabled:opacity-50"
            >
              {addItem.isPending ? "Ajout..." : "Ajouter"}
            </button>
          </div>
        </div>
      </Modal>

      {/* View modal */}
      <Modal
        open={!!viewItem}
        onClose={() => setViewItem(null)}
        title={selectedItem?.title ?? ""}
        size="lg"
      >
        {selectedItem && (
          <div className="space-y-4">
            {selectedItem.thumbnailUrl && (
              <img
                src={selectedItem.thumbnailUrl}
                alt={selectedItem.title}
                className="w-full rounded-lg"
              />
            )}
            {selectedItem.description && (
              <p className="text-sm text-foreground-secondary">{selectedItem.description}</p>
            )}
            {selectedItem.fileUrl && (
              <a
                href={selectedItem.fileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-sm text-blue-400 transition-colors hover:text-blue-300"
              >
                Voir le fichier original
              </a>
            )}
          </div>
        )}
      </Modal>

      {/* Delete confirmation */}
      <ConfirmDialog
        open={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={() => deleteConfirm && removeItem.mutate({ id: deleteConfirm })}
        title="Supprimer l'element"
        message="Voulez-vous vraiment supprimer cet element de votre portfolio ?"
        confirmLabel="Supprimer"
        variant="danger"
      />
    </div>
  );
}
