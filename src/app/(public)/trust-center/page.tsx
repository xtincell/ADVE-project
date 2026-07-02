import type { Metadata } from "next";
import { LegalShell, LegalSection, LegalTable } from "@/components/legal/legal-shell";

/**
 * /trust-center — due diligence B2B. Porté du legacy avec le même mandat :
 * « chaque affirmation correspond à un mécanisme réel du code — pas de
 * marketing, des faits vérifiables ». Réécrit sur les mécanismes v7 :
 * déterminisme d'abord, journal d'audit hash-chaîné, gateway IA à bascule,
 * validation de paiement atomique, CI bloquante, infrastructure Coolify.
 */

export const metadata: Metadata = {
  title: "Trust Center",
  description:
    "Trust Center La Fusée — fiabilité par construction, traçabilité hash-chaînée, sécurité, continuité, réversibilité : les mécanismes réels de la plateforme.",
};

export default function TrustCenterPage() {
  return (
    <LegalShell
      title="Trust Center"
      updated="2 juillet 2026"
      intro={
        <>
          Cette page documente les mécanismes par lesquels La Fusée tient ses engagements. Chaque
          point correspond à un dispositif réel et auditable de la plateforme — état en direct sur{" "}
          <a href="/status">/status</a>, historique des évolutions sur{" "}
          <a href="/changelog">/changelog</a>.
        </>
      }
    >
      <LegalSection title="1. Fiabilité par construction">
        <ul>
          <li>
            <strong>Déterminisme d&apos;abord</strong> : le diagnostic, le score sur 100, le pricing
            par zone et la composition de l&apos;Oracle sont des fonctions pures reproduites à
            l&apos;identique depuis vos données — variance zéro, auditables ligne à ligne. Un
            incident chez un fournisseur d&apos;IA <em>ne bloque jamais une livraison</em>.
          </li>
          <li>
            <strong>IA optionnelle, encadrée</strong> : la passerelle IA bascule automatiquement
            entre fournisseurs (Anthropic → OpenAI → local → OpenRouter), borne chaque appel dans le
            temps et valide chaque sortie par schéma — une réponse non conforme est rejetée, jamais
            persistée silencieusement. Sans fournisseur configuré, la fonctionnalité disparaît de
            l&apos;interface au lieu de simuler.
          </li>
          <li>
            <strong>Jamais de donnée inventée</strong> : quand une information manque, la plateforme
            affiche un état vide honnête ou un statut différé explicite — jamais un succès simulé ni
            du remplissage. Barèmes, taxonomies et indices de zone sont des données versionnées, pas
            des constantes cachées.
          </li>
          <li>
            <strong>Validation de paiement idempotente</strong> : les flips de statut sont atomiques
            — une demande de souscription ne se valide qu&apos;une seule fois, même sous
            double-clic ; une extension d&apos;abonnement appliquée deux fois est structurellement
            impossible.
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="2. Traçabilité et gouvernance">
        <ul>
          <li>
            <strong>Journal d&apos;audit hash-chaîné</strong> : toute mutation métier (inscription,
            amendement de pilier, validation de paiement…) écrit une ligne chaînée par empreinte à
            la précédente, dans la même transaction que la mutation — l&apos;historique ne se
            réécrit pas, toute altération a posteriori est détectable.
          </li>
          <li>
            <strong>Noyau de marque sous contrôle humain</strong> : chaque révision de pilier est
            versionnée et chaînée ; l&apos;IA propose des brouillons marqués « à valider »,
            l&apos;humain dispose — aucun automatisme n&apos;écrit le noyau.
          </li>
          <li>
            <strong>Décisions d&apos;architecture tracées</strong> : chaque choix structurant de la
            plateforme est documenté, numéroté et daté dans le dépôt de décisions — contexte,
            alternatives écartées, conséquences.
          </li>
          <li>
            <strong>Isolation default-deny</strong> : le cloisonnement par espace client est vérifié
            à chaque requête ; aucune donnée métier ne circule entre clients.
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="3. Sécurité">
        <LegalTable
          headers={["Surface", "Mécanisme"]}
          rows={[
            ["Transport", "TLS 1.2+ partout (certificats Let's Encrypt)"],
            ["Mots de passe", "Hachage bcrypt 12 rounds — jamais stockés en clair"],
            ["Sessions", "JWT signés, cookies httpOnly + secure"],
            [
              "Secrets système",
              "Variables d'environnement exclusivement — jamais en base, jamais dans le dépôt",
            ],
            [
              "Paiements",
              "Aucune donnée carte ni credential mobile money — règlement de gré à gré, seule une référence courte est journalisée",
            ],
            ["Accès", "Contrôle par rôle et par espace client à chaque requête (middleware)"],
          ]}
        />
      </LegalSection>

      <LegalSection title="4. Continuité et réversibilité">
        <ul>
          <li>
            <strong>CI bloquante</strong> : vérification des types, suite de tests automatisés,
            validation du schéma de données et build complet doivent être verts avant toute mise en
            production — pas de « rouge toléré ».
          </li>
          <li>
            Schéma de données versionné, appliqué automatiquement au déploiement ; toute opération
            sensible (migration de données, bascule de version) est précédée d&apos;une sauvegarde
            complète.
          </li>
          <li>
            <strong>Réversibilité client</strong> : export du patrimoine en format ouvert, version
            imprimable des livrables depuis le Cockpit, fenêtre de portabilité de 90 jours
            post-contrat — aucune rétention en otage (<a href="/cgv">CGV art. 7</a>).
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="5. Conformité">
        <p>
          RGPD / Convention de Malabo / cadres nationaux : voir le <a href="/dpa">DPA</a> (classes
          de données, non-entraînement des LLM, sous-traitants, violations) et la{" "}
          <a href="/privacy">politique de confidentialité</a>. Engagements de délais :{" "}
          <a href="/sla">SLA</a>. Cadre contractuel : <a href="/cgv">CGV</a> ·{" "}
          <a href="/cgu">CGU</a>.
        </p>
      </LegalSection>

      <LegalSection title="6. Contact due diligence">
        <p>
          Dossier de due diligence détaillé (architecture, registre des traitements, attestations
          fournisseurs) sur demande raisonnable :{" "}
          <a href="mailto:bonjour@upgraders.pro">bonjour@upgraders.pro</a>.
        </p>
      </LegalSection>
    </LegalShell>
  );
}
