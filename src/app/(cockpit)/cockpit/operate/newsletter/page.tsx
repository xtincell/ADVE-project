"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { useCurrentStrategyId } from "@/components/cockpit/strategy-context";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { StatCard } from "@/components/shared/stat-card";
import { Modal } from "@/components/shared/modal";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { FormField } from "@/components/shared/form-field";
import { Tabs } from "@/components/shared/tabs";
import {
  Mail,
  Users,
  Plus,
  Send,
  FileText,
  AlertTriangle,
  CheckCircle,
  Upload,
  UserPlus,
  Sparkles,
  Inbox,
  Clock,
  Eye
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function NewsletterPage() {
  const strategyId = useCurrentStrategyId();
  const [activeTab, setActiveTab] = useState("subscribers");
  const [showAddContact, setShowAddContact] = useState(false);
  const [showBulkImport, setShowBulkImport] = useState(false);
  const [showCreateNewsletter, setShowCreateNewsletter] = useState(false);
  const [selectedNewsletterId, setSelectedNewsletterId] = useState<string | null>(null);
  // Envoi en masse = acte conséquent → confirmation DS explicite (UX-DR14),
  // plus de confirm() navigateur (lot 14, audit 2026-07-11 T4). Déclaré ICI
  // (avec les autres hooks, avant tout early return) — sinon Rules of Hooks
  // violée (React #310 : « rendered more hooks than during the previous
  // render ») car les early returns !strategyId / isLoading plus bas sautaient
  // ce useState au premier rendu.
  const [sendTarget, setSendTarget] = useState<string | null>(null);

  // Forms state
  const [contactForm, setContactForm] = useState({ email: "", name: "", tags: "" });
  const [bulkCsv, setBulkCsv] = useState("");
  const [newsletterForm, setNewsletterForm] = useState({ subject: "", content: "" });

  // Queries
  const subscribersQuery = trpc.newsletter.subscribersList.useQuery(
    { strategyId: strategyId ?? "" },
    { enabled: Boolean(strategyId) }
  );

  const newslettersQuery = trpc.newsletter.newslettersList.useQuery(
    undefined,
    { enabled: Boolean(strategyId) }
  );

  const statsQuery = trpc.newsletter.newslettersStats.useQuery(
    { newsletterId: selectedNewsletterId ?? "" },
    { enabled: Boolean(selectedNewsletterId) }
  );

  // Mutations
  const utils = trpc.useUtils();

  const addContactMutation = trpc.newsletter.subscribersAdd.useMutation({
    onSuccess: () => {
      subscribersQuery.refetch();
      setContactForm({ email: "", name: "", tags: "" });
      setShowAddContact(false);
    }
  });

  const bulkImportMutation = trpc.newsletter.subscribersBulkImport.useMutation({
    onSuccess: () => {
      subscribersQuery.refetch();
      setBulkCsv("");
      setShowBulkImport(false);
    }
  });

  const createNewsletterMutation = trpc.newsletter.newslettersCreate.useMutation({
    onSuccess: () => {
      newslettersQuery.refetch();
      setNewsletterForm({ subject: "", content: "" });
      setShowCreateNewsletter(false);
    }
  });

  const sendNewsletterMutation = trpc.newsletter.newslettersSend.useMutation({
    onSuccess: () => {
      newslettersQuery.refetch();
      if (selectedNewsletterId) {
        utils.newsletter.newslettersStats.invalidate({ newsletterId: selectedNewsletterId });
      }
    }
  });

  if (!strategyId) {
    return (
      <div className="container mx-auto px-4 py-8">
        <EmptyState
          icon={Mail}
          title="Sélectionnez une marque"
          description="Cette surface nécessite de sélectionner une stratégie active dans le menu supérieur."
        />
      </div>
    );
  }

  if (subscribersQuery.isLoading || newslettersQuery.isLoading) {
    return (
      <div className="container mx-auto px-4 py-6 space-y-6 animate-pulse">
        <div className="h-8 w-64 bg-background/40 rounded" />
        <div className="grid grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-28 bg-background/40 rounded-xl border border-border" />
          ))}
        </div>
        <div className="h-80 bg-background/40 rounded-xl border border-border" />
      </div>
    );
  }

  const subscribers = subscribersQuery.data ?? [];
  const newsletters = newslettersQuery.data ?? [];

  const handleAddContact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactForm.email) return;
    await addContactMutation.mutateAsync({
      email: contactForm.email,
      name: contactForm.name || undefined,
      tags: contactForm.tags ? contactForm.tags.split(",").map(t => t.trim()) : [],
      strategyId,
    });
  };

  const handleBulkImport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bulkCsv.trim()) return;
    await bulkImportMutation.mutateAsync({
      csv: bulkCsv,
      strategyId,
    });
  };

  const handleCreateNewsletter = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newsletterForm.subject || !newsletterForm.content) return;
    await createNewsletterMutation.mutateAsync({
      subject: newsletterForm.subject,
      content: newsletterForm.content,
      strategyId,
    });
  };

  const handleSendNewsletter = (newsletterId: string) => setSendTarget(newsletterId);
  const confirmSendNewsletter = async () => {
    if (!sendTarget) return;
    const newsletterId = sendTarget;
    setSendTarget(null);
    await sendNewsletterMutation.mutateAsync({
      newsletterId,
      strategyId,
    });
  };

  const tabs = [
    { key: "subscribers", label: "Abonnés", count: subscribers.length },
    { key: "campaigns", label: "Campagnes Newsletters", count: newsletters.length }
  ];

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      <PageHeader
        title="Newsletter Cockpit"
        description="Gérez les listes d'abonnés de votre marque et actionnez des newsletters d'engagement."
        breadcrumbs={[
          { label: "Cockpit", href: "/cockpit" },
          { label: "Opérations" },
          { label: "Newsletter" },
        ]}
      />

      {/* Overview Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          title="Total abonnés opt-in"
          value={subscribers.length}
          icon={Users}
          trend="up"
          trendValue="Actifs"
        />
        <StatCard
          title="Campagnes envoyées"
          value={newsletters.filter(n => n.status === "SENT").length}
          icon={Send}
          trend="flat"
          trendValue={`${newsletters.filter(n => n.status === "DRAFT").length} brouillons`}
        />
        <StatCard
          title="Taux de délivrabilité"
          value="—"
          icon={Sparkles}
          trend="flat"
          trendValue="Bientôt disponible"
        />
      </div>

      {/* La configuration du fournisseur email (« API et test ») a rejoint la
          zone Réglages → Connexions, avec les autres canaux. Cet onglet reste
          opérationnel : abonnés, campagnes, envois. */}

      <div className="flex justify-between items-center flex-wrap gap-2">
        <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />
        
        {activeTab === "subscribers" ? (
          <div className="flex gap-2">
            <button
              onClick={() => setShowAddContact(true)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-white hover:bg-foreground hover:text-white px-3 py-1.5 text-xs font-semibold text-foreground-muted transition-colors"
            >
              <UserPlus className="h-3.5 w-3.5" />
              Ajouter contact
            </button>
            <button
              onClick={() => setShowBulkImport(true)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background hover:bg-surface-raised px-3 py-1.5 text-xs text-foreground-secondary hover:text-white transition-colors"
            >
              <Upload className="h-3.5 w-3.5" />
              Import CSV
            </button>
          </div>
        ) : (
          <button
            onClick={() => setShowCreateNewsletter(true)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-white hover:bg-foreground hover:text-white px-3 py-1.5 text-xs font-semibold text-foreground-muted transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
            Créer newsletter
          </button>
        )}
      </div>

      {/* Main content grid */}
      <div className="rounded-xl border border-border bg-background/80 p-5 space-y-4">
        {activeTab === "subscribers" ? (
          <div>
            {subscribers.length === 0 ? (
              <EmptyState
                icon={Users}
                title="Aucun abonné"
                description="Ajoutez manuellement des abonnés ou importez un fichier CSV pour commencer à peupler votre liste."
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="text-foreground-secondary border-b border-border pb-2">
                      <th className="py-2.5 font-semibold">Nom</th>
                      <th className="py-2.5 font-semibold">Email</th>
                      <th className="py-2.5 font-semibold">Source</th>
                      <th className="py-2.5 font-semibold">Tags</th>
                      <th className="py-2.5 font-semibold">Date d'inscription</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {subscribers.map((sub) => (
                      <tr key={sub.id} className="hover:bg-background/20 transition-colors">
                        <td className="py-3 text-white font-medium">
                          {sub.name || <span className="text-foreground-muted italic">Sans nom</span>}
                        </td>
                        <td className="py-3 text-white font-mono">{sub.email}</td>
                        <td className="py-3">
                          <span className="px-1.5 py-0.5 rounded bg-background border border-border text-foreground-muted text-[10px]">
                            {sub.source}
                          </span>
                        </td>
                        <td className="py-3">
                          <div className="flex flex-wrap gap-1">
                            {sub.tags.map((tag) => (
                              <span key={tag} className="px-1.5 py-px rounded bg-accent/15 text-accent text-[9px] font-medium border border-accent/20">
                                {tag}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="py-3 text-foreground-secondary">
                          {sub.subscribedAt ? new Date(sub.subscribedAt).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" }) : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ) : (
          <div>
            {newsletters.length === 0 ? (
              <EmptyState
                icon={Mail}
                title="Aucune campagne"
                description="Composez votre premier projet de newsletter."
              />
            ) : (
              <div className="space-y-3">
                {newsletters.map((camp) => {
                  const isDraft = camp.status === "DRAFT";
                  const isSending = camp.status === "SENDING";
                  const isSent = camp.status === "SENT";

                  return (
                    <div key={camp.id} className="rounded-lg border border-border bg-background p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:border-foreground-muted transition-colors">
                      <div className="space-y-1.5 flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={cn(
                            "text-[10px] font-semibold px-2 py-0.5 rounded border uppercase tracking-wider",
                            isDraft && "bg-foreground-muted/15 text-foreground-secondary border-foreground-muted/30",
                            isSending && "bg-info/20 text-info border-info/30 animate-pulse",
                            isSent && "bg-success/15 text-success border-success/30"
                          )}>
                            {camp.status}
                          </span>
                          {camp.sentAt && (
                            <span className="text-2xs text-foreground-muted flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              Envoyé le {new Date(camp.sentAt).toLocaleDateString()} à {new Date(camp.sentAt).toLocaleTimeString()}
                            </span>
                          )}
                        </div>

                        <h4 className="text-sm font-bold text-white">{camp.subject}</h4>
                        
                        {isSent && (
                          <div className="flex items-center gap-4 text-2xs text-foreground-muted flex-wrap">
                            <span>Destinataires : <strong className="text-white">{camp.recipientCount}</strong></span>
                            <span>Succès : <strong className="text-success">{camp.sentCount}</strong></span>
                            {camp.failedCount > 0 && (
                              <span className="text-error">Échecs : <strong>{camp.failedCount}</strong></span>
                            )}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => setSelectedNewsletterId(camp.id)}
                          className="inline-flex items-center gap-1 rounded-lg border border-border bg-background/40 hover:bg-background px-3 py-1.5 text-xs text-foreground-secondary hover:text-white transition-colors"
                          title="Visualiser et statistiques"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          Consulter
                        </button>
                        
                        {isDraft && (
                          <button
                            onClick={() => handleSendNewsletter(camp.id)}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-accent hover:bg-accent/90 px-3 py-1.5 text-xs font-bold text-background transition-colors"
                          >
                            <Send className="h-3.5 w-3.5" />
                            Envoyer
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Add Contact Modal */}
      <Modal open={showAddContact} onClose={() => setShowAddContact(false)} title="Ajouter un contact" size="md">
        <form onSubmit={handleAddContact} className="space-y-4">
          <FormField label="Adresse email" required>
            <input
              type="email"
              required
              value={contactForm.email}
              onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
              placeholder="ex: jean.dupont@gmail.com"
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-white placeholder-foreground-muted outline-none focus:border-border-strong"
            />
          </FormField>
          <FormField label="Nom complet">
            <input
              type="text"
              value={contactForm.name}
              onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })}
              placeholder="ex: Jean Dupont"
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-white placeholder-foreground-muted outline-none focus:border-border-strong"
            />
          </FormField>
          <FormField label="Tags (séparés par virgule)">
            <input
              type="text"
              value={contactForm.tags}
              onChange={(e) => setContactForm({ ...contactForm, tags: e.target.value })}
              placeholder="ex: prospects, event-juin"
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-white placeholder-foreground-muted outline-none focus:border-border-strong"
            />
          </FormField>
          <button
            type="submit"
            disabled={addContactMutation.isPending}
            className="w-full rounded-lg bg-white px-4 py-2.5 text-sm font-semibold text-foreground-muted hover:bg-foreground hover:text-white disabled:opacity-50"
          >
            {addContactMutation.isPending ? "Ajout..." : "Ajouter le contact"}
          </button>
        </form>
      </Modal>

      {/* Bulk Import Modal */}
      <Modal open={showBulkImport} onClose={() => setShowBulkImport(false)} title="Import de contacts en masse" size="lg">
        <form onSubmit={handleBulkImport} className="space-y-4">
          <FormField label="Collez vos lignes CSV (Format: email,nom)" required>
            <textarea
              required
              rows={8}
              value={bulkCsv}
              onChange={(e) => setBulkCsv(e.target.value)}
              placeholder="exemple@domain.com,Jean Dupont&#10;contact@agence.com,Marie Durand"
              className="w-full font-mono text-xs rounded-lg border border-border bg-background px-3 py-2 text-white placeholder-foreground-muted outline-none focus:border-border-strong"
            />
          </FormField>
          <button
            type="submit"
            disabled={bulkImportMutation.isPending}
            className="w-full rounded-lg bg-white px-4 py-2.5 text-sm font-semibold text-foreground-muted hover:bg-foreground hover:text-white disabled:opacity-50"
          >
            {bulkImportMutation.isPending ? "Importation..." : "Importer la liste"}
          </button>
        </form>
      </Modal>

      {/* Create Newsletter Modal */}
      <Modal open={showCreateNewsletter} onClose={() => setShowCreateNewsletter(false)} title="Créer une newsletter" size="lg">
        <form onSubmit={handleCreateNewsletter} className="space-y-4">
          <FormField label="Sujet de l'email" required>
            <input
              type="text"
              required
              value={newsletterForm.subject}
              onChange={(e) => setNewsletterForm({ ...newsletterForm, subject: e.target.value })}
              placeholder="ex: Lancement exclusif de notre nouvelle collection !"
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-white placeholder-foreground-muted outline-none"
            />
          </FormField>
          <FormField label="Contenu (HTML ou Texte)" required>
            <textarea
              required
              rows={12}
              value={newsletterForm.content}
              onChange={(e) => setNewsletterForm({ ...newsletterForm, content: e.target.value })}
              placeholder="Entrez le contenu de votre email ici..."
              className="w-full font-mono text-xs rounded-lg border border-border bg-background px-3 py-2 text-white placeholder-foreground-muted outline-none"
            />
          </FormField>
          <button
            type="submit"
            disabled={createNewsletterMutation.isPending}
            className="w-full rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-background hover:bg-accent/90 disabled:opacity-50"
          >
            {createNewsletterMutation.isPending ? "Création..." : "Créer le brouillon"}
          </button>
        </form>
      </Modal>

      {/* Stats Drilldown Modal */}
      <Modal open={!!selectedNewsletterId} onClose={() => setSelectedNewsletterId(null)} title="Détails de la campagne" size="lg">
        {statsQuery.isLoading ? (
          <div className="h-64 flex items-center justify-center animate-pulse">
            <span className="text-xs text-foreground-muted">Chargement des données statistiques...</span>
          </div>
        ) : statsQuery.data && (
          <div className="space-y-4">
            <div className="bg-background/40 border border-border p-4 rounded-lg space-y-2">
              <h3 className="text-sm font-bold text-white">{statsQuery.data.campaign.subject}</h3>
              <p className="text-xs text-foreground-secondary">
                Status : <span className="text-white font-medium uppercase">{statsQuery.data.campaign.status}</span>
              </p>
              {statsQuery.data.campaign.sentAt && (
                <p className="text-xs text-foreground-secondary">
                  Envoyé le : {new Date(statsQuery.data.campaign.sentAt).toLocaleDateString()} à {new Date(statsQuery.data.campaign.sentAt).toLocaleTimeString()}
                </p>
              )}
            </div>

            <div>
              <h4 className="text-xs font-semibold text-foreground-secondary uppercase tracking-wider mb-2">
                Historique des envois ({statsQuery.data.messages.length})
              </h4>
              <div className="max-h-60 overflow-y-auto border border-border rounded-lg divide-y divide-border">
                {statsQuery.data.messages.length === 0 ? (
                  <div className="p-4 text-center text-xs text-foreground-muted">
                    Aucun message envoyé.
                  </div>
                ) : (
                  statsQuery.data.messages.map((msg) => (
                    <div key={msg.id} className="p-3 flex items-center justify-between text-xs hover:bg-background/20 transition-colors">
                      <div>
                        <p className="font-semibold text-white">{msg.name || "Abonné"}</p>
                        <p className="text-2xs text-foreground-muted font-mono">{msg.recipient}</p>
                      </div>
                      <div className="text-right">
                        <span className={cn(
                          "px-2 py-0.5 rounded text-3xs font-semibold uppercase border",
                          msg.status === "SENT" ? "bg-success/10 text-success border-success/20" : "bg-warning/10 text-warning border-warning/20"
                        )}>
                          {msg.status}
                        </span>
                        <p className="text-3xs text-foreground-secondary mt-1">
                          {new Date(msg.sentAt).toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={sendTarget !== null}
        onClose={() => setSendTarget(null)}
        onConfirm={() => void confirmSendNewsletter()}
        variant="warning"
        title="Envoyer cette newsletter ?"
        message="Elle partira immédiatement à l'ensemble des abonnés opt-in. Cet envoi ne peut pas être rappelé."
        confirmLabel="Envoyer"
      />
    </div>
  );
}
