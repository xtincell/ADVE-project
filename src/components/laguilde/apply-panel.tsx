"use client";

/**
 * La Guilde — panneau de candidature à une mission. ADR-0098.
 * Réutilise missionApplication.submit (APPLY_TO_MISSION). Inscription requise
 * pour postuler (le mur reste lisible sans compte).
 */

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { CheckCircle2, Send } from "lucide-react";
import { trpc } from "@/lib/trpc/client";
import { Button } from "@/components/primitives/button";
import { Textarea } from "@/components/primitives/textarea";
import { Input } from "@/components/primitives/input";
import { Select } from "@/components/primitives/select";
import { Field, FieldError } from "@/components/primitives/field";
import { Label } from "@/components/primitives/label";

export function ApplyPanel({ missionId, isOpen }: { missionId: string; isOpen: boolean }) {
  const { status } = useSession();
  const pathname = usePathname();
  const [expanded, setExpanded] = React.useState(false);
  const [message, setMessage] = React.useState("");
  const [rate, setRate] = React.useState("");
  const [currency, setCurrency] = React.useState("XAF");

  const submit = trpc.missionApplication.submit.useMutation();

  if (!isOpen) {
    return (
      <div className="rounded-[var(--card-radius)] border border-border bg-background-subtle px-5 py-4 text-sm text-muted-foreground">
        Cette mission n'accepte plus de candidatures (attribuée ou clôturée).
      </div>
    );
  }

  if (status !== "authenticated") {
    const cb = encodeURIComponent(pathname || "/LaGuilde");
    return (
      <div className="flex flex-col gap-3 rounded-[var(--card-radius)] border border-border bg-card px-5 py-5">
        <p className="text-sm text-foreground">
          Connectez-vous ou rejoignez la Guilde pour postuler à cette mission.
        </p>
        <div className="flex flex-wrap gap-2">
          <Link href={`/LaGuilde/rejoindre?callbackUrl=${cb}`}>
            <Button>Rejoindre la Guilde</Button>
          </Link>
          <Link href={`/login?callbackUrl=${cb}`}>
            <Button variant="ghost">J'ai déjà un compte</Button>
          </Link>
        </div>
      </div>
    );
  }

  if (submit.isSuccess) {
    return (
      <div className="flex items-center gap-2 rounded-[var(--card-radius)] border border-border bg-card px-5 py-4 text-sm text-foreground">
        <CheckCircle2 className="h-5 w-5 text-accent" />
        Candidature envoyée. L'opérateur reviendra vers vous après revue.
      </div>
    );
  }

  if (!expanded) {
    return (
      <Button onClick={() => setExpanded(true)} className="gap-2">
        <Send className="h-4 w-4" /> Postuler à cette mission
      </Button>
    );
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    submit.mutate({
      missionId,
      message: message.trim() || undefined,
      proposedRate: rate ? Number(rate) : undefined,
      currency,
    });
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-4 rounded-[var(--card-radius)] border border-border bg-card px-5 py-5"
    >
      <Field>
        <Label htmlFor="apply-message">Message de candidature</Label>
        <Textarea
          id="apply-message"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Présentez votre approche, vos références pertinentes…"
          rows={4}
          maxLength={2000}
        />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field>
          <Label htmlFor="apply-rate" optional>
            Tarif proposé
          </Label>
          <Input
            id="apply-rate"
            type="number"
            min={0}
            value={rate}
            onChange={(e) => setRate(e.target.value)}
            placeholder="Ex. 250000"
          />
        </Field>
        <Field>
          <Label htmlFor="apply-currency">Devise</Label>
          <Select
            id="apply-currency"
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
          >
            <option value="XAF">FCFA (XAF)</option>
            <option value="XOF">FCFA (XOF)</option>
            <option value="EUR">EUR</option>
            <option value="USD">USD</option>
          </Select>
        </Field>
      </div>

      {submit.isError && <FieldError>{submit.error.message}</FieldError>}

      <div className="flex gap-2">
        <Button type="submit" loading={submit.isPending} className="gap-2">
          <Send className="h-4 w-4" /> Envoyer ma candidature
        </Button>
        <Button type="button" variant="ghost" onClick={() => setExpanded(false)}>
          Annuler
        </Button>
      </div>
    </form>
  );
}
