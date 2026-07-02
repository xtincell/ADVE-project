import type { Metadata } from "next";
import { LegalShell, LegalSection, LegalTable } from "@/components/legal/legal-shell";

/**
 * /cgu — Conditions Générales d'Utilisation. Porté du legacy (Vague 6
 * conformité B2B) : licence SaaS (la marque au client, l'outillage à
 * l'opérateur), gouvernance du noyau ADVE, usage acceptable. Adapté à la
 * réalité v7 : espaces Cockpit/console (plus de 4 portails), journal d'audit
 * hash-chaîné (plus de bus d'intents), brouillons IA « à valider ».
 */

export const metadata: Metadata = {
  title: "CGU",
  description:
    "Conditions Générales d'Utilisation de La Fusée — comptes, licence, propriété, gouvernance du noyau de marque, usage acceptable.",
};

export default function CguPage() {
  return (
    <LegalShell
      title="Conditions Générales d'Utilisation"
      updated="2 juillet 2026"
      intro={
        <>
          Les présentes CGU régissent l&apos;accès aux surfaces de La Fusée — site public, espace
          client (Cockpit) et console d&apos;administration — et l&apos;usage de la plateforme, quel
          que soit le plan souscrit.
        </>
      }
    >
      <LegalSection title="1. Comptes et rôles">
        <ul>
          <li>
            Un compte est personnel ; les identifiants ne se partagent pas. Les mots de passe sont
            stockés hachés (bcrypt), jamais en clair.
          </li>
          <li>
            Les rôles (fondateur, membre d&apos;espace, opérateur UPgraders) déterminent les
            surfaces accessibles. Toute promotion ou rétrogradation de rôle est un acte
            d&apos;administration journalisé.
          </li>
          <li>
            Le titulaire répond de l&apos;exactitude des informations fournies — notamment le
            pays/zone, qui détermine la tarification (<a href="/lafusee/tarifs">/lafusee/tarifs</a>) et le régime de
            données applicable.
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="2. Licence d'utilisation de la plateforme">
        <p>
          UPgraders concède au client, pour la durée de son plan, une licence d&apos;utilisation{" "}
          <strong>non exclusive, non transférable</strong> de la plateforme (Cockpit, moteur de
          diagnostic et de score, composition de livrables). Cette licence s&apos;éteint à la fin du
          contrat. La répartition de propriété est constante :
        </p>
        <LegalTable
          headers={["Objet", "Propriétaire", "Régime"]}
          rows={[
            [
              "Noyau de marque (piliers ADVE/RTIS), livrables produits (dont l'Oracle), historique des révisions",
              "Le client",
              "Cession / propriété — emportés à la sortie",
            ],
            [
              "Plateforme, méthode ADVE/RTIS, moteurs de score et de pricing, gabarits",
              "UPgraders",
              "Licence d'usage pendant le contrat",
            ],
            [
              "Apprentissages agrégés anonymisés (le cas échéant, seuil k ≥ 5 marques)",
              "UPgraders",
              "Sous opt-in explicite du client — irrévocable sur l'agrégé passé, stoppable pour le futur",
            ],
          ]}
        />
        <p>
          Sur les contenus assistés par IA, UPgraders cède au client les droits les plus larges
          cessibles et lui en garantit l&apos;usage exclusif ; le noyau de marque sous-jacent,
          protégeable, est cédé en pleine propriété.
        </p>
      </LegalSection>

      <LegalSection title="3. Gouvernance du noyau de marque">
        <ul>
          <li>
            Le noyau ADVE du client n&apos;est modifié que par{" "}
            <strong>action explicite d&apos;un humain autorisé</strong>. Aucun automatisme — y
            compris l&apos;assistance IA de la plateforme — ne réécrit le noyau : l&apos;IA ne
            produit que des <strong>brouillons marqués « à valider »</strong>, que l&apos;humain
            confirme ou rejette champ par champ.
          </li>
          <li>
            Chaque révision de pilier est versionnée et chaque mutation métier écrit une ligne dans
            le journal d&apos;audit <strong>chaîné par empreintes (hash)</strong> :
            l&apos;historique ne se réécrit pas.
          </li>
          <li>
            Les piliers dérivés (RTIS) sont recalculés depuis le noyau déclaré — jamais édités à la
            main, ni par le client ni par l&apos;opérateur.
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="4. Usage acceptable">
        <ul>
          <li>
            Pas d&apos;usage illicite, diffamatoire, contrefaisant ou contraire aux droits des tiers
            ; le client garantit détenir les droits sur les contenus qu&apos;il fournit à la
            plateforme (textes, assets, listes de contacts — base légale requise).
          </li>
          <li>
            Pas de tentative de contournement des mécanismes de gouvernance, de facturation ou
            d&apos;isolation entre espaces clients.
          </li>
          <li>
            Pas d&apos;extraction massive ni de revente de l&apos;intelligence sectorielle de la
            plateforme (barèmes, indices de zone, référentiels).
          </li>
          <li>
            À l&apos;ouverture de la Guilde, les talents respecteront les standards de qualité et
            les fenêtres de livraison convenues par mission.
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="5. Disponibilité et évolution">
        <p>
          Le service est fourni en mode SaaS avec des engagements de niveau de service publiés sur{" "}
          <a href="/sla">/sla</a> et un état de la plateforme sur <a href="/status">/status</a>.
          UPgraders peut faire évoluer la plateforme (fonctionnalités, interfaces) sans dégrader les
          engagements contractuels en cours ; les évolutions notables sont publiées sur le{" "}
          <a href="/changelog">changelog</a>.
        </p>
      </LegalSection>

      <LegalSection title="6. Suspension et résiliation">
        <ul>
          <li>
            UPgraders peut suspendre un compte en cas de violation grave des présentes (fraude,
            contournement, impayé persistant), après notification motivée sauf urgence.
          </li>
          <li>
            La résiliation n&apos;ampute jamais le patrimoine du client : export et portabilité
            selon les <a href="/cgv">CGV (art. 7)</a> et le <a href="/dpa">DPA</a>. Un livrable déjà
            produit reste lisible — il n&apos;est jamais confisqué.
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="7. Contact">
        <p>
          Questions sur les présentes :{" "}
          <a href="mailto:bonjour@upgraders.pro">bonjour@upgraders.pro</a>.
        </p>
      </LegalSection>
    </LegalShell>
  );
}
