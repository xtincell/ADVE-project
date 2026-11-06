"use client";

import { useState } from "react";
import Link from "next/link";
import { Loader2, Pin, X, Zap } from "lucide-react";
import type { ArticleSourceGrounding, JehutyFeedItem } from "@/lib/types/jehuty";
import { FIELD_PROVENANCE_LABEL, type FieldProvenance } from "@/domain/field-provenance";

export interface ArticleSpreadProps {
  onOpen?: () => void;
  expanded?: boolean;
  item: JehutyFeedItem;
  onNotoria: () => void;
  isNotoriaPending: boolean;
  onPin: () => void;
  onUnpin: () => void;
  onDismiss: () => void;
}

/** A stored heading is sometimes repeated as the first paragraph of the body. */
export function readingBody(text: string, heading: string): string {
  const paragraphs = text.trim().split(/\n\s*\n/);
  return paragraphs.length > 1 && paragraphs[0]?.trim() === heading.trim()
    ? paragraphs.slice(1).join("\n\n") : text;
}

function ReadingText({ text, expanded = false }: { text: string; expanded?: boolean }) {
  // The full received text stays accessible, including after a feed refresh.
  const [open, setOpen] = useState(false);
  const long = text.length > 700;
  return <div>
    <p className={`whitespace-pre-wrap break-words text-sm leading-relaxed text-foreground-secondary ${long && !open && !expanded ? "line-clamp-6" : ""}`}>{text}</p>
    {long && !expanded && <button type="button" aria-expanded={open} onClick={() => setOpen(!open)} className="mt-2 text-sm text-accent underline underline-offset-4">{open ? "Réduire" : "Lire la suite"}</button>}
  </div>;
}

function groundingLabel(value?: { score: number; band: ArticleSourceGrounding["band"] }): string {
  if (!value) return "Non mesuré";
  if (value.band === "NO_SOURCE") return "Recouvrement non mesurable";
  const label = { GROUNDED: "Appui lexical", WEAK: "Appui lexical partiel", UNGROUNDED: "Appui lexical insuffisant" }[value.band];
  return `${label} · ${Math.round(value.score * 100)} %`;
}

/** A double editorial spread: reported facts on the left, brand reading on the right.
 * No text generation on read; only the explicit CTA calls the governed Notoria route. */
export function ArticleSpread({ item, onNotoria, isNotoriaPending, onPin, onUnpin, onDismiss, onOpen, expanded = false }: ArticleSpreadProps) {
  const [failedImageUrl, setFailedImageUrl] = useState<string>();
  const context = item.articleContext;
  const analyses = context?.linkedAnalyses ?? [];
  const stored = context?.recommendations ?? [];
  const recommendations = stored.filter(row => row.actionBasis);
  const history = [...(context?.generalRecommendations ?? []), ...stored.filter(row => !row.actionBasis)];
  const alternatives = context?.alternatives ?? [];
  const toInvestigate = context?.toInvestigate ?? [];
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
      {onOpen && <button type="button" onClick={onOpen} aria-haspopup="dialog" className="mb-4 inline-block text-sm font-medium text-accent underline underline-offset-4">Ouvrir l’article et son décryptage</button>}
      <p className="mb-2 text-xs text-foreground-muted">Extrait reçu de la source</p>
      <ReadingText expanded={expanded} text={item.observation || item.summary} />
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
        <ReadingText expanded={expanded} text={readingBody(analysis.text, analysis.title)} />
        <p className="mt-2 text-xs text-foreground-muted">Analyse liée à cet article · {new Date(analysis.createdAt).toLocaleDateString("fr-FR")}</p>
      </div>)}</div>}
      {[
        { label: "Actions tirées de l’article", rows: recommendations },
        { label: "Alternatives équivalentes", rows: alternatives },
        { label: "Pistes à instruire", rows: toInvestigate },
        { label: "Historique des recommandations générales", rows: history, historical: true },
      ].filter(group => group.rows.length).map(group => {
        const Section = group.historical ? "details" : "section";
        const Heading = group.historical ? "summary" : "h5";
        return <Section key={group.label} className="my-4 space-y-5">
        <Heading className="font-semibold">{group.label} ({group.rows.length})</Heading>
        {group.historical && <p className="text-sm text-foreground-muted">Le lien entre ces anciennes propositions et un passage précis de cet article reste à établir.</p>}
        {group.rows.map(reco => <div key={reco.id}>
          <p className="mb-2 text-xs text-foreground-muted">Pilier {reco.targetPillarKey.toUpperCase()} · {reco.status === "PENDING" ? "Proposition à examiner" : reco.status === "APPLIED" ? "Proposition appliquée" : reco.status === "ACCEPTED" ? "Proposition retenue" : reco.status === "REJECTED" ? "Proposition écartée" : "Proposition enregistrée"}</p>
          {reco.actionBasis ? <>
            <h6 className="mb-2 font-semibold">{reco.actionBasis.action}</h6>
            <blockquote className="my-3 whitespace-pre-wrap border-l border-border-subtle pl-3">{reco.actionBasis.quote}</blockquote>
            <p className="text-sm font-semibold">Ce que cela suggère pour votre marque</p>
            <ReadingText expanded={expanded} text={reco.actionBasis.implication} />
            <p className="mt-3 text-sm"><strong>À vérifier.</strong> {reco.actionBasis.measure}</p>
            <details className="mt-3 text-sm"><summary className="cursor-pointer">Raisons et comparaison</summary>
              <p className="mt-2">Repère de marque · {reco.actionBasis.anchor.pillarKey.toUpperCase()}.{reco.actionBasis.anchor.field}</p>
              <blockquote className="my-2">{reco.actionBasis.anchor.quote}</blockquote>
              <p>{reco.actionBasis.reviewReason}</p>
              <p className="mt-3 font-semibold">Comparaison · {reco.actionBasis.comparison.objective}</p>
              <p>{reco.actionBasis.comparison.reason}</p>
              {reco.actionBasis.comparison.criterion && <p>{reco.actionBasis.comparison.criterion} · {reco.actionBasis.comparison.basis === "measurement" ? "Mesure observée" : "Projection de planification"}</p>}
              {reco.actionBasis.comparison.delta != null && <p>Écart projeté · {reco.actionBasis.comparison.delta.toLocaleString("fr-FR")} {reco.actionBasis.comparison.unit}</p>}
              {reco.actionBasis.comparison.evidence.map(ref => <p className="mt-1 break-words text-xs" key={ref}>{ref}</p>)}
            </details>
          </> : <ReadingText expanded={expanded} text={reco.explain} />}
          <details className="mt-3 rounded-lg border border-border-subtle p-3">
            <summary className="cursor-pointer text-xs text-foreground-muted">Sources de cette proposition</summary>
            <dl className="mt-3 space-y-2 text-xs text-foreground-secondary">
              <div><dt className="font-semibold">Article observé</dt><dd>{groundingLabel(reco.articleGrounding)}</dd></div>
              <div><dt className="font-semibold">Documentation de marque</dt><dd>{groundingLabel(reco.documentaryGrounding)}</dd></div>
            </dl>
            <p className="mt-3 text-xs text-foreground-muted">Le recouvrement compare le vocabulaire de la proposition aux extraits transmis. Il ne valide ni les faits rapportés ni l’impact supposé pour la marque.</p>
            {reco.articleGrounding ? <div className="mt-3 space-y-2 text-xs text-foreground-secondary">
              <a className="text-accent underline underline-offset-4" href={reco.articleGrounding.sourceUrl} target="_blank" rel="noopener noreferrer">{reco.articleGrounding.source || "Voir la publication source"} ↗</a>
              <p>Faits rapportés par la source · {reco.articleGrounding.publishedAt ? `Date fournie : ${reco.articleGrounding.publishedAt}` : "Date non fournie par la source"}</p>
              <p className="font-semibold">Extraits effectivement transmis</p>
              {reco.articleGrounding.excerpts.map(excerpt => <blockquote key={excerpt.field} className="whitespace-pre-wrap break-words border-l border-border-subtle pl-3">{excerpt.text}</blockquote>)}
              <p className="break-all text-foreground-muted">Référence : {reco.articleGrounding.sourceId} · Empreinte de l’entrée : {reco.articleGrounding.observationHash}</p>
            </div> : <p className="mt-3 text-xs text-foreground-muted">L’extrait exact utilisé pour cette proposition n’est pas conservé dans son reçu. L’article affiché aujourd’hui ne remplace pas cette trace.</p>}
          </details>
        </div>)}
      </Section>; })}
      {!recommendations.length && (history.length > 0 || context?.lastActionAnalysis) && <p className="mb-4 text-sm">
        {context?.lastActionAnalysis?.status === "FAILED" ? "La dernière analyse de cet article a échoué." : "Aucune action retenue à ce stade."}
      </p>}
      {!context?.lastActionAnalysis && !history.length && !analyses.length && !recommendations.length && !alternatives.length && !toInvestigate.length && <p className="text-sm leading-relaxed text-foreground-secondary">Cette actualité est à confronter à vos choix de marque ci-dessous. Son impact n’a pas encore été analysé ; les données de votre ADVE serviront à préparer des propositions liées à cet article.</p>}
      {!!context?.brandContext.length && <details className="my-6 border-y border-border-subtle py-4" open={!analyses.length && !recommendations.length}>
        <summary className="cursor-pointer text-sm font-semibold text-foreground">Les repères de votre ADVE</summary>
        <div className="mt-4 space-y-4">{context.brandContext.map(anchor => <div key={`${anchor.pillarKey}.${anchor.field}`}>
          <p className="mb-1 text-xs text-foreground-muted">{anchor.label} · {anchor.pillarKey.toUpperCase()}{anchor.certainty && anchor.certainty in FIELD_PROVENANCE_LABEL ? ` · ${FIELD_PROVENANCE_LABEL[anchor.certainty as FieldProvenance]}` : ""}{anchor.stale ? " · À réactualiser" : ""}</p>
          <ReadingText expanded={expanded} text={anchor.text} />
        </div>)}</div>
      </details>}
      <button type="button" onClick={onNotoria} disabled={isNotoriaPending} className="mt-5 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-accent px-5 py-3 text-sm font-medium text-accent-foreground transition-opacity hover:opacity-90 disabled:opacity-50">
        {isNotoriaPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
        {isNotoriaPending ? "Préparation des propositions…" : "Proposer des actions avec l’IA"}
      </button>
      <p className="mt-3 text-xs leading-relaxed text-foreground-muted">Une piste cite un passage de l’article et un repère de votre marque. La comparaison aux décisions adoptées distingue les actions retenues, les alternatives et les pistes à instruire.</p>
      {item.strategyId && <Link href={`/cockpit/brand/notoria?strategy=${encodeURIComponent(item.strategyId)}`} className="mt-3 inline-block text-sm text-accent underline underline-offset-4">Examiner les propositions dans Recommandations →</Link>}
    </section>
  </article>;
}
