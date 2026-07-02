import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowRight,
  Building2,
  LogOut,
  Palette,
  Rocket,
  Terminal,
  type LucideIcon,
} from "lucide-react";
import { readSession } from "@/lib/session";
import { isAdminSession } from "@/lib/session-token";
import { getDb } from "@/lib/db";
import { logoutAction } from "@/app/(public)/connexion/actions";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Portails" };

/**
 * Hub des portails — port du sélecteur legacy (legacy/src/app/portals/page.tsx)
 * ramené aux 3 espaces + console du monde v7. Session requise (redirect
 * /connexion sinon — la route n'est pas couverte par le middleware, la garde
 * vit ici). Cartes role-aware :
 *   Cockpit → /app      (membre d'un workspace BRAND)
 *   Studio  → /studio   (tout compte — l'espace créateur est un onboarding)
 *   Agence  → /espace-agence   (membre d'un workspace AGENCY)
 *   Console → /admin    (OPERATOR, ou OWNER d'une AGENCY — même règle que le
 *                        middleware ; carte INVISIBLE sinon, pas juste grisée)
 * Les cartes non accessibles restent listées grisées (pattern legacy honnête),
 * sauf la console qui n'apparaît qu'aux opérateurs.
 */

type PortalCard = {
  id: string;
  href: string;
  label: string;
  tagline: string;
  description: string;
  icon: LucideIcon;
  /** Classe de teinte de la tuile d'icône (tokens DS uniquement). */
  iconTone: string;
  /** Affiché sous la carte grisée quand l'accès manque. */
  lockedHint?: string;
};

/** Prénom d'accueil — port du helper legacy (nom → premier mot, sinon email). */
function firstName(name: string | null | undefined, email: string | null | undefined): string {
  if (name && name.trim()) return name.trim().split(/\s+/)[0]!;
  if (email) return email.split("@")[0]!;
  return "vous";
}

export default async function PortailsPage() {
  const session = await readSession();
  if (!session) redirect("/connexion?next=/portails");

  const db = getDb();
  const [user, memberships] = await Promise.all([
    db.user.findUnique({
      where: { id: session.userId },
      select: { name: true, email: true },
    }),
    db.membership.findMany({
      where: { userId: session.userId },
      select: { role: true, workspace: { select: { kind: true } } },
    }),
  ]);

  const hasBrand = memberships.some((m) => m.workspace.kind === "BRAND");
  const hasAgency = memberships.some((m) => m.workspace.kind === "AGENCY");
  const admin = isAdminSession(session);

  // Taglines portées du legacy, descriptions ramenées à ce que v7 sert vraiment.
  const cockpit: PortalCard = {
    id: "cockpit",
    href: "/app",
    label: "Cockpit",
    tagline: "Pilotez votre marque",
    description:
      "Le poste de pilotage de votre marque : socle ADVE, dérivation RTIS, score structurel /200, Oracle stratégique, facturation.",
    icon: Rocket,
    iconTone: "bg-coral/15 text-coral",
    lockedHint: "Aucune marque dans vos espaces — le diagnostic gratuit en crée une.",
  };
  const studio: PortalCard = {
    id: "studio",
    href: "/studio",
    label: "Studio créateur",
    tagline: "Pour les créateurs et freelances",
    description:
      "Votre espace de créateur : profil, et bientôt le mur des missions de la Guilde — candidatures, production, paiement mobile money.",
    icon: Palette,
    iconTone: "bg-ember/15 text-ember",
  };
  const agence: PortalCard = {
    id: "agence",
    href: "/espace-agence",
    label: "Espace agence",
    tagline: "Pour les agences partenaires",
    description:
      "La vue flotte des marques que votre agence accompagne — paliers, derniers scores, état des abonnements.",
    icon: Building2,
    iconTone: "bg-gold/15 text-gold",
    lockedHint: "Réservé aux membres d'un workspace agence.",
  };
  const console_: PortalCard = {
    id: "console",
    href: "/admin",
    label: "Console opérateur",
    tagline: "Réservé UPgraders (interne)",
    description:
      "Les opérations : leads du funnel, file de validation des paiements, flotte complète des marques.",
    icon: Terminal,
    iconTone: "bg-success/15 text-success",
  };

  const accessible: PortalCard[] = [
    ...(hasBrand ? [cockpit] : []),
    studio,
    ...(hasAgency ? [agence] : []),
    ...(admin ? [console_] : []),
  ];
  // La console n'apparaît JAMAIS aux non-opérateurs — même pas grisée.
  const locked: PortalCard[] = [
    ...(hasBrand ? [] : [cockpit]),
    ...(hasAgency ? [] : [agence]),
  ];

  const greeting = firstName(user?.name, user?.email);

  return (
    <div className="min-h-screen bg-ink text-bone">
      <header className="border-b border-line">
        <div className="mx-auto flex h-16 max-w-page items-center justify-between px-gutter">
          <Link href="/" className="flex items-center gap-2.5" aria-label="La Fusée — accueil">
            <Rocket className="size-4.5 text-coral" aria-hidden />
            <span className="font-display text-lg font-semibold tracking-tight">
              La Fusée<span className="text-coral">·</span>
            </span>
          </Link>
          <form action={logoutAction}>
            <button
              type="submit"
              className="flex items-center gap-2 text-sm font-medium text-sand transition-colors hover:text-bone [&_svg]:size-4"
            >
              <LogOut aria-hidden />
              Déconnexion
            </button>
          </form>
        </div>
      </header>

      <main className="mx-auto max-w-page px-gutter py-12">
        <div className="mb-10 space-y-3">
          <p className="eyebrow text-coral">Bienvenue</p>
          <h1 className="font-display text-3xl font-semibold md:text-4xl">
            Bonjour {greeting}.
          </h1>
          <p className="max-w-2xl text-sand">
            Voici les espaces auxquels vous avez accès. Choisissez celui qui correspond à ce
            que vous voulez faire maintenant — vous pourrez revenir ici à tout moment depuis
            le bouton « Portails » de la navigation.
          </p>
        </div>

        <section className="grid gap-bento md:grid-cols-2" aria-label="Espaces accessibles">
          {accessible.map((card) => (
            <Link
              key={card.id}
              href={card.href}
              className="group flex flex-col gap-4 rounded-lg border border-line bg-ink-2 p-6 transition-all hover:-translate-y-0.5 hover:border-ink-4 hover:bg-ink-3"
            >
              <div className="flex items-start justify-between">
                <span
                  className={`flex size-11 items-center justify-center rounded-sm ${card.iconTone} [&_svg]:size-5`}
                  aria-hidden
                >
                  <card.icon />
                </span>
                <ArrowRight
                  className="size-4 text-smoke-2 transition-transform group-hover:translate-x-1 group-hover:text-bone"
                  aria-hidden
                />
              </div>
              <div>
                <h2 className="font-display text-lg font-semibold tracking-tight">
                  {card.label}
                </h2>
                <p className="eyebrow mt-1 text-smoke-2">{card.tagline}</p>
              </div>
              <p className="text-sm leading-relaxed text-sand">{card.description}</p>
            </Link>
          ))}
        </section>

        {locked.length > 0 ? (
          <section className="mt-12" aria-label="Espaces non accessibles">
            <p className="eyebrow mb-3 text-smoke-2">Non accessibles avec ce compte</p>
            <div className="grid gap-3 md:grid-cols-2">
              {locked.map((card) => (
                <div
                  key={card.id}
                  className="flex items-start gap-3 rounded-md border border-line-soft bg-ink-0 p-4 opacity-60"
                >
                  <span className="mt-0.5 text-smoke-2 [&_svg]:size-4" aria-hidden>
                    <card.icon />
                  </span>
                  <div>
                    <p className="text-sm font-semibold">{card.label}</p>
                    <p className="text-xs text-smoke-2">{card.lockedHint ?? card.tagline}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        ) : null}

        <div className="mt-12 border-t border-line-soft pt-6">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm text-smoke-2 transition-colors hover:text-bone"
          >
            ← Retour à l&apos;accueil
          </Link>
        </div>
      </main>
    </div>
  );
}
