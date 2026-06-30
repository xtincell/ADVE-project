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

import { useSession, signOut } from "next-auth/react";
import { LogOut, User as UserIcon, Mail, Shield, Languages, CreditCard } from "lucide-react";
import { useLocale } from "@/lib/i18n/locale-context";
import { LocaleToggle } from "@/components/i18n/locale-toggle";
import { trpc } from "@/lib/trpc/client";

const SUB_STATUS_LABELS: Record<string, string> = {
  active: "Actif",
  trialing: "Essai",
  pending_manual: "En attente de validation",
  past_due: "Paiement en retard",
  canceled: "Résilié",
  unpaid: "Impayé",
};

const TIER_LABELS: Record<string, string> = {
  COCKPIT_MONTHLY: "Cockpit (mensuel)",
  ORACLE_FULL: "Oracle complet",
  INTAKE_PDF: "Diagnostic PDF",
  RETAINER_BASE: "Accompagnement",
  RETAINER_GROWTH: "Accompagnement Growth",
  RETAINER_SCALE: "Accompagnement Scale",
};

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
  const subsQuery = trpc.payment.mySubscriptions.useQuery();
  const sub = (subsQuery.data ?? [])[0];

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
          Abonnement
        </h2>
        {subsQuery.isLoading ? (
          <p className="mt-3 text-sm text-foreground-muted">Chargement…</p>
        ) : !sub ? (
          <div className="mt-3 space-y-3">
            <p className="text-sm text-foreground-muted">Aucun abonnement actif.</p>
            <a
              href="/pricing"
              className="inline-flex w-fit rounded-lg border border-border px-4 py-2 text-sm text-foreground-secondary transition-colors hover:border-accent hover:text-accent"
            >
              Voir les offres
            </a>
          </div>
        ) : (
          <div className="mt-3 space-y-3">
            {sub.status === "pending_manual" && (
              <p className="rounded-lg border border-warning/30 bg-warning/10 px-3 py-2 text-xs text-warning">
                Paiement en cours de validation — votre accès sera activé dès confirmation par notre équipe.
              </p>
            )}
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between gap-3">
                <dt className="text-foreground-muted">Offre</dt>
                <dd className="text-foreground">{TIER_LABELS[sub.tierKey] ?? sub.tierKey}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-foreground-muted">Statut</dt>
                <dd className="text-foreground">{SUB_STATUS_LABELS[sub.status] ?? sub.status}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-foreground-muted">Montant</dt>
                <dd className="text-foreground">{sub.amountPerPeriod.toLocaleString("fr-FR")} {sub.currency} / période</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-foreground-muted">Échéance</dt>
                <dd className="text-foreground">{sub.currentPeriodEnd ? new Date(sub.currentPeriodEnd).toLocaleDateString("fr-FR") : "—"}</dd>
              </div>
            </dl>
          </div>
        )}
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
