import type { Metadata } from "next";
import Link from "next/link";
import { MessageCircle } from "lucide-react";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { buildWhatsAppUrl, operatorWhatsAppNumber } from "@/server/finance";
import { ForgotPasswordForm } from "./forgot-form";

export const metadata: Metadata = {
  title: "Mot de passe oublié",
  description: "Demandez la réinitialisation de votre mot de passe La Fusée.",
};

/**
 * /mot-de-passe-oublie (WP-022, port de legacy //forgot-password) — demande
 * par email. Honnêteté v7 : AUCUN provider email n'est branché, donc pas de
 * « email envoyé » fictif. Si un compte existe, un lien est généré (token
 * hashé en base, TTL 1 h, usage unique) et l'OPÉRATEUR le transmet par
 * WhatsApp — le même canal manuel que la validation des paiements.
 */
export default async function MotDePasseOubliePage({
  searchParams,
}: {
  searchParams: Promise<{ envoyee?: string }>;
}) {
  const { envoyee } = await searchParams;
  const whatsappUrl = buildWhatsAppUrl(
    operatorWhatsAppNumber(),
    "Bonjour, j'ai demandé la réinitialisation de mon mot de passe La Fusée — pouvez-vous me transmettre le lien ?",
  );

  return (
    <div className="px-gutter py-16 sm:py-24">
      <Card padding="lg" className="mx-auto w-full max-w-md">
        {envoyee === "1" ? (
          <>
            <CardHeader>
              <CardTitle className="text-2xl">Demande enregistrée</CardTitle>
              <CardDescription>
                Si un compte existe avec cette adresse, un lien de réinitialisation a été
                généré (valable 1 heure, à usage unique).
              </CardDescription>
            </CardHeader>
            <div className="mt-6 space-y-4">
              <p className="rounded-sm border border-gold/40 bg-gold/10 px-4 py-3 text-sm leading-relaxed text-graphite">
                La Fusée n&apos;envoie pas encore d&apos;email : c&apos;est l&apos;opérateur
                UPgraders qui vous transmet le lien, directement sur WhatsApp — comme pour la
                validation des paiements.
              </p>
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 rounded-sm bg-ink px-4 py-3 text-sm font-semibold text-bone transition-colors hover:bg-ink-3"
              >
                <MessageCircle className="size-4.5" aria-hidden />
                Contacter l&apos;opérateur sur WhatsApp
              </a>
            </div>
            <p className="pt-6 text-center text-sm text-smoke">
              <Link href="/connexion" className="font-semibold text-coral hover:text-coral-deep">
                Retour à la connexion
              </Link>
            </p>
          </>
        ) : (
          <>
            <CardHeader>
              <CardTitle className="text-2xl">Mot de passe oublié</CardTitle>
              <CardDescription>
                Indiquez l&apos;email de votre compte. Si un compte existe, un lien de
                réinitialisation est généré — l&apos;opérateur vous le transmet par WhatsApp.
              </CardDescription>
            </CardHeader>
            <div className="pt-6">
              <ForgotPasswordForm />
            </div>
            <p className="pt-6 text-center text-sm text-smoke">
              Mot de passe retrouvé ?{" "}
              <Link href="/connexion" className="font-semibold text-coral hover:text-coral-deep">
                Se connecter
              </Link>
            </p>
          </>
        )}
      </Card>
    </div>
  );
}
