"use client";

import { useActionState, useState } from "react";
import { Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { FormState } from "@/lib/forms";
import {
  AVAILABILITY_LABELS,
  MAX_SKILLS,
  TALENT_AVAILABILITIES,
  TALENT_VISIBILITIES,
  VISIBILITY_LABELS,
  type TalentAvailability,
  type TalentVisibility,
} from "@/domain/guild";
import { saveTalentProfileAction } from "./actions";

/**
 * Onboarding / édition du profil talent (WP-011). Un seul formulaire pour
 * les deux cas — prérempli quand le profil existe. Le pays vient du
 * référentiel seedé (aucun pays inventé) ; le tarif indicatif s'exprime dans
 * la devise du pays sélectionné (jamais de devise en dur).
 */

export type CountryOption = { code: string; name: string; currency: string };

export type ProfileFormValues = {
  headline: string;
  skills: string[];
  city: string;
  countryCode: string;
  whatsapp: string | null;
  portfolioUrl: string | null;
  dailyRate: number | null;
  availability: TalentAvailability;
  visibility: TalentVisibility;
};

function FieldError({ messages }: { messages: string[] | undefined }) {
  if (!messages?.[0]) return null;
  return (
    <p className="text-sm text-coral" role="alert">
      {messages[0]}
    </p>
  );
}

export function TalentProfileForm({
  profile,
  countries,
}: {
  profile: ProfileFormValues | null;
  countries: CountryOption[];
}) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(
    saveTalentProfileAction,
    null,
  );
  const [countryCode, setCountryCode] = useState(profile?.countryCode ?? "");
  const currency = countries.find((c) => c.code === countryCode)?.currency;

  return (
    <form
      action={formAction}
      className="rounded-lg border border-line bg-ink-2 p-6"
      aria-label={profile ? "Modifier votre profil talent" : "Créer votre profil talent"}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5 sm:col-span-2">
          <label htmlFor="talent-headline" className="block text-sm font-semibold text-sand">
            Votre accroche
          </label>
          <Input
            id="talent-headline"
            name="headline"
            placeholder="Photographe produit — Douala"
            defaultValue={profile?.headline ?? ""}
            required
            minLength={4}
            maxLength={120}
            aria-invalid={Boolean(state?.fieldErrors?.headline?.length) || undefined}
          />
          <p className="text-xs text-smoke-2">
            La ligne que la marque lit en premier avec chaque candidature.
          </p>
          <FieldError messages={state?.fieldErrors?.headline} />
        </div>

        <div className="space-y-1.5 sm:col-span-2">
          <label htmlFor="talent-skills" className="block text-sm font-semibold text-sand">
            Compétences
          </label>
          <Textarea
            id="talent-skills"
            name="skills"
            rows={3}
            placeholder={"Photographie produit\nRetouche Lightroom\nDirection artistique"}
            defaultValue={profile?.skills.join("\n") ?? ""}
            required
            maxLength={600}
            aria-invalid={Boolean(state?.fieldErrors?.skills?.length) || undefined}
          />
          <p className="text-xs text-smoke-2">
            Une par ligne (ou séparées par des virgules), {MAX_SKILLS} maximum.
          </p>
          <FieldError messages={state?.fieldErrors?.skills} />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="talent-city" className="block text-sm font-semibold text-sand">
            Ville
          </label>
          <Input
            id="talent-city"
            name="city"
            placeholder="Douala"
            defaultValue={profile?.city ?? ""}
            required
            minLength={2}
            maxLength={80}
            aria-invalid={Boolean(state?.fieldErrors?.city?.length) || undefined}
          />
          <FieldError messages={state?.fieldErrors?.city} />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="talent-country" className="block text-sm font-semibold text-sand">
            Pays
          </label>
          <Select
            id="talent-country"
            name="countryCode"
            required
            value={countryCode}
            onChange={(event) => setCountryCode(event.target.value)}
            aria-invalid={Boolean(state?.fieldErrors?.countryCode?.length) || undefined}
          >
            <option value="" disabled>
              Choisir votre pays…
            </option>
            {countries.map((country) => (
              <option key={country.code} value={country.code}>
                {country.name} ({country.currency})
              </option>
            ))}
          </Select>
          <FieldError messages={state?.fieldErrors?.countryCode} />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="talent-daily-rate" className="block text-sm font-semibold text-sand">
            Tarif journalier indicatif <span className="font-normal text-smoke-2">(optionnel)</span>
          </label>
          <Input
            id="talent-daily-rate"
            name="dailyRate"
            inputMode="numeric"
            placeholder="75000"
            defaultValue={profile?.dailyRate ?? ""}
            maxLength={11}
            aria-invalid={Boolean(state?.fieldErrors?.dailyRate?.length) || undefined}
          />
          <p className="text-xs text-smoke-2">
            {currency
              ? `En ${currency} (devise de votre pays), sans espaces ni devise.`
              : "Dans la devise de votre pays — choisissez d'abord le pays."}
          </p>
          <FieldError messages={state?.fieldErrors?.dailyRate} />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="talent-whatsapp" className="block text-sm font-semibold text-sand">
            WhatsApp <span className="font-normal text-smoke-2">(optionnel)</span>
          </label>
          <Input
            id="talent-whatsapp"
            name="whatsapp"
            inputMode="tel"
            placeholder="+237690000000"
            defaultValue={profile?.whatsapp ?? ""}
            maxLength={24}
            aria-invalid={Boolean(state?.fieldErrors?.whatsapp?.length) || undefined}
          />
          <p className="text-xs text-smoke-2">
            Montré à la marque uniquement quand elle accepte votre candidature.
          </p>
          <FieldError messages={state?.fieldErrors?.whatsapp} />
        </div>

        <div className="space-y-1.5 sm:col-span-2">
          <label htmlFor="talent-portfolio" className="block text-sm font-semibold text-sand">
            Portfolio <span className="font-normal text-smoke-2">(optionnel)</span>
          </label>
          <Input
            id="talent-portfolio"
            name="portfolioUrl"
            type="url"
            placeholder="https://behance.net/votre-travail"
            defaultValue={profile?.portfolioUrl ?? ""}
            maxLength={300}
            aria-invalid={Boolean(state?.fieldErrors?.portfolioUrl?.length) || undefined}
          />
          <FieldError messages={state?.fieldErrors?.portfolioUrl} />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="talent-availability" className="block text-sm font-semibold text-sand">
            Disponibilité
          </label>
          <Select
            id="talent-availability"
            name="availability"
            required
            defaultValue={profile?.availability ?? "AVAILABLE"}
          >
            {TALENT_AVAILABILITIES.map((value) => (
              <option key={value} value={value}>
                {AVAILABILITY_LABELS[value]}
              </option>
            ))}
          </Select>
          <FieldError messages={state?.fieldErrors?.availability} />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="talent-visibility" className="block text-sm font-semibold text-sand">
            Visibilité du profil
          </label>
          <Select
            id="talent-visibility"
            name="visibility"
            required
            defaultValue={profile?.visibility ?? "VISIBLE"}
          >
            {TALENT_VISIBILITIES.map((value) => (
              <option key={value} value={value}>
                {VISIBILITY_LABELS[value]}
              </option>
            ))}
          </Select>
          <p className="text-xs text-smoke-2">
            Masqué : le profil sort de la circulation, vos candidatures passées restent.
          </p>
          <FieldError messages={state?.fieldErrors?.visibility} />
        </div>
      </div>

      {state?.formError ? (
        <p className="mt-4 text-sm text-coral" role="alert">
          {state.formError}
        </p>
      ) : null}

      <div className="mt-5">
        <Button type="submit" disabled={pending}>
          <Save aria-hidden />
          {pending
            ? "Enregistrement…"
            : profile
              ? "Enregistrer le profil"
              : "Créer mon profil talent"}
        </Button>
      </div>
    </form>
  );
}
