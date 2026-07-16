"use client";

/**
 * Connexions — l'onglet qui RAMÈNE TOUT (vague opérateur 2026-07-12 :
 * « on crée un cockpit qui ramène tout, c'est l'utilisateur qui autorise »).
 * Chaque environnement connectable de la marque vit ici avec son état
 * honnête : réseaux sociaux (OAuth ADR-0128), boutique Shopify (OAuth
 * commerce), et les canaux à venir. Aucun secret ne descend jamais ici.
 */
import { useState } from "react";
import { useCurrentStrategyId } from "@/components/cockpit/strategy-context";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { useToast } from "@/components/shared/notification-toast";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { trpc } from "@/lib/trpc/client";
import { SocialHubCard } from "@/components/cockpit/social/social-hub-card";
import { EmailProviderCard } from "@/components/cockpit/newsletter/email-provider-card";
import { Button, Input } from "@/components/primitives";
import { CopyButton } from "@/components/shared/copy-button";
import { Plug, Store, RefreshCw, Unlink, ArrowRight, Smartphone, Plug2, KeyRound, Trash2 } from "lucide-react";

const SHOP_RE = /^[a-z0-9][a-z0-9-]{1,58}[a-z0-9]\.myshopify\.com$/;
const APP_STORE_RE = /^https:\/\/apps\.apple\.com\/\S+$/i;
const PLAY_STORE_RE = /^https:\/\/play\.google\.com\/store\/apps\/details\?id=\S+$/i;

/**
 * Applications mobiles — liens App Store / Play Store posés par le founder,
 * pour préparer le suivi des téléchargements et des avis (Increment 2b). Le
 * lien est une donnée publique ; les métriques attendent les accès API
 * (App Store Connect / Google Play) — état affiché honnêtement.
 */
function MobileAppCard({ strategyId }: { strategyId: string }) {
  const toast = useToast();
  const utils = trpc.useUtils();
  const { data, isLoading } = trpc.commerce.getMobileAppStatus.useQuery({ strategyId });
  const [ios, setIos] = useState<string | null>(null);
  const [android, setAndroid] = useState<string | null>(null);

  // Valeurs éditées (fallback sur l'état serveur tant qu'on n'a pas touché).
  const iosVal = ios ?? data?.appStoreUrl ?? "";
  const androidVal = android ?? data?.playStoreUrl ?? "";
  const iosInvalid = iosVal.trim().length > 0 && !APP_STORE_RE.test(iosVal.trim());
  const androidInvalid = androidVal.trim().length > 0 && !PLAY_STORE_RE.test(androidVal.trim());

  const save = trpc.commerce.linkMobileApp.useMutation({
    onSuccess: () => {
      toast.success("Liens des applications enregistrés.");
      setIos(null); setAndroid(null);
      utils.commerce.getMobileAppStatus.invalidate({ strategyId });
    },
    onError: (e) => toast.error(e.message || "Enregistrement impossible."),
  });

  const metricsReady = data?.metricsReady;
  const anyMetrics = Boolean(metricsReady?.ios || metricsReady?.android);

  return (
    <div className="ck-card">
      <p className="ck-card__eyebrow"><Smartphone />Applications mobiles</p>
      {isLoading ? (
        <p className="ck-ops__note">Chargement…</p>
      ) : (
        <div className="space-y-3">
          <p className="ck-ops__note">
            Reliez les fiches de votre app pour préparer le suivi des téléchargements et des avis.
            Le lien est public ; les chiffres s&apos;afficheront dès que les accès API seront branchés.
          </p>
          <div className="space-y-2">
            <Input
              placeholder="Fiche App Store (iOS) — https://apps.apple.com/…"
              value={iosVal}
              onChange={(e) => setIos(e.target.value)}
              spellCheck={false}
            />
            {iosInvalid && <p className="ck-shop-connect__hint">Le lien doit commencer par https://apps.apple.com/.</p>}
            <Input
              placeholder="Fiche Play Store (Android) — https://play.google.com/store/apps/details?id=…"
              value={androidVal}
              onChange={(e) => setAndroid(e.target.value)}
              spellCheck={false}
            />
            {androidInvalid && <p className="ck-shop-connect__hint">Le lien doit être une fiche play.google.com (…details?id=…).</p>}
          </div>
          <Button
            disabled={save.isPending || iosInvalid || androidInvalid}
            onClick={() =>
              save.mutate({
                strategyId,
                appStoreUrl: iosVal.trim() ? iosVal.trim() : null,
                playStoreUrl: androidVal.trim() ? androidVal.trim() : null,
              })
            }
          >
            {save.isPending ? "Enregistrement…" : "Enregistrer les liens"}
          </Button>
          <div className="rounded-lg border border-warning/30 bg-warning/10 p-3">
            <p className="text-xs text-warning">
              {anyMetrics
                ? "Accès API détectés — le suivi des téléchargements et des avis s'activera à la prochaine synchronisation."
                : "Suivi des téléchargements et des avis : en attente des accès API (App Store Connect · Google Play Console) — à brancher par votre équipe."}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

function ShopCard({ strategyId }: { strategyId: string }) {
  const toast = useToast();
  const utils = trpc.useUtils();
  const [shopInput, setShopInput] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const { data, isLoading } = trpc.commerce.getShopStatus.useQuery({ strategyId });

  const sync = trpc.commerce.syncShop.useMutation({
    onSuccess: (res) => {
      if (res.state === "LIVE") toast.success(`Ventes actualisées — ${res.data.ordersLast7d} commande${res.data.ordersLast7d > 1 ? "s" : ""} sur 7 jours.`);
      else if (res.state === "DEGRADED" && res.reason === "AUTH_REVOKED") toast.error("La boutique demande une reconnexion.");
      else toast.info("Boutique injoignable pour le moment — nouvel essai plus tard.");
      utils.commerce.getShopStatus.invalidate({ strategyId });
      utils.cockpitDashboard.getOperationsSnapshot.invalidate({ strategyId });
    },
    onError: () => toast.error("L'actualisation a échoué. Réessayez."),
  });
  const disconnect = trpc.commerce.disconnectShop.useMutation({
    onSuccess: () => {
      toast.success("Boutique déconnectée — l'historique de ventes est conservé.");
      utils.commerce.getShopStatus.invalidate({ strategyId });
    },
    onError: () => toast.error("La déconnexion a échoué. Réessayez."),
  });

  const normalized = shopInput.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/.*$/, "");
  const shopValid = SHOP_RE.test(normalized);

  return (
    <div className="ck-card">
      <p className="ck-card__eyebrow"><Store />Boutique en ligne</p>
      {isLoading ? (
        <p className="ck-ops__note">Chargement…</p>
      ) : data?.connected ? (
        <div className="ck-social__row">
          <span className="ck-social__mono" data-on={1}>Sh</span>
          <div className="ck-social__body">
            <p className="ck-social__name">{data.shopName ?? data.shopDomain}</p>
            <p className="ck-social__meta">
              {data.shopDomain}
              {data.lastSyncAt ? ` · relevé ${new Date(data.lastSyncAt).toLocaleDateString("fr-FR")}` : " · jamais relevé"}
            </p>
          </div>
          <button
            type="button"
            className="ck-theme-toggle"
            title="Actualiser les ventes"
            aria-label="Actualiser les ventes"
            disabled={sync.isPending}
            onClick={() => sync.mutate({ strategyId })}
          >
            <RefreshCw />
          </button>
          <button
            type="button"
            className="ck-theme-toggle"
            title="Déconnecter la boutique"
            aria-label="Déconnecter la boutique"
            onClick={() => setConfirmOpen(true)}
          >
            <Unlink />
          </button>
          <ConfirmDialog
            open={confirmOpen}
            onClose={() => setConfirmOpen(false)}
            title="Déconnecter la boutique ?"
            message="La collecte des ventes s'arrête ; l'historique déjà relevé est conservé."
            confirmLabel="Déconnecter"
            variant="warning"
            onConfirm={() => { setConfirmOpen(false); disconnect.mutate({ strategyId }); }}
          />
        </div>
      ) : data?.providerReady ? (
        <div className="ck-shop-connect">
          <p className="ck-ops__note">
            Reliez votre boutique Shopify : vos commandes du jour et vos meilleures
            ventes s&apos;afficheront dans le Suivi du jour. Lecture seule — vous
            autorisez, vous pouvez révoquer à tout moment.
          </p>
          <div className="ck-shop-connect__row">
            <input
              className="ck-shop-connect__input"
              placeholder="votre-boutique.myshopify.com"
              value={shopInput}
              onChange={(e) => setShopInput(e.target.value)}
              spellCheck={false}
            />
            <a
              className="ck-dash-switch"
              aria-disabled={!shopValid}
              style={!shopValid ? { opacity: 0.5, pointerEvents: "none" } : undefined}
              href={`/api/integrations/oauth/shopify/start?commerce=1&strategyId=${encodeURIComponent(strategyId)}&shop=${encodeURIComponent(normalized)}&returnUrl=/cockpit/settings/connections`}
            >
              Connecter <ArrowRight />
            </a>
          </div>
          {shopInput.length > 3 && !shopValid && (
            <p className="ck-shop-connect__hint">Le domaine doit finir par .myshopify.com (ex. motion19.myshopify.com).</p>
          )}
        </div>
      ) : (
        <p className="ck-ops__note">
          Bientôt disponible — la connexion boutique sera activée par votre équipe.
        </p>
      )}
    </div>
  );
}

/**
 * Point de connexion MCP — le founder récupère l'endpoint `/api/mcp` + génère
 * une clé scopée à SA marque, à coller dans Claude (Desktop / autre client MCP).
 * La clé en clair n'apparaît qu'une fois (ADR-0145). Réutilise `brandMcp`.
 */
function McpCard({ strategyId }: { strategyId: string }) {
  const toast = useToast();
  const utils = trpc.useUtils();
  const { data, isLoading } = trpc.brandMcp.info.useQuery({ strategyId });
  const [name, setName] = useState("");
  const [freshKey, setFreshKey] = useState<string | null>(null);
  const [revokeId, setRevokeId] = useState<string | null>(null);

  const create = trpc.brandMcp.createKey.useMutation({
    onSuccess: (res) => {
      setFreshKey(res.plaintextKey);
      setName("");
      toast.success("Clé MCP générée. Copiez-la maintenant — elle ne sera plus affichée.");
      utils.brandMcp.info.invalidate({ strategyId });
    },
    onError: (e) => toast.error(e.message || "Génération impossible."),
  });
  const revoke = trpc.brandMcp.revokeKey.useMutation({
    onSuccess: () => {
      toast.success("Clé révoquée.");
      utils.brandMcp.info.invalidate({ strategyId });
    },
    onError: (e) => toast.error(e.message || "Révocation impossible."),
  });

  return (
    <div className="ck-card">
      <p className="ck-card__eyebrow"><Plug2 />Connexion à Claude (MCP)</p>
      {isLoading ? (
        <p className="ck-ops__note">Chargement…</p>
      ) : (
        <div className="space-y-3">
          <p className="ck-ops__note">
            Branchez votre marque à Claude (ou un autre assistant compatible MCP) : donnez-lui
            l&apos;adresse ci-dessous et une clé. Il pourra alors travailler sur votre marque.
          </p>

          {/* Endpoint */}
          <div className="flex items-center gap-2 rounded-lg border border-border bg-surface px-3 py-2">
            <span className="min-w-0 flex-1 truncate font-mono text-xs text-foreground">{data?.endpoint}</span>
            {data?.endpoint ? <CopyButton value={data.endpoint} label="" /> : null}
          </div>

          {/* Clé fraîche (une seule fois) */}
          {freshKey ? (
            <div className="rounded-lg border border-success/40 bg-success/10 p-3">
              <p className="text-2xs font-semibold text-success">Votre nouvelle clé (copiez-la, elle ne sera plus affichée) :</p>
              <div className="mt-1.5 flex items-center gap-2">
                <code className="min-w-0 flex-1 truncate font-mono text-xs text-foreground">{freshKey}</code>
                <CopyButton value={freshKey} label="" />
              </div>
            </div>
          ) : null}

          {/* Génération */}
          <div className="flex flex-wrap items-center gap-2">
            <Input
              placeholder="Nom de la clé (ex. Claude Desktop)"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <Button
              disabled={create.isPending || name.trim().length < 2}
              onClick={() => create.mutate({ strategyId, name: name.trim() })}
            >
              <KeyRound className="h-4 w-4" />
              {create.isPending ? "Génération…" : "Générer une clé"}
            </Button>
          </div>

          {/* Clés existantes */}
          {data && data.keys.length > 0 ? (
            <ul className="space-y-1.5">
              {data.keys.map((k) => (
                <li key={k.id} className="flex items-center justify-between gap-3 rounded-lg border border-border-subtle px-3 py-2">
                  <div className="min-w-0">
                    <p className="truncate text-xs font-medium text-foreground">
                      {k.name}
                      {!k.isActive ? <span className="ml-2 text-foreground-muted">(révoquée)</span> : null}
                    </p>
                    <p className="text-2xs text-foreground-muted">
                      {k.lastUsedAt ? `Dernière utilisation ${new Date(k.lastUsedAt).toLocaleDateString("fr-FR")}` : "Jamais utilisée"}
                    </p>
                  </div>
                  {k.isActive ? (
                    <button
                      type="button"
                      className="ck-theme-toggle"
                      title="Révoquer la clé"
                      aria-label="Révoquer la clé"
                      onClick={() => setRevokeId(k.id)}
                    >
                      <Trash2 />
                    </button>
                  ) : null}
                </li>
              ))}
            </ul>
          ) : null}

          <ConfirmDialog
            open={revokeId !== null}
            onClose={() => setRevokeId(null)}
            title="Révoquer cette clé ?"
            message="Les assistants qui l'utilisent perdront l'accès immédiatement. Cette action est définitive."
            confirmLabel="Révoquer"
            variant="warning"
            onConfirm={() => { const id = revokeId; setRevokeId(null); if (id) revoke.mutate({ strategyId, keyId: id }); }}
          />
        </div>
      )}
    </div>
  );
}

/**
 * Page publique de marque (`/b/<slug>`) — audit 2026-07-16
 * `public-page-no-founder-surface` : seuls les seeds écrivaient `publicSlug`,
 * aucun lien UI n'existait — le founder ne pouvait ni activer sa page ni en
 * connaître l'URL. Activation via `strategy.update` (voie gouvernée existante).
 */
function PublicPageCard({ strategyId }: { strategyId: string }) {
  const toast = useToast();
  const utils = trpc.useUtils();
  const strategy = trpc.strategy.get.useQuery({ id: strategyId }, { enabled: !!strategyId });
  const update = trpc.strategy.update.useMutation({
    onSuccess: () => {
      utils.strategy.get.invalidate({ id: strategyId });
      toast.success("Page publique activée");
    },
    onError: () => toast.error("Activation impossible — réessayez ou contactez-nous."),
  });

  const slug = strategy.data?.publicSlug ?? null;
  const url = slug && typeof window !== "undefined" ? `${window.location.origin}/b/${slug}` : null;

  return (
    <div className="ck-card">
      <p className="ck-card__eyebrow"><ArrowRight />Page publique</p>
      {slug ? (
        <div className="space-y-2">
          <p className="ck-ops__note">
            Votre marque a sa page publique — partagez-la, elle montre votre identité et vos
            réseaux (données publiques uniquement).
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <a href={`/b/${slug}`} target="_blank" rel="noreferrer" className="text-sm text-accent underline-offset-2 hover:underline">
              /b/{slug}
            </a>
            {url && <CopyButton value={url} />}
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          <p className="ck-ops__note">
            Activez la page publique de votre marque : une URL propre à partager
            (identité, logo, réseaux — données publiques uniquement).
          </p>
          <Button
            size="sm"
            disabled={update.isPending || strategy.isLoading}
            onClick={() => update.mutate({ id: strategyId, enablePublicPage: true, recalculateScore: false })}
          >
            {update.isPending ? "Activation…" : "Activer ma page publique"}
          </Button>
        </div>
      )}
    </div>
  );
}

export default function ConnectionsPage() {
  const strategyId = useCurrentStrategyId();

  if (!strategyId) {
    return (
      <div className="container mx-auto px-4 py-8">
        <EmptyState icon={Plug} title="Sélectionnez une marque" description="Choisissez une marque pour gérer ses connexions." />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      <PageHeader
        title="Connexions"
        description="Tous les comptes de votre marque, reliés par vous — réseaux, boutique, et bientôt plus. Vous autorisez, vous révoquez, rien ne se fait sans vous."
        breadcrumbs={[
          { label: "Cockpit", href: "/cockpit" },
          { label: "Mon compte" },
          { label: "Connexions" },
        ]}
      />

      <div className="ck-dash">
        <div className="ck-grid ck-grid--2">
          <SocialHubCard strategyId={strategyId} />
          <div className="space-y-4">
            <ShopCard strategyId={strategyId} />
            {/* Fournisseur email de la Newsletter (« API et test ») — sa place
                est ici, dans la zone Connexions, avec les autres canaux. La
                carte se masque d'elle-même pour les fondateurs (opérateur only). */}
            <EmailProviderCard strategyId={strategyId} />
            <McpCard strategyId={strategyId} />
            <MobileAppCard strategyId={strategyId} />
            <PublicPageCard strategyId={strategyId} />
            <div className="ck-card">
              <p className="ck-card__eyebrow"><Plug />À venir</p>
              <p className="ck-ops__note">
                Fiche Google Business (avis clients) et WhatsApp Business (messages)
                arriveront ici, toujours avec votre autorisation explicite.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
