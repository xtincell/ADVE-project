/**
 * /sla — Engagements de niveau de service (Vague 6 — conformité B2B).
 * Table SLA livrable × tier + pénalités + régime dégradé, transposée du
 * Cahier des charges Ch.4 (« strate ferme » : le délai des livrables auto
 * est garanti en résultat).
 */
import { LegalShell, LegalSection, LegalTable } from "@/components/legal/legal-shell";

export const metadata = {
  title: "SLA — La Fusée",
  description: "Engagements de niveau de service La Fusée — délais par livrable et par plan, pénalités, régime dégradé.",
};

export default function SlaPage() {
  return (
    <LegalShell
      title="Engagements de niveau de service (SLA)"
      updated="12 juin 2026"
      intro={
        <>
          Les délais ci-dessous font partie de la <strong>strate ferme</strong> de l&apos;obligation d&apos;effet
          tracé (CGV art. 4) : pour les livrables produits par l&apos;OS, le délai est garanti en résultat. Heures et
          jours s&apos;entendent ouvrés.
        </>
      }
    >
      <LegalSection title="1. Livrables automatiques (production OS)">
        <LegalTable
          headers={["Livrable", "Embarquement", "Starter", "Pro", "Group", "Enterprise"]}
          rows={[
            ["Brief (texte)", "24 h", "12 h", "4 h", "2 h", "1 h"],
            ["Asset image / KV", "72 h", "48 h", "24 h", "12 h", "6 h"],
            ["Asset vidéo court", "—", "5 j", "3 j", "48 h", "24 h"],
            ["Rapport périodique", "mensuel", "mensuel", "bi-mensuel", "hebdo", "hebdo + à la demande"],
            ["Oracle complet (35 sections)", "—", "7 j", "5 j", "3 j", "48 h"],
          ]}
        />
      </LegalSection>

      <LegalSection title="2. Missions crew (talents tiers)">
        <p>
          L&apos;opérateur garantit le <strong>matching</strong> d&apos;un talent qualifié dans les délais suivants ;
          la fenêtre de livraison est ensuite convenue à la mission et portée par l&apos;engagement du talent
          (jalons séquestrés) :
        </p>
        <LegalTable
          headers={["Étape", "Embarquement", "Starter", "Pro", "Group", "Enterprise"]}
          rows={[["Matching (assignation talent qualifié)", "5 j", "3 j", "48 h", "24 h", "12 h"]]}
        />
      </LegalSection>

      <LegalSection title="3. Pénalités de retard">
        <ul>
          <li>Par période de retard entamée (l&apos;unité du SLA concerné) : <strong>avoir de 5 % de la valeur du livrable</strong>.</li>
          <li>Plafond par livrable : 100 % de sa valeur.</li>
          <li>Plafond combiné avec le geste commercial des CGV : 2 cycles d&apos;abonnement sur une même période.</li>
          <li>Les pénalités sont des avoirs en compte, imputés automatiquement — pas de démarche à faire.</li>
        </ul>
      </LegalSection>

      <LegalSection title="4. Régime dégradé sous charge">
        <ul>
          <li>File de production priorisée par plan (Enterprise &gt; Group &gt; Pro &gt; Starter &gt; Embarquement), ancienneté en départage.</li>
          <li>Sous charge exceptionnelle, le SLA peut s&apos;étendre jusqu&apos;à <strong>2× le délai de base au maximum</strong> ; au-delà, incident de capacité traité en gouvernance.</li>
          <li><strong>Tout passage en régime dégradé est notifié</strong> au client avec le nouveau délai estimé — aucun retard silencieux.</li>
          <li>La qualité n&apos;est jamais dégradée : les contrôles de cohérence et de QC ne sont pas assouplis, seul le délai s&apos;étend.</li>
        </ul>
      </LegalSection>

      <LegalSection title="5. Mesure et preuve">
        <p>
          Les horodatages de demande et de livraison sont journalisés dans la trace de la plateforme — le constat
          de respect ou de violation d&apos;un SLA est mécanique, lisible par le client, et fait foi entre les
          parties. État temps réel de la plateforme : <a href="/status" className="text-accent hover:underline">/status</a>.
        </p>
      </LegalSection>
    </LegalShell>
  );
}
