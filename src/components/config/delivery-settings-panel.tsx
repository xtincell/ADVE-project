"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import { useSession } from "next-auth/react";
import { trpc } from "@/lib/trpc/client";
import { Badge } from "@/components/primitives/badge";
import { Button } from "@/components/primitives/button";
import { Card } from "@/components/primitives/card";
import { Input } from "@/components/primitives/input";
import { Select } from "@/components/primitives/select";
import {
  deliverySettingsInputSchema,
  type DeliverySettingsInput,
  type DeliverySettingsView,
  type SecretStatus,
  type ConfigurationStatus,
} from "@/domain/delivery-settings";

type SecretDraft = { action: "KEEP" | "REPLACE" | "CLEAR" | "USE_ENV"; value: string };
const emptySecret = (): SecretDraft => ({ action: "KEEP", value: "" });
function secretInput(draft: SecretDraft) {
  if (draft.action === "REPLACE" && draft.value.trim()) return { action: "REPLACE" as const, value: draft.value.trim() };
  return { action: draft.action === "REPLACE" ? "KEEP" as const : draft.action };
}
const STATUS_LABELS: Record<ConfigurationStatus, string> = {
  MISSING: "À renseigner", INCOMPLETE: "Brouillon incomplet", CONFIGURED: "Renseigné · non vérifié",
};

function ConfigurationState({ status }: { status: ConfigurationStatus }) {
  return <div className="flex flex-wrap items-center gap-2"><span className="text-sm text-foreground-secondary">État enregistré</span>
    <Badge tone={status === "CONFIGURED" ? "info" : "neutral"}>{STATUS_LABELS[status]}</Badge></div>;
}

function Field({ id, label, help, error, children }: { id: string; label: string; help?: string; error?: string; children: ReactNode }) {
  return <div className="space-y-2">
    <label htmlFor={id} className="block text-sm font-medium text-foreground">{label}</label>
    {children}
    {help && <p id={`${id}-help`} className="text-sm text-foreground-secondary">{help}</p>}
    {error && <p id={`${id}-error`} role="alert" className="text-sm text-error">{error}</p>}
  </div>;
}

function SecretEditor({ id, label, status, draft, onChange, disabled, storageAvailable }: {
  id: string; label: string; status: SecretStatus | null; draft: SecretDraft;
  onChange: (value: SecretDraft) => void; disabled: boolean; storageAvailable: boolean;
}) {
  const source = status?.source === "ENV" ? "dans la configuration du serveur" : "dans la console";
  const pendingRemoval = draft.action === "CLEAR" || draft.action === "USE_ENV";
  return <div className="space-y-2">
    <Field id={id} label={label} help="Laissez ce champ vide pour conserver la valeur actuelle. Le secret enregistré n’est jamais affiché.">
      <Input id={id} type="password" name={id} autoComplete="new-password" spellCheck={false}
        value={draft.value} disabled={disabled || !storageAvailable || pendingRemoval}
        aria-describedby={`${id}-help ${id}-status`} placeholder="Saisir une nouvelle valeur"
        onChange={event => onChange({ action: event.target.value.trim() ? "REPLACE" : "KEEP", value: event.target.value })} />
    </Field>
    <p id={`${id}-status`} className="text-sm text-foreground-secondary">
      {!status ? "Le statut de cette clé sera actualisé après l’enregistrement du fournisseur."
        : !status.readable ? "Secret enregistré, mais sa lecture est indisponible."
        : status.configured ? `Secret présent ${source}.`
        : status.overridden ? "Secret désactivé dans la console." : "Aucun secret renseigné."}
    </p>
    {pendingRemoval ? <div className="space-y-2 rounded-lg border border-warning/30 bg-warning/10 p-3 text-sm text-warning">
      <p>{draft.action === "CLEAR" ? "Ce secret sera effacé à l’enregistrement. La valeur du serveur sera également désactivée."
        : "À l’enregistrement, la valeur de la console sera retirée et la configuration du serveur sera utilisée."}</p>
      <Button type="button" variant="outline" size="sm" disabled={disabled} onClick={() => onChange(emptySecret())}>Annuler ce changement</Button>
    </div> : <div className="flex flex-wrap gap-2">
      {(status?.configured || status?.overridden) && <Button type="button" variant="outline" size="sm" disabled={disabled}
        onClick={() => onChange({ action: "CLEAR", value: "" })}>Effacer ce secret</Button>}
      {status?.overridden && <Button type="button" variant="subtle" size="sm" disabled={disabled}
        onClick={() => onChange({ action: "USE_ENV", value: "" })}>Utiliser la configuration du serveur</Button>}
    </div>}
  </div>;
}

type Feedback = { error?: string; success?: string };
function SaveFeedback({ value }: { value: Feedback }) {
  return <div aria-live="polite" className="text-sm">
    {value.error && <p role="alert" className="text-error">{value.error}</p>}
    {value.success && <p role="status" className="text-foreground-secondary">{value.success}</p>}
  </div>;
}

function EmailSettings({ initial, vaultAvailable, onSaved }: {
  initial: DeliverySettingsView["email"]; vaultAvailable: boolean; onSaved: (view: DeliverySettingsView) => void;
}) {
  const [provider, setProvider] = useState(initial.provider);
  const [from, setFrom] = useState(initial.from ?? "");
  const [domain, setDomain] = useState(initial.mailgunDomain ?? "");
  const [region, setRegion] = useState(initial.mailgunRegion);
  const [key, setKey] = useState(emptySecret);
  const [feedback, setFeedback] = useState<Feedback>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const save = trpc.systemConfig.saveDeliverySettings.useMutation();
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setFeedback({}); setErrors({});
    const input: DeliverySettingsInput = { email: { provider, from: from.trim() || null,
      mailgunDomain: domain.trim() || null, mailgunRegion: region, apiKey: provider === "ENV" ? { action: "KEEP" } : secretInput(key) } };
    const parsed = deliverySettingsInputSchema.safeParse(input);
    if (!parsed.success) {
      setErrors(Object.fromEntries(parsed.error.issues.map(issue => [String(issue.path.at(-1)), issue.message])));
      setFeedback({ error: "Vérifiez les champs indiqués avant d’enregistrer." }); return;
    }
    try {
      const view = await save.mutateAsync(parsed.data);
      onSaved(view); setProvider(view.email.provider); setFrom(view.email.from ?? "");
      setDomain(view.email.mailgunDomain ?? ""); setRegion(view.email.mailgunRegion); setKey(emptySecret());
      setFeedback({ success: view.email.status === "CONFIGURED" ? "Paramètres email enregistrés. L’envoi reste à vérifier."
        : "Brouillon email enregistré. Vous pourrez le compléter plus tard." });
    } catch (error) {
      setFeedback({ error: error instanceof Error ? error.message : "Impossible d’enregistrer les paramètres email. Réessayez." });
    }
  }
  return <Card className="p-5 sm:p-6">
    <form noValidate onSubmit={submit} aria-labelledby="email-settings-title" className="space-y-5">
      <div className="space-y-2">
        <h3 id="email-settings-title" className="text-lg font-semibold text-foreground">Emails transactionnels</h3>
        <ConfigurationState status={initial.status} />
        <p className="text-sm text-foreground-secondary">Choisissez le service qui enverra les emails de l’application.</p>
      </div>
      <fieldset disabled={save.isPending} className="space-y-5">
        <Field id="email-provider" label="Fournisseur email" help="La sélection automatique utilise le premier fournisseur disponible parmi ceux renseignés dans la console ou sur le serveur.">
          <Select id="email-provider" value={provider} aria-describedby="email-provider-help" onChange={event => { setProvider(event.target.value as typeof provider); setKey(emptySecret()); }}>
            <option value="ENV">Sélection automatique</option>
            <option value="RESEND">Resend</option><option value="MAILGUN">Mailgun</option>
            <option value="SENDGRID">SendGrid</option><option value="BREVO">Brevo</option>
          </Select>
        </Field>
        <Field id="email-from" label="Expéditeur" error={errors.from}
          help="Utilisez une adresse validée chez votre fournisseur. Cette validation n’est pas vérifiée depuis cette page.">
          <Input id="email-from" value={from} onChange={event => setFrom(event.target.value)} autoComplete="off"
            placeholder="La Fusée <contact@votre-domaine.fr>" inputMode="email"
            aria-invalid={Boolean(errors.from)} aria-describedby={`email-from-help${errors.from ? " email-from-error" : ""}`}
            state={errors.from ? "invalid" : "default"} />
        </Field>
        {provider === "MAILGUN" && <>
          <Field id="mailgun-domain" label="Domaine Mailgun" error={errors.mailgunDomain}>
            <Input id="mailgun-domain" value={domain} onChange={event => setDomain(event.target.value)} placeholder="mg.votre-domaine.fr"
              aria-invalid={Boolean(errors.mailgunDomain)} aria-describedby={errors.mailgunDomain ? "mailgun-domain-error" : undefined} />
          </Field>
          <Field id="mailgun-region" label="Région Mailgun">
            <Select id="mailgun-region" value={region} onChange={event => setRegion(event.target.value as "us" | "eu")}>
              <option value="eu">Europe</option><option value="us">États-Unis</option>
            </Select>
          </Field>
        </>}
        <SecretEditor id="email-api-key" label="Clé API email" status={provider === initial.provider ? initial.apiKey : null} draft={key} onChange={setKey}
          disabled={provider === "ENV" || save.isPending} storageAvailable={vaultAvailable} />
        {provider === "ENV" && <p className="text-sm text-foreground-secondary">Choisissez un fournisseur pour enregistrer une clé depuis la console.</p>}
      </fieldset>
      <SaveFeedback value={feedback} />
      <Button type="submit" disabled={save.isPending} aria-busy={save.isPending}>{save.isPending ? "Enregistrement…" : "Enregistrer l’email"}</Button>
    </form>
  </Card>;
}

function PaymentSettings({ initial, vaultAvailable, onSaved }: {
  initial: DeliverySettingsView["cinetpay"]; vaultAvailable: boolean; onSaved: (view: DeliverySettingsView) => void;
}) {
  const [mode, setMode] = useState(initial.mode);
  const [key, setKey] = useState(emptySecret);
  const [password, setPassword] = useState(emptySecret);
  const [feedback, setFeedback] = useState<Feedback>({});
  const save = trpc.systemConfig.saveDeliverySettings.useMutation();
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setFeedback({});
    try {
      const view = await save.mutateAsync({ cinetpay: { mode, apiKey: secretInput(key), apiPassword: secretInput(password) } });
      onSaved(view); setMode(view.cinetpay.mode); setKey(emptySecret()); setPassword(emptySecret());
      setFeedback({ success: view.cinetpay.status === "CONFIGURED" ? "Paramètres CinetPay enregistrés. Le paiement reste à vérifier."
        : "Brouillon CinetPay enregistré. Vous pourrez le compléter plus tard." });
    } catch (error) {
      setFeedback({ error: error instanceof Error ? error.message : "Impossible d’enregistrer CinetPay. Réessayez." });
    }
  }
  return <Card className="p-5 sm:p-6">
    <form noValidate onSubmit={submit} aria-labelledby="cinetpay-settings-title" className="space-y-5">
      <div className="space-y-2">
        <h3 id="cinetpay-settings-title" className="text-lg font-semibold text-foreground">Paiements CinetPay</h3>
        <ConfigurationState status={initial.status} />
        <p className="text-sm text-foreground-secondary">Renseignez les accès API CinetPay Aurore de votre compte.</p>
      </div>
      <fieldset disabled={save.isPending} className="space-y-5">
        <Field id="cinetpay-mode" label="Mode de paiement" help="Le mode choisi s’appliquera aux prochaines demandes de paiement.">
          <Select id="cinetpay-mode" value={mode} aria-describedby="cinetpay-mode-help" onChange={event => setMode(event.target.value as typeof mode)}>
            <option value="SANDBOX">Test (sandbox)</option><option value="LIVE">Production</option>
          </Select>
        </Field>
        {!initial.environmentValid && <p role="alert" className="rounded-lg border border-warning/30 bg-warning/10 p-3 text-sm text-warning">
          Le mode et les identifiants ne permettent pas encore de préparer un paiement. Vérifiez leur correspondance puis enregistrez.
        </p>}
        <SecretEditor id="cinetpay-api-key" label="Clé API CinetPay" status={initial.apiKey} draft={key} onChange={setKey}
          disabled={save.isPending} storageAvailable={vaultAvailable} />
        <SecretEditor id="cinetpay-api-password" label="Mot de passe API CinetPay" status={initial.apiPassword} draft={password} onChange={setPassword}
          disabled={save.isPending} storageAvailable={vaultAvailable} />
      </fieldset>
      <SaveFeedback value={feedback} />
      <Button type="submit" disabled={save.isPending} aria-busy={save.isPending}>{save.isPending ? "Enregistrement…" : "Enregistrer CinetPay"}</Button>
    </form>
  </Card>;
}

export function DeliverySettingsPanel() {
  const { data: session, status: sessionStatus } = useSession();
  const isAdmin = sessionStatus === "authenticated" && session?.user?.role === "ADMIN";
  const utils = trpc.useUtils();
  const query = trpc.systemConfig.getDeliverySettings.useQuery(undefined, { enabled: isAdmin, refetchOnWindowFocus: false });
  if (sessionStatus === "loading") return <p role="status" className="text-sm text-foreground-secondary">Chargement des accès de configuration…</p>;
  if (!isAdmin) return <Card className="p-5"><h2 className="font-semibold text-foreground">Email et paiement</h2>
    <p className="mt-2 text-sm text-foreground-secondary">Ces paramètres sont réservés aux administrateurs.</p></Card>;
  return <section id="email-paiement" aria-labelledby="delivery-settings-title" className="space-y-4 scroll-mt-6">
    <div className="space-y-2">
      <h2 id="delivery-settings-title" className="text-xl font-semibold text-foreground">Email et paiement</h2>
      <p className="max-w-3xl text-sm text-foreground-secondary">Enregistrez vos paramètres, même incomplets, et revenez les compléter plus tard. Enregistrer ne déclenche aucun envoi ni paiement.</p>
    </div>
    {query.isLoading ? <p role="status" className="text-sm text-foreground-secondary">Chargement des paramètres enregistrés…</p>
      : query.error ? <Card className="space-y-3 p-5"><p role="alert" className="text-sm text-error">Impossible de charger les paramètres : {query.error.message}</p>
        <Button type="button" variant="outline" onClick={() => void query.refetch()}>Réessayer</Button></Card>
      : query.data ? <>
        {!query.data.vaultAvailable && <p role="status" className="rounded-lg border border-warning/30 bg-warning/10 p-3 text-sm text-warning">
          Le stockage sécurisé des secrets est indisponible. Vous pouvez enregistrer les autres paramètres et ajouter les clés plus tard.
        </p>}
        <div className="grid items-start gap-5 xl:grid-cols-2">
          <EmailSettings initial={query.data.email} vaultAvailable={query.data.vaultAvailable} onSaved={view => utils.systemConfig.getDeliverySettings.setData(undefined, view)} />
          <PaymentSettings initial={query.data.cinetpay} vaultAvailable={query.data.vaultAvailable} onSaved={view => utils.systemConfig.getDeliverySettings.setData(undefined, view)} />
        </div>
      </> : <p role="status" className="text-sm text-foreground-secondary">Les paramètres ne sont pas encore disponibles.</p>}
  </section>;
}
