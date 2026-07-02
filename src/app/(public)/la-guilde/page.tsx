import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Hammer } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHero, Section, SectionHeader } from "@/components/marketing/section";
import { CONTACT, GUILDE_CATEGORIES, GUILDE_MEMBERS } from "@/components/marketing/site-data";

export const metadata: Metadata = {
  title: "La Guilde",
  description:
    "La Guilde, le réseau de talents curatés d'UPgraders : freelances (Core), agences partenaires (Extended) et spécialistes (Réseau). Une cellule sur mesure pour chaque mission, pas une équipe figée.",
};

/**
 * Vitrine publique de la Guilde — port de legacy/(marketing)/la-guilde :
 * 3 cercles, le noyau réel, les deux promesses (marques / talents). Le mur
 * des missions arrive avec le module guilde (WP-011) — état honnête.
 */
export default function LaGuildePage() {
  const whatsappDouala = CONTACT.whatsapp[0];

  return (
    <>
      <PageHero
        eyebrow="Le réseau"
        title={
          <>
            La <span className="text-coral">Guilde</span>.
          </>
        }
        lede="UPgraders n'a pas d'équipe figée. Pour chaque mission, on compose la cellule juste à partir de La Guilde : un réseau curaté de freelances, d'agences partenaires et de spécialistes couvrant tous les métiers de l'industrie créative."
      >
        <Link href="/contact" className={buttonVariants({ size: "lg" })}>
          Déposer une mission <ArrowRight />
        </Link>
        <Link href="/intake" className={buttonVariants({ variant: "outline", size: "lg" })}>
          Rejoindre le réseau
        </Link>
      </PageHero>

      <Section>
        <SectionHeader
          num="01"
          eyebrow="Trois cercles"
          title={
            <>
              Un réseau en cercles <span className="text-coral">concentriques</span>
            </>
          }
          lede="La Guilde se structure en trois cercles. Selon le brief, on puise dans l'un, dans l'autre, ou on assemble une cellule transverse."
        />
        <div className="mt-10 grid gap-bento md:grid-cols-3">
          {GUILDE_CATEGORIES.map((c) => (
            <div key={c.name} className="rounded-lg bg-white p-7 shadow-card">
              <h3 className="font-display text-xl font-semibold">
                La Guilde <span className="text-coral">{c.name}</span>
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-smoke">{c.desc}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section tone="dark">
        <SectionHeader
          num="02"
          eyebrow="Le noyau dur"
          tone="dark"
          title={
            <>
              Quelques <span className="text-coral">visages</span>
            </>
          }
          lede="Le modèle ne tient que parce qu'il y a un noyau qui garantit la cohérence — le binôme CEO + Friends Studio. Autour, le carnet d'adresses se densifie cycle après cycle."
        />
        <div className="mt-12 grid gap-bento sm:grid-cols-2 lg:grid-cols-3">
          {GUILDE_MEMBERS.map((m) => (
            <div key={m.name} className="flex flex-col gap-2 rounded-xl border border-line bg-ink-2 p-6">
              <p className="eyebrow text-smoke-2">{m.role}</p>
              <h3 className="font-display text-lg font-semibold">{m.name}</h3>
              <p className="text-xs text-coral">{m.tag}</p>
              <p className="mt-1 text-sm leading-relaxed text-sand">{m.desc}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section>
        <SectionHeader
          num="03"
          eyebrow="Le mur des missions"
          title={
            <>
              Les missions ouvertes — <span className="text-coral">bientôt ici</span>
            </>
          }
        />
        <div className="mt-10">
          <EmptyState
            tone="light"
            icon={<Hammer />}
            title="Le mur des missions arrive"
            description="Dépôt de brief, candidatures des talents et paiement sécurisé mobile money seront publiés ici. En attendant, les missions passent par le canal direct : parlez-nous de votre projet."
          >
            <a
              href={whatsappDouala?.link ?? "/contact"}
              target="_blank"
              rel="noopener noreferrer"
              className={buttonVariants({ variant: "outline", size: "sm" })}
            >
              Écrire sur WhatsApp
            </a>
          </EmptyState>
        </div>
      </Section>

      <Section tone="dark">
        <div className="grid gap-bento lg:grid-cols-2">
          <div className="flex flex-col rounded-xl border border-line bg-ink-2 p-8">
            <p className="eyebrow text-coral">Pour les marques</p>
            <h3 className="font-display mt-2 text-2xl font-semibold">
              Une cellule taillée pour votre ADVE
            </h3>
            <p className="mt-3 flex-1 text-sm leading-relaxed text-sand">
              Pas de structure à amortir : vous payez ce qui produit la valeur. Chaque mandat
              reçoit l&apos;équipe juste, castée pour son ADN de marque — le bon photographe, le
              bon motion designer, la bonne agence relais.
            </p>
            <div className="mt-6">
              <Link href="/contact" className={buttonVariants({ size: "md" })}>
                Déposer une mission <ArrowRight />
              </Link>
            </div>
          </div>
          <div className="flex flex-col rounded-xl border border-line bg-ink-2 p-8">
            <p className="eyebrow text-coral">Pour les talents</p>
            <h3 className="font-display mt-2 text-2xl font-semibold">
              Convoqué à la mission, payé sereinement
            </h3>
            <p className="mt-3 flex-1 text-sm leading-relaxed text-sand">
              Freelances et agences : entrez dans le réseau curaté. Missions qualifiées, brief
              structuré, et la conciergerie Sérénité qui sécurise contrats et paiements (escrow,
              mobile money). Les inscriptions en ligne ouvrent avec le mur des missions.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/intake" className={buttonVariants({ variant: "outline", size: "md" })}>
                Rejoindre le réseau
              </Link>
              <a
                href={whatsappDouala?.link ?? "/contact"}
                target="_blank"
                rel="noopener noreferrer"
                className={buttonVariants({ variant: "ghost", size: "md" })}
              >
                Se présenter sur WhatsApp
              </a>
            </div>
          </div>
        </div>
      </Section>
    </>
  );
}
