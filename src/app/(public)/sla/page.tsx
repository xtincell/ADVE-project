import type { Metadata } from "next";
import { LegalShell, LegalSection, LegalTable } from "@/components/legal/legal-shell";

/**
 * /sla — engagements de niveau de service. Porté du legacy (Cahier des
 * charges Ch.4 : « strate ferme » — le délai des livrables automatiques est
 * garanti en résultat ; pénalités en avoirs ; régime dégradé notifié).
 * Adapté à la réalité v7 : production déterministe à la demande (diagnostic,
 * Oracle), activation d'accès sous 24 h ouvrées, plans Cockpit/Retainer ;
 * les SLA de matching crew seront publiés ici à l'ouverture de la Guilde.
 */

export const metadata: Metadata = {
  title: "SLA",
  description:
    "Engagements de niveau de service La Fusée — délais des livrables automatiques, activation d'accès, pénalités, régime dégradé, preuve par la trace.",
};

export default function SlaPage() {
  return (
    <LegalShell
      title="Engagements de niveau de service (SLA)"
      updated="2 juillet 2026"
      intro={
        <>
          Les délais ci-dessous font partie de la <strong>strate ferme</strong> de
          l&apos;obligation d&apos;effet tracé (<a href="/cgv">CGV art. 4</a>) : pour ce qui est
          produit par la plateforme, le délai est garanti en résultat. Heures et jours
          s&apos;entendent ouvrés.
        </>
      }
    >
      <LegalSection title="1. Livrables automatiques (production plateforme)">
        <p>
          La production de La Fusée est <strong>déterministe et à la demande</strong> : quand les
          données requises sont présentes, la composition est immédiate — il n&apos;y a pas de file
          d&apos;attente cachée. Quand une section manque de matière, la plateforme le dit
          explicitement et indique quoi compléter, plutôt que de livrer du remplissage.
        </p>
        <LegalTable
          headers={["Engagement", "Délai", "Nature"]}
          rows={[
            [
              "Diagnostic ADVE + score sur 100 (intake public)",
              "Immédiat à la soumission",
              "Résultat",
            ],
            [
              "Composition / recomposition de l'Oracle depuis les piliers",
              "Immédiate à la demande",
              "Résultat",
            ],
            [
              "Activation d'accès après règlement (validation manuelle du paiement)",
              "24 h ouvrées",
              "Résultat",
            ],
            [
              "Rétablissement après incident de plateforme",
              "Meilleurs délais, incident affiché sur /status",
              "Moyens renforcés",
            ],
          ]}
        />
      </LegalSection>

      <LegalSection title="2. Missions crew (talents tiers) — à venir">
        <p>
          Les missions exécutées par des talents tiers arrivent avec la Guilde. L&apos;engagement de
          l&apos;opérateur portera sur le <strong>matching</strong> d&apos;un talent qualifié dans
          un délai publié par plan ; la fenêtre de livraison sera ensuite convenue à la mission et
          portée par l&apos;engagement du talent. <strong>Les délais chiffrés de matching seront
          publiés sur cette page avant l&apos;ouverture</strong> — pas de SLA rétroactif ni
          implicite.
        </p>
      </LegalSection>

      <LegalSection title="3. Pénalités de retard">
        <ul>
          <li>
            Par période de retard entamée (l&apos;unité du SLA concerné) :{" "}
            <strong>avoir de 5 % de la valeur du livrable ou du cycle concerné</strong>.
          </li>
          <li>Plafond par livrable : 100 % de sa valeur.</li>
          <li>
            Plafond combiné avec le geste commercial des <a href="/cgv">CGV (art. 5)</a> : 2 cycles
            d&apos;abonnement sur une même période.
          </li>
          <li>
            Les pénalités sont des avoirs en compte, imputés sans démarche du client — le retard
            d&apos;activation prolonge d&apos;autant l&apos;échéance du cycle payé.
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="4. Régime dégradé">
        <ul>
          <li>
            Priorisation par plan en cas de charge exceptionnelle : Retainer &gt; Cockpit,
            ancienneté en départage.
          </li>
          <li>
            Sous charge exceptionnelle, un délai peut s&apos;étendre jusqu&apos;à{" "}
            <strong>2× le délai de base au maximum</strong> ; au-delà, incident de capacité traité
            comme manquement de strate ferme.
          </li>
          <li>
            <strong>Tout passage en régime dégradé est notifié</strong> au client avec le nouveau
            délai estimé — aucun retard silencieux.
          </li>
          <li>
            La qualité n&apos;est jamais dégradée : les contrôles de cohérence ne sont pas
            assouplis, seul le délai s&apos;étend.
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="5. Mesure et preuve">
        <p>
          Les horodatages de demande, de validation et de livraison sont journalisés dans le journal
          d&apos;audit hash-chaîné de la plateforme — le constat de respect ou de violation
          d&apos;un SLA est mécanique et fait foi entre les parties. État de la plateforme :{" "}
          <a href="/status">/status</a>.
        </p>
      </LegalSection>
    </LegalShell>
  );
}
