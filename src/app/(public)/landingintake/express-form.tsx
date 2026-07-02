"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/**
 * Formulaire express de /landingintake — port du DiagnosticModal legacy
 * (mêmes trois champs, mêmes messages de validation, même contrat de sortie :
 * push vers /intake avec les réponses en query — name/email/company, comme le
 * faisait le modal legacy). Le wizard /intake re-demande aujourd'hui email et
 * marque à son étape 1 (le préremplissage depuis la query est un résidu de
 * son WP) ; rien n'est stocké ici, et rien n'est prétendu : pas de faux
 * « lien envoyé par email » (le legacy l'affichait sans jamais envoyer).
 */
export function ExpressForm() {
  const router = useRouter();
  const [form, setForm] = useState({ name: "", email: "", company: "" });
  const [err, setErr] = useState("");
  const [going, setGoing] = useState(false);

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!form.name.trim()) return setErr("Votre nom est requis.");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      return setErr("Entrez une adresse email valide.");
    }
    if (!form.company.trim()) return setErr("Le nom de votre marque est requis.");
    setErr("");
    setGoing(true);
    const qs = new URLSearchParams({
      name: form.name.trim(),
      email: form.email.trim(),
      company: form.company.trim(),
    }).toString();
    router.push(`/intake?${qs}`);
  }

  return (
    <form onSubmit={submit} noValidate className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="lf-name">Votre nom</Label>
        <Input
          id="lf-name"
          name="name"
          autoComplete="name"
          placeholder="Ex : Awa Ndongo"
          value={form.name}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="lf-email">Email professionnel</Label>
        <Input
          id="lf-email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="awa@mamarque.com"
          value={form.email}
          onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="lf-company">Nom de votre marque</Label>
        <Input
          id="lf-company"
          name="company"
          autoComplete="organization"
          placeholder="Ex : Zola Apparel"
          value={form.company}
          onChange={(e) => setForm((f) => ({ ...f, company: e.target.value }))}
        />
      </div>
      {err ? (
        <p
          role="alert"
          className="rounded-sm border border-coral/30 bg-coral/8 px-4 py-3 text-sm font-medium text-coral-deep"
        >
          {err}
        </p>
      ) : null}
      <Button type="submit" size="lg" className="w-full" disabled={going}>
        {going ? "Ouverture du diagnostic…" : "Lancer mon diagnostic"}
        <ArrowRight aria-hidden="true" />
      </Button>
      <p className="flex items-center justify-center gap-1.5 text-xs text-smoke">
        <Lock className="size-3" aria-hidden="true" />
        Vos données restent confidentielles et ne sont jamais partagées.
      </p>
    </form>
  );
}
