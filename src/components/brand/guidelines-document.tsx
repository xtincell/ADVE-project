"use client";
import { useState } from "react";
import type { GuidelineAsset, GuidelinesDocument } from "@/server/services/guidelines-renderer";
import { SOURCE_CERTAINTY_LABEL, isSourceCertainty } from "@/domain/source-certainty";
import { Button } from "@/components/primitives/button";
import { Card, CardBody } from "@/components/primitives/card";
import { WorkspaceAssetMedia } from "@/components/portfolio/WorkspaceAssets";
import { SourceReadDialog } from "@/components/brand/source-read-dialog";

function AssetEvidence({ asset }: { asset: GuidelineAsset }) {
  return <div className="space-y-2 text-sm">
    <h3 className="font-semibold">{asset.name}</h3>
    <p className="text-foreground-secondary">Version {asset.version} · {asset.stateLabel}</p>
    <p className="text-foreground-secondary">{asset.provenance.message}</p>
    {asset.state !== "ACTIVE" && <p className="text-warning">Cette proposition n’est pas une identité en usage.</p>}
  </div>;
}
function RecordedContent({ value }: { value: unknown }) {
  return <pre className="max-h-96 overflow-auto whitespace-pre-wrap break-words text-xs leading-relaxed text-foreground-secondary">{typeof value === "string" ? value : JSON.stringify(value, null, 2)}</pre>;
}

/** Renders the actual structured contract; HTML headings cannot invent sections. */
export function GuidelinesDocumentView({ document: doc }: { document: GuidelinesDocument }) {
  const [sourceId, setSourceId] = useState<string | null>(null);
  const { logo, chromatic, typography, colors, fonts } = doc.identity;
  return <div className="min-w-0 space-y-6">
    <div className="rounded-xl border border-warning/30 bg-warning/10 p-4 text-sm text-warning">
      Les états enregistrés ne constituent pas une preuve d’approbation. Une proposition reste une proposition.
      {Object.values(doc.identity.activeCounts).some((n) => n > 1) && <p className="mt-2">Plusieurs versions sont en usage dans le dossier : choix à confirmer.</p>}
    </div>
    <p className="text-xs text-foreground-secondary">Lecture du {new Date(doc.generatedAt).toLocaleString("fr-FR")} · Actualiser relit le dossier sans le modifier.</p>
    <a href={`/cockpit/brand/bible?strategy=${encodeURIComponent(doc.strategyId)}`} className="inline-block text-sm text-accent underline">Livre de marque : fondations et choix stratégiques</a>
    <nav aria-label="Sections des guidelines" className="flex flex-wrap gap-4 text-sm text-accent">
      <a href="#guidelines-logo" className="underline">Logo</a><a href="#guidelines-colors" className="underline">Couleurs</a><a href="#guidelines-typography" className="underline">Typographie</a><a href="#guidelines-books" className="underline">Chartes</a><a href="#guidelines-sources" className="underline">Documents de référence</a>
    </nav>
    <div className="grid min-w-0 gap-5 lg:grid-cols-3">
      <Card id="guidelines-logo" className="min-w-0"><CardBody className="space-y-4">
        <h2 className="text-lg font-semibold">Logo</h2><p className="text-xs text-foreground-secondary">{doc.identity.counts.logos} logos disponibles · {doc.identity.activeCounts.logos} en usage</p>
        {logo ? <><WorkspaceAssetMedia asset={{ id: logo.id, nativeId: logo.id, name: logo.name, kind: "Logo", brand: doc.title, state: logo.stateLabel, source: "La Fusée", note: logo.provenance.message, preview: logo.fileUrl, url: logo.fileUrl }} /><AssetEvidence asset={logo} /></> : <p className="text-sm text-foreground-secondary">Aucun logo disponible dans ce dossier.</p>}
      </CardBody></Card>
      <Card id="guidelines-colors" className="min-w-0"><CardBody className="space-y-4">
        <h2 className="text-lg font-semibold">Couleurs</h2><p className="text-xs text-foreground-secondary">{doc.identity.counts.palettes} palettes disponibles · {doc.identity.activeCounts.palettes} en usage</p>
        {chromatic ? <><AssetEvidence asset={chromatic} /><ul className="space-y-2">{colors.all.map((hex) => <li key={hex} className="flex items-center gap-3"><span aria-hidden="true" className="h-8 w-8 shrink-0 rounded border border-border" style={{ backgroundColor: hex }} /><code className="text-xs">{hex}</code></li>)}</ul>{!colors.all.length && <p className="text-sm text-foreground-secondary">Aucune couleur exploitable enregistrée.</p>}<details><summary className="cursor-pointer text-sm text-accent">Contenu enregistré</summary><RecordedContent value={chromatic.content} /></details></> : <p className="text-sm text-foreground-secondary">Aucune palette disponible dans ce dossier.</p>}
      </CardBody></Card>
      <Card id="guidelines-typography" className="min-w-0"><CardBody className="space-y-4">
        <h2 className="text-lg font-semibold">Typographie</h2><p className="text-xs text-foreground-secondary">{doc.identity.counts.typographies} systèmes disponibles · {doc.identity.activeCounts.typographies} en usage</p>
        {typography ? <><AssetEvidence asset={typography} /><dl className="space-y-2 text-sm"><div><dt className="text-foreground-secondary">Titrage</dt><dd>{fonts.display ?? "Non renseigné"}</dd></div><div><dt className="text-foreground-secondary">Texte</dt><dd>{fonts.body ?? "Non renseigné"}</dd></div></dl>{fonts.all.length > 0 && <p className="text-sm">Familles mentionnées : {fonts.all.join(" · ")}</p>}<p className="text-xs text-foreground-secondary">Familles enregistrées ; l’aperçu conserve la police de l’interface.</p><details><summary className="cursor-pointer text-sm text-accent">Contenu enregistré</summary><RecordedContent value={typography.content} /></details></> : <p className="text-sm text-foreground-secondary">Aucune typographie disponible dans ce dossier.</p>}
      </CardBody></Card>
    </div>
    <Card id="guidelines-books"><CardBody className="space-y-4">
      <h2 className="text-lg font-semibold">Chartes conservées</h2>
      {doc.books.length ? doc.books.map((book) => <article key={book.id} className="space-y-3 border-t border-border pt-4"><AssetEvidence asset={book} /><details><summary className="cursor-pointer text-sm text-accent">Consulter le contenu conservé</summary><RecordedContent value={book.content} /></details></article>) : <p className="text-sm text-foreground-secondary">Aucune charte structurée dans le coffre. Les documents de référence restent distincts.</p>}
    </CardBody></Card>
    <Card id="guidelines-sources"><CardBody className="space-y-4">
      <h2 className="text-lg font-semibold">Documents de référence</h2>
      <p className="text-sm text-foreground-secondary">Consultez les documents du dossier. Leur présence ne valide ni les actifs ni les propositions. Aucune analyse assistée n’est lancée à la lecture.</p>
      {doc.sources.length ? <ul className="space-y-4">{doc.sources.map((source) => <li key={source.id} className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4"><div className="min-w-0 flex-1"><p className="break-words text-sm font-medium">{source.name}</p><p className="mt-1 text-xs text-foreground-secondary">{isSourceCertainty(source.certainty) ? SOURCE_CERTAINTY_LABEL[source.certainty] : "Certitude à qualifier"}{source.shared ? " · Document partagé" : ""} · Conservé le {new Date(source.createdAt).toLocaleDateString("fr-FR")}</p></div><Button variant="outline" size="sm" onClick={() => setSourceId(source.id)} aria-label={`Consulter la source · ${source.name}`}>Consulter</Button></li>)}</ul> : <p className="text-sm text-foreground-secondary">Aucun document disponible.</p>}
    </CardBody></Card>
    {sourceId && <SourceReadDialog key={sourceId} sourceId={sourceId} strategyId={doc.strategyId} onClose={() => setSourceId(null)} />}
  </div>;
}
