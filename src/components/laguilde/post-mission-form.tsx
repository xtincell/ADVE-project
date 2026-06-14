"use client";

/**
 * La Guilde — formulaire de dépôt de mission (marques). ADR-0093.
 * Brief complet (guild-mission-brief.ts). Auth requise. À la soumission, le
 * backend crée le Client + Strategy shell sous UPgraders et met la mission en
 * attente de modération (modèle « Shell Strategy auto »).
 */

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { CheckCircle2, Plus, Trash2, Sparkles } from "lucide-react";
import { trpc } from "@/lib/trpc/client";
import { Button } from "@/components/primitives/button";
import { Input } from "@/components/primitives/input";
import { Textarea } from "@/components/primitives/textarea";
import { Select } from "@/components/primitives/select";
import { Card, CardHeader, CardBody } from "@/components/primitives/card";
import { Field, FieldHelper, FieldError } from "@/components/primitives/field";
import { Label } from "@/components/primitives/label";
import { cn } from "@/lib/utils";
import {
  GUILD_MISSION_CATEGORIES,
  GUILD_MISSION_CATEGORY_LABELS,
  GUILD_MISSION_CHANNELS,
  GUILD_MISSION_MODES,
  GUILD_MISSION_CURRENCIES,
  type GuildMissionDraft,
} from "@/lib/types/guild-mission-brief";

const splitCsv = (s: string) =>
  s
    .split(/[,\n]/)
    .map((x) => x.trim())
    .filter(Boolean);

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="text-base font-semibold tracking-tight text-foreground">{children}</h2>;
}

export function PostMissionForm() {
  const { data: session, status } = useSession();
  const pathname = usePathname();

  const [f, setF] = React.useState({
    title: "",
    category: "CONTENT",
    sector: "",
    location: "",
    mode: "DISPATCH",
    budgetAmount: "",
    budgetCurrency: "XAF",
    deadline: "",
    brandName: "",
    brandWebsite: "",
    summary: "",
    context: "",
    targetAudience: "",
    constraints: "",
    skillsRaw: "",
    qualityRaw: "",
    remoteOk: true,
    contactName: "",
    contactEmail: "",
  });
  const [deliverables, setDeliverables] = React.useState([{ title: "", description: "" }]);
  const [channels, setChannels] = React.useState<string[]>([]);

  // Pré-remplit le contact depuis la session.
  React.useEffect(() => {
    if (session?.user) {
      setF((prev) => ({
        ...prev,
        contactName: prev.contactName || session.user.name || "",
        contactEmail: prev.contactEmail || session.user.email || "",
      }));
    }
  }, [session?.user]);

  const post = trpc.laGuilde.postMission.useMutation();
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setF((prev) => ({ ...prev, [k]: e.target.value }));

  // ── Assist LLM optionnel (ADR-0093) — pré-remplissage, le dirigeant corrige ──
  const [assistText, setAssistText] = React.useState("");
  const applyDraft = (d: GuildMissionDraft) => {
    setF((prev) => ({
      ...prev,
      title: d.title ?? prev.title,
      category: d.category ?? prev.category,
      sector: d.sector ?? prev.sector,
      location: d.location ?? prev.location,
      mode: d.mode ?? prev.mode,
      budgetAmount: d.budgetAmount != null ? String(d.budgetAmount) : prev.budgetAmount,
      budgetCurrency: d.budgetCurrency ?? prev.budgetCurrency,
      brandName: d.brandName ?? prev.brandName,
      brandWebsite: d.brandWebsite ?? prev.brandWebsite,
      summary: d.summary ?? prev.summary,
      context: d.context ?? prev.context,
      targetAudience: d.targetAudience ?? prev.targetAudience,
      constraints: d.constraints ?? prev.constraints,
      skillsRaw: d.skillsRequired?.length ? d.skillsRequired.join(", ") : prev.skillsRaw,
      qualityRaw: d.qualityCriteria?.length ? d.qualityCriteria.join(", ") : prev.qualityRaw,
      remoteOk: d.remoteOk ?? prev.remoteOk,
    }));
    if (d.deliverables?.length) {
      setDeliverables(d.deliverables.map((x) => ({ title: x.title, description: x.description ?? "" })));
    }
    if (d.channels?.length) setChannels(d.channels);
  };
  const draft = trpc.laGuilde.draftMissionFromText.useMutation({ onSuccess: applyDraft });

  if (status === "loading") {
    return <p className="text-sm text-muted-foreground">Chargement…</p>;
  }

  if (status !== "authenticated") {
    const cb = encodeURIComponent(pathname || "/LaGuilde/publier");
    return (
      <Card surface="raised">
        <CardBody className="flex flex-col gap-4">
          <p className="text-foreground">
            Pour publier une mission, créez un compte marque (gratuit) ou connectez-vous.
          </p>
          <div className="flex flex-wrap gap-2">
            <Link href={`/register?callbackUrl=${cb}`}>
              <Button>Créer un compte marque</Button>
            </Link>
            <Link href={`/login?callbackUrl=${cb}`}>
              <Button variant="ghost">Se connecter</Button>
            </Link>
          </div>
        </CardBody>
      </Card>
    );
  }

  if (post.isSuccess) {
    return (
      <Card surface="raised">
        <CardBody className="flex flex-col items-start gap-4">
          <div className="flex items-center gap-2 text-foreground">
            <CheckCircle2 className="h-6 w-6 text-accent" />
            <span className="text-lg font-semibold">Mission déposée</span>
          </div>
          <p className="text-sm text-foreground-secondary">
            Votre mission est en attente de validation par un opérateur UPgraders. Une fois
            approuvée, elle apparaîtra sur le mur public et les talents pourront candidater.
          </p>
          <div className="flex flex-wrap gap-2">
            <Link href="/LaGuilde">
              <Button variant="ghost">Retour au mur</Button>
            </Link>
            <Button onClick={() => post.reset()}>Déposer une autre mission</Button>
          </div>
        </CardBody>
      </Card>
    );
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    post.mutate({
      title: f.title,
      category: f.category as (typeof GUILD_MISSION_CATEGORIES)[number],
      sector: f.sector,
      location: f.location,
      mode: f.mode as (typeof GUILD_MISSION_MODES)[number],
      budgetAmount: f.budgetAmount ? Number(f.budgetAmount) : undefined,
      budgetCurrency: f.budgetCurrency as (typeof GUILD_MISSION_CURRENCIES)[number],
      deadline: f.deadline ? new Date(f.deadline).toISOString() : undefined,
      brandName: f.brandName,
      brandWebsite: f.brandWebsite || undefined,
      summary: f.summary,
      context: f.context,
      targetAudience: f.targetAudience,
      deliverables: deliverables
        .filter((d) => d.title.trim())
        .map((d) => ({ title: d.title.trim(), description: d.description.trim() || undefined })),
      channels,
      skillsRequired: splitCsv(f.skillsRaw),
      qualityCriteria: splitCsv(f.qualityRaw),
      remoteOk: f.remoteOk,
      constraints: f.constraints || undefined,
      contactName: f.contactName || undefined,
      contactEmail: f.contactEmail || undefined,
      references: [],
    });
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      {/* Assist IA — optionnel (ADR-0093). Le formulaire reste utilisable sans. */}
      <Card surface="elevated">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-accent" />
            <SectionTitle>Pas le temps ? L'IA pré-remplit pour vous</SectionTitle>
          </div>
        </CardHeader>
        <CardBody className="flex flex-col gap-3">
          <p className="text-sm text-foreground-secondary">
            Décrivez votre besoin en quelques phrases. L'assistant structure un brouillon —{" "}
            <span className="font-medium text-foreground">relisez et corrigez</span> chaque champ
            avant d'envoyer. Optionnel : vous pouvez remplir le formulaire directement.
          </p>
          <Textarea
            value={assistText}
            onChange={(e) => setAssistText(e.target.value)}
            rows={4}
            maxLength={5000}
            placeholder="Ex. On lance une boisson hibiscus à Douala, il nous faut un mois de contenu Instagram + une affiche, budget ~500 000 FCFA, cible jeunes urbains 18-30 ans…"
          />
          <div className="flex flex-wrap items-center gap-3">
            <Button
              type="button"
              variant="subtle"
              className="gap-2"
              loading={draft.isPending}
              disabled={assistText.trim().length < 20}
              onClick={() => draft.mutate({ rawText: assistText.trim() })}
            >
              <Sparkles className="h-4 w-4" /> Pré-remplir avec l'IA
            </Button>
            {draft.isSuccess && (
              <span className="text-xs text-foreground-secondary">
                ✓ Brouillon généré — vérifiez chaque champ ci-dessous avant d'envoyer.
              </span>
            )}
            {draft.isError && (
              <span className="text-xs text-muted-foreground">
                Assistant indisponible — remplissez le formulaire manuellement.
              </span>
            )}
          </div>
        </CardBody>
      </Card>

      {/* La marque */}
      <Card surface="raised">
        <CardHeader>
          <SectionTitle>La marque</SectionTitle>
        </CardHeader>
        <CardBody className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Field>
            <Label htmlFor="brandName" required>
              Nom de la marque
            </Label>
            <Input id="brandName" required value={f.brandName} onChange={set("brandName")} placeholder="Ex. Matanga" />
          </Field>
          <Field>
            <Label htmlFor="brandWebsite" optional>
              Site web
            </Label>
            <Input id="brandWebsite" type="url" value={f.brandWebsite} onChange={set("brandWebsite")} placeholder="https://…" />
          </Field>
          <Field>
            <Label htmlFor="sector" required>
              Secteur
            </Label>
            <Input id="sector" required value={f.sector} onChange={set("sector")} placeholder="FMCG, Tech, Mode…" />
          </Field>
          <Field>
            <Label htmlFor="location" required>
              Localisation
            </Label>
            <Input id="location" required value={f.location} onChange={set("location")} placeholder="Douala · Abidjan · Remote" />
          </Field>
        </CardBody>
      </Card>

      {/* La mission */}
      <Card surface="raised">
        <CardHeader>
          <SectionTitle>La mission</SectionTitle>
        </CardHeader>
        <CardBody className="flex flex-col gap-4">
          <Field>
            <Label htmlFor="title" required>
              Titre de la mission
            </Label>
            <Input id="title" required minLength={4} value={f.title} onChange={set("title")} placeholder="Ex. Pack 1 mois réseaux sociaux + key visual lancement" />
          </Field>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Field>
              <Label htmlFor="category" required>
                Catégorie
              </Label>
              <Select id="category" value={f.category} onChange={set("category")}>
                {GUILD_MISSION_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {GUILD_MISSION_CATEGORY_LABELS[c]}
                  </option>
                ))}
              </Select>
            </Field>
            <Field>
              <Label htmlFor="mode">Mode</Label>
              <Select id="mode" value={f.mode} onChange={set("mode")}>
                <option value="DISPATCH">Dispatch (1 talent attribué)</option>
                <option value="COLLABORATIF">Collaboratif (équipe / crew)</option>
              </Select>
            </Field>
          </div>
          <Field>
            <Label htmlFor="summary" required>
              Accroche / objectif
            </Label>
            <Textarea id="summary" required minLength={20} maxLength={400} value={f.summary} onChange={set("summary")} rows={2} placeholder="En une ou deux phrases, l'objectif de la mission." />
            <FieldHelper>20 à 400 caractères. Visible sur le mur.</FieldHelper>
          </Field>
          <Field>
            <Label htmlFor="context" required>
              Contexte & enjeu
            </Label>
            <Textarea id="context" required minLength={20} maxLength={5000} value={f.context} onChange={set("context")} rows={5} placeholder="Présentez la marque, le contexte, ce que vous cherchez à accomplir." />
          </Field>
          <Field>
            <Label htmlFor="audience" required>
              Cible / client final
            </Label>
            <Textarea id="audience" required maxLength={2000} value={f.targetAudience} onChange={set("targetAudience")} rows={2} placeholder="À qui s'adresse la marque ?" />
          </Field>
        </CardBody>
      </Card>

      {/* Le brief */}
      <Card surface="raised">
        <CardHeader>
          <SectionTitle>Le brief</SectionTitle>
        </CardHeader>
        <CardBody className="flex flex-col gap-5">
          {/* Livrables */}
          <div className="flex flex-col gap-2">
            <Label>Livrables attendus</Label>
            {deliverables.map((d, i) => (
              <div key={i} className="flex flex-col gap-2 rounded-[var(--card-radius)] border border-border-subtle p-3 md:flex-row">
                <Input
                  value={d.title}
                  onChange={(e) =>
                    setDeliverables((prev) => prev.map((x, j) => (j === i ? { ...x, title: e.target.value } : x)))
                  }
                  placeholder="Intitulé (ex. 12 posts Instagram)"
                  className="md:w-1/3"
                />
                <Input
                  value={d.description}
                  onChange={(e) =>
                    setDeliverables((prev) => prev.map((x, j) => (j === i ? { ...x, description: e.target.value } : x)))
                  }
                  placeholder="Détail (optionnel)"
                  className="flex-1"
                />
                {deliverables.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label="Retirer ce livrable"
                    onClick={() => setDeliverables((prev) => prev.filter((_, j) => j !== i))}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
            <div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="gap-1"
                onClick={() => setDeliverables((prev) => [...prev, { title: "", description: "" }])}
              >
                <Plus className="h-4 w-4" /> Ajouter un livrable
              </Button>
            </div>
          </div>

          {/* Canaux */}
          <Field>
            <Label>Canaux concernés</Label>
            <div className="flex flex-wrap gap-2">
              {GUILD_MISSION_CHANNELS.map((c) => {
                const active = channels.includes(c);
                return (
                  <button
                    key={c}
                    type="button"
                    aria-pressed={active}
                    onClick={() =>
                      setChannels((prev) => (active ? prev.filter((x) => x !== c) : [...prev, c]))
                    }
                    className={cn(
                      "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                      active
                        ? "border-transparent bg-accent text-accent-foreground"
                        : "border-border text-foreground-secondary hover:text-foreground",
                    )}
                  >
                    {c}
                  </button>
                );
              })}
            </div>
          </Field>

          <Field>
            <Label htmlFor="skills">Compétences recherchées</Label>
            <Input id="skills" value={f.skillsRaw} onChange={set("skillsRaw")} placeholder="Community management, Motion design, Copywriting…" />
            <FieldHelper>Séparez par des virgules.</FieldHelper>
          </Field>

          <Field>
            <Label htmlFor="quality" optional>
              Critères de qualité / QC
            </Label>
            <Input id="quality" value={f.qualityRaw} onChange={set("qualityRaw")} placeholder="Respect charte, 2 allers-retours max…" />
            <FieldHelper>Séparez par des virgules.</FieldHelper>
          </Field>

          <Field>
            <Label htmlFor="constraints" optional>
              Contraintes
            </Label>
            <Textarea id="constraints" maxLength={3000} value={f.constraints} onChange={set("constraints")} rows={3} placeholder="Délais durs, contraintes légales, ton à éviter…" />
          </Field>
        </CardBody>
      </Card>

      {/* Cadre & budget */}
      <Card surface="raised">
        <CardHeader>
          <SectionTitle>Cadre & budget</SectionTitle>
        </CardHeader>
        <CardBody className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Field>
            <Label htmlFor="budget" optional>
              Budget
            </Label>
            <Input id="budget" type="number" min={0} value={f.budgetAmount} onChange={set("budgetAmount")} placeholder="Ex. 500000" />
          </Field>
          <Field>
            <Label htmlFor="currency">Devise</Label>
            <Select id="currency" value={f.budgetCurrency} onChange={set("budgetCurrency")}>
              <option value="XAF">FCFA (XAF)</option>
              <option value="XOF">FCFA (XOF)</option>
              <option value="EUR">EUR</option>
              <option value="USD">USD</option>
            </Select>
          </Field>
          <Field>
            <Label htmlFor="deadline" optional>
              Échéance souhaitée
            </Label>
            <Input id="deadline" type="date" value={f.deadline} onChange={set("deadline")} />
          </Field>
          <div className="flex items-end">
            <button
              type="button"
              onClick={() => setF((prev) => ({ ...prev, remoteOk: !prev.remoteOk }))}
              aria-pressed={f.remoteOk}
              className={cn(
                "rounded-[var(--button-radius)] border px-4 py-2 text-sm font-medium transition-colors",
                f.remoteOk
                  ? "border-transparent bg-accent text-accent-foreground"
                  : "border-border text-foreground-secondary hover:text-foreground",
              )}
            >
              {f.remoteOk ? "✓ Remote accepté" : "Remote accepté ?"}
            </button>
          </div>
          <Field>
            <Label htmlFor="contactName" optional>
              Contact (interne, non public)
            </Label>
            <Input id="contactName" value={f.contactName} onChange={set("contactName")} placeholder="Votre nom" />
          </Field>
          <Field>
            <Label htmlFor="contactEmail" optional>
              Email de contact (interne)
            </Label>
            <Input id="contactEmail" type="email" value={f.contactEmail} onChange={set("contactEmail")} placeholder="vous@marque.com" />
          </Field>
        </CardBody>
      </Card>

      {post.isError && (
        <FieldError>{post.error.message}</FieldError>
      )}

      <div className="flex items-center gap-3">
        <Button type="submit" size="lg" loading={post.isPending}>
          Déposer la mission
        </Button>
        <p className="text-xs text-muted-foreground">
          Soumise à validation opérateur avant publication sur le mur.
        </p>
      </div>
    </form>
  );
}
