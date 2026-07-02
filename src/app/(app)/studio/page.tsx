import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Megaphone, Palette, Send, Smartphone } from "lucide-react";
import { readSession } from "@/lib/session";
import type { SessionPayload } from "@/lib/session-token";
import { getDb } from "@/lib/db";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Studio créateur" };

/**
 * Studio créateur (/studio) — l'espace créateur v7, version honnête de
 * l'ancien portail Creator (legacy/src/app/(creator)/creator/). Le legacy
 * affichait missions, earnings, tiers de guilde : tout cela repose sur des
 * tables qui n'existent pas encore en v7 (guilde = WP-011, missions = WP-008).
 * Ici : le pitch de la Guilde, le profil réel du compte (nom, rôle, espace),
 * et l'état assumé « les missions ouvrent bientôt ». Zéro donnée inventée,
 * zéro tier fictif, zéro earnings à 0 FCFA qui ferait croire à un compteur.
 *
 * Garde : route hors matcher middleware — session vérifiée ici.
 */

const DATE_FORMAT = new Intl.DateTimeFormat("fr-FR", {
  day: "2-digit",
  month: "long",
  year: "numeric",
});

/** Rôles de membership en clair (registre client, pas de jargon technique). */
const ROLE_LABELS: Record<SessionPayload["role"], string> = {
  OWNER: "Propriétaire",
  OPERATOR: "Opérateur",
  MEMBER: "Collaborateur",
  CLIENT: "Client",
};

/** La méthode, pas des données : comment la Guilde fonctionnera à l'ouverture. */
const HOW_IT_WORKS = [
  {
    icon: Megaphone,
    title: "Les marques publient des briefs",
    description:
      "Chaque mission naît d'une campagne réelle d'une marque propulsée par La Fusée — un brief cadré, un budget, une échéance.",
  },
  {
    icon: Send,
    title: "Vous candidatez",
    description:
      "Le mur des missions sera public : vous choisissez celles qui correspondent à votre pratique et déposez votre candidature.",
  },
  {
    icon: Smartphone,
    title: "Production validée, paiement mobile money",
    description:
      "Livraison validée par l'opérateur, règlement en FCFA via Wave, Orange Money, MTN MoMo ou Moov — pas de virement international à attendre.",
  },
] as const;

export default async function StudioPage() {
  const session = await readSession();
  if (!session) redirect("/connexion?next=/studio");

  const db = getDb();
  const [user, workspace] = await Promise.all([
    db.user.findUnique({
      where: { id: session.userId },
      select: { name: true, email: true, createdAt: true },
    }),
    db.workspace.findUnique({
      where: { id: session.workspaceId },
      select: { name: true },
    }),
  ]);

  return (
    <div className="space-y-10">
      <header className="space-y-2">
        <p className="eyebrow text-coral">Studio créateur</p>
        <h1 className="font-display text-3xl font-semibold">La Guilde des créateurs</h1>
        <p className="max-w-2xl text-sm leading-relaxed text-sand">
          La Guilde réunit les talents qui exécutent les missions des marques propulsées par
          La Fusée — designers, photographes, vidéastes, plumes, community managers. Des
          briefs cadrés, des marques qui savent où elles vont, un paiement mobile money sans
          friction.
        </p>
      </header>

      {/* ── Profil réel du compte — seules données affichées ─────────── */}
      <section className="space-y-4" aria-label="Votre profil">
        <h2 className="font-display text-xl font-semibold">Votre profil</h2>
        <div className="rounded-lg border border-line bg-ink-2 p-6">
          <div className="flex flex-wrap items-center gap-3">
            <span
              className="flex size-11 items-center justify-center rounded-sm bg-ember/15 text-ember [&_svg]:size-5"
              aria-hidden
            >
              <Palette />
            </span>
            <div className="min-w-0">
              <p className="truncate font-display text-lg font-semibold text-bone">
                {user?.name?.trim() || user?.email || "Compte"}
              </p>
              {user?.name?.trim() && user.email ? (
                <p className="truncate text-sm text-smoke-2">{user.email}</p>
              ) : null}
            </div>
            <Badge variant="inverse" className="ml-auto">
              {ROLE_LABELS[session.role]}
            </Badge>
          </div>
          <dl className="mt-5 grid gap-4 border-t border-line-soft pt-5 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wider text-smoke-2">
                Espace de travail
              </dt>
              <dd className="mt-1 text-sand">{workspace?.name ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wider text-smoke-2">
                Membre depuis
              </dt>
              <dd className="mt-1 text-sand">
                {user ? DATE_FORMAT.format(user.createdAt) : "—"}
              </dd>
            </div>
          </dl>
          <p className="mt-4 text-xs text-smoke-2">
            Le profil créateur complet (spécialités, portfolio, disponibilités) ouvrira avec
            les inscriptions à la Guilde.
          </p>
        </div>
      </section>

      {/* ── État honnête : pas encore de missions ─────────────────────── */}
      <section className="space-y-4" aria-label="Missions">
        <h2 className="font-display text-xl font-semibold">Missions</h2>
        <EmptyState
          icon={<Megaphone />}
          title="Les missions ouvrent bientôt"
          description="Le mur des missions, les candidatures et le paiement mobile money sont le prochain chantier de la Guilde. Rien ne s'affichera ici avant d'être réel — pas de missions de démonstration."
        />
      </section>

      {/* ── Comment ça marchera (la méthode, pas des chiffres) ────────── */}
      <section className="space-y-4" aria-label="Comment ça marchera">
        <div>
          <h2 className="font-display text-xl font-semibold">Comment ça marchera</h2>
          <p className="text-sm text-sand">Le circuit d&apos;une mission, de la marque au créateur.</p>
        </div>
        <div className="grid gap-bento sm:grid-cols-3">
          {HOW_IT_WORKS.map((step, index) => (
            <div key={step.title} className="rounded-lg border border-line bg-ink-2 p-6">
              <p className="font-mono text-xs font-bold text-coral">
                {String(index + 1).padStart(2, "0")}
              </p>
              <div className="mt-3 flex items-center gap-2 text-bone [&_svg]:size-4.5 [&_svg]:text-smoke-2">
                <step.icon aria-hidden />
                <h3 className="font-display text-base font-semibold">{step.title}</h3>
              </div>
              <p className="mt-2 text-sm leading-relaxed text-sand">{step.description}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
