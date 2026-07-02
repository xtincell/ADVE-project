import type { Metadata } from "next";
import { LegalShell, LegalSection } from "@/components/legal/legal-shell";

/**
 * /mentions-legales — identification de l'entité (UPgraders, l'agence) + du
 * produit qu'elle opère (La Fusée) + rôle juridique. Porté du legacy (Vague 6
 * conformité B2B) ; hébergement mis à jour pour la réalité v7 (VPS + Coolify
 * + PostgreSQL auto-hébergé — plus de Vercel/Supabase).
 */

export const metadata: Metadata = {
  title: "Mentions légales",
  description:
    "Mentions légales d'UPgraders (cabinet de conseil & stratégie, Douala) — éditeur du site et opérateur du produit La Fusée. Identification, hébergement, propriété intellectuelle, droit applicable.",
};

export default function MentionsLegalesPage() {
  return (
    <LegalShell
      title="Mentions légales"
      updated="2 juillet 2026"
      intro={
        <>
          Informations d&apos;identification d&apos;<strong>UPgraders</strong>, éditeur de ce site et
          agence opératrice du produit <strong>La Fusée</strong>.
        </>
      }
    >
      <LegalSection title="Éditeur du site — UPgraders">
        <ul>
          <li>
            <strong>Dénomination</strong> : UPgraders SARL — cabinet de conseil &amp; stratégie
            créative
          </li>
          <li>
            <strong>Activité</strong> : industrialisation de la production de marques (conseil,
            direction créative, réseau de talents La Guilde, édition logicielle)
          </li>
          <li>
            <strong>Immatriculation</strong> : RC/DLA/2018/B/1381 (activité démarrée en 2017)
          </li>
          <li>
            <strong>Siège</strong> : Douala, Cameroun — hubs Douala &amp; Abidjan
          </li>
          <li>
            <strong>Directeur de la publication</strong> : Alexandre « Xtincell » Djengue (CEO)
          </li>
          <li>
            <strong>Contact</strong> :{" "}
            <a href="mailto:bonjour@upgraders.pro">bonjour@upgraders.pro</a> · WhatsApp{" "}
            <a href="https://wa.me/237694171799" target="_blank" rel="noopener noreferrer">
              +237 694 17 17 99
            </a>{" "}
            (Douala) / +225 05 46 15 64 56 (Abidjan)
          </li>
          <li>
            <strong>Site de l&apos;agence</strong> :{" "}
            <a href="https://www.upgraders.pro" target="_blank" rel="noopener noreferrer">
              upgraders.pro
            </a>
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="UPgraders & La Fusée — qui édite quoi">
        <p>
          <strong>UPgraders</strong> est la société (l&apos;agence) : elle vend et opère.{" "}
          <strong>La Fusée</strong> est son produit — un OS de marque : diagnostic, architecture,
          production et mesure de marques, accessible côté client via le Cockpit et l&apos;Oracle.{" "}
          <strong>Argos</strong> est sa sous-marque éditoriale (
          <a href="/argos">observatoire des références, en préparation</a>). Ce site et les surfaces
          produit sont édités et opérés par la même entité.
        </p>
      </LegalSection>

      <LegalSection title="Hébergement">
        <ul>
          <li>
            Application et base de données PostgreSQL : serveur privé virtuel (VPS) dédié,
            administré par UPgraders via Coolify (plateforme d&apos;hébergement open source
            auto-hébergée). Certificats TLS Let&apos;s Encrypt.
          </li>
          <li>
            Coordonnées détaillées du fournisseur d&apos;infrastructure communiquées sur demande :{" "}
            <a href="mailto:bonjour@upgraders.pro">bonjour@upgraders.pro</a>.
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="Nature et rôle de la plateforme">
        <p>
          La Fusée structure la stratégie de marque (méthode ADVE/RTIS), produit des livrables —
          dont l&apos;Oracle — et mesure l&apos;effet (score sur 100). À l&apos;ouverture de la
          Guilde, elle assurera aussi le <strong>dispatch</strong> de missions vers des talents et
          agences tiers ; UPgraders y interviendra comme opérateur technique d&apos;orchestration et
          d&apos;intermédiation gouvernée — qualification, matching, contrôle qualité, traçabilité —
          selon le partage de responsabilités détaillé aux <a href="/cgv">CGV (art. 6)</a>. Les
          talents demeurent des professionnels indépendants, responsables de leurs livraisons au
          sein des missions.
        </p>
      </LegalSection>

      <LegalSection title="Propriété intellectuelle">
        <p>
          La méthode ADVE/RTIS, les noms « UPgraders », « La Fusée » et « Argos », les interfaces,
          le moteur analytique et l&apos;ensemble du corpus de la plateforme sont la propriété
          d&apos;UPgraders. Les livrables produits pour un client lui sont cédés selon les{" "}
          <a href="/cgu">CGU (art. 2)</a>. Toute reproduction non autorisée de la plateforme, de la
          marque ou de la méthode est interdite.
        </p>
      </LegalSection>

      <LegalSection title="Données personnelles">
        <p>
          Voir la <a href="/privacy">politique de confidentialité</a> et, pour les clients
          professionnels, l&apos;<a href="/dpa">accord de traitement des données (DPA)</a>.
        </p>
      </LegalSection>

      <LegalSection title="Droit applicable">
        <p>
          Droit camerounais et actes uniformes OHADA. Résolution amiable préalable, puis
          juridictions de Douala (cf. <a href="/cgv">CGV art. 9</a>).
        </p>
      </LegalSection>
    </LegalShell>
  );
}
