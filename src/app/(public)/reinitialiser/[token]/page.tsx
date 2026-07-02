import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { getResetTokenState } from "@/server/identity";
import { ResetPasswordForm } from "./reset-form";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Réinitialiser le mot de passe",
  description: "Définissez un nouveau mot de passe pour votre compte La Fusée.",
  robots: { index: false }, // page à token — jamais indexée
};

/**
 * /reinitialiser/[token] (WP-022, port de legacy //reset-password) — le lien
 * transmis par l'opérateur. Vérifie le token à la LECTURE (hash SHA-256, TTL
 * 1 h, usage unique) avant d'afficher le formulaire ; la consommation reste
 * atomique côté action. Un seul message pour invalide/expiré/consommé —
 * rien à énumérer.
 */
export default async function ReinitialiserPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ ok?: string }>;
}) {
  const [{ token: rawToken }, { ok }] = await Promise.all([params, searchParams]);
  const token = decodeURIComponent(rawToken);

  // Succès (le token vient d'être consommé — l'état « USED » est le succès ici).
  if (ok === "1") {
    return (
      <div className="px-gutter py-16 sm:py-24">
        <Card padding="lg" className="mx-auto w-full max-w-md text-center">
          <CheckCircle2 className="mx-auto size-10 text-gold-deep" aria-hidden />
          <CardHeader className="mt-4 items-center">
            <CardTitle className="text-2xl">Mot de passe réinitialisé</CardTitle>
            <CardDescription>
              Connectez-vous avec votre nouveau mot de passe. Les sessions déjà ouvertes sur
              d&apos;autres appareils restent valides jusqu&apos;à leur expiration (30 jours) —
              la déconnexion à distance n&apos;existe pas encore en v7.
            </CardDescription>
          </CardHeader>
          <div className="pt-6">
            <Link href="/connexion" className={buttonVariants({ variant: "primary", size: "md" })}>
              Se connecter
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  const state = await getResetTokenState(token);

  if (state !== "VALID") {
    return (
      <div className="px-gutter py-16 sm:py-24">
        <Card padding="lg" className="mx-auto w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-2xl">Lien inutilisable</CardTitle>
            <CardDescription>
              Ce lien de réinitialisation est invalide, déjà utilisé ou expiré — un lien dure
              1 heure et ne sert qu&apos;une fois.
            </CardDescription>
          </CardHeader>
          <div className="pt-6">
            <Link
              href="/mot-de-passe-oublie"
              className={buttonVariants({ variant: "primary", size: "md", className: "w-full" })}
            >
              Refaire une demande
            </Link>
          </div>
          <p className="pt-6 text-center text-sm text-smoke">
            <Link href="/connexion" className="font-semibold text-coral hover:text-coral-deep">
              Retour à la connexion
            </Link>
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="px-gutter py-16 sm:py-24">
      <Card padding="lg" className="mx-auto w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl">Nouveau mot de passe</CardTitle>
          <CardDescription>
            Ce lien est valide — définissez le nouveau mot de passe de votre compte. Il sera
            chiffré (bcrypt) et le lien sera immédiatement consommé.
          </CardDescription>
        </CardHeader>
        <div className="pt-6">
          <ResetPasswordForm token={token} />
        </div>
      </Card>
    </div>
  );
}
