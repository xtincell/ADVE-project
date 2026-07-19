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

const dateFr = (iso: string) =>
  new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });

const STATUS_META: Record<string, { label: string; cls: string }> = {
  OPEN: { label: "En cours", cls: "text-accent border-accent/40" },
  HIT: { label: "Tenu", cls: "text-[color:var(--color-success)] border-[color:var(--color-success)]" },
  MISS: { label: "Raté", cls: "text-[color:var(--color-error)] border-[color:var(--color-error)]" },
  UNRESOLVED: { label: "Non tranché", cls: "text-foreground-muted border-border" },
};

export default async function ParisPage() {
  const pledges = await listPublicPledges();
  const open = pledges.filter((p) => p.status === "OPEN");
  const settled = pledges.filter((p) => p.status !== "OPEN");

  return (
    <main className="mx-auto max-w-3xl px-4 py-12">
      <header className="mb-10 text-center">
        <p className="text-xs font-medium uppercase tracking-widest text-foreground-muted">La Fusée</p>
        <h1 className="mt-1 text-3xl font-semibold text-foreground">Le registre des paris</h1>
        <p className="mx-auto mt-3 max-w-xl text-sm text-foreground-secondary">
          Ici, des marques s&apos;engagent en public : une prédiction datée, enregistrée avant
          l&apos;échéance, résolue devant tous. Les paris tenus restent. Les paris ratés aussi —
          c&apos;est ce qui rend les premiers crédibles.
        </p>
      </header>

      {pledges.length === 0 ? (
        <div className="rounded-2xl border p-8 text-center" style={{ borderColor: "var(--color-border)" }}>
          <p className="text-sm font-medium text-foreground">Aucun pari public pour l&apos;instant.</p>
          <p className="mt-2 text-xs text-foreground-secondary">
            Le premier pari s&apos;écrit bientôt — chaque marque du{" "}
            <Link href="/leaderboard" className="text-accent underline underline-offset-2">championnat</Link>{" "}
            peut s&apos;engager.
          </p>
        </div>
      ) : (
        <div className="space-y-10">
          {open.length > 0 ? (
            <section>
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-foreground-muted">
                En cours — échéance devant tous
              </h2>
              <ul className="space-y-3">
                {open.map((p) => (
                  <PledgeCard key={p.id} p={p} />
                ))}
              </ul>
            </section>
          ) : null}

          {settled.length > 0 ? (
            <section>
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-foreground-muted">
                Résolus — le verdict est resté
              </h2>
              <ul className="space-y-3">
                {settled.map((p) => (
                  <PledgeCard key={p.id} p={p} />
                ))}
              </ul>
            </section>
          ) : null}
        </div>
      )}

      <footer className="mt-12 text-center text-xs text-foreground-muted">
        <p>
          Chaque pari est enregistré AVANT son échéance et ne peut plus être réécrit. Un pari
          n&apos;engage jamais que la marque qui le fait — jamais des tiers.
        </p>
        <p className="mt-3">
          <Link href="/leaderboard" className="underline underline-offset-2">Le championnat des marques</Link>
          {" · "}
          <Link href="/scorer" className="underline underline-offset-2">Scorer ma marque</Link>
        </p>
      </footer>
    </main>
  );
}

function PledgeCard({
  p,
}: {
  p: Awaited<ReturnType<typeof listPublicPledges>>[number];
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
          {meta.label}
        </span>
      </div>
      <p className="mt-2 text-sm text-foreground">{p.statement}</p>
      <p className="mt-2 text-xs text-foreground-muted">
        déclaré le {dateFr(p.createdAt)} · échéance {dateFr(p.horizonAt)}
        {p.resolvedAt ? ` · résolu le ${dateFr(p.resolvedAt)}` : ""}
        {" · "}confiance déclarée {Math.round(p.confidence * 100)} %
      </p>
      {p.resolutionNote ? (
        <p className="mt-2 rounded-lg border px-3 py-2 text-xs text-foreground-secondary" style={{ borderColor: "var(--color-border)" }}>
          {p.resolutionNote}
        </p>
      ) : null}
    </li>
  );
}
