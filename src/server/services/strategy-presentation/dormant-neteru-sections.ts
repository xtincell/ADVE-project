/**
 * Dormant Neteru sections — placeholders Oracle pour les Neteru pré-réservés.
 *
 * Conformément à PANTHEON.md (5 actifs + 2 pré-réservés, plafond APOGEE = 7),
 * l'Oracle réserve visuellement la place des 2 Neteru en sommeil :
 *   - IMHOTEP — Crew Programs (ADR-0010, activation Phase 7+ demand-driven)
 *   - ANUBIS  — Comms        (ADR-0011, activation Phase 8+ demand-driven)
 *
 * Ces emplacements ne sont PAS de simples sections vides : ils déclarent
 * publiquement la trajectoire de production (foreshadowing client) et
 * empêchent le drift narratif silencieux ("on ne savait pas qu'il y avait
 * un slot Crew prévu"). Triggers d'activation lus depuis les ADRs canoniques.
 *
 * Cf. ADR-0014 §Imhotep et Anubis.
 */

export interface DormantNeteruSection {
  /** Section id stable (kebab-case, prefixé `dormant-` pour repérage). */
  id: string;
  /** Numéro section (continuation après les 21 actives, en chiffres romains). */
  number: string;
  /** Titre affiché dans l'Oracle. */
  title: string;
  /** Sous-système APOGEE gouverné par ce Neter. */
  subsystem: string;
  /** Gate d'activation (Phase 7+ ou Phase 8+ — gate demand-driven, pas roadmap). */
  activationGate: "Phase 7+" | "Phase 8+";
  /** Triggers business d'activation (lus depuis l'ADR canonique). */
  activationTriggers: string[];
  /** Texte explicatif client (FR — version i18n EN à ajouter Phase i18n). */
  explanation: string;
  /** Référence ADR pour traçabilité. */
  adr: string;
  /** Tier APOGEE (Mission ou Ground). */
  tier: "Mission" | "Ground";
}

export const DORMANT_NETERU_SECTIONS: DormantNeteruSection[] = [
  {
    id: "dormant-imhotep-crew",
    number: "22",
    title: "Crew Programs — Imhotep (en sommeil)",
    subsystem: "Crew Programs",
    activationGate: "Phase 7+",
    activationTriggers: [
      "Volume creators sur la plateforme > 100",
      "Volume missions actives simultanées > 50",
      "Académie (formation) opérationnelle au-delà de stub démo",
    ],
    explanation:
      "Imhotep — sage humain égyptien déifié, le seul Neter humain — gouvernera le sous-système Crew Programs : matching humain-mission selon devotion footprint sectoriel, tier evaluator, académie de formation, qc-router. Slot canonique pré-réservé (pas implémenté). Activation déclenchée par les seuils business ci-dessus, pas par décret. Avant activation, les services L3 (talent-engine, matching-engine, team-allocator) restent gouvernés par Mestor sans Neter dédié.",
    adr: "ADR-0010",
    tier: "Ground",
  },
  {
    id: "dormant-anubis-comms",
    number: "23",
    title: "Comms — Anubis (en sommeil)",
    subsystem: "Comms",
    activationGate: "Phase 8+",
    activationTriggers: [
      "Au moins une brand active déclenche du paid media (signal commercial)",
      "Volume notifications cross-portail > 1000/jour",
      "OAuth scopes Meta Ads / Google Ads obtenus en production",
    ],
    explanation:
      "Anubis — psychopompe égyptien, guide entre les mondes — gouvernera le sous-système Comms : messaging cross-portail (Console/Cockpit/Agency/Creator), notifications, ad networks (Meta/Google/TikTok Ads), social posting, broadcast email/SMS. Co-gouvernance avec Thot pour les ad networks (CHECK_CAPACITY pre-flight obligatoire avant lancement campagne). Slot canonique pré-réservé. Avant activation, le service email/ existant reste gouverné par Mestor.",
    adr: "ADR-0011",
    tier: "Ground",
  },
];

/**
 * Rendu textuel d'une section dormante pour l'export Oracle (Markdown / PDF).
 * Le format suit la convention `formatSectionBody` de export-oracle.ts pour
 * homogénéité visuelle avec les 21 sections actives.
 */
export function renderDormantSectionBody(section: DormantNeteruSection): string {
  const lines: string[] = [];
  lines.push(`**Statut** : pré-réservé (${section.activationGate} — activation demand-driven, voir ${section.adr})`);
  lines.push("");
  lines.push(`**Sous-système APOGEE** : ${section.subsystem} (${section.tier} Tier)`);
  lines.push("");
  lines.push(section.explanation);
  lines.push("");
  lines.push("**Critères d'activation (tous requis)** :");
  for (const trigger of section.activationTriggers) {
    lines.push(`  - ${trigger}`);
  }
  return lines.join("\n");
}
