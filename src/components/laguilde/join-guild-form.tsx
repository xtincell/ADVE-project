"use client";

/**
 * La Guilde — inscription freelance / agence. ADR-0098.
 * Phase compte (auth.register + signIn) si non connecté → phase profil
 * (registerTalent | registerOrganization, gouvernés). Comble le gap : c'est la
 * voie de création canonique du TalentProfile.
 */

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { useSession } from "next-auth/react";
import { CheckCircle2, User, Building2 } from "lucide-react";
import { trpc } from "@/lib/trpc/client";
import { Button } from "@/components/primitives/button";
import { Input } from "@/components/primitives/input";
import { Textarea } from "@/components/primitives/textarea";
import { Card, CardBody } from "@/components/primitives/card";
import { Field, FieldHelper, FieldError } from "@/components/primitives/field";
import { Label } from "@/components/primitives/label";
import { cn } from "@/lib/utils";

const splitCsv = (s: string) =>
  s
    .split(/[,\n]/)
    .map((x) => x.trim())
    .filter(Boolean);

type Tab = "FREELANCE" | "AGENCY";

export function JoinGuildForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/portals";
  const { data: session, status } = useSession();
  const authed = status === "authenticated";

  const [tab, setTab] = React.useState<Tab>("FREELANCE");
  const [acct, setAcct] = React.useState({ name: "", email: "", password: "" });
  const [fl, setFl] = React.useState({ displayName: "", bio: "", skillsRaw: "", payoutPhone: "" });
  const [ag, setAg] = React.useState({
    orgName: "",
    description: "",
    website: "",
    specializationsRaw: "",
    contactDisplayName: "",
    payoutPhone: "",
  });
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [done, setDone] = React.useState(false);

  const registerM = trpc.auth.register.useMutation();
  const talentM = trpc.laGuilde.registerTalent.useMutation();
  const orgM = trpc.laGuilde.registerOrganization.useMutation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!authed) {
      if (acct.password.length < 8) {
        setError("Le mot de passe doit contenir au moins 8 caractères.");
        return;
      }
    }
    setBusy(true);
    try {
      if (!authed) {
        await registerM.mutateAsync({
          name: acct.name,
          email: acct.email,
          password: acct.password,
        });
        const r = await signIn("credentials", {
          email: acct.email,
          password: acct.password,
          redirect: false,
        });
        if (r?.error) throw new Error("Compte créé, mais connexion impossible. Réessayez via /login.");
      }

      if (tab === "FREELANCE") {
        await talentM.mutateAsync({
          displayName: fl.displayName,
          bio: fl.bio || undefined,
          skills: splitCsv(fl.skillsRaw),
          driverSpecialties: [],
          payoutPhone: fl.payoutPhone || undefined,
        });
      } else {
        await orgM.mutateAsync({
          orgName: ag.orgName,
          description: ag.description || undefined,
          website: ag.website || undefined,
          specializations: splitCsv(ag.specializationsRaw),
          contactDisplayName: ag.contactDisplayName,
          payoutPhone: ag.payoutPhone || undefined,
        });
      }
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Une erreur est survenue.");
      setBusy(false);
    }
  };

  if (done) {
    return (
      <Card surface="raised">
        <CardBody className="flex flex-col items-start gap-4">
          <div className="flex items-center gap-2 text-foreground">
            <CheckCircle2 className="h-6 w-6 text-accent" />
            <span className="text-lg font-semibold">Bienvenue dans la Guilde</span>
          </div>
          <p className="text-sm text-foreground-secondary">
            Votre profil {tab === "FREELANCE" ? "freelance" : "agence"} est créé. Vous pouvez
            désormais candidater aux missions du mur.
          </p>
          <div className="flex flex-wrap gap-2">
            <Link href={callbackUrl}>
              <Button>Continuer</Button>
            </Link>
            <Link href="/LaGuilde">
              <Button variant="ghost">Voir le mur des missions</Button>
            </Link>
          </div>
        </CardBody>
      </Card>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      {/* Choix du type */}
      <div className="grid grid-cols-2 gap-2">
        {(
          [
            { key: "FREELANCE", label: "Freelance / Créateur", icon: User },
            { key: "AGENCY", label: "Agence / Boîte de prod", icon: Building2 },
          ] as const
        ).map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            aria-pressed={tab === key}
            className={cn(
              "flex items-center justify-center gap-2 rounded-[var(--card-radius)] border px-4 py-3 text-sm font-medium transition-colors",
              tab === key
                ? "border-transparent bg-accent text-accent-foreground"
                : "border-border text-foreground-secondary hover:text-foreground",
            )}
          >
            <Icon className="h-4 w-4" /> {label}
          </button>
        ))}
      </div>

      {/* Phase compte (si non connecté) */}
      {!authed && (
        <Card surface="raised">
          <CardBody className="flex flex-col gap-4">
            <p className="text-sm font-semibold text-foreground">Votre compte</p>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <Field>
                <Label htmlFor="acct-name" required>
                  Nom complet
                </Label>
                <Input id="acct-name" required value={acct.name} onChange={(e) => setAcct({ ...acct, name: e.target.value })} placeholder="Marie Ndongo" />
              </Field>
              <Field>
                <Label htmlFor="acct-email" required>
                  Email
                </Label>
                <Input id="acct-email" type="email" required value={acct.email} onChange={(e) => setAcct({ ...acct, email: e.target.value })} placeholder="marie@exemple.com" />
              </Field>
              <Field>
                <Label htmlFor="acct-password" required>
                  Mot de passe
                </Label>
                <Input id="acct-password" type="password" required minLength={8} value={acct.password} onChange={(e) => setAcct({ ...acct, password: e.target.value })} placeholder="Min. 8 caractères" />
              </Field>
            </div>
          </CardBody>
        </Card>
      )}

      {authed && session?.user?.name && (
        <p className="text-sm text-muted-foreground">
          Connecté en tant que <span className="font-medium text-foreground">{session.user.name}</span>.
        </p>
      )}

      {/* Phase profil */}
      <Card surface="raised">
        <CardBody className="flex flex-col gap-4">
          {tab === "FREELANCE" ? (
            <>
              <p className="text-sm font-semibold text-foreground">Votre profil freelance</p>
              <Field>
                <Label htmlFor="fl-name" required>
                  Nom d'affichage
                </Label>
                <Input id="fl-name" required value={fl.displayName} onChange={(e) => setFl({ ...fl, displayName: e.target.value })} placeholder="Marie · Motion designer" />
              </Field>
              <Field>
                <Label htmlFor="fl-bio" optional>
                  Bio
                </Label>
                <Textarea id="fl-bio" maxLength={2000} value={fl.bio} onChange={(e) => setFl({ ...fl, bio: e.target.value })} rows={3} placeholder="Votre spécialité, votre expérience, votre style." />
              </Field>
              <Field>
                <Label htmlFor="fl-skills" required>
                  Compétences
                </Label>
                <Input id="fl-skills" value={fl.skillsRaw} onChange={(e) => setFl({ ...fl, skillsRaw: e.target.value })} placeholder="Motion design, After Effects, Branding…" />
                <FieldHelper>Séparez par des virgules.</FieldHelper>
              </Field>
              <Field>
                <Label htmlFor="fl-phone" optional>
                  Mobile money (payouts)
                </Label>
                <Input id="fl-phone" value={fl.payoutPhone} onChange={(e) => setFl({ ...fl, payoutPhone: e.target.value })} placeholder="+237…" />
                <FieldHelper>Numéro destinataire des commissions (Wave / MTN / Orange).</FieldHelper>
              </Field>
            </>
          ) : (
            <>
              <p className="text-sm font-semibold text-foreground">Votre agence</p>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <Field>
                  <Label htmlFor="ag-name" required>
                    Nom de l'agence
                  </Label>
                  <Input id="ag-name" required value={ag.orgName} onChange={(e) => setAg({ ...ag, orgName: e.target.value })} placeholder="Studio Baobab" />
                </Field>
                <Field>
                  <Label htmlFor="ag-website" optional>
                    Site web
                  </Label>
                  <Input id="ag-website" type="url" value={ag.website} onChange={(e) => setAg({ ...ag, website: e.target.value })} placeholder="https://…" />
                </Field>
              </div>
              <Field>
                <Label htmlFor="ag-desc" optional>
                  Présentation
                </Label>
                <Textarea id="ag-desc" maxLength={2000} value={ag.description} onChange={(e) => setAg({ ...ag, description: e.target.value })} rows={3} placeholder="Ce que fait votre agence, vos références." />
              </Field>
              <Field>
                <Label htmlFor="ag-spec" required>
                  Spécialisations
                </Label>
                <Input id="ag-spec" value={ag.specializationsRaw} onChange={(e) => setAg({ ...ag, specializationsRaw: e.target.value })} placeholder="Production vidéo, Événementiel, Social…" />
                <FieldHelper>Séparez par des virgules.</FieldHelper>
              </Field>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <Field>
                  <Label htmlFor="ag-contact" required>
                    Contact référent
                  </Label>
                  <Input id="ag-contact" required value={ag.contactDisplayName} onChange={(e) => setAg({ ...ag, contactDisplayName: e.target.value })} placeholder="Nom du référent" />
                </Field>
                <Field>
                  <Label htmlFor="ag-phone" optional>
                    Mobile money (payouts)
                  </Label>
                  <Input id="ag-phone" value={ag.payoutPhone} onChange={(e) => setAg({ ...ag, payoutPhone: e.target.value })} placeholder="+237…" />
                </Field>
              </div>
            </>
          )}
        </CardBody>
      </Card>

      {error && <FieldError>{error}</FieldError>}

      <div className="flex items-center gap-3">
        <Button type="submit" size="lg" loading={busy}>
          {authed ? "Rejoindre la Guilde" : "Créer mon compte & rejoindre"}
        </Button>
        {!authed && (
          <p className="text-xs text-muted-foreground">
            Déjà un compte ?{" "}
            <Link href={`/login?callbackUrl=/LaGuilde/rejoindre`} className="text-accent hover:underline">
              Se connecter
            </Link>
          </p>
        )}
      </div>
    </form>
  );
}
