"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";
import { ADVE_PILLARS, type AdvePillarKey } from "@/domain/pillars";
import { PILLAR_FIELDS, PILLAR_LABELS, type FieldDef } from "@/domain/pillar-fields";
import { INTAKE_COUNTRIES, type RawIntakeAnswers } from "@/server/funnel-mapping";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { submitIntakeAction } from "./actions";

/**
 * Wizard /intake — UN SEUL composant client (état local, zéro DB).
 * 5 étapes : contact (0) puis les 4 piliers du socle ADVE, construites
 * DYNAMIQUEMENT depuis la bible (`PILLAR_FIELDS`) — labels, descriptions et
 * hints viennent d'elle, jamais du composant. Tous les champs piliers sont
 * optionnels : le diagnostic mesure ce qui est rempli, rien d'autre.
 */

/** Champs du pilier A déjà collectés à l'étape contact — jamais re-demandés. */
const CONTACT_OWNED_A_FIELDS = new Set(["nomMarque", "secteur"]);

/** Une ligne d'intro FR par pilier (contexte avant les champs). */
const PILLAR_INTROS: Record<AdvePillarKey, string> = {
  A: "L'identité et la raison d'être — qui est la marque, vraiment.",
  D: "Le positionnement — ce qui vous rend radicalement unique sur votre marché.",
  V: "L'offre et le pricing — la promesse économique faite au client.",
  E: "L'expérience et la communauté — les mécaniques qui fidélisent.",
};

type Step = { kind: "contact" } | { kind: "pillar"; pillar: AdvePillarKey };

const STEPS: Step[] = [
  { kind: "contact" },
  ...ADVE_PILLARS.map((pillar) => ({ kind: "pillar" as const, pillar })),
];

function stepTitle(step: Step): string {
  return step.kind === "contact"
    ? "Votre marque"
    : `Pilier ${step.pillar} — ${PILLAR_LABELS[step.pillar]}`;
}

/** Champs affichés pour un pilier (bible moins les champs de l'étape contact). */
function fieldsForPillar(pillar: AdvePillarKey): FieldDef[] {
  const fields = PILLAR_FIELDS[pillar];
  if (pillar !== "A") return fields;
  return fields.filter((f) => !CONTACT_OWNED_A_FIELDS.has(f.id));
}

function FieldBlock({
  pillar,
  field,
  value,
  onChange,
}: {
  pillar: AdvePillarKey;
  field: FieldDef;
  value: string;
  onChange: (value: string) => void;
}) {
  const id = `${pillar}-${field.id}`;
  const isListe = field.type === "liste";
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <Label htmlFor={id}>{field.label}</Label>
        {field.needsHuman ? (
          <Badge variant="gold">Décision fondateur</Badge>
        ) : null}
      </div>
      <p className="text-sm leading-relaxed text-smoke">{field.description}</p>
      <Textarea
        id={id}
        name={id}
        rows={isListe ? 4 : 3}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={isListe ? "Un élément par ligne" : "Votre réponse — ou passez."}
      />
      {isListe ? (
        <p className="text-xs text-smoke-2">
          Un élément par ligne
          {(field.minItems ?? 1) > 1 ? ` — visez au moins ${field.minItems}.` : "."}
        </p>
      ) : null}
    </div>
  );
}

export function IntakeWizard() {
  const [stepIndex, setStepIndex] = useState(0);
  const [contact, setContact] = useState({
    email: "",
    brandName: "",
    secteur: "",
    countryCode: "",
  });
  const [contactErrors, setContactErrors] = useState<{
    email?: string;
    brandName?: string;
  }>({});
  const [answers, setAnswers] = useState<RawIntakeAnswers>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const topRef = useRef<HTMLDivElement>(null);

  const step = STEPS[stepIndex] ?? STEPS[0]!;
  const isLast = stepIndex === STEPS.length - 1;

  // Retour en haut du wizard à chaque changement d'étape.
  useEffect(() => {
    if (stepIndex > 0) topRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [stepIndex]);

  function setAnswer(pillar: AdvePillarKey, fieldId: string, value: string) {
    setAnswers((prev) => ({
      ...prev,
      [pillar]: { ...(prev[pillar] ?? {}), [fieldId]: value },
    }));
  }

  function filledCount(pillar: AdvePillarKey): number {
    const raw = answers[pillar] ?? {};
    return fieldsForPillar(pillar).filter((f) => (raw[f.id] ?? "").trim().length > 0)
      .length;
  }

  /** Validation client de l'étape contact (le serveur re-valide via Zod). */
  function validateContact(): boolean {
    const errors: { email?: string; brandName?: string } = {};
    if (!/^\S+@\S+\.\S+$/.test(contact.email.trim())) {
      errors.email = "Adresse email invalide.";
    }
    if (contact.brandName.trim().length === 0) {
      errors.brandName = "Le nom de votre marque est requis.";
    }
    setContactErrors(errors);
    return Object.keys(errors).length === 0;
  }

  /** Payload final : réponses non vides uniquement (le mapping serveur re-filtre). */
  function buildPayload() {
    const pruned: RawIntakeAnswers = {};
    for (const pillar of ADVE_PILLARS) {
      const raw = answers[pillar];
      if (!raw) continue;
      const kept: Record<string, string> = {};
      for (const [fieldId, value] of Object.entries(raw)) {
        if (value.trim().length > 0) kept[fieldId] = value;
      }
      if (Object.keys(kept).length > 0) pruned[pillar] = kept;
    }
    return {
      email: contact.email.trim(),
      brandName: contact.brandName.trim(),
      ...(contact.secteur.trim() ? { secteur: contact.secteur.trim() } : {}),
      ...(contact.countryCode ? { countryCode: contact.countryCode } : {}),
      answers: pruned,
    };
  }

  function handleSubmitStep(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFormError(null);

    if (step.kind === "contact" && !validateContact()) return;

    if (!isLast) {
      setStepIndex((i) => Math.min(i + 1, STEPS.length - 1));
      return;
    }

    startTransition(async () => {
      const result = await submitIntakeAction(buildPayload());
      if (result?.formError) setFormError(result.formError);
    });
  }

  const progressPct = Math.round(((stepIndex + 1) / STEPS.length) * 100);

  return (
    <div ref={topRef} className="mx-auto max-w-2xl scroll-mt-24">
      {/* ── Progression ─────────────────────────────────────────────── */}
      <div className="mb-8 space-y-3">
        <div className="flex items-baseline justify-between gap-4">
          <p className="text-sm font-semibold text-graphite">
            Étape {stepIndex + 1}/{STEPS.length} — {stepTitle(step)}
          </p>
          <p className="text-sm tabular-nums text-smoke">{progressPct}%</p>
        </div>
        <div
          className="h-1.5 overflow-hidden rounded-full bg-ink/10"
          role="progressbar"
          aria-valuenow={progressPct}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Progression du diagnostic"
        >
          <div
            className="h-full rounded-full bg-coral transition-all duration-300"
            style={{ width: `${progressPct}%` }}
          />
        </div>
        <ol className="flex flex-wrap gap-2" aria-label="Étapes">
          {STEPS.map((s, i) => {
            const done = i < stepIndex;
            const current = i === stepIndex;
            const label = s.kind === "contact" ? "Marque" : s.pillar;
            return (
              <li
                key={label}
                aria-current={current ? "step" : undefined}
                className={[
                  "inline-flex h-7 min-w-7 items-center justify-center gap-1 rounded-xs px-2 text-xs font-bold uppercase tracking-wider",
                  current
                    ? "bg-coral text-white"
                    : done
                      ? "bg-coral/12 text-coral"
                      : "bg-ink/6 text-smoke",
                ].join(" ")}
              >
                {done ? <Check className="size-3" aria-hidden="true" /> : null}
                {label}
              </li>
            );
          })}
        </ol>
      </div>

      <form onSubmit={handleSubmitStep} noValidate>
        <Card padding="lg" className="space-y-6">
          {step.kind === "contact" ? (
            <>
              <p className="text-sm leading-relaxed text-smoke">
                L&apos;essentiel d&apos;abord : où envoyer le diagnostic, et de
                quelle marque on parle. Seuls l&apos;email et le nom sont requis.
              </p>
              <div className="space-y-2">
                <Label htmlFor="intake-email">Votre email *</Label>
                <Input
                  id="intake-email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  placeholder="vous@exemple.com"
                  required
                  value={contact.email}
                  onChange={(e) => setContact((c) => ({ ...c, email: e.target.value }))}
                  aria-invalid={contactErrors.email ? true : undefined}
                />
                {contactErrors.email ? (
                  <p className="text-sm font-medium text-coral-deep">
                    {contactErrors.email}
                  </p>
                ) : null}
              </div>
              <div className="space-y-2">
                <Label htmlFor="intake-brand">Nom de votre marque *</Label>
                <Input
                  id="intake-brand"
                  name="brandName"
                  placeholder="Ma Marque"
                  required
                  value={contact.brandName}
                  onChange={(e) =>
                    setContact((c) => ({ ...c, brandName: e.target.value }))
                  }
                  aria-invalid={contactErrors.brandName ? true : undefined}
                />
                {contactErrors.brandName ? (
                  <p className="text-sm font-medium text-coral-deep">
                    {contactErrors.brandName}
                  </p>
                ) : null}
              </div>
              <div className="space-y-2">
                <Label htmlFor="intake-secteur">Secteur d&apos;activité</Label>
                <p className="text-sm text-smoke">
                  En 1-3 mots : FMCG, fintech, matériaux de construction…
                </p>
                <Input
                  id="intake-secteur"
                  name="secteur"
                  placeholder="Ex. agroalimentaire"
                  value={contact.secteur}
                  onChange={(e) =>
                    setContact((c) => ({ ...c, secteur: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="intake-pays">Pays principal</Label>
                <Select
                  id="intake-pays"
                  name="countryCode"
                  value={contact.countryCode}
                  onChange={(e) =>
                    setContact((c) => ({ ...c, countryCode: e.target.value }))
                  }
                >
                  <option value="">— Choisir un pays —</option>
                  {INTAKE_COUNTRIES.map((country) => (
                    <option key={country.code} value={country.code}>
                      {country.name}
                    </option>
                  ))}
                </Select>
              </div>
            </>
          ) : (
            <>
              <div className="space-y-1.5">
                <p className="text-sm leading-relaxed text-smoke">
                  {PILLAR_INTROS[step.pillar]}
                </p>
                <p className="text-xs text-smoke-2">
                  Tous les champs sont optionnels — {filledCount(step.pillar)}/
                  {fieldsForPillar(step.pillar).length} renseigné(s).
                </p>
              </div>
              <div className="space-y-7">
                {fieldsForPillar(step.pillar).map((field) => (
                  <FieldBlock
                    key={field.id}
                    pillar={step.pillar}
                    field={field}
                    value={answers[step.pillar]?.[field.id] ?? ""}
                    onChange={(value) => setAnswer(step.pillar, field.id, value)}
                  />
                ))}
              </div>
            </>
          )}

          {formError ? (
            <p
              role="alert"
              className="rounded-sm border border-coral/30 bg-coral/8 px-4 py-3 text-sm font-medium text-coral-deep"
            >
              {formError}
            </p>
          ) : null}

          <div className="flex items-center justify-between gap-3 border-t border-ink/8 pt-6">
            {stepIndex > 0 ? (
              <Button
                type="button"
                variant="ghost"
                onClick={() => setStepIndex((i) => Math.max(i - 1, 0))}
                disabled={isPending}
              >
                <ArrowLeft aria-hidden="true" /> Précédent
              </Button>
            ) : (
              <span />
            )}
            <Button type="submit" disabled={isPending}>
              {isLast
                ? isPending
                  ? "Calcul du diagnostic…"
                  : "Obtenir mon diagnostic"
                : "Continuer"}
              {!isLast ? <ArrowRight aria-hidden="true" /> : null}
            </Button>
          </div>
        </Card>
      </form>

      <p className="mt-6 text-center text-xs text-smoke">
        Vos réponses restent confidentielles. Elles servent uniquement à
        calculer votre diagnostic — et, si vous créez votre Cockpit, à poser le
        socle ADVE de votre marque sans re-saisie.
      </p>
    </div>
  );
}
