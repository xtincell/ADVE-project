"use client";

import { useState } from "react";
import { SectionWrapper } from "./shared/section-wrapper";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

const FAQS = [
  {
    q: "Le diagnostic est vraiment gratuit ?",
    a: "Oui, 100%. Le diagnostic ADVE analyse votre marque sur 8 piliers et vous donne un score /200 avec classification. Aucune carte bancaire requise, aucun engagement. C'est notre porte d'entree pour vous montrer la puissance de la methode.",
  },
  {
    q: "Combien de temps prend le diagnostic ?",
    a: "15 minutes pour remplir le formulaire. Le systeme genere votre diagnostic complet en moins de 48h. Vous recevez un radar ADVE, votre score, votre classification et des premieres recommandations strategiques.",
  },
  {
    q: "Qu'est-ce que le score ADVE-RTIS ?",
    a: "Un score sur 200 base sur 8 piliers : Authenticite, Distinction, Valeur, Engagement (ADVE, gratuit) et Risk, Track, Innovation, Strategie (RTIS, offre payante). Chaque pilier est evalue de facon deterministe et transparente. Le score classe votre marque de Zombie (0-50) a Icone (181-200).",
  },
  {
    q: "Qui sont les NETERU ?",
    a: "Le trio d'intelligences AI qui propulse La Fusee. Mestor decide et recommande, Artemis orchestre et produit (91 outils GLORY), Seshat observe et anticipe (intelligence marche). Ils travaillent en concert sous supervision humaine — l'IA propose, l'operateur valide.",
  },
  {
    q: "Mes donnees sont-elles en securite ?",
    a: "Vos donnees sont hebergees sur des serveurs securises, chiffrees en transit et au repos. Aucune donnee n'est partagee avec des tiers. Chaque acces est trace et auditable. Nous respectons le RGPD et les standards les plus stricts de confidentialite.",
  },
  {
    q: "Pour qui est cette plateforme ?",
    a: "Pour toute entreprise ou agence qui veut piloter ses marques avec methode. Directeurs marketing, fondateurs, agences conseil, freelances creatifs — si vous travaillez sur la strategie de marque en Afrique francophone, La Fusee est faite pour vous.",
  },
  {
    q: "Puis-je utiliser La Fusee si j'ai deja une agence ?",
    a: "Absolument. La Fusee n'est pas une agence concurrente — c'est un systeme d'exploitation. Votre agence peut utiliser nos outils pour structurer sa production, scorer ses clients et acceder a un reseau de talents qualifies.",
  },
];

export function FaqSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <SectionWrapper id="faq" className="border-t border-border-subtle">
      <div className="text-center">
        <p
          data-reveal="fade-in"
          className="mb-4 text-sm font-medium uppercase tracking-widest text-foreground-muted"
        >
          FAQ
        </p>
        <h2
          data-reveal="slide-up"
          data-reveal-delay="100"
          className="mb-16 text-3xl font-bold tracking-tight sm:text-4xl"
        >
          Questions frequentes
        </h2>
      </div>

      <div
        data-reveal="slide-up"
        data-reveal-delay="200"
        className="mx-auto max-w-3xl divide-y divide-white/5"
      >
        {FAQS.map((faq, i) => {
          const isOpen = openIndex === i;
          return (
            <div key={i} className="py-5">
              <button
                onClick={() => setOpenIndex(isOpen ? null : i)}
                className="flex w-full items-center justify-between gap-4 text-left"
              >
                <span className="text-base font-medium text-foreground">{faq.q}</span>
                <ChevronDown
                  className={cn(
                    "h-5 w-5 shrink-0 text-foreground-muted transition-transform duration-300",
                    isOpen && "rotate-180",
                  )}
                />
              </button>
              <div
                className={cn(
                  "grid transition-all duration-300",
                  isOpen ? "grid-rows-[1fr] pt-4 opacity-100" : "grid-rows-[0fr] opacity-0",
                )}
              >
                <div className="overflow-hidden">
                  <p className="text-sm leading-relaxed text-foreground-secondary">{faq.a}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </SectionWrapper>
  );
}
