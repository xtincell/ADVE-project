import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { PageHero, Section, SectionHeader } from "@/components/marketing/section";
import { REALISATIONS, STATS } from "@/components/marketing/site-data";

export const metadata: Metadata = {
  title: "Réalisations",
  description:
    "Les marques bâties ou propulsées par UPgraders : Motion19, Universal Music Africa, Chococam, Orange Cameroun, Cimencam, KOF, Akwa Palace, Maison Gimane, Shakazz et plus. Brand build, direction artistique, production audiovisuelle.",
};

/**
 * Références — port de legacy/(marketing)/realisations : le portfolio réel
 * (12 cas du track record agence), les repères chiffrés, le CTA. Détails et
 * études de cas complètes : sur demande.
 */
export default function RealisationsPage() {
  return (
    <>
      <PageHero
        eyebrow="Preuves"
        title={
          <>
            Les marques <span className="text-coral">parlent</span>.
          </>
        }
        lede="Sept ans de missions — du brand build de bout en bout à la direction artistique, en passant par la production audiovisuelle et la marque blanche pour d'autres agences. Un échantillon de ce que le cabinet et La Guilde ont porté."
      >
        <Link href="/contact" className={buttonVariants({ size: "lg" })}>
          Démarrer un projet <ArrowRight />
        </Link>
        <Link href="/methode" className={buttonVariants({ variant: "outline", size: "lg" })}>
          Notre méthode
        </Link>
      </PageHero>

      <Section>
        <SectionHeader
          num="01"
          eyebrow="Le portfolio"
          title={
            <>
              Bâties ou <span className="text-coral">propulsées</span>
            </>
          }
          lede="Marques créées de A à Z, comptes corporate, festivals, hôtellerie, musique, joaillerie, fintech. Selon le brief, UPgraders pilote la stratégie et compose la cellule — souvent en binôme avec Friends Studio."
        />
        <div className="mt-12 grid gap-bento sm:grid-cols-2 lg:grid-cols-3">
          {REALISATIONS.map((r) => (
            <div key={r.name} className="flex flex-col gap-2 rounded-lg bg-white p-6 shadow-card">
              <h3 className="font-display text-lg font-semibold">{r.name}</h3>
              <p className="eyebrow text-coral">{r.sector}</p>
              <p className="mt-1 text-sm leading-relaxed text-smoke">{r.desc}</p>
            </div>
          ))}
        </div>
        <p className="mt-8 text-sm text-smoke">
          Études de cas détaillées (chiffres, livrables, coulisses) :{" "}
          <Link href="/contact" className="font-semibold text-coral hover:underline">
            sur demande
          </Link>
          .
        </p>
      </Section>

      <Section tone="dark">
        <SectionHeader
          num="02"
          eyebrow="En chiffres"
          tone="dark"
          title={
            <>
              La flotte et la <span className="text-coral">trace</span>
            </>
          }
          lede="Notre actif défendable n'est pas un créatif providentiel : c'est la flotte de marques accompagnées et la trace qu'on en garde."
        />
        <div className="mt-10 grid grid-cols-2 gap-bento md:grid-cols-4">
          {STATS.map((s) => (
            <div key={s.label} className="rounded-xl border border-line bg-ink-2 p-6">
              <p className="font-display text-3xl font-semibold tracking-tight text-coral">
                {s.value}
              </p>
              <p className="eyebrow mt-1 text-smoke-2">{s.label}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section>
        <div className="flex flex-col items-start gap-6 md:flex-row md:items-end md:justify-between">
          <SectionHeader
            num="03"
            eyebrow="La prochaine"
            title={
              <>
                La <span className="text-coral">vôtre</span>.
              </>
            }
            lede="Une marque à lancer, une trajectoire à corriger, une couverture à produire ? Les agences relais et studios sont aussi les bienvenus — on porte la méthode, vous portez la relation client."
          />
          <div className="flex shrink-0 flex-wrap gap-3">
            <Link href="/contact" className={buttonVariants({ size: "md" })}>
              Démarrer un projet <ArrowRight />
            </Link>
            <Link href="/services" className={buttonVariants({ variant: "outline", size: "md" })}>
              Voir les services
            </Link>
          </div>
        </div>
      </Section>
    </>
  );
}
