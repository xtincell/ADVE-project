"use client";

/**
 * Publier — composer multi-réseaux de la marque (ADR-0133, mandat « tout
 * le nécessaire pour piloter, publier, planifier »).
 *
 * V1 : Facebook Page (texte/lien/photo), Instagram (image + légende —
 * exigence plateforme), LinkedIn profil (texte/lien). X/TikTok/YouTube
 * affichés avec leur raison réelle (payant / audit / vidéo) — jamais grisés
 * en silence. Publication immédiate OU planifiée : la planification crée
 * l'action au calendrier unique et le système publie à l'échéance.
 */
import { useMemo, useState } from "react";
import Link from "next/link";
import { trpc } from "@/lib/trpc/client";
import { useCurrentStrategyId } from "@/components/cockpit/strategy-context";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { useToast } from "@/components/shared/notification-toast";
import { Button, Input, Textarea } from "@/components/primitives";
import { Send, CalendarClock, ArrowRight, PenSquare } from "lucide-react";
import { PublicationManagerPanel } from "@/components/cockpit/social/publication-manager-panel";

const PLATFORM_META: Record<string, { label: string; publishable: boolean; note?: string }> = {
  FACEBOOK: { label: "Facebook", publishable: true },
  INSTAGRAM: { label: "Instagram", publishable: true, note: "visuel obligatoire" },
  LINKEDIN: { label: "LinkedIn", publishable: true, note: "profil personnel" },
  YOUTUBE: { label: "YouTube", publishable: false, note: "publication vidéo — vague suivante" },
  TWITTER: { label: "X", publishable: false, note: "payant à l'appel — option facturée à venir" },
  TIKTOK: { label: "TikTok", publishable: false, note: "audit d'app requis" },
};

export default function PublishPage() {
  const strategyId = useCurrentStrategyId();
  const toast = useToast();
  const utils = trpc.useUtils();

  const hub = trpc.social.getBrandSocialHub.useQuery(
    { strategyId: strategyId ?? "" },
    { enabled: !!strategyId },
  );

  const [text, setText] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [scheduleAt, setScheduleAt] = useState("");
  const [targets, setTargets] = useState<string[]>([]);
  const [lastResults, setLastResults] = useState<Array<{ platform: string; state: string; detail: string | null }> | null>(null);

  const publish = trpc.social.publishPost.useMutation({
    onSuccess: (r) => {
      if (r.mode === "SCHEDULED") {
        toast.success("Publication planifiée — elle partira à l'heure choisie (visible au calendrier).");
        setLastResults(null);
      } else {
        const ok = r.results.filter((x) => x.state === "PUBLISHED").length;
        if (ok > 0) toast.success(`Publié sur ${ok} réseau${ok > 1 ? "x" : ""}.`);
        else toast.error("Aucun réseau n'a accepté la publication — détail ci-dessous.");
        setLastResults(r.results.map((x) => ({ platform: x.platform, state: x.state, detail: x.detail })));
      }
      setText(""); setLinkUrl(""); setImageUrl(""); setScheduleAt(""); setTargets([]);
      void utils.cockpitDashboard.getOperationsSnapshot.invalidate();
    },
    onError: (e) => toast.error(e.message || "Publication impossible."),
  });

  const rows = hub.data?.rows ?? [];
  const connected = useMemo(
    () => rows.filter((r) => r.state === "CONNECTED"),
    [rows],
  );
  const connectable = connected.filter((r) => PLATFORM_META[r.platform]?.publishable);
  const igSelected = targets.includes("INSTAGRAM");
  const needsImage = igSelected && !imageUrl.trim();
  const anyOutdated = connected.some((r) => r.scopesOutdated && PLATFORM_META[r.platform]?.publishable);

  if (!strategyId) {
    return (
      <div className="container mx-auto px-4 py-8">
        <EmptyState icon={PenSquare} title="Sélectionnez une marque" description="Choisissez une marque pour publier en son nom." />
      </div>
    );
  }

  const canSubmit =
    targets.length > 0 && (text.trim().length > 0 || imageUrl.trim().length > 0) && !needsImage && !publish.isPending;

  return (
    <div className="container mx-auto px-4 py-6 space-y-5">
      <PageHeader
        title="Publier"
        description="Écrivez une fois, publiez (ou planifiez) sur les réseaux connectés de votre marque — tout part d'ici, tout reste tracé au calendrier."
        breadcrumbs={[
          { label: "Cockpit", href: "/cockpit" },
          { label: "Mon activité" },
          { label: "Publier" },
        ]}
      />

      {connectable.length === 0 && !hub.isLoading ? (
        <div className="ck-card">
          <EmptyState
            icon={PenSquare}
            title="Aucun réseau publiable connecté"
            description="Connectez Facebook, Instagram ou LinkedIn pour publier depuis le cockpit."
          />
          <div className="flex justify-center pb-4">
            <Link className="ck-dash-switch" href="/cockpit/settings/connections">
              Connecter mes réseaux <ArrowRight />
            </Link>
          </div>
        </div>
      ) : (
        <div className="ck-grid ck-grid--2">
          <div className="ck-card space-y-3">
            <p className="ck-card__eyebrow"><PenSquare />Votre publication</p>
            <Textarea
              rows={6}
              maxLength={4000}
              placeholder="Le message de votre marque…"
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
            <Input
              placeholder="Lien à partager (optionnel) — https://…"
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
            />
            <Input
              placeholder="URL du visuel (obligatoire pour Instagram) — https://…"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
            />
            {needsImage ? (
              <p className="ck-ops__note">Instagram exige un visuel — ajoutez l&apos;URL d&apos;une image (votre coffre d&apos;actifs en fournit).</p>
            ) : null}
            <div className="ck-publish__schedule">
              <CalendarClock />
              <label htmlFor="publish-schedule" className="ck-ops__note">Planifier (optionnel) :</label>
              <Input
                id="publish-schedule"
                type="datetime-local"
                value={scheduleAt}
                onChange={(e) => setScheduleAt(e.target.value)}
              />
            </div>
            <Button
              disabled={!canSubmit}
              onClick={() => {
                const iso = scheduleAt ? new Date(scheduleAt).toISOString() : null;
                publish.mutate({
                  strategyId,
                  targets,
                  text: text.trim(),
                  linkUrl: linkUrl.trim() || null,
                  imageUrl: imageUrl.trim() || null,
                  scheduleAt: iso,
                });
              }}
            >
              <Send /> {publish.isPending ? "Envoi…" : scheduleAt ? "Planifier" : "Publier maintenant"}
            </Button>
          </div>

          <div className="ck-card space-y-2">
            <p className="ck-card__eyebrow">Réseaux ciblés</p>
            {anyOutdated ? (
              <p className="ck-publish__warn">
                Certaines connexions datent d&apos;avant les capacités de publication —{" "}
                <Link href="/cockpit/settings/connections" className="ck-card__link">reconnectez-les</Link> pour publier.
              </p>
            ) : null}
            {rows
              .filter((r) => r.state === "CONNECTED" || PLATFORM_META[r.platform]?.publishable === false)
              .map((r) => {
                const meta = PLATFORM_META[r.platform] ?? { label: r.platform, publishable: false };
                const selectable = r.state === "CONNECTED" && meta.publishable;
                const checked = targets.includes(r.platform);
                return (
                  <label key={r.platform} className="ck-publish__target" data-off={!selectable || undefined}>
                    <input
                      type="checkbox"
                      checked={checked}
                      disabled={!selectable}
                      onChange={(e) =>
                        setTargets((t) =>
                          e.target.checked ? [...t, r.platform] : t.filter((x) => x !== r.platform),
                        )
                      }
                    />
                    <span className="ck-publish__target-name">{meta.label}</span>
                    <span className="ck-publish__target-note">
                      {selectable
                        ? r.accountName ?? (meta.note ?? "")
                        : r.state === "CONNECTED"
                          ? meta.note
                          : "non connecté"}
                    </span>
                  </label>
                );
              })}
            {lastResults ? (
              <div className="ck-publish__results">
                <p className="ck-card__eyebrow">Dernier envoi</p>
                {lastResults.map((r) => (
                  <p key={r.platform} className="ck-ops__note" data-state={r.state}>
                    {PLATFORM_META[r.platform]?.label ?? r.platform} —{" "}
                    {r.state === "PUBLISHED" ? "publié ✓" : r.detail ?? r.state}
                  </p>
                ))}
              </div>
            ) : null}
          </div>
        </div>
      )}

      {strategyId && (
        <div className="mt-8">
          <PublicationManagerPanel strategyId={strategyId} />
        </div>
      )}
    </div>
  );
}
