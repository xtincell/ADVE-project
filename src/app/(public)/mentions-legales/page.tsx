/**
 * /mentions-legales — Identification de l'entité (UPgraders, l'agence) +
 * du produit qu'elle opère (La Fusée, l'Industry OS) + rôle juridique.
 * (Vague 6 — conformité B2B ; mise à jour : UPgraders en éditeur du site public.)
 */
import { LegalShell, LegalSection } from "@/components/legal/legal-shell";

export const metadata = {
  title: "Mentions légales — UPgraders",
  description:
    "Mentions légales d'UPgraders (cabinet de conseil & stratégie, Douala) — éditeur du site, agence opératrice du produit La Fusée. Identification, hébergement, propriété intellectuelle, droit applicable.",
};

export default function MentionsLegalesPage() {
  return (
    <LegalShell
      title="Mentions légales"
      updated="22 juin 2026"
      intro={
        <>
          Informations d&apos;identification d&apos;<strong>UPgraders</strong>, éditeur de ce site et agence
          opératrice du produit <strong>La Fusée</strong> (Industry OS).
        </>
      }
    >
      <LegalSection title="Éditeur du site — UPgraders">
        <ul>
          <li><strong>Dénomination</strong> : UPgraders — cabinet de conseil &amp; stratégie créative</li>
          <li><strong>Activité</strong> : industrialisation de la production de marques (conseil, direction créative, réseau de talents La Guilde, édition logicielle)</li>
          <li><strong>Forme</strong> : UPgraders / La Fusée SARL</li>
          <li><strong>Année de création</strong> : 2017</li>
          <li><strong>Siège</strong> : Douala, Cameroun — hubs Douala &amp; Abidjan</li>
          <li><strong>Directeur de la publication</strong> : Alexandre « Xtincell » Djengue (CEO)</li>
          <li><strong>Contact</strong> : <a href="mailto:xtincell@gmail.com" className="text-accent hover:underline">xtincell@gmail.com</a> · WhatsApp +237 694 17 17 99 (Douala) / +225 05 46 15 64 56 (Abidjan)</li>
          <li><strong>Contact juridique</strong> : <a href="mailto:legal@lafusee.upgraders.io" className="text-accent hover:underline">legal@lafusee.upgraders.io</a></li>
        </ul>
      </LegalSection>

      <LegalSection title="UPgraders & La Fusée — qui édite quoi">
        <p>
          <strong>UPgraders</strong> est la société (l&apos;agence) : elle vend et opère. <strong>La Fusée</strong>{" "}
          est son produit — un Industry OS d&apos;architecture, de production et de mesure de marques, accessible côté
          client via le Cockpit et l&apos;Oracle. <strong>Argos</strong> est sa sous-marque éditoriale. Ce site
          (<a href="/" className="text-accent hover:underline">page d&apos;accueil</a>) est édité par UPgraders ; les
          surfaces produit (<a href="/lafusee" className="text-accent hover:underline">La Fusée</a>, Cockpit, Console)
          sont opérées par la même entité.
        </p>
      </LegalSection>

      <LegalSection title="Hébergement">
        <ul>
          <li>Application : Vercel Inc., 440 N Barranca Ave #4133, Covina, CA 91723, USA.</li>
          <li>Base de données : Supabase (PostgreSQL managé), région contractuelle du projet.</li>
        </ul>
      </LegalSection>

      <LegalSection title="Nature et rôle de la plateforme">
        <p>
          La Fusée est un <strong>système d&apos;exploitation d&apos;industrie</strong> : elle structure la stratégie
          de marque (méthode ADVE/RTIS), orchestre la production de livrables, mesure l&apos;effet (score /200) et{" "}
          <strong>dispatch</strong> des missions vers des talents et agences tiers. Dans ce dispatch, UPgraders
          intervient comme opérateur technique d&apos;orchestration et d&apos;intermédiation gouvernée — qualification,
          matching, séquestre par jalons, contrôle qualité, traçabilité — selon le partage de responsabilités
          détaillé aux <a href="/cgv" className="text-accent hover:underline">CGV (art. 6)</a>. Les talents
          demeurent des professionnels indépendants, responsables de leurs livraisons au sein des missions.
        </p>
      </LegalSection>

      <LegalSection title="Propriété intellectuelle">
        <p>
          La méthode ADVE/RTIS, les noms « UPgraders » et « La Fusée », les interfaces, le moteur analytique et
          l&apos;ensemble du corpus de la plateforme sont la propriété d&apos;UPgraders. Les livrables produits pour un
          client lui sont cédés selon les <a href="/cgu" className="text-accent hover:underline">CGU (art. 2)</a>.
          Toute reproduction non autorisée de la plateforme, de la marque ou de la méthode est interdite.
        </p>
      </LegalSection>

      <LegalSection title="Données personnelles">
        <p>
          Voir la <a href="/privacy" className="text-accent hover:underline">politique de confidentialité</a> et,
          pour les clients professionnels, l&apos;<a href="/dpa" className="text-accent hover:underline">accord de traitement (DPA)</a>.
        </p>
      </LegalSection>

      <LegalSection title="Droit applicable">
        <p>
          Droit camerounais et actes uniformes OHADA. Résolution amiable préalable, puis juridictions de Douala
          (cf. <a href="/cgv" className="text-accent hover:underline">CGV art. 10</a>).
        </p>
      </LegalSection>
    </LegalShell>
  );
}
