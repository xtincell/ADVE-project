import type { Metadata } from "next";
import { getDb } from "@/lib/db";

/**
 * /status — état de la plateforme, constaté au chargement (zéro service
 * externe, zéro donnée simulée) :
 *   · application web : si cette page se rend, elle répond ;
 *   · base de données : `SELECT 1` réel via le client Prisma, latence mesurée.
 * `force-dynamic` : rendu à la requête (jamais figé au build — le build doit
 * rester vert sans DATABASE_URL, doctrine src/lib/db.ts).
 */

export const metadata: Metadata = {
  title: "État de la plateforme",
  description:
    "Santé de La Fusée en direct — application web et base de données, vérifiées au chargement de la page.",
};

export const dynamic = "force-dynamic";

type DbCheck =
  | { ok: true; latencyMs: number }
  | { ok: false; reason: "unreachable" | "unconfigured" };

async function pingDatabase(): Promise<DbCheck> {
  if (!process.env.DATABASE_URL) return { ok: false, reason: "unconfigured" };
  const startedAt = Date.now();
  try {
    await getDb().$queryRaw`SELECT 1`;
    return { ok: true, latencyMs: Date.now() - startedAt };
  } catch {
    return { ok: false, reason: "unreachable" };
  }
}

function formatCheckedAt(date: Date): string {
  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "long",
    timeStyle: "medium",
    timeZone: "Africa/Douala",
  }).format(date);
}

function StatusDot({ ok }: { ok: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={`inline-block size-2.5 rounded-full ${ok ? "bg-success" : "bg-warning"}`}
    />
  );
}

export default async function StatusPage() {
  const db = await pingDatabase();
  const checkedAt = new Date();

  const operational = db.ok;
  const services = [
    {
      name: "Application web",
      ok: true,
      detail: "Cette page est rendue par le serveur — l'application répond.",
    },
    {
      name: "Base de données",
      ok: db.ok,
      detail: db.ok
        ? `Ping réel (SELECT 1) réussi en ${db.latencyMs} ms.`
        : db.reason === "unconfigured"
          ? "Connexion non configurée sur cette instance."
          : "Le ping (SELECT 1) a échoué — la persistance est indisponible.",
    },
  ];

  return (
    <div className="bg-bone">
      <div className="mx-auto max-w-3xl px-gutter py-16 sm:py-20">
        <p className="eyebrow text-coral">Status</p>
        <h1 className="font-display mt-3 text-4xl font-semibold tracking-tight text-ink">
          État de la plateforme
        </h1>

        <section
          className={`mt-8 flex flex-wrap items-center justify-between gap-4 rounded-lg border p-6 ${
            operational
              ? "border-success/30 bg-success/8"
              : "border-warning/40 bg-warning/10"
          }`}
        >
          <div className="flex items-center gap-3">
            <StatusDot ok={operational} />
            <span className="font-display text-2xl font-semibold text-ink">
              {operational ? "Opérationnel" : "Dégradé"}
            </span>
          </div>
          <p className="font-mono text-xs text-smoke">
            Vérifié le {formatCheckedAt(checkedAt)} (heure de Douala)
          </p>
        </section>

        <section className="mt-6 space-y-3">
          {services.map((s) => (
            <div
              key={s.name}
              className="flex items-start justify-between gap-4 rounded-lg border border-ink/10 bg-white p-5"
            >
              <div>
                <h2 className="font-semibold text-ink">{s.name}</h2>
                <p className="mt-1 text-sm text-smoke">{s.detail}</p>
              </div>
              <span
                className={`mt-1 inline-flex items-center gap-2 text-sm font-semibold ${
                  s.ok ? "text-success" : "text-warning"
                }`}
              >
                <StatusDot ok={s.ok} />
                {s.ok ? "OK" : "KO"}
              </span>
            </div>
          ))}
        </section>

        <p className="mt-8 text-sm text-smoke">
          Chaque chargement de cette page refait les vérifications côté serveur — rien n&apos;est
          mis en cache, aucun service tiers n&apos;est interrogé. Engagements de délais :{" "}
          <a href="/sla" className="font-medium text-coral hover:underline">
            /sla
          </a>{" "}
          · évolutions du produit :{" "}
          <a href="/changelog" className="font-medium text-coral hover:underline">
            /changelog
          </a>
          .
        </p>
      </div>
    </div>
  );
}
