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
import { Plug, Store, RefreshCw, Unlink, ArrowRight } from "lucide-react";

const SHOP_RE = /^[a-z0-9][a-z0-9-]{1,58}[a-z0-9]\.myshopify\.com$/;

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
