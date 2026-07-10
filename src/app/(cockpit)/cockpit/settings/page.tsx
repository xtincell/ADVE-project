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
import { LogOut, User as UserIcon, Mail, Shield, Languages, CreditCard } from "lucide-react";
import { useLocale } from "@/lib/i18n/locale-context";
import { LocaleToggle } from "@/components/i18n/locale-toggle";

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
