"use client";

/**
 * Console — Blog (CMS natif « Notes de cabinet »).
 *
 * CRUD éditorial des `Post` du site public UPgraders : créer, éditer,
 * publier/dépublier, supprimer. Lecture publique via /blog (DB-first).
 */

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { PageHeader } from "@/components/shared/page-header";
import { SkeletonPage } from "@/components/shared/loading-skeleton";
import { FileText, Plus, Eye, EyeOff, Trash2, Pencil, ExternalLink } from "lucide-react";

type Draft = {
  id?: string;
  title: string;
  slug: string;
  excerpt: string;
  category: string;
  tags: string;
  coverUrl: string;
  coverAlt: string;
  contentHtml: string;
  status: "DRAFT" | "PUBLISHED";
};

const EMPTY: Draft = {
  title: "",
  slug: "",
  excerpt: "",
  category: "",
  tags: "",
  coverUrl: "",
  coverAlt: "",
  contentHtml: "",
  status: "DRAFT",
};

const field = "w-full border border-border bg-transparent px-3 py-2 text-sm outline-none focus:border-accent";

export default function ConsoleBlogPage() {
  const utils = trpc.useUtils();
  const { data: posts, isLoading } = trpc.blog.listAll.useQuery();
  const [draft, setDraft] = useState<Draft | null>(null);

  const upsert = trpc.blog.upsert.useMutation({
    onSuccess: () => {
      utils.blog.invalidate();
      setDraft(null);
    },
  });
  const setStatus = trpc.blog.setStatus.useMutation({ onSuccess: () => utils.blog.invalidate() });
  const remove = trpc.blog.remove.useMutation({ onSuccess: () => utils.blog.invalidate() });

  if (isLoading) return <SkeletonPage />;

  const published = posts?.filter((p) => p.status === "PUBLISHED").length ?? 0;
  const drafts = posts?.filter((p) => p.status === "DRAFT").length ?? 0;

  const save = () => {
    if (!draft || draft.title.trim().length < 2) return;
    upsert.mutate({
      id: draft.id,
      title: draft.title,
      slug: draft.slug || undefined,
      excerpt: draft.excerpt,
      contentHtml: draft.contentHtml,
      coverUrl: draft.coverUrl || undefined,
      coverAlt: draft.coverAlt || undefined,
      category: draft.category || undefined,
      tags: draft.tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
      status: draft.status,
    });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Blog — Notes de cabinet"
        description="CMS natif du site public UPgraders. Créez, éditez et publiez les articles ; /blog les lit en base (DB-first, fallback bundle)."
        breadcrumbs={[
          { label: "Console", href: "/console" },
          { label: "Anubis", href: "/console/anubis" },
          { label: "Blog" },
        ]}
      />

      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-success/15 px-2.5 py-1 font-mono text-[11px] text-success">
          <Eye className="h-3 w-3" /> {published} publiés
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-border px-2.5 py-1 font-mono text-[11px] text-foreground-muted">
          <EyeOff className="h-3 w-3" /> {drafts} brouillons
        </span>
        <a
          href="/blog"
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1.5 rounded-full border border-border px-2.5 py-1 font-mono text-[11px] text-foreground-muted transition-colors hover:text-accent"
        >
          <ExternalLink className="h-3 w-3" /> Voir le blog public
        </a>
        <button
          type="button"
          onClick={() => setDraft({ ...EMPTY })}
          className="ml-auto inline-flex items-center gap-2 bg-accent px-4 py-2 text-sm font-medium text-accent-foreground transition-colors hover:bg-accent-hover"
        >
          <Plus className="h-4 w-4" /> Nouvel article
        </button>
      </div>

      {/* Éditeur */}
      {draft ? (
        <div className="space-y-4 border border-accent bg-surface-raised p-5">
          <div className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-widest text-foreground-muted">
            <Pencil className="h-3.5 w-3.5" /> {draft.id ? "Éditer l'article" : "Nouvel article"}
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <label className="flex flex-col gap-1.5">
              <span className="text-sm text-foreground-secondary">Titre *</span>
              <input className={field} value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-sm text-foreground-secondary">Slug (auto si vide)</span>
              <input className={field} value={draft.slug} onChange={(e) => setDraft({ ...draft, slug: e.target.value })} placeholder="genere-depuis-le-titre" />
            </label>
          </div>
          <label className="flex flex-col gap-1.5">
            <span className="text-sm text-foreground-secondary">Chapô / extrait</span>
            <textarea className={`${field} resize-none`} rows={2} value={draft.excerpt} onChange={(e) => setDraft({ ...draft, excerpt: e.target.value })} />
          </label>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <label className="flex flex-col gap-1.5">
              <span className="text-sm text-foreground-secondary">Catégorie</span>
              <input className={field} value={draft.category} onChange={(e) => setDraft({ ...draft, category: e.target.value })} placeholder="Méthode, Stratégie…" />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-sm text-foreground-secondary">Tags (séparés par des virgules)</span>
              <input className={field} value={draft.tags} onChange={(e) => setDraft({ ...draft, tags: e.target.value })} placeholder="ADVE/RTIS, Branding Afrique" />
            </label>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <label className="flex flex-col gap-1.5">
              <span className="text-sm text-foreground-secondary">URL de couverture</span>
              <input className={field} value={draft.coverUrl} onChange={(e) => setDraft({ ...draft, coverUrl: e.target.value })} placeholder="https://…" />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-sm text-foreground-secondary">Texte alternatif couverture</span>
              <input className={field} value={draft.coverAlt} onChange={(e) => setDraft({ ...draft, coverAlt: e.target.value })} />
            </label>
          </div>
          <label className="flex flex-col gap-1.5">
            <span className="text-sm text-foreground-secondary">Contenu (HTML — &lt;p&gt;, &lt;h2&gt;, &lt;ul&gt;, &lt;strong&gt;, &lt;em&gt;)</span>
            <textarea className={`${field} resize-y font-mono text-xs`} rows={12} value={draft.contentHtml} onChange={(e) => setDraft({ ...draft, contentHtml: e.target.value })} />
          </label>
          <div className="flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-2">
              <span className="text-sm text-foreground-secondary">Statut</span>
              <select className="border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent" value={draft.status} onChange={(e) => setDraft({ ...draft, status: e.target.value as Draft["status"] })}>
                <option value="DRAFT">Brouillon</option>
                <option value="PUBLISHED">Publié</option>
              </select>
            </label>
            <button
              type="button"
              onClick={save}
              disabled={upsert.isPending || draft.title.trim().length < 2}
              className="inline-flex items-center gap-2 bg-accent px-4 py-2 text-sm font-medium text-accent-foreground transition-colors hover:bg-accent-hover disabled:opacity-40"
            >
              {upsert.isPending ? "Enregistrement…" : "Enregistrer"}
            </button>
            <button type="button" onClick={() => setDraft(null)} className="px-3 py-2 text-sm text-foreground-muted transition-colors hover:text-foreground">
              Annuler
            </button>
            {upsert.isError ? <span className="text-xs text-error">Échec — vérifiez les champs.</span> : null}
          </div>
        </div>
      ) : null}

      {/* Liste */}
      <div className="border border-border">
        {posts && posts.length > 0 ? (
          posts.map((p) => (
            <div key={p.id} className="flex flex-wrap items-center gap-3 border-b border-border-subtle p-4 last:border-0">
              <FileText className="h-4 w-4 shrink-0 text-foreground-muted" />
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium text-foreground">{p.title}</div>
                <div className="font-mono text-[11px] text-foreground-muted">
                  /{p.slug} · {p.category ?? "—"} · {p.readingMinutes} min
                </div>
              </div>
              <span
                className={
                  p.status === "PUBLISHED"
                    ? "rounded-full bg-success/15 px-2 py-0.5 font-mono text-[10px] uppercase tracking-widest text-success"
                    : "rounded-full border border-border px-2 py-0.5 font-mono text-[10px] uppercase tracking-widest text-foreground-muted"
                }
              >
                {p.status === "PUBLISHED" ? "Publié" : "Brouillon"}
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  title="Éditer"
                  onClick={() =>
                    setDraft({
                      id: p.id,
                      title: p.title,
                      slug: p.slug,
                      excerpt: p.excerpt,
                      category: p.category ?? "",
                      tags: p.tags.join(", "),
                      coverUrl: p.coverUrl ?? "",
                      coverAlt: p.coverAlt ?? "",
                      contentHtml: p.contentHtml,
                      status: p.status,
                    })
                  }
                  className="inline-flex h-8 w-8 items-center justify-center text-foreground-muted transition-colors hover:text-accent"
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  title={p.status === "PUBLISHED" ? "Dépublier" : "Publier"}
                  onClick={() => setStatus.mutate({ id: p.id, status: p.status === "PUBLISHED" ? "DRAFT" : "PUBLISHED" })}
                  className="inline-flex h-8 w-8 items-center justify-center text-foreground-muted transition-colors hover:text-accent"
                >
                  {p.status === "PUBLISHED" ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
                <button
                  type="button"
                  title="Supprimer"
                  onClick={() => {
                    if (confirm(`Supprimer « ${p.title} » ? Cette action est définitive.`)) remove.mutate({ id: p.id });
                  }}
                  className="inline-flex h-8 w-8 items-center justify-center text-foreground-muted transition-colors hover:text-error"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="p-8 text-center text-sm text-foreground-muted">
            Aucun article en base. Le blog public affiche le bundle par défaut tant que rien n&apos;est publié ici.
            <br />
            Lancez <code className="font-mono text-foreground">npm run db:seed:blog</code> pour importer les 6 notes fournies, ou créez-en un.
          </div>
        )}
      </div>
    </div>
  );
}
