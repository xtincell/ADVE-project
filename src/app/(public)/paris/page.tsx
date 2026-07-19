/**
 * Le registre des paris — page publique (ADR-0159, Phase C état-final).
 *
 * Des marques s'engagent PUBLIQUEMENT sur des prédictions datées, enregistrées
 * avant l'échéance, résolues devant tous — tenues comme ratées. Le courage
 * vérifiable comme produit. Server component, données publiques uniquement
 * (jamais le déclarant), état vide honnête.
 */
import type { Metadata } from "next";
import Link from "next/link";
import { listPublicPledges } from "@/server/services/seshat/prediction";
import { getServerLocale } from "@/lib/i18n/server";
import { t, type Locale } from "@/lib/i18n";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Le registre des paris — La Fusée",
  description:
    "Des marques qui s'engagent en public : prédictions datées, enregistrées avant l'échéance, résolues devant tous — tenues comme ratées.",
  openGraph: {
    title: "Le registre des paris — La Fusée",
    description: "Le courage vérifiable : chaque pari a son échéance, chaque échéance a son verdict.",
  },
};

const dateFr = (iso: string, locale: Locale = "fr") =>
  new Date(iso).toLocaleDateString(locale === "en" ? "en-GB" : locale === "zh" ? "zh-CN" : "fr-FR", { day: "numeric", month: "long", year: "numeric" });

const STATUS_META: Record<string, { key: string; cls: string }> = {
  OPEN: { key: "paris.status.open", cls: "text-accent border-accent/40" },
  HIT: { key: "paris.status.hit", cls: "text-[color:var(--color-success)] border-[color:var(--color-success)]" },
  MISS: { key: "paris.status.miss", cls: "text-[color:var(--color-error)] border-[color:var(--color-error)]" },
  UNRESOLVED: { key: "paris.status.unresolved", cls: "text-foreground-muted border-border" },
};

export default async function ParisPage() {
  const locale = await getServerLocale();
  const pledges = await listPublicPledges();
  const open = pledges.filter((p) => p.status === "OPEN");
  const settled = pledges.filter((p) => p.status !== "OPEN");

  return (
    <main className="mx-auto max-w-3xl px-4 py-12">
      {/* Chrome preuves (façade unique V3) — retour à l'univers La Fusée. */}
      <nav className="mb-8 flex flex-wrap items-center justify-between gap-2 text-xs">
        <Link href="/lafusee" className="font-semibold uppercase tracking-widest text-foreground hover:text-accent">
          {t("paris.brand", locale)}
        </Link>
        <span className="flex gap-4 text-foreground-muted">
          <Link href="/scorer" className="hover:text-foreground">{t("paris.nav.scorer", locale)}</Link>
          <Link href="/leaderboard" className="hover:text-foreground">{t("paris.nav.championnat", locale)}</Link>
          <Link href="/intake" className="text-accent hover:underline">{t("paris.nav.diagnostic", locale)}</Link>
        </span>
      </nav>
      <header className="mb-10 text-center">
        <p className="text-xs font-medium uppercase tracking-widest text-foreground-muted">{t("paris.brand", locale)}</p>
        <h1 className="mt-1 text-3xl font-semibold text-foreground">{t("paris.title", locale)}</h1>
        <p className="mx-auto mt-3 max-w-xl text-sm text-foreground-secondary">
          {t("paris.lede", locale)}
        </p>
      </header>

      {pledges.length === 0 ? (
        <div className="rounded-2xl border p-8 text-center" style={{ borderColor: "var(--color-border)" }}>
          <p className="text-sm font-medium text-foreground">{t("paris.empty.title", locale)}</p>
          <p className="mt-2 text-xs text-foreground-secondary">
            {t("paris.empty.before", locale)}{" "}
            <Link href="/leaderboard" className="text-accent underline underline-offset-2">{t("paris.empty.link", locale)}</Link>{" "}
            {t("paris.empty.after", locale)}
          </p>
        </div>
      ) : (
        <div className="space-y-10">
          {open.length > 0 ? (
            <section>
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-foreground-muted">
                {t("paris.section.open", locale)}
              </h2>
              <ul className="space-y-3">
                {open.map((p) => (
                  <PledgeCard key={p.id} p={p} locale={locale} />
                ))}
              </ul>
            </section>
          ) : null}

          {settled.length > 0 ? (
            <section>
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-foreground-muted">
                {t("paris.section.settled", locale)}
              </h2>
              <ul className="space-y-3">
                {settled.map((p) => (
                  <PledgeCard key={p.id} p={p} locale={locale} />
                ))}
              </ul>
            </section>
          ) : null}
        </div>
      )}

      <footer className="mt-12 text-center text-xs text-foreground-muted">
        <p>
          {t("paris.footer.rule", locale)}
        </p>
        <p className="mt-3">
          <Link href="/leaderboard" className="underline underline-offset-2">{t("paris.footer.leaderboard", locale)}</Link>
          {" · "}
          <Link href="/scorer" className="underline underline-offset-2">{t("paris.footer.scorer", locale)}</Link>
        </p>
      </footer>
    </main>
  );
}

function PledgeCard({
  p,
  locale,
}: {
  p: Awaited<ReturnType<typeof listPublicPledges>>[number];
  locale: Locale;
}) {
  const meta = STATUS_META[p.status] ?? STATUS_META.UNRESOLVED!;
  return (
    <li className="rounded-2xl border p-5" style={{ borderColor: "var(--color-border)" }}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-semibold text-foreground">
          {p.brandSlug ? (
            <Link href={`/b/${p.brandSlug}`} className="hover:underline">{p.brandName}</Link>
          ) : (
            p.brandName
          )}
        </p>
        <span className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${meta.cls}`}>
          {t(meta.key, locale)}
        </span>
      </div>
      <p className="mt-2 text-sm text-foreground">{p.statement}</p>
      <p className="mt-2 text-xs text-foreground-muted">
        {t("paris.card.declared", locale)} {dateFr(p.createdAt, locale)} · {t("paris.card.horizon", locale)} {dateFr(p.horizonAt, locale)}
        {p.resolvedAt ? ` · ${t("paris.card.resolved", locale)} ${dateFr(p.resolvedAt, locale)}` : ""}
        {" · "}{t("paris.card.confidence", locale)} {Math.round(p.confidence * 100)} %
      </p>
      {p.resolutionNote ? (
        <p className="mt-2 rounded-lg border px-3 py-2 text-xs text-foreground-secondary" style={{ borderColor: "var(--color-border)" }}>
          {p.resolutionNote}
        </p>
      ) : null}
    </li>
  );
}
