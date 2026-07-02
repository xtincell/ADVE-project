import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Hammer, Megaphone } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHero, Section, SectionHeader } from "@/components/marketing/section";
import { CONTACT, GUILDE_CATEGORIES, GUILDE_MEMBERS } from "@/components/marketing/site-data";
import { countWallMissions } from "@/server/guild";

// Compteur réel du mur → rendu à la requête (jamais figé au build sans DB).
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "La Guilde",
  description:
    "La Guilde, le réseau de talents curatés d'UPgraders : freelances (Core), agences partenaires (Extended) et spécialistes (Réseau). Une cellule sur mesure pour chaque mission, pas une équipe figée.",
};

/**
 * Vitrine publique de la Guilde — port de legacy/(marketing)/la-guilde :
 * 3 cercles, le noyau réel, les deux promesses (marques / talents), et le
 * COMPTE réel des missions ouvertes sur le mur (WP-011) — le nombre
 * seulement : le détail des missions est réservé aux talents connectés
 * (/studio), aucune donnée de marque ne sort ici.
 */
export default async function LaGuildePage() {
  const whatsappDouala = CONTACT.whatsapp[0];

  // Compte réel — null si la base est injoignable (état affiché honnêtement).
  let openMissions: number | null = null;
  try {
    openMissions = await countWallMissions();
  } catch {
    openMissions = null;
  }

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
        <Link href="/studio" className={buttonVariants({ variant: "outline", size: "lg" })}>
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
              Les missions <span className="text-coral">ouvertes</span>
            </>
          }
          lede="Le compte ci-dessous est réel — il vient du mur des missions de la plateforme. Le détail (type d'action, marché, brief) est réservé aux talents connectés : aucune donnée de marque ne sort ici."
        />
        <div className="mt-10">
          {openMissions === null ? (
            <EmptyState
              tone="light"
              icon={<Hammer />}
              title="Compteur momentanément indisponible"
              description="Impossible de lire le mur des missions à l'instant. Réessayez dans un moment — en attendant, les missions passent aussi par le canal direct."
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
          ) : openMissions === 0 ? (
            <EmptyState
              tone="light"
              icon={<Megaphone />}
              title="Aucune mission ouverte en ce moment"
              description="Les marques publient leurs missions au fil de leurs campagnes — le mur affiche uniquement des missions réelles, jamais de démonstration. Créez votre profil talent pour être prêt à candidater."
            >
              <Link href="/studio" className={buttonVariants({ variant: "outline", size: "sm" })}>
                Créer mon profil talent
              </Link>
            </EmptyState>
          ) : (
            <div className="flex flex-col items-center gap-4 rounded-lg bg-white p-10 text-center shadow-card">
              <p className="font-display text-6xl font-semibold text-coral">{openMissions}</p>
              <p className="max-w-md text-sm leading-relaxed text-smoke">
                mission{openMissions > 1 ? "s" : ""} ouverte{openMissions > 1 ? "s" : ""} aux
                candidatures sur le mur de la Guilde, en ce moment. Connectez-vous au Studio
                créateur pour les lire et candidater.
              </p>
              <Link href="/studio" className={buttonVariants({ size: "md" })}>
                Voir les missions dans le Studio <ArrowRight />
              </Link>
            </div>
          )}
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
              Freelances et agences : entrez dans le réseau curaté. Créez votre profil talent
              dans le Studio créateur (compétences, tarif indicatif, portfolio), candidatez aux
              missions du mur, et soyez payé en mobile money une fois la livraison validée.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/studio" className={buttonVariants({ variant: "outline", size: "md" })}>
                Créer mon profil talent
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
