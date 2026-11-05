"use client";

import Link from "next/link";
import { Loader2, Zap } from "lucide-react";
import { Modal } from "@/components/shared/modal";
import { trpc } from "@/lib/trpc/client";
import type { JehutyFeedItem, SignalReading } from "@/lib/types/jehuty";
import { ArticleSpread, readingBody, type ArticleSpreadProps } from "./article-spread";

interface GazetteReaderProps extends Omit<ArticleSpreadProps, "item" | "onOpen" | "expanded"> {
  item: JehutyFeedItem | null;
  onClose: () => void;
}

/** Reading an edition never runs a model, collects a new source or changes the brand. */
export function GazetteReader({ item, onClose, ...actions }: GazetteReaderProps) {
  return <Modal open={!!item} onClose={onClose} title="La Gazette · sources et décryptage" size="2xl">
    {item && (item.externalUrl
      ? <ArticleSpread key={item.id} item={item} expanded {...actions} />
      : <SignalSpread key={item.id} item={item} onNotoria={actions.onNotoria} isNotoriaPending={actions.isNotoriaPending} />)}
  </Modal>;
}

const CONTEXT_LABELS: Record<string, string> = {
  sector: "Secteur", market: "Marché", brandIdentity: "Identité", positioning: "Positionnement",
  products: "Offres", riskFactors: "Risques", countryContext: "Territoire", brandHealthContext: "Situation de la marque",
};

function SourceEntry({ source }: { source: SignalReading["inputSignals"][number] }) {
  const article = source.article;
  const url = article?.url ?? source.sourceUrl;
  return <article className="min-w-0 border-t border-border-subtle pt-5">
    <p className="mb-2 text-xs text-foreground-muted">{source.kind === "INFERRED" ? "Hypothèse générée · à vérifier" : source.kind === "COLLECTED" ? "Source collectée" : "Entrée conservée · origine non qualifiée"}</p>
    <h4 className="mb-3 font-display text-lg font-semibold text-foreground">{article?.title || source.title}</h4>
    {article?.imageUrl && <figure className="mb-4">
      {/* eslint-disable-next-line @next/next/no-img-element -- image provided by the exact publisher article */}
      <img src={article.imageUrl} alt="" referrerPolicy="no-referrer" loading="lazy" className="aspect-video w-full rounded-lg object-cover" onError={event => { event.currentTarget.hidden = true; }} />
      <figcaption className="mt-2 text-xs text-foreground-muted">Image transmise par {article.source}</figcaption>
    </figure>}
    {article && <p className="mb-2 text-xs text-foreground-muted">{article.source} · Extrait reçu de l’article{article.publishedAt ? ` · ${new Date(article.publishedAt).toLocaleDateString("fr-FR")}` : ""}</p>}
    <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-foreground-secondary">{article?.content || source.content}</p>
    {url && <a href={url} target="_blank" rel="noopener noreferrer" className="mt-3 inline-block break-all text-sm text-accent underline underline-offset-4">Consulter la source ↗</a>}
    {article && source.content.trim() && source.content !== article.content && <details className="mt-4">
      <summary className="cursor-pointer text-sm text-foreground-muted">Texte transmis à l’analyse</summary>
      <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-relaxed text-foreground-secondary">{source.content}</p>
    </details>}
  </article>;
}

function SignalSpread({ item, onNotoria, isNotoriaPending }: Pick<ArticleSpreadProps, "item" | "onNotoria" | "isNotoriaPending">) {
  const reading = trpc.jehuty.readSignal.useQuery({ strategyId: item.strategyId, signalId: item.sourceId }, {
    enabled: item.sourceType === "SIGNAL" && !!item.strategyId,
    retry: false,
  });
  const data = reading.data;
  return <article data-testid="gazette-signal-spread" className="grid min-w-0 grid-cols-1 gap-y-8 lg:grid-cols-2">
    <section aria-label="Les sources de cette analyse" className="min-w-0 lg:pr-8">
      <p className="mb-4 font-mono text-xs uppercase tracking-widest text-foreground-muted">Les sources</p>
      <h3 className="mb-4 font-display text-xl font-semibold text-foreground">Ce qui a nourri ce message</h3>
      {reading.isLoading && <p role="status" className="text-sm text-foreground-secondary">Lecture des sources enregistrées…</p>}
      {reading.error && <div role="alert" className="text-sm text-foreground-secondary">
        <p>Les sources n’ont pas pu être chargées. Le message reste consultable.</p>
        <button type="button" onClick={() => reading.refetch()} className="mt-3 text-accent underline underline-offset-4">Réessayer la lecture</button>
      </div>}
      {data?.provenanceStatus === "UNTRACEABLE" && <p className="mb-5 rounded-lg border border-warning/30 bg-warning/5 p-4 text-sm leading-relaxed text-foreground-secondary">
        L’origine de cette ancienne analyse n’a pas été conservée. Aucun article précis ne peut lui être attribué. Cette interprétation reste à vérifier.
      </p>}
      {data?.provenanceStatus === "REFERENCED" && <p className="mb-5 text-sm leading-relaxed text-foreground-secondary">
        Des références ont été conservées avec cette analyse. Le contexte historique et le texte transmis au moteur n’ont pas été enregistrés.
      </p>}
      {!!data?.inputSignals.length && <>
        <p className="mb-4 text-xs leading-relaxed text-foreground-muted">Entrées conservées lors de l’analyse. Leur présence ne prouve pas à elle seule chacune de ses conclusions.</p>
        <div className="space-y-6">{data.inputSignals.map((source, index) => <SourceEntry key={source.id ?? `${index}:${source.title}`} source={source} />)}</div>
      </>}
      {data?.brandContextSnapshot && <details className="mt-6 border-t border-border-subtle pt-4">
        <summary className="cursor-pointer text-sm font-semibold text-foreground">Contexte de marque utilisé à cette date</summary>
        <div className="mt-4 space-y-4">{Object.entries(data.brandContextSnapshot).filter(([, value]) => !!value).map(([key, value]) => <div key={key}>
          <p className="mb-1 text-xs text-foreground-muted">{CONTEXT_LABELS[key] ?? key}</p>
          <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-foreground-secondary">{Array.isArray(value) ? value.join("\n") : String(value)}</p>
        </div>)}</div>
      </details>}
      {!!data?.currentBrandContext.length && <details className="mt-6 border-t border-border-subtle pt-4">
        <summary className="cursor-pointer text-sm font-semibold text-foreground">Comparer aux fondations actuelles</summary>
        <p className="mt-3 text-xs leading-relaxed text-foreground-muted">Le contexte actuel sert à relire ce message. Il ne constitue pas la preuve de ce qui a été utilisé lors de sa rédaction.</p>
        <div className="mt-4 space-y-4">{data.currentBrandContext.map(anchor => <div key={`${anchor.pillarKey}.${anchor.field}`}>
          <p className="mb-1 text-xs text-foreground-muted">{anchor.label}{anchor.stale ? " · À réactualiser" : ""}</p>
          <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-foreground-secondary">{anchor.text}</p>
        </div>)}</div>
      </details>}
    </section>
    <section aria-label="L’interprétation pour votre marque" className="min-w-0 border-t border-border-subtle pt-6 lg:border-l lg:border-t-0 lg:pl-8 lg:pt-0">
      <p className="mb-4 font-mono text-xs uppercase tracking-widest text-accent">L’interprétation</p>
      <h3 className="mb-3 font-display text-2xl font-semibold leading-tight text-foreground">{item.title}</h3>
      <p className="mb-5 text-xs text-foreground-muted">{item.source} · {new Date(item.createdAt).toLocaleDateString("fr-FR")}</p>
      <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-foreground-secondary">{readingBody(data?.interpretation || item.observation || item.summary, item.title)}</p>
      <button type="button" onClick={onNotoria} disabled={isNotoriaPending} className="mt-6 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-accent px-5 py-3 text-sm font-medium text-accent-foreground transition-opacity hover:opacity-90 disabled:opacity-50">
        {isNotoriaPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
        {isNotoriaPending ? "Préparation des propositions…" : "Proposer des actions avec l’IA"}
      </button>
      <p className="mt-3 text-xs leading-relaxed text-foreground-muted">Cette action prépare des propositions à partir du message et de votre marque. Vous choisissez lesquelles appliquer ; leur génération ne vérifie pas les faits à elle seule.</p>
      <Link href={`/cockpit/brand/notoria?strategy=${encodeURIComponent(item.strategyId)}`} className="mt-3 inline-block text-sm text-accent underline underline-offset-4">Examiner les propositions →</Link>
    </section>
  </article>;
}
