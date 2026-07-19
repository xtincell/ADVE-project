/**
 * Passeport fan — page publique par token (ADR-0158, Phase B état-final B2).
 *
 * Server component, DONNÉES PUBLIQUES UNIQUEMENT : identités sociales
 * publiques (handle/displayName), statut sur l'échelle d'engagement,
 * conditions franchies, code de parrainage, missions fan ouvertes, cercle des
 * autres fans. Aucun email, aucun téléphone de tiers, aucun déchiffrement.
 * Token inconnu ou trop court → 404. noindex : le lien est personnel.
 *
 * Pull-first (⚗️ plan d'état final) : la page ne broadcast rien — elle donne
 * au fan les gestes sortants (écrire à la marque sur WhatsApp, partager son
 * code, candidater à une mission).
 */
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getPassportByToken } from "@/server/services/seshat/fan-passport";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Passeport fan — La Fusée",
  description: "Votre place dans la communauté de la marque : statut, preuves, parrainage.",
  robots: { index: false, follow: false },
};

const BASE_URL = process.env.NEXTAUTH_URL ?? "https://powerupgraders.com";

const PLATFORM_LABELS: Record<string, string> = {
  FACEBOOK: "Facebook", INSTAGRAM: "Instagram", TIKTOK: "TikTok",
  TWITTER: "X", YOUTUBE: "YouTube", LINKEDIN: "LinkedIn",
};

export default async function PassportPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const view = await getPassportByToken(token);
  if (!view) notFound();

  const shareText = encodeURIComponent(
    `Je te recommande ${view.brandName}. Diagnostic de marque gratuit — indique mon code ${view.fanCode ?? ""} : ${BASE_URL}/intake?parrain=${view.fanCode ?? ""}`,
  );

  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      {/* ── En-tête ── */}
      <header className="mb-8 text-center">
        <p className="text-xs font-medium uppercase tracking-widest text-foreground-muted">
          Passeport fan
        </p>
        <h1 className="mt-1 text-3xl font-semibold text-foreground">{view.brandName}</h1>
        <p className="mt-2 text-sm text-foreground-secondary">
          {view.fanName} · {PLATFORM_LABELS[view.platform] ?? view.platform}
        </p>
      </header>

      {/* ── Statut sur l'échelle d'engagement ── */}
      <section className="rounded-2xl border p-6 text-center" style={{ borderColor: "var(--color-border)" }}>
        <p className="text-xs uppercase tracking-wide text-foreground-muted">Votre statut</p>
        <p className="mt-1 text-2xl font-semibold text-accent">{view.tierLabel}</p>
        <div className="mx-auto mt-4 flex max-w-xs items-center gap-1" role="img"
          aria-label={`Niveau ${view.ladderPosition} sur ${view.ladderSize}`}>
          {Array.from({ length: view.ladderSize }, (_, i) => (
            <span
              key={i}
              className={`h-2 flex-1 rounded-full ${i < view.ladderPosition ? "bg-accent" : "bg-foreground-muted/20"}`}
            />
          ))}
        </div>
        <p className="mt-2 text-xs text-foreground-muted">
          Niveau {view.ladderPosition} / {view.ladderSize} de l&apos;échelle d&apos;engagement
        </p>
      </section>

      {/* ── Preuves (conditions franchies) ── */}
      <section className="mt-6 rounded-2xl border p-6" style={{ borderColor: "var(--color-border)" }}>
        <h2 className="text-sm font-semibold text-foreground">Vos preuves</h2>
        <p className="mt-1 text-xs text-foreground-secondary">
          Chaque statut se gagne par des actes constatés — jamais attribué au hasard.
        </p>
        <ul className="mt-4 space-y-2">
          {view.conditions.map((c) => (
            <li key={c.key} className="flex items-center gap-3 text-sm">
              <span aria-hidden className={c.met ? "text-accent" : "text-foreground-muted/50"}>
                {c.met ? "✓" : "○"}
              </span>
              <span className={c.met ? "text-foreground" : "text-foreground-muted"}>{c.label}</span>
            </li>
          ))}
        </ul>
        {view.nextSteps.length > 0 ? (
          <div className="mt-4 rounded-lg border px-4 py-3" style={{ borderColor: "var(--color-border)" }}>
            <p className="text-xs font-medium text-foreground">Prochaine étape</p>
            {view.nextSteps.map((s) => (
              <p key={s} className="mt-1 text-xs text-foreground-secondary">{s}</p>
            ))}
          </div>
        ) : null}
      </section>

      {/* ── Parrainage ── */}
      {view.fanCode ? (
        <section className="mt-6 rounded-2xl border p-6" style={{ borderColor: "var(--color-border)" }}>
          <h2 className="text-sm font-semibold text-foreground">Votre code de parrainage</h2>
          <p className="mt-3 rounded-lg border px-4 py-3 text-center font-mono text-xl tracking-widest text-accent"
            style={{ borderColor: "var(--color-border)" }}>
            {view.fanCode}
          </p>
          <p className="mt-2 text-xs text-foreground-secondary">
            Recommandez {view.brandName} : la personne indique votre code à son diagnostic
            gratuit. Quand elle devient cliente, votre statut monte — et la marque vous
            remercie directement.
          </p>
          {view.referrals.pending + view.referrals.converted > 0 ? (
            <p className="mt-2 text-xs text-foreground-muted">
              {view.referrals.converted} conversion{view.referrals.converted > 1 ? "s" : ""} ·{" "}
              {view.referrals.pending} en attente
            </p>
          ) : null}
          <a
            href={`https://wa.me/?text=${shareText}`}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 inline-block rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-foreground"
          >
            Partager sur WhatsApp
          </a>
        </section>
      ) : null}

      {/* ── Missions fan ── */}
      <section className="mt-6 rounded-2xl border p-6" style={{ borderColor: "var(--color-border)" }}>
        <h2 className="text-sm font-semibold text-foreground">Missions fan</h2>
        {view.fanMissions.length === 0 ? (
          <p className="mt-2 text-xs text-foreground-muted">
            Aucune mission ouverte pour l&apos;instant — elles apparaîtront ici dès que la
            marque en publie.
          </p>
        ) : (
          <ul className="mt-3 space-y-2">
            {view.fanMissions.map((m) => (
              <li key={m.title} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border px-4 py-3"
                style={{ borderColor: "var(--color-border)" }}>
                <div>
                  <p className="text-sm font-medium text-foreground">{m.title}</p>
                  {m.budget ? <p className="text-xs text-foreground-muted">{m.budget}</p> : null}
                </div>
                {view.brandWhatsapp ? (
                  <a
                    href={`https://wa.me/${view.brandWhatsapp}?text=${encodeURIComponent(`Mission « ${m.title} » — je suis partant·e. Mon passeport : ${view.fanCode ?? ""}`)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-lg border px-3 py-1.5 text-xs font-medium text-accent"
                    style={{ borderColor: "var(--color-border)" }}
                  >
                    Candidater sur WhatsApp
                  </a>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* ── Le cercle (fan-à-fan) ── */}
      {view.circle.length > 0 ? (
        <section className="mt-6 rounded-2xl border p-6" style={{ borderColor: "var(--color-border)" }}>
          <h2 className="text-sm font-semibold text-foreground">Le cercle</h2>
          <p className="mt-1 text-xs text-foreground-secondary">
            Les autres fans suivis de {view.brandName} — vous n&apos;êtes pas seul·e.
          </p>
          <ul className="mt-3 flex flex-wrap gap-2">
            {view.circle.map((f) => (
              <li key={`${f.platform}:${f.name}`}
                className="rounded-full border px-3 py-1 text-xs text-foreground-secondary"
                style={{ borderColor: "var(--color-border)" }}>
                {f.name} · {f.tierLabel}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {/* ── Contact marque (pull-first) ── */}
      <footer className="mt-8 text-center">
        {view.brandWhatsapp ? (
          <a
            href={`https://wa.me/${view.brandWhatsapp}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-medium text-accent"
          >
            Écrire à {view.brandName} sur WhatsApp
          </a>
        ) : null}
        <p className="mt-4 text-xs text-foreground-muted">
          {view.brandSlug ? (
            <Link href={`/b/${view.brandSlug}`} className="underline underline-offset-2">
              Page publique de {view.brandName}
            </Link>
          ) : null}
        </p>
      </footer>
    </main>
  );
}
