/**
 * /mentions-legales — Identification de l'entité + rôle juridique de l'OS
 * (Vague 6 — conformité B2B, mandat « Identification de l'entité »).
 */
import { LegalShell, LegalSection } from "@/components/legal/legal-shell";

export const metadata = {
  title: "Mentions légales — La Fusée",
  description: "Mentions légales de La Fusée Industry OS — éditeur, hébergement, propriété intellectuelle, rôle de l'OS.",
};

export default function MentionsLegalesPage() {
  return (
    <LegalShell
      title="Mentions légales"
      updated="12 juin 2026"
      intro={<>Informations d&apos;identification de l&apos;éditeur et de l&apos;opérateur de la plateforme La Fusée.</>}
    >
      <LegalSection title="Éditeur et opérateur">
        <ul>
          <li><strong>Dénomination</strong> : UPgraders / La Fusée SARL</li>
          <li><strong>Siège</strong> : Douala, Cameroun</li>
          <li><strong>Directeur de la publication</strong> : Alexandre Djengue Mbangue</li>
          <li><strong>Contact</strong> : <a href="mailto:legal@lafusee.upgraders.io" className="text-accent hover:underline">legal@lafusee.upgraders.io</a></li>
          <li><strong>Produit</strong> : « La Fusée », Industry OS — plateforme d&apos;architecture, de production et de mesure de marques, opérée par UPgraders.</li>
        </ul>
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
          de marque (méthode ADVERTIS), orchestre la production de livrables, mesure l&apos;effet (score /200) et{" "}
          <strong>dispatch</strong> des missions vers des talents et agences tiers. Dans ce dispatch, UPgraders
          intervient comme opérateur technique d&apos;orchestration et d&apos;intermédiation gouvernée — qualification,
          matching, séquestre par jalons, contrôle qualité, traçabilité — selon le partage de responsabilités
          détaillé aux <a href="/cgv" className="text-accent hover:underline">CGV (art. 6)</a>. Les talents
          demeurent des professionnels indépendants, responsables de leurs livraisons au sein des missions.
        </p>
      </LegalSection>

      <LegalSection title="Propriété intellectuelle">
        <p>
          La méthode ADVERTIS / ADVE-RTIS, le nom « La Fusée », les interfaces, le moteur analytique et l&apos;ensemble
          du corpus de la plateforme sont la propriété d&apos;UPgraders. Les livrables produits pour un client lui
          sont cédés selon les <a href="/cgu" className="text-accent hover:underline">CGU (art. 2)</a>. Toute
          reproduction non autorisée de la plateforme ou de la méthode est interdite.
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
