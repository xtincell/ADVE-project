import type { Metadata } from "next";
import { LegalShell, LegalSection, LegalTable } from "@/components/legal/legal-shell";

/**
 * /cgv — Conditions Générales de Vente. Porté du legacy (Vague 6, transposition
 * du Cahier des charges) : obligation d'effet tracé à deux strates, recours,
 * renonciation à la rétractation, patrimoine emporté. Adapté à la réalité v7 :
 * plans Cockpit/Retainer, paiement mobile money validé manuellement (cycles
 * re-consentis 30 j / 92 j, grâce découverte 15 j), score /100, Guilde à venir.
 * Retiré : rails Stripe/CinetPay/PayPal et facturation API (inexistants en v7).
 */

export const metadata: Metadata = {
  title: "CGV",
  description:
    "Conditions Générales de Vente La Fusée — pricing localisé, paiement mobile money re-consenti, obligation d'effet tracé, recours, patrimoine emporté.",
};

export default function CgvPage() {
  return (
    <LegalShell
      title="Conditions Générales de Vente"
      updated="2 juillet 2026"
      intro={
        <>
          Les présentes CGV régissent toute souscription aux offres de La Fusée, produit opéré par
          UPgraders SARL (Douala, Cameroun). Elles s&apos;appliquent aux clients professionnels
          (B2B).
        </>
      }
    >
      <LegalSection title="1. Offres et prix — calcul localisé">
        <p>
          Les offres sont publiées sur <a href="/lafusee/tarifs">/lafusee/tarifs</a> : diagnostic ADVE{" "}
          <strong>gratuit</strong>, abonnement <strong>Cockpit</strong> (mensuel),{" "}
          <strong>Retainer</strong> (trimestriel, accompagnement UPgraders) et dispositifs sur
          devis.
        </p>
        <ul>
          <li>
            Les prix sont <strong>calculés selon la zone du client</strong> (indice économique de
            zone, devise locale) — il n&apos;existe pas de grille mondiale unique. Les barèmes et
            indices sont des données versionnées de la plateforme, pas des constantes cachées.
          </li>
          <li>
            Le montant résolu au moment de la demande de souscription est celui dû pour le cycle :
            il est journalisé avec sa référence — un prix accepté est reproductible et opposable.
          </li>
          <li>La TVA et les taxes applicables s&apos;ajoutent selon le pays de facturation.</li>
        </ul>
      </LegalSection>

      <LegalSection title="2. Paiement — mobile money, cycles re-consentis">
        <ul>
          <li>
            <strong>Mobile money (zone FCFA)</strong> : Wave, Orange Money, MTN MoMo, Moov. Le
            règlement s&apos;effectue via WhatsApp avec une référence courte ; chaque paiement est{" "}
            <strong>validé manuellement par l&apos;opérateur sous 24 h ouvrées</strong> —
            l&apos;accès s&apos;ouvre à la validation, pas avant.
          </li>
          <li>
            Les abonnements fonctionnent par <strong>cycles payés un à un</strong> (30 jours pour
            Cockpit, 92 jours pour Retainer) : <strong>aucun prélèvement automatique</strong> —
            chaque cycle est un nouvel acte de paiement consenti. L&apos;accès expire à la fin de la
            période payée.
          </li>
          <li>
            <strong>Grâce découverte</strong> : tout espace nouvellement créé dispose de 15 jours
            pour composer son Oracle sans paiement — la valeur se constate avant de payer.
          </li>
          <li>
            Défaut de paiement : l&apos;accès expire simplement à l&apos;échéance ; les données du
            client restent conservées selon la fenêtre de portabilité (art. 7) et un livrable déjà
            composé reste lisible.
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="3. Droit de rétractation — renonciation expresse">
        <p>
          Les livrables de La Fusée sont des{" "}
          <strong>contenus numériques à exécution immédiate</strong> : l&apos;ouverture du Cockpit
          et la composition des livrables commencent dès le paiement validé. En validant sa
          commande, le client professionnel{" "}
          <strong>
            demande l&apos;exécution immédiate et renonce expressément à tout droit de rétractation
          </strong>{" "}
          à compter de la délivrance du premier livrable numérique. Les recours contractuels de
          l&apos;article 5 restent intégralement applicables.
        </p>
      </LegalSection>

      <LegalSection title="4. Nature de l'engagement — l'obligation d'effet tracé">
        <p>
          La Fusée ne vend pas des moyens : elle vend un état final mesuré (palier visé, score cible
          sur 100, horizon). Cet engagement est une <strong>obligation composite</strong>, dite
          « obligation d&apos;effet tracé », à deux strates de force juridique distincte :
        </p>
        <LegalTable
          headers={["Strate", "Porte sur", "Nature juridique"]}
          rows={[
            [
              "Strate ferme",
              "La méthode (cascade ADVE→RTIS respectée), la production (livrables composés depuis les données réelles du client), la traçabilité (journal d'audit hash-chaîné continu), les délais (SLA publiés)",
              "Obligation de résultat — entièrement sous le contrôle de l'opérateur",
            ],
            [
              "Strate visée",
              "L'altitude atteinte (palier et score à l'horizon)",
              "Obligation de moyens renforcée, prouvée par la trace — le résultat est co-déterminé par le marché et par le co-pilotage du client",
            ],
          ]}
        />
        <p>
          <strong>
            Les scores, diagnostics et recommandations produits par la plateforme sont des
            instruments d&apos;aide à la décision
          </strong>{" "}
          : ils n&apos;emportent aucune garantie de résultat commercial absolu. Le constat
          d&apos;atteinte est <strong>mécanique</strong> : à l&apos;horizon contractuel, le taux
          d&apos;atteinte est calculé depuis le score composite sur 100 et journalisé — il
          n&apos;est pas laissé à l&apos;appréciation discrétionnaire d&apos;une partie.
        </p>
      </LegalSection>

      <LegalSection title="5. Recours en cas de non-atteinte">
        <p>
          La part de co-pilotage du client est appréciée sur la trace : suivi des recommandations,
          réponses aux demandes d&apos;amendement du noyau, cadence de pilotage, maintien du budget.
          Quatre recours, selon l&apos;état constaté et ce co-pilotage :
        </p>
        <ul>
          <li>
            <strong>Remédiation</strong> — prolongation (jusqu&apos;à 50 % de l&apos;horizon
            initial, plafond un cycle), gratuite si le co-pilotage a été tenu.
          </li>
          <li>
            <strong>Renégociation du cap</strong> — avenant substituant un nouvel état final.
          </li>
          <li>
            <strong>Geste commercial</strong> — avoir (crédit en compte) jusqu&apos;à 20 % des
            honoraires de la période, plafonné à 2 cycles ; remboursement monétaire réservé à la
            faute de strate ferme.
          </li>
          <li>
            <strong>Sortie</strong> — résiliation avec conservation intégrale du patrimoine
            (art. 7).
          </li>
        </ul>
        <p>
          Tout manquement de la <strong>strate ferme</strong> (trace rompue, livrable hors-norme,
          SLA violé au sens de la page <a href="/sla">/sla</a>) engage l&apos;opérateur quel que
          soit le co-pilotage : remédiation gratuite immédiate + geste plein, ou sortie sans
          pénalité au choix du client.
        </p>
      </LegalSection>

      <LegalSection title="6. Missions et talents tiers (La Guilde — à venir)">
        <p>
          Le présent article s&apos;applique à compter de l&apos;ouverture de la Guilde (réseau de
          talents). Pour les missions exécutées par des talents ou agences tiers, La Fusée agit
          comme <strong>opérateur technique d&apos;orchestration et d&apos;intermédiation
          gouvernée</strong> : qualification des talents, matching sous SLA, contrôle qualité et
          traçabilité de bout en bout.
        </p>
        <ul>
          <li>
            L&apos;opérateur garantit en <strong>résultat</strong> : le matching d&apos;un talent
            qualifié dans les délais SLA (publiés sur <a href="/sla">/sla</a> avant ouverture) et
            l&apos;intégrité du process de qualité.
          </li>
          <li>
            La <strong>livraison du talent</strong> relève de l&apos;engagement propre de celui-ci
            au sein de la mission — un retard de matching engage l&apos;opérateur ; un retard de
            livraison du talent relève du régime de défaillance (remplacement, escalade).
          </li>
          <li>Le dispatch est journalisé : chaque assignation et validation est tracée et auditable.</li>
        </ul>
      </LegalSection>

      <LegalSection title="7. Résiliation et patrimoine emporté">
        <p>
          À la fin du contrat, quelle qu&apos;en soit la cause, le client{" "}
          <strong>emporte son patrimoine</strong> :
        </p>
        <ul>
          <li>
            noyau de marque (piliers), livrables produits — dont l&apos;Oracle — et historique des
            révisions (cession — art. 2 des <a href="/cgu">CGU</a>) ;
          </li>
          <li>
            export en format ouvert sur demande, version imprimable des livrables depuis le Cockpit
            (fenêtre de portabilité : 90 jours après la sortie) ;
          </li>
          <li>
            les licences d&apos;usage de la plateforme s&apos;éteignent — l&apos;outillage et la
            méthode restent la propriété d&apos;UPgraders.
          </li>
        </ul>
        <p>
          Aucune rétention de données en otage : la portabilité est une condition de validité de
          l&apos;engagement d&apos;effet.
        </p>
      </LegalSection>

      <LegalSection title="8. Responsabilité">
        <p>
          La responsabilité totale d&apos;UPgraders au titre d&apos;un contrat est plafonnée aux
          montants effectivement payés sur les douze derniers mois, hors faute lourde ou dolosive.
          UPgraders ne répond pas des contenus et données fournis par le client, ni des décisions
          commerciales prises sur la base des instruments d&apos;aide à la décision (art. 4).
        </p>
      </LegalSection>

      <LegalSection title="9. Droit applicable">
        <p>
          Droit de la République du Cameroun et actes uniformes OHADA. Tentative de résolution
          amiable préalable obligatoire (30 jours) ; à défaut, compétence des juridictions de
          Douala. Pour les clients soumis à un ordre public local impératif, les protections
          impératives de leur ressort demeurent.
        </p>
      </LegalSection>
    </LegalShell>
  );
}
