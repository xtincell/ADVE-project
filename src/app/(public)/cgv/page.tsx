/**
 * /cgv — Conditions Générales de Vente (Vague 6 — conformité B2B).
 *
 * Transposition opposable du Cahier des charges détaillé : obligation
 * d'effet TRACÉ (Ch.1 — résultat sur la strate ferme, moyens renforcés
 * prouvés sur la strate visée), recours mécaniques, renonciation au droit de
 * rétractation (exécution immédiate), rôle de l'OS dans le dispatch (Ch.4),
 * pricing localisé figé au devis (Ch.6), patrimoine emporté à la sortie (Ch.9).
 */
import { LegalShell, LegalSection, LegalTable } from "@/components/legal/legal-shell";

export const metadata = {
  title: "CGV — La Fusée",
  description:
    "Conditions Générales de Vente La Fusée Industry OS — obligation d'effet tracé, SLA, recours, rétractation, dispatch.",
};

export default function CgvPage() {
  return (
    <LegalShell
      title="Conditions Générales de Vente"
      updated="12 juin 2026"
      intro={
        <>
          Les présentes CGV régissent toute souscription aux offres de La Fusée, l&apos;Industry OS opéré par
          UPgraders / La Fusée SARL (Douala, Cameroun). Elles s&apos;appliquent aux clients professionnels (B2B).
        </>
      }
    >
      <LegalSection title="1. Offres et prix — calcul localisé, devis figé">
        <p>
          Les offres suivent le product ladder publié sur la page <a href="/pricing" className="text-accent hover:underline">/pricing</a> :
          diagnostic gratuit, rapports one-shot (PDF ADVE-RTIS, Oracle complet), abonnements mensuels
          (Embarquement, Starter, Pro, Group) et Enterprise sur devis.
        </p>
        <ul>
          <li>
            Les prix sont <strong>calculés en temps réel selon la zone du client</strong> (indice de marché composite,
            devise locale, fiscalité) — il n&apos;existe pas de grille mondiale unique.
          </li>
          <li>
            Tout devis émis <strong>fige les paramètres de calcul utilisés</strong> (versions d&apos;indices + horodatage,
            scellés dans la trace) : un prix accepté est reproductible et opposable pendant sa durée de validité.
          </li>
          <li>La TVA et taxes applicables s&apos;ajoutent selon le pays de facturation.</li>
        </ul>
      </LegalSection>

      <LegalSection title="2. Paiement">
        <ul>
          <li>
            <strong>Zone FCFA (XAF/XOF)</strong> : mobile money et cartes via CinetPay. Les abonnements y
            fonctionnent par <strong>cycles de 30 jours payés un à un</strong> : aucun prélèvement automatique —
            chaque cycle est un nouvel acte de paiement consenti. L&apos;accès expire à la fin de la période payée.
          </li>
          <li>
            <strong>International</strong> : carte bancaire via Stripe (abonnement récurrent, annulable à tout moment
            à effet fin de période) ou PayPal.
          </li>
          <li>
            <strong>Usage API</strong> : les appels aux serveurs MCP par clé API sont mesurés à l&apos;appel et facturés
            par relevés mensuels (franchise d&apos;appels incluse, tarif par appel contractuel, relevé gelé à
            l&apos;émission).
          </li>
          <li>Défaut de paiement : suspension de l&apos;accès après notification ; les données du client restent conservées selon la fenêtre de portabilité (art. 8).</li>
        </ul>
      </LegalSection>

      <LegalSection title="3. Droit de rétractation — renonciation expresse">
        <p>
          Les livrables de La Fusée sont des <strong>contenus numériques à exécution immédiate</strong> : la
          formulation du noyau de marque, la génération du rapport et l&apos;ouverture du Cockpit commencent dès le
          paiement confirmé. En validant sa commande, le client professionnel{" "}
          <strong>
            demande l&apos;exécution immédiate et renonce expressément à tout droit de rétractation
          </strong>{" "}
          à compter de la délivrance du premier livrable numérique. Les recours contractuels de l&apos;article 5
          restent intégralement applicables.
        </p>
      </LegalSection>

      <LegalSection title="4. Nature de l'engagement — l'obligation d'effet tracé">
        <p>
          La Fusée ne vend pas des moyens : elle vend un état final mesuré (palier visé, score cible /200,
          horizon). Cet engagement est une <strong>obligation composite</strong>, dite « obligation d&apos;effet
          tracé », à deux strates de force juridique distincte :
        </p>
        <LegalTable
          headers={["Strate", "Porte sur", "Nature juridique"]}
          rows={[
            [
              "Strate ferme",
              "La méthode (gates de cohérence franchis), la production (livrables au standard QC), la traçabilité (journal d'intents continu et infalsifiable), les délais (SLA publiés)",
              "Obligation de résultat — entièrement sous le contrôle de l'opérateur",
            ],
            [
              "Strate visée",
              "L'altitude atteinte (palier et score à l'horizon)",
              "Obligation de moyens renforcée, intégralement prouvée par la trace — le résultat est co-déterminé par le marché et par le co-pilotage du client",
            ],
          ]}
        />
        <p>
          <strong>Les scores, projections et recommandations produits par l&apos;OS sont des instruments d&apos;aide à la
          décision</strong> : ils n&apos;emportent aucune garantie de résultat commercial absolu. Le constat
          d&apos;atteinte est <strong>mécanique</strong> : à l&apos;horizon contractuel, le système calcule le taux
          d&apos;atteinte à partir du score composite /200 et le scelle dans la trace (Constat d&apos;Altitude) — il
          n&apos;est pas laissé à l&apos;appréciation discrétionnaire d&apos;une partie.
        </p>
      </LegalSection>

      <LegalSection title="5. Recours en cas de non-atteinte">
        <p>
          La part de responsabilité du client est mesurée par l&apos;<strong>Indice de Co-Pilotage (ICP)</strong>,
          calculé sur la trace (suivi des recommandations, tenue du régime de pilotage, réponses aux amendements,
          cadence, maintien du budget). Quatre recours, déclenchés mécaniquement selon l&apos;état constaté et l&apos;ICP :
        </p>
        <ul>
          <li><strong>Remédiation</strong> — prolongation (jusqu'à 50 % de l&apos;horizon initial, plafond un cycle), gratuite si le co-pilotage a été tenu.</li>
          <li><strong>Renégociation du cap</strong> — avenant substituant un nouvel état final.</li>
          <li><strong>Geste commercial</strong> — avoir (crédit en compte) jusqu&apos;à 20 % des honoraires de la période, plafonné à 2 cycles ; remboursement monétaire réservé à la faute de strate ferme.</li>
          <li><strong>Sortie</strong> — résiliation avec conservation intégrale du patrimoine (art. 8).</li>
        </ul>
        <p>
          Tout manquement de la <strong>strate ferme</strong> (trace rompue, livrable hors-norme, SLA violé au sens
          de la page <a href="/sla" className="text-accent hover:underline">/sla</a>) engage l&apos;opérateur quel que
          soit l&apos;ICP : remédiation gratuite immédiate + geste plein, sortie sans pénalité au choix du client.
        </p>
      </LegalSection>

      <LegalSection title="6. Rôle de l'OS dans le dispatch des missions (crew)">
        <p>
          Pour les missions exécutées par des talents ou agences tiers (« crew »), La Fusée agit comme{" "}
          <strong>opérateur technique d&apos;orchestration et d&apos;intermédiation gouvernée</strong> : qualification des
          talents, matching sous SLA, séquestre des fonds par jalons (Hub-Escrow), contrôle qualité par les pairs et
          traçabilité de bout en bout.
        </p>
        <ul>
          <li>L&apos;opérateur garantit en <strong>résultat</strong> : le matching d&apos;un talent qualifié dans les délais SLA et l&apos;intégrité du process escrow/QC.</li>
          <li>La <strong>livraison du talent</strong> relève de l&apos;engagement propre de celui-ci au sein de la mission (fenêtre convenue, jalons séquestrés) — un retard de matching engage l&apos;opérateur, un retard de livraison du créateur relève du régime de défaillance crew (remplacement, escalade, libération des jalons non atteints).</li>
          <li>Le dispatch est journalisé : chaque assignation, validation QC et paiement de jalon est tracé et auditable.</li>
        </ul>
      </LegalSection>

      <LegalSection title="7. Facturation API et services additionnels">
        <p>
          Les clés API sont nominatives, sécurisées par empreinte, révocables. Le relevé mensuel fait foi :
          nombre d&apos;appels constaté par le metering, franchise déduite, tarif contractuel appliqué. Toute
          contestation s&apos;instruit sur les enregistrements d&apos;appels (source de vérité unique).
        </p>
      </LegalSection>

      <LegalSection title="8. Résiliation et patrimoine emporté">
        <p>À la fin du contrat, quelle qu&apos;en soit la cause, le client <strong>emporte son patrimoine</strong> :</p>
        <ul>
          <li>noyau de marque, briefs, assets produits (cession — art. PI des CGU), liste de communauté (Brand Vault) ;</li>
          <li>l&apos;historique tracé de sa marque, exportable en format ouvert (fenêtre de portabilité : 90 jours après la sortie) ;</li>
          <li>les licences d&apos;usage de l&apos;OS (Cockpit, outils, moteur analytique, benchmark sectoriel) s&apos;éteignent — l&apos;outillage reste la propriété d&apos;UPgraders.</li>
        </ul>
        <p>Aucune rétention de données en otage : la portabilité est une condition de validité de l&apos;engagement d&apos;effet.</p>
      </LegalSection>

      <LegalSection title="9. Responsabilité">
        <p>
          La responsabilité totale d&apos;UPgraders au titre d&apos;un contrat est plafonnée aux montants effectivement
          payés sur les douze derniers mois, hors faute lourde ou dolosive. UPgraders ne répond pas des contenus et
          données fournis par le client ni des décisions commerciales prises sur la base des instruments d&apos;aide à
          la décision (art. 4).
        </p>
      </LegalSection>

      <LegalSection title="10. Droit applicable">
        <p>
          Droit applicable : droit de la République du Cameroun et actes uniformes OHADA. Tentative de résolution
          amiable préalable obligatoire (30 jours) ; à défaut, compétence des juridictions de Douala. Pour les
          clients soumis à un ordre public local impératif, les protections impératives de leur ressort demeurent.
        </p>
      </LegalSection>
    </LegalShell>
  );
}
