/**
 * /cgu — Conditions Générales d'Utilisation (Vague 6 — conformité B2B).
 * Accès aux portails, licence SaaS (la marque au client, l'apparatus à
 * l'opérateur — Cahier des charges Ch.9), usage acceptable, gouvernance ADVE.
 */
import { LegalShell, LegalSection, LegalTable } from "@/components/legal/legal-shell";

export const metadata = {
  title: "CGU — La Fusée",
  description: "Conditions Générales d'Utilisation de La Fusée Industry OS — comptes, licence, propriété, usage.",
};

export default function CguPage() {
  return (
    <LegalShell
      title="Conditions Générales d'Utilisation"
      updated="12 juillet 2026"
      intro={
        <>
          Les présentes CGU régissent l&apos;accès aux portails de La Fusée (Launchpad public, Cockpit, Console,
          Crew Quarters) et l&apos;usage de l&apos;Industry OS, quel que soit le plan souscrit.
        </>
      }
    >
      <LegalSection title="1. Comptes et rôles">
        <ul>
          <li>Un compte est personnel ; les identifiants ne se partagent pas. Les comptes administrateurs peuvent être soumis à une double authentification (TOTP).</li>
          <li>Les rôles (founder, créateur, agence, opérateur, administrateur) déterminent les surfaces accessibles. La promotion/rétrogradation d&apos;un rôle est un acte d&apos;administration tracé.</li>
          <li>Le titulaire répond de l&apos;exactitude des informations fournies (notamment pays/zone, qui détermine la tarification et le régime de données applicable).</li>
        </ul>
      </LegalSection>

      <LegalSection title="2. Licence d'utilisation de l'OS">
        <p>
          UPgraders concède au client, pour la durée de son plan, une licence d&apos;utilisation{" "}
          <strong>non exclusive, non transférable</strong> de l&apos;OS (Cockpit, outils de production, moteur
          analytique, benchmark). Cette licence s&apos;éteint à la fin du contrat. La répartition de propriété est
          constante :
        </p>
        <LegalTable
          headers={["Objet", "Propriétaire", "Régime"]}
          rows={[
            ["Noyau de marque, briefs, assets produits, communauté (Brand Vault), historique tracé natif", "Le client", "Cession / propriété — emportés à la sortie"],
            ["OS, outils, gabarits, moteur analytique, méthode ADVERTIS", "UPgraders", "Licence d'usage pendant le contrat"],
            ["Apprentissages agrégés anonymisés (signal pool, k ≥ 5)", "UPgraders", "Sous opt-in explicite du client — irrévocable sur l'agrégé, stoppable pour le futur"],
          ]}
        />
        <p>
          Sur les contenus générés par IA, UPgraders cède les droits les plus larges cessibles et garantit au
          client l&apos;usage exclusif ; le brief et le noyau de marque sous-jacents, protégeables, sont cédés en
          pleine propriété.
        </p>
      </LegalSection>

      <LegalSection title="3. Gouvernance du noyau de marque">
        <ul>
          <li>
            Le noyau ADVE du client ne peut être modifié que par <strong>action explicite d&apos;un humain
            autorisé</strong> (amendement opérateur). Aucun automatisme — y compris l&apos;IA de la plateforme — ne
            réécrit le noyau sans validation : le système observe, propose, l&apos;humain dispose.
          </li>
          <li>Chaque mutation métier transite par le journal d&apos;intents (hash-chaîné) : l&apos;historique ne se réécrit pas.</li>
          <li>Les recommandations sont scorées et comparées au contenu en place : une proposition inférieure au contenu existant est refusée par le système avec motif.</li>
        </ul>
      </LegalSection>

      <LegalSection title="4. Usage acceptable">
        <ul>
          <li>Pas d&apos;usage illicite, diffamatoire, contrefaisant ou contraire aux droits des tiers ; le client garantit détenir les droits sur les contenus qu&apos;il importe (assets, listes de contacts — base légale requise).</li>
          <li>Pas de tentative de contournement des mécanismes de gouvernance, de quotas, de facturation API ou d&apos;isolation entre espaces clients.</li>
          <li>Pas d&apos;extraction massive ou de revente de l&apos;intelligence sectorielle de la plateforme.</li>
          <li>Les talents de la Guilde respectent les standards QC et les fenêtres de livraison convenues par mission.</li>
        </ul>
      </LegalSection>

      <LegalSection title="5. Réseaux sociaux connectés — mandat de gestion">
        <p>
          Le client (ou son délégué autorisé) peut connecter les comptes sociaux et boutiques de sa marque
          via OAuth. En connectant un compte, il <strong>mandate la plateforme</strong> pour, en son nom et
          sur ses instructions : lire les statistiques et publications de ses comptes, collecter les
          interactions publiques adressées à sa marque (commentaires, mentions), y répondre, et publier ou
          planifier des contenus qu&apos;il a rédigés ou approuvés.
        </p>
        <ul>
          <li>Les jetons d&apos;accès sont chiffrés (AES-256-GCM), jamais exposés, révocables à tout instant depuis Mon compte → Connexions ou depuis la plateforme d&apos;origine.</li>
          <li>Le client reste seul responsable éditorial des contenus publiés et des réponses envoyées en son nom ; il garantit leur licéité et respecte les règles de chaque plateforme.</li>
          <li>Pour les données des tiers traitées à cette occasion (auteurs de commentaires, messages adressés à la marque), le client est responsable de traitement et UPgraders sous-traitant — périmètre, durées et droits détaillés dans la <a href="/privacy" className="text-accent hover:underline">Politique de confidentialité</a> et le <a href="/dpa" className="text-accent hover:underline">DPA</a>.</li>
          <li>Certaines capacités dépendent des autorisations accordées par les plateformes (Meta, Google, LinkedIn…) ; la plateforme affiche honnêtement ce qui est actif, en attente de reconnexion, ou indisponible.</li>
        </ul>
      </LegalSection>

      <LegalSection title="6. Disponibilité et évolution">
        <p>
          Le service est fourni en mode SaaS avec des objectifs de niveau de service publiés sur{" "}
          <a href="/sla" className="text-accent hover:underline">/sla</a> et un état de la plateforme sur{" "}
          <a href="/status" className="text-accent hover:underline">/status</a>. UPgraders peut faire évoluer
          l&apos;OS (fonctionnalités, interfaces) sans dégrader les engagements contractuels en cours ; les
          changements notables sont journalisés dans le changelog public.
        </p>
      </LegalSection>

      <LegalSection title="7. Suspension et résiliation">
        <ul>
          <li>UPgraders peut suspendre un compte en cas de violation grave des présentes (fraude, contournement, impayé persistant), après notification motivée sauf urgence.</li>
          <li>La résiliation n&apos;ampute jamais le patrimoine du client : export et portabilité selon les CGV (art. 8) et le <a href="/dpa" className="text-accent hover:underline">DPA</a>.</li>
        </ul>
      </LegalSection>

      <LegalSection title="8. Contact">
        <p>
          Questions sur les présentes :{" "}
          <a href="mailto:legal@lafusee.upgraders.io" className="text-accent hover:underline">legal@lafusee.upgraders.io</a>.
        </p>
      </LegalSection>
    </LegalShell>
  );
}
