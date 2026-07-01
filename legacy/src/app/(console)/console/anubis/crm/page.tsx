"use client";

/**
 * Console — CRM : contacts, messagerie, newsletter (Vague 10).
 * Trois onglets : Contacts (recherche/tags/opt-in), Messagerie (envoi réel
 * + consignation entrants), Newsletter (composer MJML/HTML, test, envoi
 * aux opt-in avec stats).
 */

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { PageHeader } from "@/components/shared/page-header";
import { SkeletonPage } from "@/components/shared/loading-skeleton";
import { Tabs } from "@/components/shared/tabs";
import { Mail, Send, UserPlus, Newspaper, Inbox } from "lucide-react";

export default function CrmPage() {
  const utils = trpc.useUtils();
  const [tab, setTab] = useState("contacts");
  const [search, setSearch] = useState("");
  const [selectedContact, setSelectedContact] = useState<string | null>(null);

  const { data: stats } = trpc.crmContacts.stats.useQuery();
  const { data: contacts, isLoading } = trpc.crmContacts.listContacts.useQuery({ search: search || undefined, limit: 100 });
  const { data: messages } = trpc.crmContacts.listMessages.useQuery({ contactId: selectedContact ?? undefined, limit: 50 });
  const { data: campaigns } = trpc.crmContacts.listCampaigns.useQuery();

  const upsert = trpc.crmContacts.upsertContact.useMutation({ onSuccess: () => utils.crmContacts.invalidate() });
  const sendMessage = trpc.crmContacts.sendMessage.useMutation({ onSuccess: () => utils.crmContacts.listMessages.invalidate() });
  const saveCampaign = trpc.crmContacts.saveCampaign.useMutation({ onSuccess: () => utils.crmContacts.listCampaigns.invalidate() });
  const sendTest = trpc.crmContacts.sendTest.useMutation();
  const sendCampaign = trpc.crmContacts.sendCampaign.useMutation({ onSuccess: () => utils.crmContacts.listCampaigns.invalidate() });

  const [newContact, setNewContact] = useState({ email: "", name: "", company: "", optIn: false });
  const [msg, setMsg] = useState({ subject: "", body: "" });
  const [campaign, setCampaign] = useState({ id: "", subject: "", bodyMjml: "" });
  const [testTo, setTestTo] = useState("");

  if (isLoading) return <SkeletonPage />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="CRM — Messagerie & Newsletter"
        description="Contacts unifiés (intake, newsletter, clients, talents), envoi d'emails réels (Resend/Mailgun/SendGrid — DEFERRED sans clés) et campagnes The Upgrade aux opt-in, lien de désinscription un-clic inclus."
        breadcrumbs={[
          { label: "Console", href: "/console" },
          { label: "Anubis", href: "/console/anubis" },
          { label: "CRM" },
        ]}
      />

      <div className="flex flex-wrap gap-2">
        <span className="rounded-full bg-bg-subtle px-2.5 py-1 font-mono text-[11px] text-foreground">{stats?.total ?? 0} contacts</span>
        <span className="rounded-full bg-success/15 px-2.5 py-1 font-mono text-[11px] text-success">{stats?.optIn ?? 0} opt-in newsletter</span>
        <span className="rounded-full bg-bg-subtle px-2.5 py-1 font-mono text-[11px] text-foreground-muted">{stats?.sentMessages ?? 0} emails envoyés</span>
        {Object.entries(stats?.bySource ?? {}).map(([src, n]) => (
          <span key={src} className="rounded-full bg-bg-subtle px-2.5 py-1 font-mono text-[10px] text-foreground-muted">{src} · {n as number}</span>
        ))}
      </div>

      <Tabs
        tabs={[
          { key: "contacts", label: "Contacts", count: stats?.total ?? 0 },
          { key: "messages", label: "Messagerie", count: undefined },
          { key: "newsletter", label: "Newsletter", count: campaigns?.length ?? 0 },
        ]}
        activeTab={tab}
        onChange={setTab}
      />

      {/* ── CONTACTS ── */}
      {tab === "contacts" && (
        <div className="space-y-4">
          <div className="rounded-xl border border-border bg-card p-4">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground"><UserPlus className="h-4 w-4" /> Nouveau contact</h2>
            <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-5">
              <input placeholder="email@exemple.com" value={newContact.email} onChange={(e) => setNewContact({ ...newContact, email: e.target.value })} className="rounded-lg border border-border bg-bg px-3 py-2 text-sm" />
              <input placeholder="Nom" value={newContact.name} onChange={(e) => setNewContact({ ...newContact, name: e.target.value })} className="rounded-lg border border-border bg-bg px-3 py-2 text-sm" />
              <input placeholder="Entreprise" value={newContact.company} onChange={(e) => setNewContact({ ...newContact, company: e.target.value })} className="rounded-lg border border-border bg-bg px-3 py-2 text-sm" />
              <label className="flex items-center gap-2 text-xs text-foreground-secondary">
                <input type="checkbox" checked={newContact.optIn} onChange={(e) => setNewContact({ ...newContact, optIn: e.target.checked })} />
                Opt-in newsletter (consentement recueilli)
              </label>
              <button
                onClick={() => upsert.mutate({ email: newContact.email, name: newContact.name || undefined, company: newContact.company || undefined, newsletterOptIn: newContact.optIn || undefined })}
                disabled={upsert.isPending || !newContact.email.includes("@")}
                className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-foreground hover:opacity-90 disabled:opacity-40"
              >
                Ajouter
              </button>
            </div>
            {upsert.error && <p className="mt-2 text-xs text-error">{upsert.error.message}</p>}
          </div>

          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Rechercher (email, nom, entreprise)…" className="w-full rounded-xl border border-border bg-card px-4 py-2.5 text-sm" />

          <div className="divide-y divide-border rounded-xl border border-border bg-card">
            {(contacts?.items ?? []).map((c) => (
              <div key={c.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-foreground">{c.name ?? c.email}</span>
                    <span className="rounded-full bg-bg-subtle px-2 py-0.5 font-mono text-[10px] text-foreground-muted">{c.source}</span>
                    {c.newsletterOptIn && <span className="rounded-full bg-success/15 px-2 py-0.5 text-[10px] font-bold text-success">OPT-IN</span>}
                  </div>
                  <p className="text-xs text-foreground-muted">
                    {c.email}{c.company ? ` · ${c.company}` : ""}{c.phone ? ` · ${c.phone}` : ""} · {c._count.messages} message(s)
                    {c.tags.length > 0 ? ` · ${c.tags.join(", ")}` : ""}
                  </p>
                </div>
                <button onClick={() => { setSelectedContact(c.id); setTab("messages"); }} className="flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-xs hover:bg-card-hover">
                  <Mail className="h-3 w-3" /> Messagerie
                </button>
              </div>
            ))}
            {(contacts?.items ?? []).length === 0 && <div className="p-6 text-center text-sm text-foreground-muted">Aucun contact.</div>}
          </div>
        </div>
      )}

      {/* ── MESSAGERIE ── */}
      {tab === "messages" && (
        <div className="space-y-4">
          <div className="rounded-xl border border-border bg-card p-4">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground"><Send className="h-4 w-4" /> Envoyer un email {selectedContact ? "" : "(sélectionne un contact dans l'onglet Contacts)"}</h2>
            <div className="mt-3 space-y-2">
              <input placeholder="Sujet" value={msg.subject} onChange={(e) => setMsg({ ...msg, subject: e.target.value })} className="w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm" />
              <textarea placeholder="Corps (texte ou HTML)" rows={5} value={msg.body} onChange={(e) => setMsg({ ...msg, body: e.target.value })} className="w-full rounded-lg border border-border bg-bg px-3 py-2 font-mono text-sm" />
              <button
                onClick={() => selectedContact && sendMessage.mutate({ contactId: selectedContact, subject: msg.subject, body: msg.body })}
                disabled={!selectedContact || sendMessage.isPending || msg.subject.length < 2 || msg.body.length < 2}
                className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-foreground hover:opacity-90 disabled:opacity-40"
              >
                {sendMessage.isPending ? "Envoi…" : "Envoyer (réel)"}
              </button>
              {sendMessage.error && <p className="text-xs text-error">{sendMessage.error.message}</p>}
              {sendMessage.data && <p className="text-xs text-success">Envoyé via {sendMessage.data.provider}.</p>}
            </div>
          </div>

          <div className="divide-y divide-border rounded-xl border border-border bg-card">
            {(messages ?? []).map((m) => (
              <div key={m.id} className="p-4">
                <div className="flex items-center gap-2 text-xs">
                  {m.direction === "OUT" ? <Send className="h-3 w-3 text-accent" /> : <Inbox className="h-3 w-3 text-success" />}
                  <span className="font-medium text-foreground">{m.contact.name ?? m.contact.email}</span>
                  <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${m.status === "SENT" ? "bg-success/15 text-success" : m.status === "FAILED" ? "bg-error/15 text-error" : "bg-bg-subtle text-foreground-muted"}`}>{m.status}</span>
                  {m.provider && <span className="text-foreground-muted">{m.provider}</span>}
                  <span className="ml-auto text-foreground-muted">{new Date(m.createdAt).toLocaleString("fr-FR")}</span>
                </div>
                {m.subject && <p className="mt-1 text-sm font-medium text-foreground">{m.subject}</p>}
                <p className="mt-0.5 line-clamp-2 text-xs text-foreground-muted">{m.body}</p>
                {m.error && <p className="mt-1 text-xs text-error">{m.error}</p>}
              </div>
            ))}
            {(messages ?? []).length === 0 && <div className="p-6 text-center text-sm text-foreground-muted">Aucun message.</div>}
          </div>
        </div>
      )}

      {/* ── NEWSLETTER ── */}
      {tab === "newsletter" && (
        <div className="space-y-4">
          <div className="rounded-xl border border-border bg-card p-4">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground"><Newspaper className="h-4 w-4" /> Composer The Upgrade</h2>
            <div className="mt-3 space-y-2">
              <input placeholder="Sujet de la campagne" value={campaign.subject} onChange={(e) => setCampaign({ ...campaign, subject: e.target.value })} className="w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm" />
              <textarea
                placeholder={"Corps MJML (rendu zéro-dépendance) — ex:\n<mj-body><mj-section><mj-column>\n  <mj-text>Bonjour {–}</mj-text>\n</mj-column></mj-section></mj-body>"}
                rows={8}
                value={campaign.bodyMjml}
                onChange={(e) => setCampaign({ ...campaign, bodyMjml: e.target.value })}
                className="w-full rounded-lg border border-border bg-bg px-3 py-2 font-mono text-xs"
              />
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => saveCampaign.mutate({ id: campaign.id || undefined, subject: campaign.subject, bodyMjml: campaign.bodyMjml })}
                  disabled={saveCampaign.isPending || campaign.subject.length < 2 || campaign.bodyMjml.length < 2}
                  className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-foreground hover:opacity-90 disabled:opacity-40"
                >
                  {campaign.id ? "Mettre à jour le brouillon" : "Enregistrer le brouillon"}
                </button>
                {saveCampaign.data && !campaign.id && (
                  <button onClick={() => setCampaign({ ...campaign, id: saveCampaign.data!.id })} className="text-xs text-accent hover:underline">
                    Continuer l'édition de « {saveCampaign.data.subject} »
                  </button>
                )}
              </div>
              {saveCampaign.error && <p className="text-xs text-error">{saveCampaign.error.message}</p>}
            </div>
          </div>

          <div className="divide-y divide-border rounded-xl border border-border bg-card">
            {(campaigns ?? []).map((c) => (
              <div key={c.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-foreground">{c.subject}</span>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${c.status === "SENT" ? "bg-success/15 text-success" : c.status === "FAILED" ? "bg-error/15 text-error" : c.status === "SENDING" ? "bg-warning/15 text-warning" : "bg-bg-subtle text-foreground-muted"}`}>{c.status}</span>
                  </div>
                  <p className="text-xs text-foreground-muted">
                    {c.status === "SENT" || c.status === "FAILED"
                      ? `${c.sentCount}/${c.recipientCount} envoyés · ${c.failedCount} échec(s) · ${c.sentAt ? new Date(c.sentAt).toLocaleString("fr-FR") : ""}`
                      : `Brouillon créé le ${new Date(c.createdAt).toLocaleDateString("fr-FR")}`}
                  </p>
                </div>
                {c.status === "DRAFT" && (
                  <div className="flex items-center gap-2">
                    <button onClick={() => setCampaign({ id: c.id, subject: c.subject, bodyMjml: c.bodyMjml ?? "" })} className="rounded-lg border border-border px-3 py-1.5 text-xs hover:bg-card-hover">Éditer</button>
                    <input placeholder="email de test" value={testTo} onChange={(e) => setTestTo(e.target.value)} className="w-40 rounded-lg border border-border bg-bg px-2 py-1.5 text-xs" />
                    <button
                      onClick={() => sendTest.mutate({ campaignId: c.id, to: testTo })}
                      disabled={sendTest.isPending || !testTo.includes("@")}
                      className="rounded-lg border border-border px-3 py-1.5 text-xs hover:bg-card-hover disabled:opacity-40"
                    >
                      Test
                    </button>
                    <button
                      onClick={() => {
                        if (window.confirm(`Envoyer « ${c.subject} » à ${stats?.optIn ?? 0} contact(s) opt-in ?`)) {
                          sendCampaign.mutate({ campaignId: c.id });
                        }
                      }}
                      disabled={sendCampaign.isPending || (stats?.optIn ?? 0) === 0}
                      className="rounded-lg bg-accent px-3 py-1.5 text-xs font-medium text-accent-foreground hover:opacity-90 disabled:opacity-40"
                    >
                      {sendCampaign.isPending ? "Envoi…" : `Envoyer aux ${stats?.optIn ?? 0} opt-in`}
                    </button>
                  </div>
                )}
              </div>
            ))}
            {(campaigns ?? []).length === 0 && <div className="p-6 text-center text-sm text-foreground-muted">Aucune campagne.</div>}
          </div>
          {sendTest.error && <p className="text-xs text-error">{sendTest.error.message}</p>}
          {sendCampaign.error && <p className="text-xs text-error">{sendCampaign.error.message}</p>}
          {sendCampaign.data && (
            <p className="text-xs text-success">
              Campagne {sendCampaign.data.status} : {sendCampaign.data.sent}/{sendCampaign.data.recipients} envoyés.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
