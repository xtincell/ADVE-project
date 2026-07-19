/**
 * Vérification publique d'un certificat de valorisation (ADR-0160).
 * Le hash imprimé sur le certificat se vérifie ici : authentique ou inconnu.
 * Projection SANS montant (le certificat se vend en privé) — marque, date,
 * palier de force, numéro. Jamais de PII, jamais le CA déclaré.
 */
import type { Metadata } from "next";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Vérification de certificat — La Fusée",
  robots: { index: false, follow: false },
};

export default async function CertificatPage({ params }: { params: Promise<{ hash: string }> }) {
  const { hash } = await params;
  const clean = hash.slice(0, 64).replace(/[^a-f0-9]/gi, "");
  const asset =
    clean.length >= 16
      ? await db.brandAsset.findFirst({
          where: {
            kind: "VALUATION_CERTIFICATE",
            metadata: { path: ["certificateHash"], equals: clean },
          },
          select: { name: true, createdAt: true, content: true },
        })
      : null;
  const force = asset
    ? ((asset.content as { force?: { tier?: string } | null } | null)?.force ?? null)
    : null;

  return (
    <main className="mx-auto max-w-xl px-4 py-16 text-center">
      <p className="text-xs font-medium uppercase tracking-widest text-foreground-muted">
        La Fusée — registre des certificats
      </p>
      {asset ? (
        <>
          <h1 className="mt-3 text-2xl font-semibold text-[color:var(--color-success)]">
            Certificat authentique
          </h1>
          <div className="mt-6 rounded-2xl border p-6 text-left" style={{ borderColor: "var(--color-border)" }}>
            <p className="text-sm font-medium text-foreground">{asset.name}</p>
            <p className="mt-2 text-xs text-foreground-muted">
              N° <span className="font-mono">{clean}</span>
              <br />
              Émis le {asset.createdAt.toLocaleDateString("fr-FR")}
              {force?.tier ? (
                <>
                  <br />
                  Palier de force à l&apos;émission : {force.tier}
                </>
              ) : null}
            </p>
          </div>
          <p className="mt-4 text-xs text-foreground-muted">
            Ce numéro correspond à un certificat émis par La Fusée. Le contenu détaillé
            reste entre la marque et son destinataire.
          </p>
        </>
      ) : (
        <>
          <h1 className="mt-3 text-2xl font-semibold text-[color:var(--color-error)]">
            Certificat inconnu
          </h1>
          <p className="mt-4 text-sm text-foreground-secondary">
            Aucun certificat émis ne porte ce numéro. Vérifiez la saisie — ou méfiez-vous
            du document qui vous a été présenté.
          </p>
        </>
      )}
    </main>
  );
}
