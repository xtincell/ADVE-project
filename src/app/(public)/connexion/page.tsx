import type { Metadata } from "next";
import Link from "next/link";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { LoginForm } from "./login-form";

export const metadata: Metadata = {
  title: "Connexion",
  description: "Accédez à votre espace La Fusée.",
};

export default async function ConnexionPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;

  return (
    <div className="px-gutter py-16 sm:py-24">
      <Card padding="lg" className="mx-auto w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl">Connexion</CardTitle>
          <CardDescription>
            Retrouvez votre marque, votre Oracle et votre facturation.
          </CardDescription>
        </CardHeader>
        <div className="pt-6">
          <LoginForm next={next} />
        </div>
        <p className="pt-6 text-center text-sm text-smoke">
          Pas encore de compte ?{" "}
          <Link href="/inscription" className="font-semibold text-coral hover:text-coral-deep">
            Créer mon compte
          </Link>
        </p>
      </Card>
    </div>
  );
}
