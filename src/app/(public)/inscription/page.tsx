import type { Metadata } from "next";
import Link from "next/link";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getLeadForPrefill, type LeadPrefill } from "@/server/funnel";
import { RegisterForm } from "./register-form";

export const metadata: Metadata = {
  title: "Créer mon compte",
  description:
    "Créez votre espace La Fusée : votre marque, son diagnostic ADVE et ses livrables.",
};

/**
 * Inscription. Si un lead du funnel est passé (?lead=…), le formulaire est
 * prérempli (email, nom de marque) et l'inscription convertira le lead :
 * les réponses du diagnostic deviennent le socle ADVE de la marque créée.
 * Sans lead, chemin d'inscription classique inchangé.
 */
export default async function InscriptionPage({
  searchParams,
}: {
  searchParams: Promise<{ lead?: string }>;
}) {
  const { lead: leadParam } = await searchParams;

  let lead: LeadPrefill | null = null;
  if (leadParam) {
    try {
      lead = await getLeadForPrefill(leadParam);
    } catch (err) {
      // Lead illisible (DB indisponible…) → inscription classique, jamais bloquée.
      console.error("[inscription] préremplissage lead impossible :", err);
    }
  }

  return (
    <div className="px-gutter py-16 sm:py-24">
      <Card padding="lg" className="mx-auto w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl">Créer mon compte</CardTitle>
          <CardDescription>
            {lead
              ? "Votre diagnostic est prêt à embarquer — le socle ADVE de votre marque sera importé automatiquement."
              : "Votre marque naît LATENT — le diagnostic la fait décoller."}
          </CardDescription>
        </CardHeader>
        {lead ? (
          <p className="mt-4 rounded-sm border border-gold/40 bg-gold/10 px-4 py-3 text-sm font-medium text-gold-deep">
            Diagnostic retrouvé pour «&nbsp;{lead.brandName}&nbsp;» — vos réponses
            seront importées, rien à re-saisir.
          </p>
        ) : null}
        <div className="pt-6">
          <RegisterForm lead={lead} />
        </div>
        <p className="pt-6 text-center text-sm text-smoke">
          Déjà un compte ?{" "}
          <Link href="/connexion" className="font-semibold text-coral hover:text-coral-deep">
            Se connecter
          </Link>
        </p>
      </Card>
    </div>
  );
}
