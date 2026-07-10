/**
 * /cockpit/settings — User settings (session info + logout).
 *
 * Cible du bouton « Paramètres » du dropdown utilisateur (Topbar). Surface
 * minimaliste pour l'instant : affiche email + role de la session active et
 * permet la déconnexion. Évoluera vers préférences notifications, langue,
 * MFA enrollment au fur et à mesure des besoins métier réels (pas de
 * scaffolding pour hypothétique future).
 */
"use client";

import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { LogOut, User as UserIcon, Mail, Shield, Languages, CreditCard, Plug } from "lucide-react";
import { useLocale } from "@/lib/i18n/locale-context";
import { LocaleToggle } from "@/components/i18n/locale-toggle";
import { trpc } from "@/lib/trpc/client";
import { useCurrentStrategyId } from "@/components/cockpit/strategy-context";

/**
 * Intégrations (vague E) — état honnête des sources de données connectées à
 * la marque : relevés sociaux réels, empreinte web collectée, fraîcheur du
 * digest marché. Read-only ; une source absente est dite absente.
 */
function ConnectedSourcesSection() {
  const strategyId = useCurrentStrategyId();
  const { data, isLoading } = trpc.cockpitDashboard.getConnectedSources.useQuery(
    { strategyId: strategyId ?? "" },
    { enabled: Boolean(strategyId) },
  );

  if (!strategyId) return null;

  return (
    <section className="rounded-lg border border-border bg-background-raised p-6">
      <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-foreground-secondary">
        <Plug className="h-4 w-4 text-foreground-muted" />
        Sources de données connectées
      </h2>
      <p className="mb-4 mt-2 text-sm text-foreground-muted">
        Ce que La Fusée observe réellement pour votre marque — relevés sociaux, empreinte web, données marché.
      </p>
      {isLoading && <p className="text-sm text-foreground-muted">Chargement…</p>}
      {data && (
        <div className="space-y-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-foreground-muted">Réseaux sociaux</p>
            {data.socials.length > 0 ? (
              <ul className="mt-1 space-y-1">
                {data.socials.map((s) => (
                  <li key={`${s.platform}:${s.handle}`} className="flex flex-wrap items-center justify-between gap-2 text-sm">
                    <span className="text-foreground">
                      {s.platform} · @{s.handle} — {new Intl.NumberFormat("fr-FR").format(s.followerCount)} abonnés
                    </span>
                    <span className="text-xs text-foreground-muted">
                      {s.source === "APIFY" || s.source === "CONNECTOR" ? "relevé automatique" : "relevé manuel"} ·{" "}
                      {new Date(s.capturedAt).toLocaleDateString("fr-FR")}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-1 text-sm text-foreground-muted">Aucun relevé social — aucune source connectée pour l&apos;instant.</p>
            )}
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-foreground-muted">Empreinte web</p>
            {data.webPresence ? (
              <p className="mt-1 text-sm text-foreground">
                {data.webPresence.siteUrl ? `Site ${data.webPresence.siteReachable ? "en ligne" : "injoignable"} · ` : ""}
                {data.webPresence.socialsDetected} canal(aux) détecté(s) · {data.webPresence.pressMentions} mention(s) presse
                {data.webPresence.footprintScore !== null ? ` · score d'empreinte ${data.webPresence.footprintScore}/100` : ""}
              </p>
            ) : (
              <p className="mt-1 text-sm text-foreground-muted">Empreinte web non collectée pour cette marque.</p>
            )}
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-foreground-muted">Données marché</p>
            <p className="mt-1 text-sm text-foreground">
              {data.marketFeed.lastDigestAt
                ? `Digest ${data.marketFeed.countryCode ?? ""}${data.marketFeed.sector ? ` × ${data.marketFeed.sector}` : ""} — actualisé le ${new Date(data.marketFeed.lastDigestAt).toLocaleDateString("fr-FR")}`
                : "Pas encore de digest marché pour votre pays × secteur (il se construit automatiquement)."}
            </p>
          </div>
        </div>
      )}
    </section>
  );
}

export default function CockpitSettingsPage() {
  const { data: session, status } = useSession();
  const { t } = useLocale();

  if (status === "loading") {
    return (
      <div className="mx-auto max-w-3xl space-y-6 p-6">
        <h1 className="text-2xl font-bold text-foreground">Paramètres</h1>
        <p className="text-sm text-foreground-muted">Chargement...</p>
      </div>
    );
  }

  const user = session?.user;

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Paramètres</h1>
        <p className="mt-1 text-sm text-foreground-muted">
          Profil et session active.
        </p>
      </div>

      {user && (
        <section className="space-y-4 rounded-lg border border-border bg-background-raised p-6">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-foreground-secondary">
            Session active
          </h2>
          <dl className="space-y-3">
            <div className="flex items-center gap-3">
              <UserIcon className="h-4 w-4 text-foreground-muted" />
              <dt className="w-24 text-sm text-foreground-muted">Nom</dt>
              <dd className="flex-1 text-sm text-foreground">
                {user.name ?? "—"}
              </dd>
            </div>
            <div className="flex items-center gap-3">
              <Mail className="h-4 w-4 text-foreground-muted" />
              <dt className="w-24 text-sm text-foreground-muted">Email</dt>
              <dd className="flex-1 text-sm text-foreground">
                {user.email ?? "—"}
              </dd>
            </div>
            <div className="flex items-center gap-3">
              <Shield className="h-4 w-4 text-foreground-muted" />
              <dt className="w-24 text-sm text-foreground-muted">Rôle</dt>
              <dd className="flex-1 text-sm text-foreground">
                {(user as { role?: string }).role ?? "USER"}
              </dd>
            </div>
          </dl>
        </section>
      )}

      <ConnectedSourcesSection />

      <section className="rounded-lg border border-border bg-background-raised p-6">
        <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-foreground-secondary">
          <CreditCard className="h-4 w-4 text-foreground-muted" />
          Abonnement & facturation
        </h2>
        <p className="mb-4 mt-2 text-sm text-foreground-muted">
          Votre plan, sa période en cours, l&apos;annulation et l&apos;historique.
        </p>
        <Link
          href="/cockpit/settings/billing"
          className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm text-foreground transition-colors hover:border-primary"
        >
          Gérer mon abonnement
        </Link>
      </section>

      <section className="rounded-lg border border-border bg-background-raised p-6">
        <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-foreground-secondary">
          <Languages className="h-4 w-4 text-foreground-muted" />
          {t("settings.language.title")}
        </h2>
        <p className="mb-4 mt-2 text-sm text-foreground-muted">
          {t("settings.language.desc")}
        </p>
        <LocaleToggle variant="full" />
      </section>

      <section className="rounded-lg border border-border bg-background-raised p-6">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-foreground-secondary">
          Session
        </h2>
        <p className="mt-2 text-sm text-foreground-muted">
          Déconnecte cet appareil. Tu seras redirigé vers la page de connexion.
        </p>
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="mt-4 flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive-subtle px-4 py-2 text-sm text-destructive transition-colors hover:bg-destructive/20"
        >
          <LogOut className="h-4 w-4" />
          Se déconnecter
        </button>
      </section>
    </div>
  );
}
