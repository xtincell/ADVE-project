import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { CheckCircle2, KeyRound, LogOut, Mail, ShieldAlert, UserRound } from "lucide-react";
import { logoutAction } from "@/app/(public)/connexion/actions";
import { readSession } from "@/lib/session";
import { getAccountOverview } from "@/server/identity";
import { Badge } from "@/components/ui/badge";
import { ChangeEmailForm, ChangePasswordForm, UpdateNameForm } from "./settings-forms";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Réglages du compte" };

/**
 * /reglages (WP-022) — réglages du compte : nom, email (mot de passe
 * re-vérifié), mot de passe, espaces & rôles, sessions. Route hors matcher
 * middleware (comme /studio) — session vérifiée ici ET dans chaque action.
 * Résidu honnête affiché : pas de « déconnexion partout » en v7 (JWT
 * stateless, pas de rotation de version de session).
 */

const DATE_FORMAT = new Intl.DateTimeFormat("fr-FR", {
  day: "numeric",
  month: "long",
  year: "numeric",
});

/** Libellés FR d'affichage (mêmes valeurs que la console admin). */
const ROLE_LABELS: Record<string, string> = {
  OWNER: "Propriétaire",
  OPERATOR: "Opérateur",
  MEMBER: "Membre",
  CLIENT: "Client",
};
const KIND_LABELS: Record<string, string> = { AGENCY: "Agence", BRAND: "Marque" };

/** Bannières de succès par valeur de ?ok= (posée par les actions). */
const SUCCESS_MESSAGES: Record<string, string> = {
  nom: "Nom enregistré.",
  email: "Email changé — utilisez-le à votre prochaine connexion.",
  motdepasse:
    "Mot de passe changé. Les sessions déjà ouvertes ailleurs restent valides jusqu'à leur expiration.",
};

function Section({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-lg border border-line bg-ink-2 p-6">
      <div className="flex items-start gap-3">
        <Icon className="mt-0.5 size-5 shrink-0 text-coral" aria-hidden />
        <div className="space-y-1">
          <h2 className="font-display text-lg font-semibold text-bone">{title}</h2>
          <p className="text-sm leading-relaxed text-sand">{description}</p>
        </div>
      </div>
      <div className="mt-5 max-w-xl">{children}</div>
    </section>
  );
}

export default async function ReglagesPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string }>;
}) {
  const session = await readSession();
  if (!session) redirect("/connexion?next=/reglages");

  const account = await getAccountOverview(session);
  if (!account) redirect("/connexion?next=/reglages"); // session orpheline (compte disparu)

  const { ok } = await searchParams;
  const successMessage = ok ? SUCCESS_MESSAGES[ok] : undefined;

  return (
    <div className="space-y-8">
      <header className="space-y-1">
        <p className="eyebrow text-coral">Compte</p>
        <h1 className="font-display text-3xl font-semibold">Réglages</h1>
        <p className="max-w-2xl text-sm leading-relaxed text-sand">
          Votre identité de connexion et vos espaces. Chaque changement est tracé au journal
          d&apos;audit.
        </p>
      </header>

      {successMessage ? (
        <p
          role="status"
          className="flex items-center gap-2 rounded-sm border border-gold/40 bg-gold/10 px-4 py-3 text-sm font-medium text-bone"
        >
          <CheckCircle2 className="size-4.5 shrink-0 text-gold" aria-hidden />
          {successMessage}
        </p>
      ) : null}

      <Section
        icon={UserRound}
        title="Profil"
        description={`Compte créé le ${DATE_FORMAT.format(account.user.createdAt)}.`}
      >
        <UpdateNameForm currentName={account.user.name} />
      </Section>

      <Section
        icon={Mail}
        title="Email de connexion"
        description="Changer d'email exige votre mot de passe actuel — c'est votre clé d'entrée."
      >
        <ChangeEmailForm currentEmail={account.user.email} />
      </Section>

      <Section
        icon={KeyRound}
        title="Mot de passe"
        description="8 caractères minimum, chiffré en bcrypt. En cas d'oubli : lien de réinitialisation transmis par l'opérateur (mot de passe oublié sur l'écran de connexion)."
      >
        <ChangePasswordForm />
      </Section>

      <section className="rounded-lg border border-line bg-ink-2 p-6">
        <h2 className="font-display text-lg font-semibold text-bone">Espaces &amp; rôles</h2>
        <p className="mt-1 text-sm leading-relaxed text-sand">
          Vos memberships réelles — le rôle est porté par l&apos;espace, pas par le compte.
        </p>
        <ul className="mt-5 space-y-2">
          {account.memberships.map((m) => (
            <li
              key={m.workspaceId}
              className="flex flex-wrap items-center gap-2 rounded-md border border-line bg-ink px-4 py-3"
            >
              <span className="font-semibold text-bone">{m.workspaceName}</span>
              <span className="font-mono text-xs text-smoke">/{m.workspaceSlug}</span>
              <span className="ml-auto flex items-center gap-1.5">
                <Badge variant="inverse">{KIND_LABELS[m.workspaceKind] ?? m.workspaceKind}</Badge>
                <Badge variant={m.role === "OPERATOR" ? "coral" : "gold"}>
                  {ROLE_LABELS[m.role] ?? m.role}
                </Badge>
                {m.current ? <Badge variant="outline">Session en cours</Badge> : null}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <Section
        icon={ShieldAlert}
        title="Sessions"
        description="Votre session vit dans un cookie signé de 30 jours sur cet appareil. Résidu v7 assumé : pas de « déconnexion partout » — les jetons de session sont sans état et ne peuvent pas être révoqués à distance tant que la rotation de version de session n'existe pas. Changer de mot de passe n'invalide donc pas les sessions déjà ouvertes."
      >
        <form action={logoutAction}>
          <button
            type="submit"
            className="inline-flex h-11 items-center gap-2 rounded-md border-[1.5px] border-current px-5 text-[15px] font-semibold text-sand transition-colors hover:text-bone"
          >
            <LogOut className="size-4.5" aria-hidden />
            Se déconnecter de cet appareil
          </button>
        </form>
      </Section>
    </div>
  );
}
