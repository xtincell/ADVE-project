"use client";
import { useEffect, useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { Button } from "@/components/primitives";

export function PublicationPackagePanel({ strategyId }: { strategyId: string }) {
  const [packageId, setPackageId] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [sendConfirmed, setSendConfirmed] = useState(false);
  const [connectionId, setConnectionId] = useState("");
  const [scheduleAt, setScheduleAt] = useState("");
  const utils = trpc.useUtils();
  useEffect(() => { setPackageId(new URLSearchParams(window.location.search).get("package") ?? ""); }, []);
  useEffect(() => { setConfirmed(false); setSendConfirmed(false); setConnectionId(""); }, [packageId]);
  const list = trpc.social.listPublicationPackages.useQuery({ strategyId });
  const packet = trpc.social.getPublicationPackage.useQuery({ strategyId, packageId }, { enabled: Boolean(packageId) });
  const review = trpc.social.preparePublicationPackage.useMutation({ onSuccess: () => {
    setConfirmed(false); void packet.refetch(); void utils.social.listPublicationPackages.invalidate({ strategyId });
  } });
  const send = trpc.social.publishPreparedPackage.useMutation({ onSuccess: () => {
    setSendConfirmed(false); void packet.refetch(); void utils.social.listPublications.invalidate({ strategyId });
    void utils.social.listPublicationPackages.invalidate({ strategyId });
  } });
  const data = packet.data;
  const destinations = data?.destinations.filter(d => d.platform === data.content.platform.toUpperCase()) ?? [];
  const destination = destinations.find(d => d.id === connectionId);
  if (!packageId && !list.data?.length) return null;
  return <section className="ck-card space-y-4" aria-label="Publication issue du planning">
    <h2 className="text-xl font-semibold">Du planning à la publication</h2>
    <label className="block text-sm">Version à relire
      <select className="mt-2 block w-full rounded border border-border bg-background p-2" value={packageId} onChange={e => setPackageId(e.target.value)}>
        <option value="">Choisir un paquet préparé</option>
        {list.data?.map(p => <option key={p.id} value={p.id}>{p.name} · v{p.version} · {p.reviewed ? "Relu" : "À relire"}</option>)}
      </select>
    </label>
    {packet.isLoading && packageId && <p role="status">Vérification du brief et du fichier retenus…</p>}
    {packet.error && <p role="alert">{packet.error.message}</p>}
    {data && <>
      <div className="grid gap-5 md:grid-cols-2">
        <img src={data.previewUrl} alt="Version du visuel retenue pour cette publication" className="max-h-96 w-full object-contain" />
        <div className="space-y-3">
          <h3 className="font-semibold">{data.content.platform} · {data.content.format ?? "Image"} · paquet v{data.version}</h3>
          <p className="whitespace-pre-wrap">{data.content.publicationText}</p>
          <p className="text-sm text-foreground-secondary">Export JPEG relu : {data.content.delivery.width} × {data.content.delivery.height}. La transparence éventuelle est remplacée par du blanc, sans recadrage.</p>
          {data.content.delivery.placement === "STORIES" && <p className="text-sm text-status-warning">Story image : seule l’image sera publiée. La légende est conservée dans ce paquet, elle n’apparaît pas sur la story.</p>}
          <p className="text-sm text-foreground-secondary">Visuel produit par {data.content.material.author.provider} · {data.content.material.author.model}. Brief v{data.content.brief.version}.</p>
          <details className="text-sm"><summary className="cursor-pointer">Versions et traçabilité</summary>
            <dl className="mt-2 space-y-2 break-all"><dt>Fichier retenu</dt><dd>{data.content.material.id}</dd>
              <dt>Empreinte du fichier</dt><dd>{data.content.material.contentHash}</dd>
              <dt>Empreinte du paquet</dt><dd>{data.contentHash}</dd>
              <dt>Auteur de la sélection</dt><dd>{data.selectedById}</dd>
              <dt>Relecture humaine</dt><dd>{data.review ? `${data.review.userId} · ${data.review.reviewedAt}` : "Pas encore effectuée"}</dd></dl>
          </details>
        </div>
      </div>
      {data.issue && <p role="alert" className="text-status-warning">{data.issue}</p>}
      {!data.review && !data.issue && <div className="space-y-3">
        <label className="flex items-start gap-2 text-sm"><input type="checkbox" checked={confirmed} onChange={e => setConfirmed(e.target.checked)} />
          J’ai relu ce visuel et sa légende ; j’approuve cette version pour la publication.</label>
        <Button disabled={!confirmed || review.isPending} onClick={() => review.mutate({ operation: "REVIEW", strategyId,
          packageId: data.id, contentHash: data.contentHash, approved: true })}>Valider cette version</Button>
      </div>}
      {data.review && !data.issue && <div className="space-y-3 border-t border-border pt-4">
        <p role="status" className="text-status-success">Cette version a été relue. État de l’envoi : {data.actionStatus === "EXECUTED" ? "reçu par le réseau" : data.actionStatus === "SCHEDULED" ? "planifié" : data.actionStatus === "PUBLISHING" ? "en cours ou à rapprocher" : data.actionStatus === "CANCELLED" ? "annulé" : "à préparer"}.</p>
        {["ACCEPTED", "SCHEDULED"].includes(data.actionStatus ?? "") && <>
          <label className="block text-sm">Compte destinataire
            <select className="mt-2 block w-full rounded border border-border bg-background p-2" value={connectionId} onChange={e => { setConnectionId(e.target.value); setSendConfirmed(false); }}>
              <option value="">Choisir le compte connecté</option>
              {destinations.map(d => <option key={d.id} value={d.id}>{d.accountName} · {d.platform} · {d.accountId}</option>)}
            </select>
          </label>
          {destinations.length === 0 && <p className="text-sm">Aucun compte actif pour {data.content.platform}. <a className="underline" href="/cockpit/settings/connections">Ouvrir les connexions</a></p>}
          <label className="block text-sm">Échéance facultative — laisser vide pour envoyer maintenant
            <input className="mt-2 block rounded border border-border bg-background p-2" type="datetime-local" value={scheduleAt} onChange={e => { setScheduleAt(e.target.value); setSendConfirmed(false); }} />
          </label>
          <label className="flex items-start gap-2 text-sm"><input type="checkbox" checked={sendConfirmed} onChange={e => setSendConfirmed(e.target.checked)} />
            Je confirme {scheduleAt ? "la planification" : "l’envoi public immédiat"} de cette version sur {destination?.accountName ?? "le compte à choisir"}.</label>
          <Button disabled={!sendConfirmed || !destination || send.isPending} onClick={() => destination && send.mutate({ strategyId,
            packageId: data.id, contentHash: data.contentHash, confirmed: true,
            target: { connectionId: destination.id, accountId: destination.accountId },
            ...(scheduleAt ? { scheduleAt: new Date(scheduleAt).toISOString() } : {}) })}>{send.isPending ? "Prise en charge…" : scheduleAt ? "Planifier cette version" : "Publier cette version"}</Button>
        </>}
        {send.error && <p role="alert">{send.error.message}</p>}
        {send.data && <div role="status"><p>{send.data.mode === "SCHEDULED" ? "Publication planifiée ; aucun envoi pour l’instant." : send.data.mode === "PUBLISHED" ? "Le réseau a confirmé la réception." : "Consultez le résultat avant toute reprise."}</p>
          {send.data.results.map(r => <p key={r.platform}>{r.platform} : {r.externalPostId ? `reçu ${r.externalPostId}` : r.detail ?? r.state}</p>)}</div>}
      </div>}
      {review.error && <p role="alert">{review.error.message}</p>}
    </>}
  </section>;
}
