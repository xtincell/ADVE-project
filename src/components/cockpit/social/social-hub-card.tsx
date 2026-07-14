"use client";

/**
 * SocialHubCard — « Mes réseaux » (dashboard cockpit, ADR-0128).
 *
 * Le porteur de marque connecte LUI-MÊME ses comptes (Facebook/Instagram,
 * YouTube, TikTok, X, LinkedIn) via OAuth — à la façon des suites social
 * media. États honnêtes par plateforme : connecté / à connecter / bientôt
 * disponible (fournisseur non configuré côté serveur) / reconnexion requise.
 * Les compteurs affichés proviennent des relevés d'audience réels
 * (FollowerSnapshot) — jamais de chiffre fabriqué.
 *
 * Registre client (ADR-0123) : aucun nom interne, aucun jargon connecteur.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Check, Loader2, Plug, RefreshCw, Settings2, Unplug, Users } from "lucide-react";
import { trpc } from "@/lib/trpc/client";
import { useToast } from "@/components/shared/notification-toast";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { Dialog } from "@/components/primitives";
import type { BrandSocialHubRow } from "@/server/services/anubis/social-connect";

const PLATFORM_LABELS: Record<string, { label: string; mono: string }> = {
  FACEBOOK: { label: "Facebook", mono: "Fb" },
  INSTAGRAM: { label: "Instagram", mono: "Ig" },
  YOUTUBE: { label: "YouTube", mono: "Yt" },
  TIKTOK: { label: "TikTok", mono: "Tk" },
  TWITTER: { label: "X (Twitter)", mono: "X" },
  LINKEDIN: { label: "LinkedIn", mono: "In" },
};

const PLATFORM_ORDER = ["FACEBOOK", "INSTAGRAM", "TIKTOK", "YOUTUBE", "TWITTER", "LINKEDIN"];

const FLAG_MESSAGES: Record<string, { kind: "success" | "info" | "error"; text: string }> = {
  boutique_connectee: { kind: "success", text: "Boutique connectée — vos ventes arrivent dans le Suivi du jour." },
  boutique_invalide: { kind: "error", text: "Domaine de boutique invalide — utilisez votre-boutique.myshopify.com." },
  connecte: { kind: "success", text: "Réseau connecté — vos données d'audience arrivent." },
  refuse: { kind: "info", text: "Connexion annulée depuis le réseau social." },
  aucun_compte: { kind: "info", text: "Aucune page ou compte accessible trouvé sur ce réseau." },
  indisponible: { kind: "info", text: "Ce réseau n'est pas encore disponible — votre équipe finalise la configuration." },
  chiffrement_manquant: { kind: "error", text: "Connexion indisponible : configuration sécurité du serveur incomplète." },
  echec_echange: { kind: "error", text: "La connexion a échoué pendant l'autorisation. Réessayez." },
  echec_enregistrement: { kind: "error", text: "Le compte a été autorisé mais l'enregistrement a échoué. Réessayez." },
  etat_invalide: { kind: "error", text: "La connexion a expiré. Relancez-la depuis le tableau de bord." },
  marque_manquante: { kind: "error", text: "Aucune marque sélectionnée pour cette connexion." },
  marque_introuvable: { kind: "error", text: "Marque introuvable pour cette connexion." },
  acces_refuse: { kind: "error", text: "Cette marque ne vous appartient pas." },
  fournisseur_inconnu: { kind: "error", text: "Réseau non pris en charge." },
};

function sourceLabel(source: string | null): string | null {
  if (!source) return null;
  return source === "MANUAL" ? "relevé manuel" : "relevé auto";
}

function relativeDays(iso: string | null): string | null {
  if (!iso) return null;
  const ms = Date.now() - new Date(iso).getTime();
  const days = Math.floor(ms / 86_400_000);
  if (days <= 0) return "aujourd'hui";
  if (days === 1) return "hier";
  return `il y a ${days} j`;
}

export function SocialHubCard({ strategyId }: { strategyId: string }) {
  const toast = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const utils = trpc.useUtils();
  const flagHandled = useRef(false);

  const hubQuery = trpc.social.getBrandSocialHub.useQuery({ strategyId });

  const [toDisconnect, setToDisconnect] = useState<{ id: string; name: string } | null>(null);
  // Réseau dont on gère les Pages (modal de choix de la Page de travail).
  const [manageRow, setManageRow] = useState<BrandSocialHubRow | null>(null);
  // Bandeau de vérification après une connexion Meta : Facebook peut connecter
  // le mauvais compte (profil perso au lieu de la Page). On invite à vérifier
  // le NOM affiché et à reconnecter en choisissant la bonne Page si besoin.
  const [metaJustConnected, setMetaJustConnected] = useState(false);

  const disconnect = trpc.social.disconnectSocial.useMutation({
    onSuccess: (res) => {
      toast.success(`${PLATFORM_LABELS[res.platform]?.label ?? res.platform} déconnecté. Vos relevés passés sont conservés.`);
      utils.social.getBrandSocialHub.invalidate({ strategyId });
      setManageRow(null);
    },
    onError: () => toast.error("La déconnexion a échoué. Réessayez."),
  });

  const setWorking = trpc.social.setWorkingAccount.useMutation({
    onSuccess: (res) => {
      toast.success(`« ${res.accountName} » est votre Page de travail — seule celle-ci est suivie.`);
      utils.social.getBrandSocialHub.invalidate({ strategyId });
      setManageRow(null);
    },
    onError: () => toast.error("Le changement de Page a échoué. Réessayez."),
  });

  const sync = trpc.social.syncSocial.useMutation({
    onSuccess: (res) => {
      if (res.state === "LIVE") {
        toast.success(`Audience mise à jour — ${res.data.length} réseau${res.data.length > 1 ? "x" : ""} relevé${res.data.length > 1 ? "s" : ""}.`);
      } else if (res.state === "DEGRADED" && res.reason === "AUTH_REVOKED") {
        toast.error("Un compte demande une reconnexion — relancez la connexion sur la ligne concernée.");
      } else if (res.state === "DEGRADED" && res.reason === "INSUFFICIENT_DATA") {
        toast.info("Aucun nouveau compteur disponible pour le moment.");
      } else if (res.state === "DEFERRED_AWAITING_CREDENTIALS") {
        toast.error("Configuration sécurité du serveur incomplète — votre équipe a la main.");
      } else {
        toast.info("Réseaux injoignables pour le moment — nouvel essai plus tard.");
      }
      utils.social.getBrandSocialHub.invalidate({ strategyId });
      utils.cockpitDashboard.getCommunityDashboard.invalidate({ strategyId });
      // P1 — dans la foulée de l'audience : collecte des publications
      // (SocialPost). Best-effort silencieux, le « Suivi du jour » se rafraîchit.
      syncPosts.mutate({ strategyId });
    },
    onError: () => toast.error("L'actualisation a échoué. Réessayez."),
  });

  const syncPosts = trpc.social.syncPosts.useMutation({
    onSuccess: (res) => {
      if (res.state === "LIVE") {
        const total = res.data.reduce((n, r) => n + r.upserted, 0);
        if (total > 0) toast.success(`${total} publication${total > 1 ? "s" : ""} collectée${total > 1 ? "s" : ""}.`);
      }
      utils.cockpitDashboard.getOperationsSnapshot.invalidate({ strategyId });
    },
    onError: () => { /* best-effort — l'audience a déjà son retour */ },
  });

  // Retour de redirection OAuth : message unique + nettoyage de l'URL.
  useEffect(() => {
    const flag = searchParams.get("reseau");
    if (!flag || flagHandled.current) return;
    flagHandled.current = true;
    const msg = FLAG_MESSAGES[flag];
    if (msg) toast[msg.kind](msg.text);
    // Connexion Meta réussie → bandeau de vérification (le compte connecté
    // peut ne pas être la bonne Page). Persiste jusqu'à fermeture manuelle.
    if (flag === "connecte" && searchParams.get("fournisseur") === "meta") {
      setMetaJustConnected(true);
    }
    utils.social.getBrandSocialHub.invalidate({ strategyId });
    const clean = new URLSearchParams(searchParams.toString());
    clean.delete("reseau");
    clean.delete("fournisseur");
    clean.delete("plateformes");
    router.replace(clean.size > 0 ? `/cockpit?${clean.toString()}` : "/cockpit", { scroll: false });
  }, [searchParams, toast, router, utils, strategyId]);

  const rows = useMemo(() => {
    // On affiche TOUTES les lignes (plusieurs Pages Facebook possibles pour une
    // même marque) — triées par ordre de plateforme, sans dédoublonnage.
    const order = (p: string) => {
      const i = PLATFORM_ORDER.indexOf(p);
      return i === -1 ? 99 : i;
    };
    return [...(hubQuery.data?.rows ?? [])].sort((a, b) => order(a.platform) - order(b.platform));
  }, [hubQuery.data]);

  const connectedCount = rows.filter((r) => r.state === "CONNECTED").length;

  return (
    <div className="ck-card">
      <div className="ck-card__head">
        <h3 className="ck-card__t">Mes réseaux</h3>
        <span className="ck-card__sub">
          <Users />
          {connectedCount > 0
            ? `${connectedCount} connecté${connectedCount > 1 ? "s" : ""}`
            : "connectez vos comptes"}
        </span>
      </div>

      {metaJustConnected ? (
        <div className="ck-social__notice" role="status">
          <p className="ck-social__notice-t">Vérifiez la ou les Pages connectées ci-dessous</p>
          <p className="ck-social__notice-b">
            Toutes vos Pages Facebook connectées apparaissent maintenant, chacune avec son <b>nom</b>.
            <b> Débranchez</b> (icône à droite) celles que vous ne voulez pas garder. Votre Page
            n&apos;apparaît pas&nbsp;? Facebook a mémorisé votre choix précédent — révoquez l&apos;accès
            dans <b>Facebook → Paramètres → Applications et sites web / Intégrations Business</b>,
            puis <a
              className="ck-social__notice-link"
              href={`/api/integrations/oauth/meta/start?social=1&strategyId=${encodeURIComponent(strategyId)}&returnUrl=%2Fcockpit`}
            >reconnectez</a> pour re-choisir vos Pages.
          </p>
          <button
            type="button"
            className="ck-social__notice-x"
            aria-label="Fermer"
            onClick={() => setMetaJustConnected(false)}
          >
            ✕
          </button>
        </div>
      ) : null}

      {hubQuery.isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-11 animate-[shimmer_2s_linear_infinite] rounded-lg bg-surface-overlay" />
          ))}
        </div>
      ) : (
        <>
          <div className="ck-social">
            {rows.map((row) => {
              const info = PLATFORM_LABELS[row.platform] ?? { label: row.platform, mono: "•" };
              const connectHref = `/api/integrations/oauth/${row.provider}/start?social=1&strategyId=${encodeURIComponent(strategyId)}&returnUrl=%2Fcockpit`;
              const freshness = relativeDays(row.followerCapturedAt);
              const src = sourceLabel(row.followerSource);
              return (
                <div className="ck-social__row" key={row.connectionId ?? row.platform}>
                  <span className="ck-social__mono" data-on={row.state === "CONNECTED" ? 1 : 0}>
                    {info.mono}
                  </span>
                  <div className="ck-social__body">
                    <p className="ck-social__name">
                      {info.label}
                      {/* Nom EXACT du compte connecté — pour repérer d'un coup
                          d'œil si c'est la bonne Page ou le mauvais compte. */}
                      {row.state === "CONNECTED" && row.accountName ? (
                        <span className="ck-social__acct">· {row.accountName}</span>
                      ) : null}
                      {row.handle ? <span className="ck-social__handle">@{row.handle}</span> : null}
                    </p>
                    <p className="ck-social__meta">
                      {row.followerCount != null ? (
                        <>
                          <b>{row.followerCount.toLocaleString("fr-FR")}</b> abonnés
                          {src ? ` · ${src}` : ""}
                          {freshness ? ` · ${freshness}` : ""}
                        </>
                      ) : row.state === "NEEDS_CHOICE" ? (
                        `${row.connectedCount} Page${row.connectedCount > 1 ? "s" : ""} connectée${row.connectedCount > 1 ? "s" : ""} — choisissez celle à suivre`
                      ) : row.state === "CONNECTED" ? (
                        "connecté — en attente du premier relevé"
                      ) : (
                        "aucun relevé d'audience"
                      )}
                    </p>
                    {row.platform === "INSTAGRAM" && row.state === "NOT_CONNECTED" ? (
                      <p className="ck-social__hint">
                        Instagram se connecte <b>directement</b> (bouton ci-contre), sans passer par
                        Facebook. Votre compte doit être <b>Professionnel</b> (Business ou Créateur)&nbsp;:
                        activez-le dans <b>Instagram → Paramètres → Type de compte et outils</b>, puis
                        connectez.
                      </p>
                    ) : null}
                  </div>
                  {row.state === "CONNECTED" ? (
                    <div className="ck-social__actions">
                      <span className="ck-social__chip ck-social__chip--ok">Connecté</span>
                      {row.connectedCount > 1 ? (
                        <button
                          type="button"
                          className="ck-social__icon-btn"
                          title={`Choisir parmi ${row.connectedCount} Pages`}
                          aria-label={`Gérer les Pages ${info.label}`}
                          onClick={() => setManageRow(row)}
                        >
                          <Settings2 />
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="ck-social__icon-btn"
                          title="Déconnecter ce compte"
                          aria-label={`Déconnecter ${info.label}`}
                          onClick={() =>
                            row.connectionId &&
                            setToDisconnect({ id: row.connectionId, name: row.accountName ?? info.label })
                          }
                        >
                          <Unplug />
                        </button>
                      )}
                    </div>
                  ) : row.state === "NEEDS_CHOICE" ? (
                    <button
                      type="button"
                      className="ck-social__btn ck-social__btn--accent"
                      onClick={() => setManageRow(row)}
                    >
                      <Settings2 /> Choisir ma Page ({row.connectedCount})
                    </button>
                  ) : row.state === "ERROR" ? (
                    <a className="ck-social__btn ck-social__btn--warn" href={connectHref}>
                      <Plug /> Reconnecter
                    </a>
                  ) : row.state === "DISCONNECTED" ? (
                    <a className="ck-social__btn" href={connectHref}>
                      <Plug /> Reconnecter
                    </a>
                  ) : row.state === "PROVIDER_UNAVAILABLE" ? (
                    <span
                      className="ck-social__chip"
                      title="Votre équipe finalise la configuration de ce réseau."
                    >
                      Bientôt disponible
                    </span>
                  ) : (
                    <a className="ck-social__btn ck-social__btn--accent" href={connectHref}>
                      <Plug /> Connecter
                    </a>
                  )}
                </div>
              );
            })}
          </div>

          <div className="ck-social__foot">
            {connectedCount > 0 && (
              <button
                type="button"
                className="ck-chip ck-chip--info"
                onClick={() => sync.mutate({ strategyId })}
                disabled={sync.isPending}
              >
                {sync.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw />}
                Actualiser l&apos;audience
              </button>
            )}
            <Link href="/cockpit/intelligence/community" className="ck-card__link">
              Suivi communauté →
            </Link>
          </div>
        </>
      )}

      <ConfirmDialog
        open={toDisconnect !== null}
        onClose={() => setToDisconnect(null)}
        onConfirm={() => {
          if (toDisconnect) disconnect.mutate({ strategyId, connectionId: toDisconnect.id });
          setToDisconnect(null);
        }}
        title="Déconnecter ce compte ?"
        message={`${toDisconnect?.name ?? "Ce compte"} sera déconnecté. Vos relevés d'audience déjà enregistrés sont conservés, et vous pourrez reconnecter le compte à tout moment.`}
        confirmLabel="Déconnecter"
        variant="warning"
      />

      {/* Modal : choisir la Page de TRAVAIL du réseau (seule elle est suivie). */}
      <Dialog
        open={manageRow !== null}
        onOpenChange={(o) => { if (!o) setManageRow(null); }}
        title={manageRow ? `Vos Pages ${PLATFORM_LABELS[manageRow.platform]?.label ?? manageRow.platform}` : ""}
        description="Choisissez la Page sur laquelle vous travaillez. Seule celle-ci est suivie et comptée — les autres restent en réserve."
      >
        {manageRow ? (
          <div className="ck-pagepick">
            {manageRow.accounts.map((a) => (
              <div className="ck-pagepick__row" key={a.connectionId} data-on={a.working ? 1 : 0}>
                <button
                  type="button"
                  className="ck-pagepick__choose"
                  disabled={a.working || setWorking.isPending}
                  onClick={() => setWorking.mutate({ strategyId, connectionId: a.connectionId })}
                >
                  <span className="ck-pagepick__radio" data-on={a.working ? 1 : 0}>
                    {a.working ? <Check /> : null}
                  </span>
                  <span className="ck-pagepick__body">
                    <span className="ck-pagepick__name">{a.accountName}</span>
                    <span className="ck-pagepick__meta">
                      {a.handle ? `@${a.handle}` : ""}
                      {a.followerCount != null ? `${a.handle ? " · " : ""}${a.followerCount.toLocaleString("fr-FR")} abonnés` : ""}
                      {a.working ? `${a.handle || a.followerCount != null ? " · " : ""}Page de travail` : ""}
                    </span>
                  </span>
                </button>
                <button
                  type="button"
                  className="ck-social__icon-btn"
                  title="Déconnecter cette Page"
                  aria-label={`Déconnecter ${a.accountName}`}
                  onClick={() => disconnect.mutate({ strategyId, connectionId: a.connectionId })}
                  disabled={disconnect.isPending}
                >
                  <Unplug />
                </button>
              </div>
            ))}
            <a
              className="ck-social__btn"
              href={`/api/integrations/oauth/${manageRow.provider}/start?social=1&strategyId=${encodeURIComponent(strategyId)}&returnUrl=%2Fcockpit`}
            >
              <Plug /> Connecter une autre Page
            </a>
          </div>
        ) : null}
      </Dialog>
    </div>
  );
}
