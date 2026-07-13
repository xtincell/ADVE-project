"use client";

/**
 * Console Superviseur — gestion des comptes (Vague 7).
 * Promotion/rétrogradation des rôles (entrepreneur / créateur / agence /
 * partenaire / opérateur / admin), acte gouverné + motivé + audité.
 */

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { PageHeader } from "@/components/shared/page-header";
import { SkeletonPage } from "@/components/shared/loading-skeleton";
import { Shield, Search } from "lucide-react";

const ROLE_OPTIONS = [
  { value: "USER", label: "Utilisateur" },
  { value: "FOUNDER", label: "Entrepreneur (founder)" },
  { value: "BRAND", label: "Marque" },
  { value: "CREATOR", label: "Créateur" },
  { value: "FREELANCE", label: "Freelance" },
  { value: "AGENCY", label: "Agence" },
  { value: "PARTNER", label: "Partenaire" },
  { value: "CLIENT_RETAINER", label: "Client retainer" },
  { value: "CLIENT_STATIC", label: "Client one-shot" },
  { value: "OPERATOR", label: "Opérateur UPgraders" },
  { value: "ADMIN", label: "Administrateur" },
] as const;

const ROLE_TONE: Record<string, string> = {
  ADMIN: "bg-error/15 text-error",
  OPERATOR: "bg-accent/15 text-accent",
  AGENCY: "bg-warning/15 text-warning",
  PARTNER: "bg-warning/15 text-warning",
  CREATOR: "bg-success/15 text-success",
  FREELANCE: "bg-success/15 text-success",
  FOUNDER: "bg-bg-subtle text-foreground",
};

export default function AccountsSupervisorPage() {
  const utils = trpc.useUtils();
  const [search, setSearch] = useState("");
  const [pendingRole, setPendingRole] = useState<Record<string, string>>({});
  const [reason, setReason] = useState<Record<string, string>>({});

  const { data, isLoading } = trpc.accounts.list.useQuery({ search: search || undefined, limit: 100 });
  const { data: stats } = trpc.accounts.roleStats.useQuery();
  const setRole = trpc.accounts.setRole.useMutation({
    onSuccess: () => {
      utils.accounts.list.invalidate();
      utils.accounts.roleStats.invalidate();
    },
  });

  if (isLoading) return <SkeletonPage />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Comptes & rôles"
        description="Console superviseur : promotion / rétrogradation des comptes (entrepreneur, créateur, agence, partenaire…). Chaque changement est motivé, gouverné et audité."
        breadcrumbs={[
          { label: "Console", href: "/console" },
          { label: "Gouvernance", href: "/console/governance" },
          { label: "Comptes" },
        ]}
      />

      {/* Marques de démo — seed serveur en un clic (fin du SSH, 12/07). */}
      <SeedBrandsCard />

      {/* Login personnalisé par marque — feature opérateur réutilisable. */}
      <CreateBrandLoginCard />

      {/* Répartition par rôle */}
      <div className="flex flex-wrap gap-2">
        {Object.entries(stats ?? {}).map(([role, count]) => (
          <span key={role} className={`rounded-full px-2.5 py-1 font-mono text-[11px] ${ROLE_TONE[role] ?? "bg-bg-subtle text-foreground-muted"}`}>
            {role} · {count as number}
          </span>
        ))}
      </div>

      {/* Recherche */}
      <div className="flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2">
        <Search className="h-4 w-4 text-foreground-muted" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher par nom ou email…"
          className="w-full bg-transparent text-sm outline-none"
        />
      </div>

      {/* Liste */}
      <div className="divide-y divide-border rounded-xl border border-border bg-card">
        {(data?.items ?? []).map((u) => (
          <div key={u.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-foreground">{u.name ?? "—"}</span>
                <span className={`rounded-full px-2 py-0.5 font-mono text-[10px] ${ROLE_TONE[u.role] ?? "bg-bg-subtle text-foreground-muted"}`}>
                  {u.role}
                </span>
                {u.talentProfile && (
                  <span className="rounded-full bg-bg-subtle px-2 py-0.5 text-[10px] text-foreground-muted">
                    Guilde {u.talentProfile.tier} · {u.talentProfile.totalMissions} mission(s)
                  </span>
                )}
              </div>
              <p className="text-xs text-foreground-muted">
                {u.email} · {u._count.Strategy} stratégie(s) · {u._count.missionApplications} candidature(s) · créé {new Date(u.createdAt).toLocaleDateString("fr-FR")}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <select
                value={pendingRole[u.id] ?? u.role}
                onChange={(e) => setPendingRole({ ...pendingRole, [u.id]: e.target.value })}
                className="rounded-lg border border-border bg-bg px-2 py-1.5 text-xs"
              >
                {ROLE_OPTIONS.map((r) => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
              <input
                placeholder="Motif (obligatoire)"
                value={reason[u.id] ?? ""}
                onChange={(e) => setReason({ ...reason, [u.id]: e.target.value })}
                className="w-44 rounded-lg border border-border bg-bg px-2 py-1.5 text-xs"
              />
              <button
                onClick={() =>
                  setRole.mutate({
                    userId: u.id,
                    role: (pendingRole[u.id] ?? u.role) as (typeof ROLE_OPTIONS)[number]["value"],
                    reason: reason[u.id] ?? "",
                  })
                }
                disabled={
                  setRole.isPending ||
                  (pendingRole[u.id] ?? u.role) === u.role ||
                  (reason[u.id] ?? "").trim().length < 3
                }
                className="flex items-center gap-1 rounded-lg bg-accent px-3 py-1.5 text-xs font-medium text-accent-foreground hover:opacity-90 disabled:opacity-40"
              >
                <Shield className="h-3 w-3" /> Appliquer
              </button>
            </div>
          </div>
        ))}
        {(data?.items ?? []).length === 0 && (
          <div className="p-6 text-center text-sm text-foreground-muted">Aucun compte trouvé.</div>
        )}
      </div>
      {setRole.error && <p className="text-xs text-error">{setRole.error.message}</p>}
    </div>
  );
}


/** Installe/actualise les marques de démo (Motion19 + Xtincell) côté serveur.
 *  Idempotent — remplace l'étape SSH `npm run db:seed:motion19`. */
function SeedBrandsCard() {
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const run = async () => {
    setRunning(true);
    setResult(null);
    try {
      const res = await fetch("/api/admin/seed-brands", { method: "POST" });
      const json = (await res.json()) as { ok: boolean; log?: string[]; error?: string };
      setResult(json.ok
        ? `OK — ${(json.log ?? []).filter((l) => l.startsWith("[OK]")).length} étapes vertes. Ouvrez le cockpit Motion19.`
        : `Échec : ${json.error ?? "inconnu"}`);
    } catch (e) {
      setResult(`Échec : ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setRunning(false);
    }
  };
  return (
    <div className="rounded-xl border border-border bg-card p-4 flex flex-wrap items-center gap-3">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-foreground">Marques de démo (Motion19 + Xtincell)</p>
        <p className="text-xs text-foreground-muted">
          Installe/actualise sur CE serveur : ADVE Motion19, logos officiels, mission Guilde,
          compte Maximus, marque Xtincell sourcée. Idempotent — aucun SSH requis.
        </p>
        {result && <p className="mt-1 text-xs font-mono text-foreground-secondary">{result}</p>}
      </div>
      <button
        type="button"
        onClick={run}
        disabled={running}
        className="rounded-lg border border-border-strong px-4 py-2 text-sm font-semibold text-foreground transition-colors hover:border-accent hover:text-accent disabled:opacity-50"
      >
        {running ? "Installation…" : "Installer / actualiser"}
      </button>
    </div>
  );
}

/** Rôles délégués sur la marque (sous-ensemble lisible de CampaignTeamRole). */
const TEAM_ROLE_OPTIONS = [
  { value: "DIGITAL_DIRECTOR", label: "Direction digitale (accès large)" },
  { value: "SOCIAL_MANAGER", label: "Social media manager" },
  { value: "ACCOUNT_DIRECTOR", label: "Directeur de clientèle" },
  { value: "PROJECT_MANAGER", label: "Chef de projet" },
  { value: "CREATIVE_DIRECTOR", label: "Directeur créatif" },
  { value: "DATA_ANALYST", label: "Analyste data" },
  { value: "CLIENT", label: "Client (lecture large)" },
] as const;

/** Type de compte (User.role) — accès cockpit. */
const ACCOUNT_ROLE_OPTIONS = [
  { value: "FOUNDER", label: "Entrepreneur (founder)" },
  { value: "CREATOR", label: "Créateur" },
  { value: "FREELANCE", label: "Freelance" },
  { value: "BRAND", label: "Marque" },
  { value: "CLIENT_RETAINER", label: "Client retainer" },
  { value: "CLIENT_STATIC", label: "Client one-shot" },
] as const;

/**
 * Crée un login (email + mot de passe) rattaché à UNE marque. La personne se
 * connecte sur /login et ne voit que cette marque dans son cockpit. Acte
 * gouverné + audité ; le mot de passe n'est jamais journalisé (payload redacté).
 */
function CreateBrandLoginCard() {
  const utils = trpc.useUtils();
  const [brandSearch, setBrandSearch] = useState("");
  const { data: brands } = trpc.accounts.brands.useQuery({ search: brandSearch || undefined });
  const [strategyId, setStrategyId] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [teamRole, setTeamRole] = useState<(typeof TEAM_ROLE_OPTIONS)[number]["value"]>("DIGITAL_DIRECTOR");
  const [accountRole, setAccountRole] = useState<(typeof ACCOUNT_ROLE_OPTIONS)[number]["value"]>("FOUNDER");
  const [ok, setOk] = useState<string | null>(null);

  const create = trpc.accounts.createBrandLogin.useMutation({
    onSuccess: (r) => {
      setOk(
        `Login créé : ${r.email} → ${r.brandName} (${r.teamRole})${r.claimed ? " · compte existant réclamé" : ""}. La personne peut se connecter sur /login.`,
      );
      setName("");
      setEmail("");
      setPassword("");
      utils.accounts.list.invalidate();
      utils.accounts.roleStats.invalidate();
    },
  });

  const disabled = create.isPending || !strategyId || !email || !name || password.length < 8;

  const inputCls = "rounded-lg border border-border bg-bg px-2 py-1.5 text-sm text-foreground";
  const labelCls = "flex flex-col gap-1 text-xs text-foreground-muted";

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <p className="text-sm font-semibold text-foreground">Créer un login de marque</p>
      <p className="mt-0.5 text-xs text-foreground-muted">
        Un compte (email + mot de passe) rattaché à une marque. La personne se connecte
        sur <span className="font-mono">/login</span> et ne pilote que cette marque. Acte
        gouverné + audité — le mot de passe n&apos;est jamais journalisé.
      </p>

      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <label className={labelCls}>
          Marque
          <input
            value={brandSearch}
            onChange={(e) => setBrandSearch(e.target.value)}
            placeholder="Filtrer les marques…"
            className={`${inputCls} mb-1`}
          />
          <select value={strategyId} onChange={(e) => setStrategyId(e.target.value)} className={inputCls}>
            <option value="">— choisir une marque —</option>
            {(brands ?? []).map((b) => (
              <option key={b.id} value={b.id}>
                {b.name ?? b.id}
              </option>
            ))}
          </select>
        </label>
        <label className={labelCls}>
          Nom affiché
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Lionel" className={inputCls} />
        </label>
        <label className={labelCls}>
          Email de connexion
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="lionel@motion19.cm"
            className={inputCls}
          />
        </label>
        <label className={labelCls}>
          Mot de passe (≥ 8 caractères)
          <input
            type="text"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="au moins 8 caractères"
            className={inputCls}
          />
        </label>
        <label className={labelCls}>
          Rôle sur la marque
          <select value={teamRole} onChange={(e) => setTeamRole(e.target.value as typeof teamRole)} className={inputCls}>
            {TEAM_ROLE_OPTIONS.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
        </label>
        <label className={labelCls}>
          Type de compte
          <select
            value={accountRole}
            onChange={(e) => setAccountRole(e.target.value as typeof accountRole)}
            className={inputCls}
          >
            {ACCOUNT_ROLE_OPTIONS.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => {
            setOk(null);
            create.mutate({ strategyId, email, name, password, teamRole, accountRole });
          }}
          disabled={disabled}
          className="rounded-lg bg-accent px-3 py-1.5 text-sm font-medium text-accent-foreground hover:opacity-90 disabled:opacity-40"
        >
          {create.isPending ? "Création…" : "Créer le login"}
        </button>
        {ok && <p className="text-xs text-success">{ok}</p>}
        {create.error && <p className="text-xs text-error">{create.error.message}</p>}
      </div>
    </div>
  );
}
