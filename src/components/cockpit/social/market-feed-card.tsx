"use client";

/**
 * MarketFeedCard — « Veille & actualités » (dashboard cockpit, ADR-0128).
 *
 * Agrégation d'articles de presse spécialisée du couple (secteur × pays) de
 * la marque — l'esprit d'un lecteur de flux, alimenté par la collecte
 * automatique. Chaque état est honnête : secteur/pays absents → CTA pour
 * compléter la fiche ; pas encore de collecte → on le dit ; jamais de flux
 * fabriqué.
 */

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ExternalLink, Newspaper, Settings2, X } from "lucide-react";
import { trpc } from "@/lib/trpc/client";
import { EmptyState } from "@/components/shared/empty-state";

function relativeTime(iso: string | null): string | null {
  if (!iso) return null;
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return null;
  const mins = Math.floor((Date.now() - t) / 60_000);
  if (mins < 60) return `il y a ${Math.max(1, mins)} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `il y a ${hours} h`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "hier";
  return `il y a ${days} j`;
}

export function MarketFeedCard({ strategyId }: { strategyId: string }) {
  const router = useRouter();
  const feedQuery = trpc.cockpitDashboard.getMarketFeed.useQuery({ strategyId });
  const feed = feedQuery.data;

  // ── Éditeur de sujets suivis (ADR-0165, manual-first) ──
  const [editing, setEditing] = useState(false);
  const [draftSubjects, setDraftSubjects] = useState<string[] | null>(null);
  const [newSubject, setNewSubject] = useState("");
  const updateMutation = trpc.strategy.update.useMutation({
    onSuccess: () => {
      setEditing(false);
      setDraftSubjects(null);
      feedQuery.refetch();
    },
  });
  const subjects = draftSubjects ?? feed?.watchSubjects ?? [];
  const startEditing = () => {
    setDraftSubjects(feed?.watchSubjects ?? []);
    setEditing(true);
  };
  const addSubject = () => {
    const v = newSubject.trim();
    if (v.length < 3 || subjects.some((s) => s.toLowerCase() === v.toLowerCase()) || subjects.length >= 8) return;
    setDraftSubjects([...subjects, v]);
    setNewSubject("");
  };

  return (
    <div className="ck-card">
      <div className="ck-card__head">
        <h3 className="ck-card__t">Veille &amp; actualités</h3>
        <span className="flex items-center gap-2">
          {feed?.sector && (
            <span className="ck-card__sub">
              <Newspaper />
              {feed.sector}
              {feed.countryCode ? ` · ${feed.countryCode}` : ""}
            </span>
          )}
          {feed?.configured && (
            <button
              type="button"
              onClick={() => (editing ? setEditing(false) : startEditing())}
              className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs text-foreground-secondary hover:border-primary hover:text-primary"
            >
              <Settings2 className="h-3.5 w-3.5" />
              Sujets suivis
            </button>
          )}
        </span>
      </div>

      {editing && (
        <div className="mb-4 rounded-lg border border-border-subtle bg-background-raised p-3">
          <p className="text-xs text-foreground-muted">
            La veille suit ces sujets, en plus de votre marque. Par défaut ils sont déduits de votre
            catalogue, de vos concurrents et de votre communauté — ajoutez ou retirez librement
            (ex&nbsp;: «&nbsp;Canon&nbsp;», «&nbsp;photographie Cameroun&nbsp;»).
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {subjects.map((s) => (
              <span key={s} className="inline-flex items-center gap-1 rounded-full border border-border px-2.5 py-0.5 text-xs text-foreground">
                {s}
                <button type="button" aria-label={`Retirer ${s}`} onClick={() => setDraftSubjects(subjects.filter((x) => x !== s))}>
                  <X className="h-3 w-3 text-foreground-muted hover:text-destructive" />
                </button>
              </span>
            ))}
            {subjects.length === 0 && (
              <span className="text-xs text-foreground-muted">Aucun sujet — la veille retombera sur votre marque et votre secteur.</span>
            )}
          </div>
          <div className="mt-2 flex gap-2">
            <input
              value={newSubject}
              onChange={(e) => setNewSubject(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addSubject(); } }}
              placeholder="Ajouter un sujet…"
              className="w-full rounded-md border border-border bg-background px-2.5 py-1.5 text-xs text-foreground placeholder:text-foreground-muted"
              maxLength={60}
            />
            <button
              type="button"
              onClick={addSubject}
              className="shrink-0 rounded-md border border-border px-2.5 py-1.5 text-xs text-foreground-secondary hover:border-primary hover:text-primary"
            >
              Ajouter
            </button>
            <button
              type="button"
              disabled={updateMutation.isPending}
              onClick={() => updateMutation.mutate({ id: strategyId, watchSubjects: draftSubjects ?? [] })}
              className="shrink-0 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
            >
              {updateMutation.isPending ? "Enregistrement…" : "Enregistrer"}
            </button>
          </div>
          {updateMutation.error && (
            <p className="mt-1.5 text-xs text-destructive">L&apos;enregistrement a échoué — réessayez.</p>
          )}
        </div>
      )}

      {feedQuery.isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-10 animate-[shimmer_2s_linear_infinite] rounded-lg bg-surface-overlay" />
          ))}
        </div>
      ) : !feed || !feed.configured ? (
        <EmptyState
          className="py-10"
          icon={Newspaper}
          title="Veille non activée"
          description="Précisez le secteur et le pays de votre marque pour recevoir automatiquement l'actualité de votre marché."
          action={{ label: "Compléter ma fiche marque", onClick: () => router.push("/cockpit/brand/fondation") }}
        />
      ) : feed.articles.length === 0 ? (
        <EmptyState
          className="py-10"
          icon={Newspaper}
          title="Collecte en préparation"
          description={`La veille ${feed.sector ?? ""} s'alimentera automatiquement dès la prochaine collecte — revenez d'ici demain.`}
        />
      ) : (
        <>
          {feed.themes.length > 0 && (
            <div className="ck-feed__themes">
              {feed.themes.map((t) => (
                <span className="ck-feed__theme" key={t}>{t}</span>
              ))}
            </div>
          )}
          <div className="ck-feed">
            {feed.articles.slice(0, 6).map((a, i) => {
              const when = relativeTime(a.publishedAt);
              const body = (
                <>
                  <p className="ck-feed__title">{a.title}</p>
                  <p className="ck-feed__meta">
                    {a.source ?? "Presse spécialisée"}
                    {when ? ` · ${when}` : ""}
                  </p>
                </>
              );
              return a.link ? (
                <a
                  className="ck-feed__item"
                  key={`${a.title}-${i}`}
                  href={a.link}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <span className="ck-feed__body">{body}</span>
                  <ExternalLink className="ck-feed__ext" />
                </a>
              ) : (
                <div className="ck-feed__item" key={`${a.title}-${i}`}>
                  <span className="ck-feed__body">{body}</span>
                </div>
              );
            })}
          </div>
          <div className="ck-feed__foot">
            {feed.lastDigestAt && <span>Dernière collecte : {relativeTime(feed.lastDigestAt)}</span>}
            <Link href="/cockpit/brand/jehuty" className="ck-card__link">
              Toute la Gazette →
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
