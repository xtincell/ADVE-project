import type { Metadata } from "next";
import { LegalShell, LegalSection } from "@/components/legal/legal-shell";

/**
 * /privacy — politique de confidentialité (RGPD / cadres africains baseline).
 * Porté du legacy et aligné sur la réalité v7 : données réellement collectées
 * (compte, lead de diagnostic, piliers, référence de paiement mobile money),
 * cookie de session uniquement, hébergement VPS/Coolify, IA optionnelle.
 */

export const metadata: Metadata = {
  title: "Confidentialité",
  description:
    "Politique de confidentialité La Fusée — données traitées, base légale, conservation, droits, cookies, IA sans entraînement.",
};

export default function PrivacyPage() {
  return (
    <LegalShell
      title="Politique de confidentialité"
      updated="2 juillet 2026"
      intro={
        <>
          UPgraders SARL traite vos données pour faire fonctionner La Fusée et vous livrer le
          diagnostic ADVE et vos livrables. <strong>Pas de revente. Pas de tracking publicitaire
          tiers.</strong>
        </>
      }
    >
      <LegalSection title="Données collectées">
        <ul>
          <li>
            <strong>Compte</strong> : nom, email, mot de passe (haché bcrypt — jamais en clair),
            rôle.
          </li>
          <li>
            <strong>Diagnostic</strong> : nom de la marque, secteur, pays, réponses au questionnaire
            d&apos;intake.
          </li>
          <li>
            <strong>Marque</strong> : contenu des piliers ADVE/RTIS, révisions, livrables composés.
          </li>
          <li>
            <strong>Usage</strong> : journal d&apos;audit des actions métier (qui, quoi, quand) —
            chaîné par empreintes.
          </li>
          <li>
            <strong>Paiement</strong> : plan, montant résolu, référence courte de règlement mobile
            money. La Fusée ne collecte <strong>ni numéro de carte, ni identifiants mobile
            money</strong> — le règlement s&apos;effectue de gré à gré via votre opérateur.
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="Base légale">
        <p>
          Exécution du contrat (compte, diagnostic, livrables), intérêt légitime (journal
          d&apos;audit, sécurité, prévention de la fraude), consentement explicite (communications
          commerciales).
        </p>
      </LegalSection>

      <LegalSection title="Conservation">
        <p>
          Compte et données de marque : durée de la relation, puis fenêtre de portabilité de 90
          jours (cf. <a href="/dpa">DPA §8</a>). Journal d&apos;audit : 5 ans (obligation de
          traçabilité). Leads de diagnostic non convertis : effaçables sur simple demande.
        </p>
      </LegalSection>

      <LegalSection title="Vos droits">
        <p>
          Accès, rectification, effacement, portabilité, opposition. Pour exercer : écrire à{" "}
          <a href="mailto:bonjour@upgraders.pro">bonjour@upgraders.pro</a> avec une preuve
          d&apos;identité. Réponse dans les meilleurs délais et au plus tard sous 30 jours.
        </p>
      </LegalSection>

      <LegalSection title="Cookies">
        <p>
          Un seul cookie : la <strong>session de connexion</strong> (essentiel, httpOnly, secure) —
          sans consentement requis. Aucun cookie publicitaire, aucun traceur analytique tiers ; il
          n&apos;y a donc pas de bannière à subir.
        </p>
      </LegalSection>

      <LegalSection title="IA — non-entraînement garanti">
        <p>
          Aucune de vos données n&apos;est utilisée pour entraîner des modèles d&apos;IA — ni par La
          Fusée, ni par ses fournisseurs (appels API sous garanties contractuelles de
          non-entraînement). L&apos;IA est <strong>optionnelle</strong> et ne produit que des
          brouillons marqués « à valider » ; les traitements structurants (score, prix, composition
          de l&apos;Oracle) sont déterministes et n&apos;envoient <strong>rien</strong> à un LLM.
          Détail complet dans le <a href="/dpa">DPA (§4)</a>.
        </p>
      </LegalSection>

      <LegalSection title="Sécurité">
        <p>
          TLS en transit sur toutes les surfaces (certificats Let&apos;s Encrypt) ; mots de passe
          hachés bcrypt (12 rounds) ; sessions signées (JWT) en cookie httpOnly/secure ; secrets
          système en variables d&apos;environnement uniquement ; cloisonnement par espace client à
          chaque requête. Cf. <a href="/trust-center">Trust Center</a>.
        </p>
      </LegalSection>

      <LegalSection title="Sous-traitants">
        <p>
          Hébergement : VPS dédié administré par UPgraders via Coolify (application + base
          PostgreSQL). Fournisseurs LLM (Anthropic, OpenAI, OpenRouter — API sans entraînement),
          sollicités uniquement si vous utilisez l&apos;assistance IA. Liste détaillée et actualisée
          dans le <a href="/dpa">DPA (§7)</a>.
        </p>
      </LegalSection>

      <LegalSection title="Contact">
        <p>
          UPgraders SARL — Douala, Cameroun ·{" "}
          <a href="mailto:bonjour@upgraders.pro">bonjour@upgraders.pro</a>
        </p>
      </LegalSection>
    </LegalShell>
  );
}
