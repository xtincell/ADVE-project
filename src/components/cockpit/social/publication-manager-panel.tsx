"use client";

/**
 * PublicationManagerPanel — gestion par publication (mandat 2026-07-13 :
 * « l'outil de feedback doit marcher pour CHAQUE publication, pour voir et
 * corriger : importer l'image, changer l'heure, déclencher maintenant, ou
 * modifier le texte »).
 *
 * Chaque publication (planifiée ou récente) est affichée avec son brief, sa
 * copy visuel, sa légende et l'état par plateforme. Actions : modifier
 * (texte/image/heure → ré-émet via publishPost + brandActionId), déclencher
 * maintenant, annuler. Registre client (ADR-0123) : zéro jargon.
 */

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { useToast } from "@/components/shared/notification-toast";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { Button, Input, Textarea } from "@/components/primitives";
import { CalendarClock, Send, Pencil, Trash2, Image as ImageIcon, Sparkles, Check, X } from "lucide-react";

const STATUS_LABEL: Record<string, { label: string; tone: string }> = {
  SCHEDULED: { label: "Planifiée", tone: "info" },
  EXECUTED: { label: "Publiée", tone: "ok" },
  CANCELLED: { label: "Annulée", tone: "muted" },
};

const RESULT_LABEL: Record<string, string> = {
  PUBLISHED: "publié",
  NOT_CONNECTED: "réseau non connecté",
  SCOPE_MISSING: "reconnexion requise",
  UNSUPPORTED: "non couvert",
  FAILED: "échec",
};

function toLocalInput(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  // yyyy-MM-ddThh:mm pour <input type="datetime-local">
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function PublicationManagerPanel({ strategyId }: { strategyId: string }) {
  const toast = useToast();
  const utils = trpc.useUtils();
  const list = trpc.social.listPublications.useQuery({ strategyId }, { enabled: !!strategyId });

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [editImage, setEditImage] = useState("");
  const [editWhen, setEditWhen] = useState("");
  const [toCancel, setToCancel] = useState<string | null>(null);
  const [toFire, setToFire] = useState<{ id: string; targets: string[]; text: string; imageUrl: string | null; linkUrl: string | null; brief: string | null; visualCopy: string | null } | null>(null);

  const refresh = () => {
    utils.social.listPublications.invalidate({ strategyId });
    utils.cockpitDashboard.getOperationsSnapshot.invalidate({ strategyId });
  };

  const publish = trpc.social.publishPost.useMutation({
    onSuccess: (res) => {
      const ok = res.results.filter((r) => r.state === "PUBLISHED").length;
      if (res.mode === "SCHEDULED") toast.success("Publication mise à jour et replanifiée.");
      else if (ok > 0) toast.success(`Publiée sur ${ok} réseau${ok > 1 ? "x" : ""}.`);
      else toast.info("Traitée — voir l'état par réseau (connexion requise ?).");
      setEditingId(null);
      setToFire(null);
      refresh();
    },
    onError: () => toast.error("L'action a échoué. Réessayez."),
  });

  const cancel = trpc.social.cancelPublication.useMutation({
    onSuccess: () => { toast.success("Publication annulée."); setToCancel(null); refresh(); },
    onError: () => toast.error("L'annulation a échoué."),
  });

  if (list.isLoading) {
    return <div className="ck-card"><p className="ck-ops__note">Chargement des publications…</p></div>;
  }
  const items = list.data ?? [];
  if (items.length === 0) {
    return (
      <EmptyState
        icon={CalendarClock}
        title="Aucune publication"
        description="Créez une publication ci-dessus : elle apparaîtra ici avec son brief, sa copy et son statut, prête à être corrigée."
      />
    );
  }

  return (
    <div className="space-y-3">
      <h3 className="ck-card__t">Vos publications — voir &amp; corriger</h3>
      {items.map((p) => {
        const st = STATUS_LABEL[p.status] ?? { label: p.status, tone: "muted" };
        const isEditing = editingId === p.brandActionId;
        const editable = p.status === "SCHEDULED";
        return (
          <div className="ck-card ck-pub" key={p.brandActionId}>
            <div className="ck-pub__head">
              <span className={`ck-social__chip ck-social__chip--${st.tone === "ok" ? "ok" : ""}`} data-tone={st.tone}>{st.label}</span>
              {p.scheduledAt && (
                <span className="ck-pub__when"><CalendarClock />{new Date(p.scheduledAt).toLocaleString("fr-FR")}</span>
              )}
              <span className="ck-pub__targets">{p.targets.join(" · ")}</span>
            </div>

            {/* Brief + copy visuel — la direction créative pour illustrer */}
            {(p.brief || p.visualCopy) && (
              <div className="ck-pub__brief">
                {p.brief && <p><b><Sparkles /> Brief :</b> {p.brief}</p>}
                {p.visualCopy && <p><b><ImageIcon /> Copy du visuel :</b> {p.visualCopy}</p>}
              </div>
            )}

            {isEditing ? (
              <div className="ck-pub__edit">
                <Textarea value={editText} onChange={(e) => setEditText(e.target.value)} rows={4} placeholder="Texte de la publication" />
                <Input value={editImage} onChange={(e) => setEditImage(e.target.value)} placeholder="URL de l'image (visuel forgé)" />
                <label className="ck-pub__when-edit">Heure de publication
                  <Input type="datetime-local" value={editWhen} onChange={(e) => setEditWhen(e.target.value)} />
                </label>
                <div className="ck-pub__actions">
                  <Button size="sm" variant="primary" disabled={publish.isPending}
                    onClick={() => publish.mutate({
                      strategyId, brandActionId: p.brandActionId, targets: p.targets,
                      text: editText, imageUrl: editImage || null, linkUrl: p.linkUrl,
                      brief: p.brief, visualCopy: p.visualCopy,
                      scheduleAt: editWhen ? new Date(editWhen).toISOString() : null,
                    })}>
                    <Check /> Enregistrer
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}><X /> Annuler l'édition</Button>
                </div>
              </div>
            ) : (
              <>
                <p className="ck-pub__text">{p.text}</p>
                {p.imageUrl ? <p className="ck-pub__img"><ImageIcon /> visuel joint</p> : <p className="ck-pub__noimg">Pas encore de visuel — importez-en un depuis le brief.</p>}
                {p.results.length > 0 && (
                  <p className="ck-pub__results">
                    {p.results.map((r) => `${r.platform} : ${RESULT_LABEL[r.state] ?? r.state}`).join(" · ")}
                  </p>
                )}
                {editable && (
                  <div className="ck-pub__actions">
                    <Button size="sm" variant="outline" onClick={() => { setEditingId(p.brandActionId); setEditText(p.text); setEditImage(p.imageUrl ?? ""); setEditWhen(toLocalInput(p.scheduledAt)); }}>
                      <Pencil /> Modifier
                    </Button>
                    <Button size="sm" variant="primary" disabled={publish.isPending}
                      onClick={() => setToFire({ id: p.brandActionId, targets: p.targets, text: p.text, imageUrl: p.imageUrl, linkUrl: p.linkUrl, brief: p.brief, visualCopy: p.visualCopy })}>
                      <Send /> Déclencher maintenant
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setToCancel(p.brandActionId)}><Trash2 /> Annuler</Button>
                  </div>
                )}
              </>
            )}
          </div>
        );
      })}

      <ConfirmDialog
        open={toFire !== null}
        onClose={() => setToFire(null)}
        onConfirm={() => {
          if (toFire) publish.mutate({
            strategyId, brandActionId: toFire.id, targets: toFire.targets, text: toFire.text,
            imageUrl: toFire.imageUrl, linkUrl: toFire.linkUrl, brief: toFire.brief,
            visualCopy: toFire.visualCopy, scheduleAt: null,
          });
        }}
        title="Publier maintenant ?"
        message="La publication part immédiatement sur les réseaux connectés. Les réseaux non connectés resteront en attente."
        confirmLabel="Publier maintenant"
        variant="warning"
      />
      <ConfirmDialog
        open={toCancel !== null}
        onClose={() => setToCancel(null)}
        onConfirm={() => { if (toCancel) cancel.mutate({ strategyId, brandActionId: toCancel }); }}
        title="Annuler cette publication ?"
        message="Elle ne partira plus. L'historique est conservé ; vous pourrez en recréer une."
        confirmLabel="Annuler la publication"
        variant="warning"
      />
    </div>
  );
}
