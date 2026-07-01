import type { Metadata } from "next";
import Link from "next/link";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { RegisterForm } from "./register-form";

export const metadata: Metadata = {
  title: "Créer mon compte",
  description:
    "Créez votre espace La Fusée : votre marque, son diagnostic ADVE et ses livrables.",
};

export default function InscriptionPage() {
  return (
    <div className="px-gutter py-16 sm:py-24">
      <Card padding="lg" className="mx-auto w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl">Créer mon compte</CardTitle>
          <CardDescription>
            Votre marque naît LATENT — le diagnostic la fait décoller.
          </CardDescription>
        </CardHeader>
        <div className="pt-6">
          <RegisterForm />
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
