import type { Metadata } from "next";
import { LegalShell, LegalSection, LegalTable } from "@/components/legal/legal-shell";

/**
 * /dpa — accord de traitement des données (B2B). Porté du legacy (doctrine de
 * données du Cahier des charges Ch.2 : classes de données, isolation
 * default-deny, non-entraînement LLM, hash-chain vs effacement) et aligné sur
 * la réalité v7 : VPS/Coolify + PostgreSQL auto-hébergé (plus de
 * Vercel/Supabase), pas de prestataire carte (mobile money de gré à gré),
 * journal d'audit minimisé plutôt que « zéro PII » invérifiable.
 */

export const metadata: Metadata = {
  title: "DPA",
  description:
    "Accord de traitement des données La Fusée — classes de données, isolation default-deny, non-entraînement des LLM, sécurité, sous-traitants, violations.",
};

export default function DpaPage() {
  return (
    <LegalShell
      title="Accord de traitement des données (DPA)"
      updated="2 juillet 2026"
      intro={
        <>
          Le présent accord encadre les traitements opérés par UPgraders SARL pour le compte de ses
          clients professionnels. Il complète la{" "}
          <a href="/privacy">politique de confidentialité</a> et prévaut sur elle pour la relation
          B2B. Signature d&apos;un exemplaire dédié sur demande :{" "}
          <a href="mailto:bonjour@upgraders.pro">bonjour@upgraders.pro</a>.
        </>
      }
    >
      <LegalSection title="1. Rôles et objet">
        <p>
          Le client est <strong>responsable de traitement</strong> des données de sa marque ;
          UPgraders agit en <strong>sous-traitant</strong> pour les besoins exclusifs de la mission
          (diagnostic, production, mesure). Pour les données d&apos;exploitation de la plateforme
          (journal d&apos;audit technique, facturation), UPgraders est responsable de traitement.
        </p>
      </LegalSection>

      <LegalSection title="2. Classes de données et propriété">
        <LegalTable
          headers={["Classe", "Contenu", "Propriétaire", "Remonte au pool cross-marques ?"]}
          rows={[
            [
              "Donnée de marque",
              "Noyau ADVE/RTIS, révisions, livrables (dont l'Oracle), contenus fournis au diagnostic",
              "Le client",
              "Non — jamais",
            ],
            [
              "Donnée d'usage",
              "Journal d'audit, historique de pilotage, événements de facturation",
              "UPgraders (lecture client sur son périmètre)",
              "Non identifiant",
            ],
            [
              "Apprentissage agrégé (le cas échéant)",
              "Patterns abstraits anonymisés appris sur la flotte",
              "UPgraders",
              "Oui — uniquement si opt-in explicite ET seuil d'anonymat k ≥ 5 marques",
            ],
          ]}
        />
        <ul>
          <li>
            <strong>Isolation par défaut (default-deny)</strong> : aucune donnée métier d&apos;un
            client ne traverse vers un autre client. Un client ne voit jamais les piliers ou
            livrables d&apos;un autre — le cloisonnement par espace est vérifié à chaque requête.
          </li>
          <li>
            La contribution au pool d&apos;apprentissage est{" "}
            <strong>désactivée par défaut</strong>, révocable à tout moment à effet futur ; les
            données personnelles (contacts, communauté) n&apos;y entrent jamais, opt-in ou pas.
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="3. Ingestion">
        <p>
          Les contenus fournis (formulaires de diagnostic, textes, documents) sont rattachés au seul
          espace du client et soumis au même régime d&apos;isolation. Le client garantit disposer
          d&apos;une base légale pour les données personnelles qu&apos;il importe (notamment les
          listes de contacts) ; l&apos;import est refusé sans cette garantie.
        </p>
      </LegalSection>

      <LegalSection title="4. LLM — non-entraînement garanti">
        <ul>
          <li>
            <strong>
              Aucune donnée client n&apos;est utilisée pour entraîner ou affiner des modèles
              d&apos;IA
            </strong>{" "}
            — ni par UPgraders, ni par ses fournisseurs de modèles.
          </li>
          <li>
            Les appels aux fournisseurs LLM (Anthropic, OpenAI, OpenRouter) sont effectués via API
            avec les garanties contractuelles de ces fournisseurs : les données soumises par API{" "}
            <strong>ne servent pas à l&apos;entraînement</strong> et sont soumises à des durées de
            rétention limitées. Une exécution locale (Ollama) est possible : rien ne sort alors de
            l&apos;infrastructure.
          </li>
          <li>
            La plateforme minimise la surface : les traitements structurants (score, prix,
            composition de l&apos;Oracle) sont <strong>déterministes</strong> et n&apos;envoient{" "}
            <strong>rien</strong> à un LLM. L&apos;IA est réservée à l&apos;assistance explicite
            (brouillons de piliers) et n&apos;est active que si l&apos;opérateur a configuré un
            fournisseur.
          </li>
          <li>
            Sortie structurée validée par schéma : une réponse LLM non conforme est rejetée, jamais
            persistée silencieusement. Les contenus de marque transmis au modèle sont balisés comme
            données non exécutables (encapsulation anti-injection).
          </li>
          <li>
            Un brouillon IA n&apos;écrase jamais le noyau : il est marqué « à valider » et soumis à
            décision humaine, champ par champ.
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="5. Sécurité">
        <ul>
          <li>
            <strong>En transit</strong> : TLS 1.2+ sur toutes les surfaces (certificats Let&apos;s
            Encrypt).
          </li>
          <li>
            <strong>Authentification</strong> : mots de passe hachés bcrypt (12 rounds), sessions
            signées (JWT) en cookies httpOnly/secure.
          </li>
          <li>
            <strong>Secrets</strong> : clés et secrets système en variables d&apos;environnement
            exclusivement — jamais en base, jamais dans le code.
          </li>
          <li>
            <strong>Cloisonnement</strong> : contrôle d&apos;accès par rôle et par espace client à
            chaque requête.
          </li>
          <li>
            <strong>Exploitation</strong> : infrastructure dédiée (VPS) administrée par UPgraders ;
            toute opération sensible (migration de données, bascule de version) est précédée
            d&apos;une sauvegarde complète — règle d&apos;exploitation non négociable.
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="6. Traçabilité immuable et droit à l'effacement — coexistence">
        <p>
          Le journal d&apos;audit de la plateforme est <strong>chaîné par empreintes (hash)</strong>{" "}
          : l&apos;historique ne se réécrit pas et toute altération a posteriori est détectable. Il
          est minimisé (actions, identifiants techniques, références), son accès est restreint à
          l&apos;opérateur, et il est conservé 5 ans au titre de l&apos;obligation de traçabilité —
          jamais utilisé à d&apos;autres fins. L&apos;effacement d&apos;une personne purge ses
          données des magasins applicatifs (compte, contenus, leads) ; le journal ne conserve que le
          minimum nécessaire à la preuve d&apos;exécution. L&apos;immuabilité de la trace et le
          droit à l&apos;effacement coexistent ainsi.
        </p>
      </LegalSection>

      <LegalSection title="7. Sous-traitants ultérieurs">
        <LegalTable
          headers={["Sous-traitant", "Rôle", "Localisation"]}
          rows={[
            [
              "Fournisseur d'infrastructure (VPS)",
              "Hébergement de l'application et de la base PostgreSQL, administrées par UPgraders via Coolify",
              "Coordonnées communiquées sur demande",
            ],
            [
              "Anthropic / OpenAI / OpenRouter",
              "Génération LLM optionnelle (API, sans entraînement)",
              "US/UE — données minimisées, uniquement si l'assistance IA est utilisée",
            ],
            [
              "WhatsApp (Meta)",
              "Canal de règlement et de relation commerciale, à l'initiative du client",
              "Selon Meta — aucun credential de paiement chez UPgraders",
            ],
          ]}
        />
        <p>
          Toute évolution de cette liste est notifiée aux clients sous DPA signé, avec faculté
          d&apos;objection motivée.
        </p>
      </LegalSection>

      <LegalSection title="8. Durées, portabilité, restitution">
        <ul>
          <li>
            Données de marque : durée du contrat + fenêtre de portabilité de 90 jours, puis purge
            sur demande ou à l&apos;expiration.
          </li>
          <li>
            Export en format ouvert sur demande à tout moment ; version imprimable (PDF) des
            livrables directement depuis le Cockpit.
          </li>
          <li>Journal d&apos;audit : 5 ans (obligation de traçabilité).</li>
        </ul>
      </LegalSection>

      <LegalSection title="9. Violations de données">
        <p>
          Notification au client <strong>sans retard injustifié et au plus tard 72 h</strong> après
          prise de connaissance d&apos;une violation affectant ses données, avec nature, périmètre,
          mesures prises et point de contact. Registre des incidents tenu par l&apos;opérateur.
        </p>
      </LegalSection>

      <LegalSection title="10. Cadres applicables et audits">
        <p>
          RGPD lorsque des personnes concernées résident dans l&apos;UE ; Convention de Malabo et
          cadres nationaux de la zone (CDP, ARTCI, APDP et équivalents) pour les traitements
          africains. Un audit documentaire annuel est disponible sur demande raisonnable ; voir
          aussi le <a href="/trust-center">Trust Center</a>.
        </p>
      </LegalSection>
    </LegalShell>
  );
}
