/**
 * /dpa — Accord de traitement des données (Vague 6 — conformité B2B).
 * Transposition de la doctrine de données du Cahier des charges Ch.2 :
 * classes de données, isolation default-deny, non-entraînement des LLM,
 * chiffrement, hash-chain vs effacement, signal pool opt-in k≥5.
 */
import { LegalShell, LegalSection, LegalTable } from "@/components/legal/legal-shell";

export const metadata = {
  title: "DPA — La Fusée",
  description:
    "Accord de traitement des données La Fusée — ingestion, isolation, non-entraînement des LLM, chiffrement, sous-traitants.",
};

export default function DpaPage() {
  return (
    <LegalShell
      title="Accord de traitement des données (DPA)"
      updated="12 juin 2026"
      intro={
        <>
          Le présent accord encadre les traitements opérés par UPgraders / La Fusée SARL pour le compte de ses
          clients professionnels. Il complète la <a href="/privacy" className="text-accent hover:underline">politique de confidentialité</a> et
          prévaut sur elle pour la relation B2B. Signature d&apos;un exemplaire dédié sur demande :{" "}
          <a href="mailto:privacy@lafusee.upgraders.io" className="text-accent hover:underline">privacy@lafusee.upgraders.io</a>.
        </>
      }
    >
      <LegalSection title="1. Rôles et objet">
        <p>
          Le client est <strong>responsable de traitement</strong> des données de sa marque ; UPgraders agit en{" "}
          <strong>sous-traitant</strong> pour les besoins exclusifs de la mission (diagnostic, production,
          mesure, dispatch). Pour les données d&apos;exploitation de la plateforme (télémétrie technique,
          facturation), UPgraders est responsable de traitement.
        </p>
      </LegalSection>

      <LegalSection title="2. Classes de données et propriété">
        <LegalTable
          headers={["Classe", "Contenu", "Propriétaire", "Remonte au pool cross-marques ?"]}
          rows={[
            ["Donnée de marque", "Noyau ADVE/RTIS, briefs, assets, campagnes, Brand Vault (contacts communauté)", "Le client", "Non — jamais"],
            ["Donnée d'usage", "Télémétrie, événements, journaux, historique de pilotage", "UPgraders (lecture client depuis son Cockpit)", "Non identifiant"],
            ["Apprentissage agrégé", "Patterns abstraits anonymisés appris sur la flotte", "UPgraders", "Oui — uniquement si opt-in explicite ET seuil d'anonymat k ≥ 5 marques"],
          ]}
        />
        <ul>
          <li><strong>Isolation par défaut (default-deny)</strong> : aucune donnée métier d&apos;un client ne traverse vers un autre client. Un client ne voit jamais les piliers, briefs ou assets d&apos;un autre.</li>
          <li>La contribution au pool d&apos;apprentissage est <strong>désactivée par défaut</strong>, révocable à tout moment à effet futur ; la liste de communauté (PII) n&apos;y entre jamais, opt-in ou pas.</li>
        </ul>
      </LegalSection>

      <LegalSection title="3. Ingestion et briefs">
        <p>
          Les contenus ingérés (formulaires, documents, URL, briefs, études) sont rattachés au seul espace du
          client, indexés pour son usage propre (recherche, génération contextualisée) et soumis au même régime
          d&apos;isolation. Le client garantit disposer d&apos;une base légale pour les données personnelles qu&apos;il
          importe (notamment les listes de contacts) ; l&apos;import de communauté est refusé sans cette garantie.
        </p>
      </LegalSection>

      <LegalSection title="4. LLM — non-entraînement garanti">
        <ul>
          <li>
            <strong>Aucune donnée client n&apos;est utilisée pour entraîner ou affiner des modèles d&apos;IA</strong> —
            ni par UPgraders, ni par ses fournisseurs de modèles.
          </li>
          <li>
            Les appels aux fournisseurs LLM (Anthropic, OpenAI) sont effectués via API avec les garanties
            contractuelles de ces fournisseurs : les données soumises par API <strong>ne servent pas à
            l&apos;entraînement</strong> de leurs modèles et sont soumises à des durées de rétention limitées.
          </li>
          <li>La plateforme minimise la surface : ~95 % des traitements (scores, prix, gates, compilation) sont déterministes et n&apos;envoient <strong>rien</strong> à un LLM ; le LLM est réservé à la génération créative explicite.</li>
          <li>Sortie structurée validée par schéma : les réponses LLM non conformes sont rejetées, jamais persistées silencieusement.</li>
        </ul>
      </LegalSection>

      <LegalSection title="5. Sécurité et chiffrement">
        <ul>
          <li><strong>En transit</strong> : TLS 1.2+ sur toutes les surfaces (web, API, webhooks).</li>
          <li><strong>Au repos</strong> : chiffrement AES-256 des bases et sauvegardes (infrastructure Supabase/PostgreSQL managée).</li>
          <li><strong>Secrets</strong> : les clés de paiement et secrets système vivent en variables d&apos;environnement, jamais en base ; les credentials de connecteurs externes sont stockés chiffrés dans un coffre applicatif ; les clés API émises ne sont conservées qu&apos;en empreinte SHA-256.</li>
          <li><strong>Authentification</strong> : mots de passe hachés (bcrypt, 12 rounds), double authentification TOTP disponible et exigible pour les administrateurs.</li>
          <li><strong>Cloisonnement</strong> : contrôle d&apos;accès par rôle et par espace client à chaque requête.</li>
        </ul>
      </LegalSection>

      <LegalSection title="6. Traçabilité immuable et droit à l'effacement — coexistence">
        <p>
          Le journal de gouvernance de la plateforme est chaîné par empreintes (hash) pour garantir
          l&apos;infalsifiabilité de l&apos;historique. <strong>Il ne contient jamais de données personnelles en
          clair</strong> : les PII vivent hors-chaîne, dans des magasins effaçables. L&apos;effacement d&apos;une
          personne purge ses données ; la chaîne conserve la seule preuve d&apos;existence (empreinte), vide de
          contenu. L&apos;immuabilité de la trace et le droit à l&apos;effacement coexistent ainsi sans exception.
        </p>
      </LegalSection>

      <LegalSection title="7. Sous-traitants ultérieurs">
        <LegalTable
          headers={["Sous-traitant", "Rôle", "Localisation"]}
          rows={[
            ["Vercel", "Hébergement applicatif", "UE/US (CDN mondial)"],
            ["Supabase (PostgreSQL managé)", "Base de données", "Région contractuelle du projet"],
            ["Anthropic / OpenAI", "Génération LLM (API, sans entraînement)", "US — données minimisées"],
            ["CinetPay / Stripe / PayPal", "Paiements", "Selon prestataire — aucune donnée carte chez UPgraders"],
            ["Mailgun / fournisseurs SMS", "Messages transactionnels", "UE/US"],
          ]}
        />
        <p>Toute évolution de cette liste est notifiée aux clients sous DPA signé avec faculté d&apos;objection motivée.</p>
      </LegalSection>

      <LegalSection title="8. Durées, portabilité, restitution">
        <ul>
          <li>Données de marque : durée du contrat + fenêtre de portabilité de 90 jours, puis purge sur demande ou à l&apos;expiration.</li>
          <li>Export en format ouvert (JSON/PDF) à tout moment depuis le Cockpit ou sur demande.</li>
          <li>Journal d&apos;audit : 5 ans (obligation de traçabilité), empreintes seules au-delà.</li>
        </ul>
      </LegalSection>

      <LegalSection title="9. Violations de données">
        <p>
          Notification au client <strong>sans retard injustifié et au plus tard 72 h</strong> après prise de
          connaissance d&apos;une violation affectant ses données, avec nature, périmètre, mesures prises et point de
          contact. Registre des incidents tenu en gouvernance.
        </p>
      </LegalSection>

      <LegalSection title="10. Cadres applicables et audits">
        <p>
          RGPD lorsque des personnes concernées résident dans l&apos;UE ; Convention de Malabo et cadres nationaux
          de la zone (CDP, ARTCI, APDP et équivalents) pour les traitements africains. Un audit documentaire
          annuel est disponible sur demande raisonnable ; voir aussi le{" "}
          <a href="/trust-center" className="text-accent hover:underline">Trust Center</a>.
        </p>
      </LegalSection>
    </LegalShell>
  );
}
