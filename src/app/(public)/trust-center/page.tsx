/**
 * /trust-center — Due diligence B2B (Vague 6).
 * Mandat : « page dédiée prouvant la fiabilité asynchrone et l'échelle
 * industrielle de l'OS ». Chaque affirmation correspond à un mécanisme réel
 * du code (pas de marketing : des faits vérifiables).
 */
import { LegalShell, LegalSection, LegalTable } from "@/components/legal/legal-shell";

export const metadata = {
  title: "Trust Center — La Fusée",
  description:
    "Trust Center La Fusée — fiabilité asynchrone, échelle industrielle, sécurité, gouvernance : les mécanismes réels de l'OS.",
};

export default function TrustCenterPage() {
  return (
    <LegalShell
      title="Trust Center"
      updated="12 juin 2026"
      intro={
        <>
          Cette page documente les mécanismes par lesquels La Fusée tient ses engagements à l&apos;échelle.
          Chaque point correspond à un dispositif réel et auditable de la plateforme — état temps réel sur{" "}
          <a href="/status" className="text-accent hover:underline">/status</a>, historique des évolutions sur{" "}
          <a href="/changelog" className="text-accent hover:underline">/changelog</a>.
        </>
      }
    >
      <LegalSection title="1. Fiabilité asynchrone">
        <ul>
          <li>
            <strong>Notifications temps réel</strong> : flux d&apos;événements serveur (SSE) avec reprise — le
            Cockpit reflète l&apos;état de production sans polling ; la perte d&apos;un canal n&apos;interrompt jamais un
            traitement (émissions best-effort découplées du chemin métier).
          </li>
          <li>
            <strong>Webhooks idempotents</strong> : les confirmations de paiement sont vérifiées en double
            (signature HMAC + re-vérification API côté fournisseur) et rejouables sans double effet — une
            extension d&apos;abonnement appliquée deux fois est structurellement impossible.
          </li>
          <li>
            <strong>Verrous optimistes à TTL</strong> : les générations longues (sections d&apos;Oracle) sont
            protégées par verrou daté — pas de double exécution concurrente, pas de verrou orphelin.
          </li>
          <li>
            <strong>Disjoncteurs LLM</strong> : la passerelle IA surveille chaque fournisseur (circuit breaker),
            bascule automatiquement (Anthropic → OpenAI → local) et dégrade proprement.
          </li>
          <li>
            <strong>Fallback déterministe intégral</strong> : la compilation de l&apos;Oracle (35/35 sections)
            fonctionne <em>sans aucun LLM</em> — composition depuis les données réelles, provenance tracée. Un
            incident fournisseur IA ne bloque jamais une livraison.
          </li>
          <li>
            <strong>Connecteurs externes honnêtes</strong> : sans credentials, un connecteur répond par un statut
            différé explicite — jamais un succès simulé.
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="2. Échelle industrielle">
        <ul>
          <li>
            <strong>Gouvernance par intents</strong> : toute mutation métier transite par un bus unique, journalisé
            en chaîne d&apos;empreintes (hash-chain) — ~480 types d&apos;opérations cataloguées, chacune avec ses
            objectifs de latence/coût (SLO) déclarés.
          </li>
          <li>
            <strong>Déterminisme massif</strong> : ~95 % des traitements (scoring /200, pricing par zone, gates,
            compilation, facturation API) sont des fonctions pures reproductibles — variance zéro, auditables
            ligne à ligne.
          </li>
          <li>
            <strong>Anti-drift continu</strong> : plus de 1 900 tests automatisés dont des suites de gouvernance
            bloquantes (cohérence des 35 sections, cascade de tokens du design system, unicité des chemins
            d&apos;écriture, interdiction des stubs silencieux) exécutées à chaque modification.
          </li>
          <li>
            <strong>Décisions architecturales tracées</strong> : 90+ ADRs publics dans le dépôt de gouvernance —
            chaque choix structurant a son contexte, ses alternatives écartées et sa date.
          </li>
          <li>
            <strong>Isolation tenant default-deny</strong> : l&apos;architecture interdit par défaut toute fuite de
            données métier entre clients ; seuls des agrégats anonymisés (k ≥ 5) circulent, sous opt-in.
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="3. Sécurité">
        <LegalTable
          headers={["Surface", "Mécanisme"]}
          rows={[
            ["Transport", "TLS 1.2+ partout (web, API, webhooks)"],
            ["Stockage", "Chiffrement au repos AES-256 (PostgreSQL managé)"],
            ["Mots de passe", "bcrypt 12 rounds ; MFA TOTP exigible pour les administrateurs"],
            ["Clés API", "Empreinte SHA-256 seule persistée — le secret n'est affiché qu'une fois"],
            ["Secrets système", "Variables d'environnement exclusivement — jamais en base (ADR-0075)"],
            ["Credentials connecteurs", "Coffre applicatif chiffré, géré en console, jamais exposé client"],
            ["Paiements", "Aucune donnée carte chez UPgraders — prestataires certifiés (CinetPay, Stripe, PayPal)"],
          ]}
        />
      </LegalSection>

      <LegalSection title="4. Continuité et réversibilité">
        <ul>
          <li>Sauvegardes automatiques de la base (fournisseur managé) + migrations de schéma versionnées appliquées au déploiement.</li>
          <li><strong>Réversibilité client</strong> : export du patrimoine en format ouvert à tout moment ; fenêtre de portabilité de 90 jours post-contrat ; aucune rétention en otage.</li>
          <li>Le journal d&apos;intents fournit la preuve d&apos;exécution opposable (qui, quoi, quand) sans exposer de données personnelles en clair.</li>
        </ul>
      </LegalSection>

      <LegalSection title="5. Conformité">
        <p>
          RGPD / Convention de Malabo / cadres nationaux : voir le{" "}
          <a href="/dpa" className="text-accent hover:underline">DPA</a> (classes de données, non-entraînement
          des LLM, sous-traitants, violations) et la{" "}
          <a href="/privacy" className="text-accent hover:underline">politique de confidentialité</a>. Engagements
          de délais : <a href="/sla" className="text-accent hover:underline">SLA</a>. Cadre contractuel :{" "}
          <a href="/cgv" className="text-accent hover:underline">CGV</a> · <a href="/cgu" className="text-accent hover:underline">CGU</a>.
        </p>
      </LegalSection>

      <LegalSection title="6. Contact due diligence">
        <p>
          Dossier de due diligence détaillé (architecture, registre des traitements, attestations
          fournisseurs) sur demande :{" "}
          <a href="mailto:trust@lafusee.upgraders.io" className="text-accent hover:underline">trust@lafusee.upgraders.io</a>.
        </p>
      </LegalSection>
    </LegalShell>
  );
}
