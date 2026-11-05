"use client";

import { useState } from "react";
import Link from "next/link";
import { Loader2, Pin, X, Zap } from "lucide-react";
import type { JehutyFeedItem } from "@/lib/types/jehuty";
import { FIELD_PROVENANCE_LABEL, type FieldProvenance } from "@/domain/field-provenance";

interface ArticleSpreadProps {
  item: JehutyFeedItem;
  onNotoria: () => void;
  isNotoriaPending: boolean;
  onPin: () => void;
  onUnpin: () => void;
  onDismiss: () => void;
}

function ReadingText({ text }: { text: string }) {
  // The full received text stays accessible, including after a feed refresh.
  const [open, setOpen] = useState(false);
  const long = text.length > 700;
  return <div>
    <p className={`whitespace-pre-wrap break-words text-sm leading-relaxed text-foreground-secondary ${long && !open ? "line-clamp-6" : ""}`}>{text}</p>
    {long && <button type="button" aria-expanded={open} onClick={() => setOpen(!open)} className="mt-2 text-sm text-accent underline underline-offset-4">{open ? "Réduire" : "Lire la suite"}</button>}
  </div>;
}

/** A double editorial spread: reported facts on the left, brand reading on the right.
 * No text generation on read; only the explicit CTA calls the governed Notoria route. */
export function ArticleSpread({ item, onNotoria, isNotoriaPending, onPin, onUnpin, onDismiss }: ArticleSpreadProps) {
  const [failedImageUrl, setFailedImageUrl] = useState<string>();
  const context = item.articleContext;
  const analyses = context?.linkedAnalyses ?? [];
  const recommendations = context?.recommendations ?? [];
  const pinned = item.curation?.action === "PINNED";
  const sourceDate = new Date(item.createdAt).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
  return <article data-testid="gazette-article-spread" className={`grid min-w-0 grid-cols-1 gap-y-8 border-y border-border-subtle py-6 lg:grid-cols-2 ${pinned ? "border-t-accent" : ""}`}>
    <section aria-label="L’actualité" className="min-w-0 lg:pr-8">
      <p className="mb-4 font-mono text-xs uppercase tracking-widest text-foreground-muted">L’actualité</p>
      {item.imageUrl && failedImageUrl !== item.imageUrl && <figure className="mb-5">
        {/* eslint-disable-next-line @next/next/no-img-element -- publisher-provided image, never a generated illustration */}
        <img src={item.imageUrl} alt="" referrerPolicy="no-referrer" loading="lazy" onError={() => setFailedImageUrl(item.imageUrl)} className="aspect-video w-full rounded-lg object-cover" />
        <figcaption className="mt-2 text-xs text-foreground-muted">Image transmise par {item.source || "la source"}</figcaption>
      </figure>}
      <p className="mb-3 text-xs text-foreground-muted">{item.source || "Publication externe"} · {item.dateKind === "COLLECTED" ? "Collecté le " : "Publié le "}{sourceDate}</p>
      <h3 className="mb-4 font-display text-2xl font-semibold leading-tight tracking-tight text-foreground md:text-3xl">
        <a href={item.externalUrl} target="_blank" rel="noopener noreferrer" className="hover:text-accent">{item.title}</a>
      </h3>
      <ReadingText text={item.observation || item.summary} />
      <a href={item.externalUrl} target="_blank" rel="noopener noreferrer" className="mt-4 inline-block text-sm text-accent underline underline-offset-4">Lire l’article chez {item.source || "l’éditeur"} ↗</a>
      <div className="mt-6 flex flex-wrap gap-5 text-xs text-foreground-muted">
        <button type="button" onClick={pinned ? onUnpin : onPin} className="inline-flex items-center gap-2 hover:text-foreground"><Pin className="h-3.5 w-3.5" />{pinned ? "Retirer de la une" : "Épingler"}</button>
        <button type="button" onClick={onDismiss} className="inline-flex items-center gap-2 hover:text-error"><X className="h-3.5 w-3.5" />Écarter</button>
      </div>
    </section>
    <section aria-label="La lecture pour votre marque" className="min-w-0 border-t border-border-subtle pt-6 lg:border-l lg:border-t-0 lg:pl-8 lg:pt-0">
      <p className="mb-4 font-mono text-xs uppercase tracking-widest text-accent">La lecture pour votre marque</p>
      <h4 className="mb-5 font-display text-xl font-semibold text-foreground">Ce que cette actualité met en question</h4>
      {analyses.length > 0 && <div className="space-y-5">{analyses.map(analysis => <div key={analysis.id}>
        <p className="mb-2 text-sm font-semibold text-foreground">{analysis.title}</p>
        <ReadingText text={analysis.text} />
        <p className="mt-2 text-xs text-foreground-muted">Analyse liée à cet article · {new Date(analysis.createdAt).toLocaleDateString("fr-FR")}</p>
      </div>)}</div>}
      {recommendations.length > 0 && <div className="space-y-5">
        {recommendations.map(reco => <div key={reco.id}>
          <p className="mb-2 text-xs text-foreground-muted">Pilier {reco.targetPillarKey.toUpperCase()} · {reco.status === "PENDING" ? "Proposition à examiner" : reco.status === "APPLIED" ? "Proposition appliquée" : reco.status === "ACCEPTED" ? "Proposition retenue" : reco.status === "REJECTED" ? "Proposition écartée" : "Proposition enregistrée"}</p>
          <ReadingText text={reco.explain} />
        </div>)}
      </div>}
      {!analyses.length && !recommendations.length && <p className="text-sm leading-relaxed text-foreground-secondary">Cette actualité est à confronter à vos choix de marque ci-dessous. Son impact n’a pas encore été analysé ; les données de votre ADVE serviront à préparer des propositions liées à cet article.</p>}
      {!!context?.brandContext.length && <details className="my-6 border-y border-border-subtle py-4" open={!analyses.length && !recommendations.length}>
        <summary className="cursor-pointer text-sm font-semibold text-foreground">Les repères de votre ADVE</summary>
        <div className="mt-4 space-y-4">{context.brandContext.map(anchor => <div key={`${anchor.pillarKey}.${anchor.field}`}>
          <p className="mb-1 text-xs text-foreground-muted">{anchor.label} · {anchor.pillarKey.toUpperCase()}{anchor.certainty && anchor.certainty in FIELD_PROVENANCE_LABEL ? ` · ${FIELD_PROVENANCE_LABEL[anchor.certainty as FieldProvenance]}` : ""}{anchor.stale ? " · À réactualiser" : ""}</p>
          <ReadingText text={anchor.text} />
        </div>)}</div>
      </details>}
      <button type="button" onClick={onNotoria} disabled={isNotoriaPending} className="mt-5 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-accent px-5 py-3 text-sm font-medium text-accent-foreground transition-opacity hover:opacity-90 disabled:opacity-50">
        {isNotoriaPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
        {isNotoriaPending ? "Préparation des propositions…" : "Proposer des actions avec l’IA"}
      </button>
      <p className="mt-3 text-xs leading-relaxed text-foreground-muted">L’article et votre ADVE nourrissent les propositions. Vous choisissez ensuite lesquelles appliquer dans Recommandations.</p>
      {item.strategyId && <Link href={`/cockpit/brand/notoria?strategy=${encodeURIComponent(item.strategyId)}`} className="mt-3 inline-block text-sm text-accent underline underline-offset-4">Examiner les propositions dans Recommandations →</Link>}
    </section>
  </article>;
}
