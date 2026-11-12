"use client";

import { useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { Bot, UserRound, Pause, Play, Send, ArrowRight, Plus } from "lucide-react";
import { trpc } from "@/lib/trpc/client";
import { MarkdownContent } from "@/components/shared/markdown-content";
import { CrmSalesPortfolio } from "./crm-sales-portfolio";
import { CrmSalesPublicEntry } from "./crm-sales-public-entry";
import type { SalesCatalogueOffer } from "./crm-sales-mandate-fields";

const field = "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary";
const button = "inline-flex items-center justify-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary";
const statusNames: Record<string, string> = { DRAFT: "À préparer", ACTIVE: "Actif", PAUSED: "En pause", QUEUED: "À traiter", RUNNING: "En cours", DONE: "Terminé", FAILED: "À reprendre", AMBIGUOUS: "À vérifier" };
const date = (value: Date | string) => new Date(value).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" });

/** Fleet control lives beside the existing sales desk; deals remain the source of commitments. */
export function CrmSalesFleet() {
  const { data: session } = useSession();
  const utils = trpc.useUtils();
  const brands = trpc.strategy.list.useQuery({});
  const deals = trpc.crm.listDeals.useQuery({ limit: 500 });
  const [strategyId, setStrategyId] = useState("");
  const initialBrandRead = useRef(false);
  useEffect(() => {
    if (initialBrandRead.current || !brands.data) return;
    initialBrandRead.current = true;
    const params = new URLSearchParams(window.location.search);
    const requested = params.get("strategy") || params.get("strategyId");
    if (requested && brands.data.some(brand => brand.id === requested)) setStrategyId(current => current || requested);
  }, [brands.data]);
  const [selected, setSelected] = useState("");
  const [creating, setCreating] = useState(false);
  const [mode, setMode] = useState<"AI" | "HUMAN">("AI");
  const [error, setError] = useState("");
  const [pendingDispatch, setPendingDispatch] = useState<{ id: string; dealId?: string; instruction: string; requestId: string } | null>(null);
  const profiles = trpc.crm.listSalesRepresentatives.useQuery({ strategyId }, { enabled: Boolean(strategyId), refetchInterval: 10000 });
  const options = trpc.crm.salesRosterOptions.useQuery({ strategyId }, { enabled: Boolean(strategyId) });
  const detail = trpc.crm.getSalesRepresentative.useQuery({ id: selected }, { enabled: Boolean(selected), refetchInterval: 5000 });
  const save = trpc.crm.saveSalesRepresentative.useMutation();
  const status = trpc.crm.setSalesRepresentativeStatus.useMutation();
  const dispatch = trpc.crm.dispatchSalesRepresentative.useMutation();
  const resolve = trpc.crm.resolveSalesRun.useMutation();
  const profile = detail.data?.profile;
  const scopedDeals = deals.data?.filter(deal => deal.sellerStrategyId === strategyId) ?? [];
  const activeCount = profiles.data?.filter(item => item.status === "ACTIVE").length ?? 0;
  const brand = brands.data?.find(item => item.id === strategyId);
  const offerPillar = brand?.pillars.find(item => item.key === "v");
  const catalogue = (offerPillar?.content as { produitsCatalogue?: SalesCatalogueOffer[] } | null)?.produitsCatalogue ?? [];
  const principals = [
    ...(options.data?.users.filter(user => options.data?.financeUserIds.includes(user.id)).map(user => ({ id: user.id, label: user.name ?? user.email ?? "Membre de l’équipe" })) ?? []),
    ...(profiles.data?.filter(item => item.principalId && item.status === "ACTIVE" && (item.mode === "AI" || options.data?.financeUserIds.includes(item.principalId!))).map(item => ({ id: item.principalId!, label: `${item.name} · ${item.mode === "AI" ? "IA" : "humain"}` })) ?? []),
  ].filter((item, index, all) => all.findIndex(person => person.id === item.id) === index);

  async function refresh() { await utils.crm.invalidate(); }
  async function setStatus(next: "ACTIVE" | "PAUSED") {
    if (!profile) return;
    setError("");
    try { await status.mutateAsync({ id: profile.id, status: next }); await refresh(); }
    catch (cause) { setError((cause as Error).message); }
  }

  return <section aria-labelledby="sales-fleet-title" className="overflow-hidden rounded-xl border border-border">
    <div className="flex flex-wrap items-start justify-between gap-4 border-b border-border p-5">
      <div>
        <h2 id="sales-fleet-title" className="text-lg font-semibold">Équipe commerciale</h2>
        <p className="mt-1 max-w-2xl text-sm text-foreground-muted">Confier le travail, parler à un vendeur et reprendre ses affaires.</p>
      </div>
      <label htmlFor="fleet-brand" className="min-w-56 text-sm">Marque vendeuse
        <select id="fleet-brand" className={`${field} mt-1`} value={strategyId} onChange={event => {
          setStrategyId(event.target.value); setSelected(""); setCreating(false); setError("");
        }}>
          <option value="">Choisir une marque</option>
          {brands.data?.map(brand => <option key={brand.id} value={brand.id}>{brand.name}</option>)}
        </select>
      </label>
    </div>
    {!strategyId ? <p className="p-5 text-sm text-foreground-muted">Choisissez la marque dont vous voulez organiser les ventes.</p> : <div className="grid lg:grid-cols-[18rem_1fr]">
      <aside className="space-y-3 border-b border-border p-4 lg:border-b-0 lg:border-r" aria-label="Vendeurs de la marque">
        <div className="flex items-center justify-between text-sm"><span>{profiles.data?.length ?? 0} vendeur{profiles.data?.length === 1 ? "" : "s"}</span><span className="text-foreground-muted">{activeCount} actif{activeCount === 1 ? "" : "s"}</span></div>
        {profiles.isLoading && <p className="text-sm text-foreground-muted">Chargement de l’équipe…</p>}
        {profiles.data?.map(item => <button key={item.id} type="button" onClick={() => { setSelected(item.id); setCreating(false); setError(""); }}
          aria-pressed={selected === item.id && !creating}
          className={`flex w-full items-start gap-3 rounded-lg border p-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${selected === item.id && !creating ? "border-primary bg-primary/10" : "border-border hover:bg-foreground/5"}`}>
          {item.mode === "AI" ? <Bot aria-hidden className="mt-0.5 h-5 w-5 shrink-0" /> : <UserRound aria-hidden className="mt-0.5 h-5 w-5 shrink-0" />}
          <span className="min-w-0 flex-1"><span className="block break-words font-medium">{item.name}</span><span className="mt-1 block text-xs text-foreground-muted">{item.mode === "AI" ? "Vendeur IA" : "Vendeur humain"} · {statusNames[item.status] ?? item.status}</span></span>
          <ArrowRight aria-hidden className="mt-1 h-4 w-4 shrink-0" />
        </button>)}
        {!profiles.isLoading && !profiles.data?.length && <p className="text-sm text-foreground-muted">L’équipe est vide. Ajoutez le premier vendeur, puis confiez-lui une affaire.</p>}
        <button type="button" className={`${button} w-full`} onClick={() => { setCreating(true); setSelected(""); setError(""); }}><Plus className="h-4 w-4" />Ajouter un vendeur</button>
      </aside>
      <div className="min-w-0 p-5">
        {creating ? <form className="max-w-2xl space-y-4" onSubmit={async event => {
          event.preventDefault(); const form = new FormData(event.currentTarget); setError("");
          try {
            const created = await save.mutateAsync({ strategyId, name: String(form.get("name") ?? "").trim(), mode,
              humanUserId: mode === "HUMAN" ? String(form.get("humanUserId") ?? session?.user.id ?? "") : undefined,
              maxTurns: Number(form.get("maxTurns") ?? 12), dailyTokenBudget: Number(form.get("dailyTokenBudget") ?? 150000),
            });
            setSelected(created.id); setCreating(false); await refresh();
          } catch (cause) { setError((cause as Error).message); }
        }}>
          <h3 className="font-semibold">Préparer un vendeur</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <label htmlFor="fleet-name" className="text-sm">Nom du vendeur<input id="fleet-name" name="name" className={`${field} mt-1`} required maxLength={120} placeholder="Ex. Camille · Restaurants" /></label>
            <label htmlFor="fleet-mode" className="text-sm">Type de vendeur<select id="fleet-mode" className={`${field} mt-1`} value={mode} onChange={event => setMode(event.target.value as typeof mode)}><option value="AI">Vendeur IA</option><option value="HUMAN">Vendeur humain</option></select></label>
          </div>
          {mode === "HUMAN" && <label htmlFor="fleet-person" className="block text-sm">Membre de l’équipe<select id="fleet-person" name="humanUserId" className={`${field} mt-1`} required defaultValue={session?.user.id}>
            <option value={session?.user.id}>Moi · {session?.user.name ?? session?.user.email}</option>
            {options.data?.users.filter(user => user.id !== session?.user.id).map(user => <option key={user.id} value={user.id}>{user.name ?? user.email}</option>)}
          </select></label>}
          {mode === "AI" && <details className="rounded-lg border border-border p-3"><summary className="cursor-pointer text-sm">Réglages avancés de l’IA</summary><div className="mt-3 grid gap-3 sm:grid-cols-2">
            <label htmlFor="fleet-turns" className="text-sm">Actions maximum par travail<input id="fleet-turns" name="maxTurns" className={`${field} mt-1`} type="number" min={1} max={24} defaultValue={12} /></label>
            <label htmlFor="fleet-tokens" className="text-sm">Limite quotidienne de l’IA (en jetons)<input id="fleet-tokens" name="dailyTokenBudget" className={`${field} mt-1`} type="number" min={60000} max={1000000} step={1000} defaultValue={150000} /></label>
          </div></details>}
          <p className="text-sm text-foreground-muted">Le vendeur est d’abord désactivé. Vous choisirez ensuite ses offres et les contacts dont il s’occupe.</p>
          <div className="flex flex-wrap gap-2"><button className={`${button} bg-primary text-primary-foreground`} disabled={save.isPending}>Créer le vendeur</button><button type="button" className={button} onClick={() => setCreating(false)}>Annuler</button></div>
        </form> : profile ? <div className="space-y-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div><h3 className="text-xl font-semibold">{profile.name}</h3><p className="mt-1 text-sm text-foreground-muted">{profile.mode === "AI" ? "Vendeur IA" : "Vendeur humain"} · {statusNames[profile.status] ?? profile.status}</p>
              {profile.mode === "AI" && <p className="mt-1 text-xs text-foreground-muted">{profile.lastWorkerSeenAt ? `Dernier signe d’activité : ${date(profile.lastWorkerSeenAt)}` : "Aucune activité enregistrée pour le moment."}</p>}</div>
            <button type="button" className={button} disabled={status.isPending} onClick={() => void setStatus(profile.status === "ACTIVE" ? "PAUSED" : "ACTIVE")}>{profile.status === "ACTIVE" ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}{profile.status === "ACTIVE" ? "Mettre en pause" : "Activer le vendeur"}</button>
          </div>
          {profile.status !== "ACTIVE" && <p className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-sm">Ce vendeur ne prend pas de nouveau travail. Activez-le, puis confiez-lui les affaires dont les conditions de vente sont approuvées.</p>}
          <CrmSalesPublicEntry key={`public:${profile.id}`} strategyId={strategyId} brandName={brand?.name ?? "La marque"} representative={profile} catalogue={catalogue} offerVersion={offerPillar ? String(offerPillar.currentVersion) : ""} principals={principals} defaultPrincipalId={options.data?.brandOwnerId} canManage={Boolean(options.data && (session?.user.role === "ADMIN" || options.data.canManage))} />
          <CrmSalesPortfolio key={profile.id} strategyId={strategyId} representative={profile} catalogue={catalogue} offerVersion={offerPillar ? String(offerPillar.currentVersion) : ""} principals={principals} defaultPrincipalId={options.data?.brandOwnerId} canManage={Boolean(options.data && (session?.user.role === "ADMIN" || options.data.canManage))} />
          <div className="grid gap-4 xl:grid-cols-2">
            <section aria-labelledby="sales-orders-title" className="min-w-0 space-y-3">
              <h4 id="sales-orders-title" className="font-medium">Lui parler</h4>
              <div className="max-h-80 space-y-3 overflow-y-auto rounded-lg border border-border p-3" aria-live="polite" aria-label="Conversation avec le vendeur">
                {detail.data?.messages.length ? detail.data.messages.map(message => <article key={message.id} className="space-y-1 border-b border-border pb-3 last:border-0 last:pb-0"><p className="text-xs text-foreground-muted">{message.senderName} · {date(message.createdAt)}</p><MarkdownContent>{message.content}</MarkdownContent></article>) : <p className="text-sm text-foreground-muted">Donnez une consigne au vendeur. Retrouvez ici ses réponses et ce qu’il a terminé.</p>}
              </div>
              <form className="space-y-3" onSubmit={async event => {
                event.preventDefault(); const form = new FormData(event.currentTarget); const target = event.currentTarget; setError("");
                const request = pendingDispatch?.id === profile.id ? pendingDispatch : { id: profile.id, dealId: String(form.get("dealId") ?? "") || undefined, instruction: String(form.get("instruction") ?? "").trim(), requestId: crypto.randomUUID() };
                setPendingDispatch(request);
                try { await dispatch.mutateAsync(request); setPendingDispatch(null); target.reset(); await refresh(); }
                catch (cause) {
                  const code = (cause as { data?: { code?: string } }).data?.code;
                  if (code && !["TIMEOUT", "INTERNAL_SERVER_ERROR"].includes(code)) setPendingDispatch(null);
                  setError((cause as Error).message);
                }
              }}>
                <label htmlFor="fleet-instruction-deal" className="block text-sm">Affaire concernée<select id="fleet-instruction-deal" name="dealId" className={`${field} mt-1`} disabled={pendingDispatch?.id === profile.id}><option value="">Toutes ses affaires</option>{scopedDeals.map(deal => <option key={deal.id} value={deal.id}>{deal.companyName} · {deal.contactName}</option>)}</select></label>
                <label htmlFor="fleet-instruction" className="block text-sm">Votre consigne<textarea id="fleet-instruction" name="instruction" rows={3} className={`${field} mt-1`} disabled={pendingDispatch?.id === profile.id} required minLength={3} maxLength={12000} placeholder="Quelle affaire traiter, quel résultat obtenir, quelles limites respecter ?" /></label>
                <button className={`${button} bg-primary text-primary-foreground`} disabled={dispatch.isPending || profile.status !== "ACTIVE"}><Send className="h-4 w-4" />{pendingDispatch?.id === profile.id ? "Vérifier le même travail" : "Lui confier ce travail"}</button>
              </form>
            </section>
            <section aria-labelledby="sales-runs-title" className="space-y-3">
              <h4 id="sales-runs-title" className="font-medium">Travail confié</h4>
              {!detail.data?.runs.length && <p className="text-sm text-foreground-muted">Aucun travail ne lui a encore été confié.</p>}
              <ol className="max-h-[36rem] space-y-3 overflow-y-auto">{detail.data?.runs.map(run => <li key={run.id} className="space-y-2 rounded-lg border border-border p-3">
                <div className="flex flex-wrap justify-between gap-2 text-xs"><span className={run.status === "AMBIGUOUS" || run.status === "FAILED" ? "text-amber-400" : "text-foreground-muted"}>{statusNames[run.status] ?? run.status}</span><span>{date(run.createdAt)}</span></div>
                <p className="whitespace-pre-wrap break-words text-sm">{run.instruction}</p>
                {run.result && <MarkdownContent className="border-t border-border pt-2">{run.result}</MarkdownContent>}
                {run.status === "AMBIGUOUS" && <p className="text-xs text-amber-400">Vérifiez le dernier échange avant de confier un nouveau travail.</p>}
                {((profile.mode === "HUMAN" && run.status === "QUEUED") || ["FAILED", "AMBIGUOUS"].includes(run.status)) && <details>
                  <summary className="cursor-pointer text-sm underline">Ajouter le résultat constaté</summary>
                  <form className="mt-2 space-y-2" onSubmit={async event => {
                    event.preventDefault(); const form = new FormData(event.currentTarget); setError("");
                    try { await resolve.mutateAsync({ runId: run.id, status: String(form.get("status")) as "DONE" | "FAILED", result: String(form.get("result") ?? "").trim() }); await refresh(); }
                    catch (cause) { setError((cause as Error).message); }
                  }}>
                    <label className="block text-sm">Résultat observé<textarea name="result" className={field} required minLength={3} rows={3} maxLength={12000} /></label>
                    <label className="block text-sm">Issue<select name="status" className={field}><option value="DONE">Travail terminé</option><option value="FAILED">À reprendre</option></select></label>
                    <button className={button} disabled={resolve.isPending}>Enregistrer ce résultat</button>
                  </form>
                </details>}
              </li>)}</ol>
            </section>
          </div>
          <p className="border-t border-border pt-3 text-xs text-foreground-muted">Les clients échangent avec le vendeur sur leurs canaux habituels ou dans le lien de conversation de leur affaire. Les conditions approuvées limitent ce que le vendeur peut proposer. Le paiement est confirmé après vérification.</p>
        </div> : <div className="py-8"><h3 className="font-medium">Une équipe, des affaires suivies</h3><p className="mt-2 max-w-lg text-sm text-foreground-muted">Choisissez un vendeur pour consulter son travail et lui donner une consigne, ou ajoutez un vendeur.</p></div>}
      </div>
    </div>}
    {(error || profiles.error || detail.error || options.error) && <p role="alert" className="border-t border-border p-4 text-sm text-error">{error || profiles.error?.message || detail.error?.message || options.error?.message}</p>}
  </section>;
}
