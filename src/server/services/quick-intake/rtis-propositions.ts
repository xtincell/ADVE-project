/**
 * Quick Intake — propositions R/T/I/S déterministes, ancrées données (ADR-0164).
 *
 * Constat (retour opérateur 2026-07-20) : la page résultat affichait 4 cartes
 * R/T/I/S VIDES (« Le volet Risque sera dérivé de votre ADVE par l'analyse
 * complète ») dès que le narratif LLM échouait ou que les piliers RTIS
 * n'étaient pas remplis. Un fondateur qui vient de répondre à 20 questions
 * mérite AU MOINS 2 propositions concrètes par volet — dérivées de SES
 * données, pas des placeholders.
 *
 * Règles : 100 % déterministe, zéro LLM. Chaque proposition CITE la donnée
 * qui la fonde (réponse déclarée, mesure d'empreinte) — jamais de chiffre
 * inventé (ADR-0163). Langage fondateur : concepts expliqués, pas de jargon.
 * Pur : aucune IO, testé sur fixtures.
 */

import type { EnrichedFootprint } from "./footprint-types";

export interface RtisProposition {
  /** L'action, formulée fondateur. */
  action: string;
  /** La donnée qui la fonde — citée, jamais inventée. */
  because: string;
}

export interface RtisVoletPropositions {
  preview: string;
  full: string;
  keyMove: string;
}

interface ComposeInput {
  companyName: string;
  /** Libellé humain du secteur (jamais le code) ou null. */
  sectorLabel: string | null;
  extractedValues: Record<"a" | "d" | "v" | "e", Record<string, unknown>>;
  /** Scores /25 par pilier (vector a/d/v/e). */
  pillarScores: Record<"a" | "d" | "v" | "e", number>;
  footprint: EnrichedFootprint | null;
}

const PILLAR_HUMAN: Record<"a" | "d" | "v" | "e", string> = {
  a: "vos racines (qui vous êtes, d'où vous venez)",
  d: "votre différence (ce qui fait qu'on vous choisit vous)",
  v: "votre offre (ce que vous vendez, à quel prix)",
  e: "votre communauté (qui vous suit, et où)",
};

function firstText(content: Record<string, unknown>, keys: string[]): string | null {
  for (const k of keys) {
    const v = content[k];
    if (typeof v === "string" && v.trim().length > 8) return v.trim();
  }
  return null;
}

function fmt(props: RtisProposition[]): string {
  return props.map((p) => `• ${p.action}\n  Pourquoi : ${p.because}`).join("\n");
}

function pack(props: RtisProposition[]): RtisVoletPropositions {
  return {
    preview: props[0]?.action ?? "",
    full: fmt(props),
    keyMove: props[0]?.action.slice(0, 120) ?? "",
  };
}

/** ≥ 2 propositions par volet, fondées sur le déclaré + le mesuré. */
export function composeRtisPropositions(input: ComposeInput): Record<"r" | "t" | "i" | "s", RtisVoletPropositions> {
  const { companyName, sectorLabel, extractedValues, pillarScores, footprint } = input;
  const secteur = sectorLabel ?? "votre marché";
  const press = footprint?.press ?? [];
  const socials = footprint?.socials ?? [];
  const site = footprint?.site ?? null;
  const maps = footprint?.maps ?? null;
  const followers = footprint?.followerCounts ?? [];
  const totalFollowers = followers.reduce((n, f) => n + (f.followerCount ?? 0), 0);
  const measured = new Set((footprint?.score?.dimensions ?? []).filter(d => d.measured && d.score !== null).map(d => d.key));
  const canaux = firstText(extractedValues.e, ["canaux", "e_channels", "primaryChannel"]);
  const hasChannel = Boolean(canaux) || (Array.isArray(extractedValues.e.touchpoints) && extractedValues.e.touchpoints.length > 0);
  const difference = firstText(extractedValues.d, ["difference", "positionnement", "positioning"]);
  const offre = firstText(extractedValues.v, ["offre", "produitsCatalogue", "businessModel"]);
  const catalogCount = Array.isArray(extractedValues.v.produitsCatalogue) ? extractedValues.v.produitsCatalogue.length : 0;
  const hasOffer = Boolean(offre) || catalogCount > 0;

  // ── R — Vulnérabilités : les trous OBSERVÉS, classés du plus grave ──
  const r: RtisProposition[] = [];
  if (!site?.reachable) {
    r.push({
      action: site
        ? `Vérifier l'accès au site de ${companyName} avant de décider d'une correction.`
        : `Renseigner l'adresse web de ${companyName} si elle existe, puis vérifier son accès.`,
      because: site ? "le site analysé n'était pas joignable lors de la collecte." : "l'accès à votre site n'a pas été mesuré ici.",
    });
  }
  if (socials.length <= 1) {
    r.push({
      action:
        socials.length === 0
          ? "Vérifier et renseigner les liens de vos comptes existants avant d'envisager d'en créer un."
          : `Ne pas dépendre d'un seul canal (${socials[0]!.platform.toLowerCase()}) : un compte suspendu ou piraté et votre visibilité tombe à zéro.`,
      because:
        socials.length === 0
          ? measured.has("social") ? "aucun profil n'a pu être rattaché par cette collecte." : "vos profils sociaux sont non mesurés ici ; leur absence n'est pas établie."
          : `un seul profil public détecté (${socials[0]!.handle ?? socials[0]!.url}).`,
    });
  }
  if (press.length === 0 && measured.has("press")) {
    r.push({
      action: "Rechercher vos retombées presse existantes et préparer une prise de parole si nécessaire.",
      because: "aucune mention presse récente n'a été retenue par les recherches de cette collecte.",
    });
  }
  if ((pillarScores.d ?? 0) < 8) {
    r.push({
      action: `Écrire noir sur blanc ce qui vous distingue — tant que ce n'est pas formulé, un concurrent de ${secteur} peut prendre votre place dans la tête des clients.`,
      because: difference
        ? `votre différence déclarée (« ${difference.slice(0, 90)}${difference.length > 90 ? "…" : ""} ») reste générique tant qu'elle n'est pas prouvée.`
        : "votre fondation « différence » est aujourd'hui vide dans vos réponses.",
    });
  }
  if (r.length < 2) {
    r.push({
      action: "Documenter vos preuves (chiffres, témoignages datés, photos) : c'est la matière première de tout le reste.",
      because: "vos réponses contiennent peu de preuves vérifiables à ce stade.",
    });
  }

  // ── T — Validation marché : ce que le public prouve DÉJÀ ──
  const t: RtisProposition[] = [];
  if (maps?.status === "LIVE" && maps.reviewCount) {
    t.push({
      action: `Capitaliser sur vos avis Google : répondre à chaque avis et afficher la note dans votre communication.`,
      because: `votre fiche « ${maps.placeName} » affiche ${maps.rating ?? "?"}★ sur ${maps.reviewCount} avis publics — une preuve sociale déjà acquise.`,
    });
  }
  if (press.length > 0) {
    t.push({
      action: `Réutiliser vos retombées presse (site, réseaux, signature email) — une marque citée par la presse inspire confiance.`,
      because: `${press.length} mention(s) presse trouvée(s), dont « ${press[0]!.title.slice(0, 80)}${press[0]!.title.length > 80 ? "…" : ""} ».`,
    });
  }
  if (totalFollowers > 0) {
    t.push({
      action: "Transformer votre audience en clients identifiés : proposer une raison simple de laisser un contact (offre, jeu, contenu exclusif).",
      because: `${totalFollowers.toLocaleString("fr-FR")} abonnés réels comptés sur vos réseaux publics.`,
    });
  }
  if (t.length < 2) {
    t.push(
      {
        action: "Collecter 3 témoignages clients datés et signés ce mois-ci — c'est la preuve marché la moins chère qui existe.",
        because: "les pièces captées ici ne suffisent pas à documenter la validation commerciale ; des exemples datés peuvent les compléter.",
      },
      {
        action: "Vérifier votre fiche Google Business existante ; si elle est absente, envisager sa création.",
        because: maps?.status === "DEFERRED_NO_KEY" || !maps ? "votre présence Google n'a pas pu être vérifiée." : "aucune fiche Google active trouvée à votre nom.",
      },
    );
  }

  // ── I — Innovation : une piste ancrée sur l'offre déclarée + une sur le canal ──
  const i: RtisProposition[] = [];
  i.push({
    action: hasOffer
      ? `Tester UNE déclinaison de votre offre sur 30 jours (édition limitée, format découverte, offre duo) et mesurer qui achète.`
      : `Formuler votre offre en une phrase vendable, puis en tester une variante sur 30 jours.`,
    because: offre
      ? `piste de test pour votre offre déclarée — « ${offre.slice(0, 90)}${offre.length > 90 ? "…" : ""} » — à valider avec vous.`
      : catalogCount > 0 ? `votre catalogue contient ${catalogCount} offre(s) déclarée(s) ; un test de variante reste une proposition à valider.` : "votre fondation « offre » est encore peu documentée dans vos réponses.",
  });
  i.push({
    action: canaux?.toLowerCase().includes("whatsapp")
      ? "Structurer WhatsApp en vrai canal de vente (catalogue, statuts réguliers, liste de diffusion) plutôt qu'en simple messagerie."
      : hasChannel ? "Mesurer les retours sur vos canaux actuels avant de tester un canal supplémentaire." : `Choisir un canal à expérimenter après avoir vérifié les usages de ${secteur}.`,
    because: canaux
      ? `vos canaux déclarés (« ${canaux.slice(0, 80)}${canaux.length > 80 ? "…" : ""} ») offrent une base à mesurer.`
      : hasChannel ? "des points de contact sont déjà déclarés ; leurs résultats restent à documenter." : "aucun canal n'est encore formalisé dans vos réponses.",
  });

  // ── S — Plan : séquencé depuis les 2 fondations les plus faibles ──
  const ranked = (Object.entries(pillarScores) as Array<["a" | "d" | "v" | "e", number]>).sort(
    (x, y) => x[1] - y[1],
  );
  const [w1, w2] = [ranked[0]!, ranked[1]!];
  const s: RtisProposition[] = [
    {
      action: `Semaines 1-4 : consolider ${PILLAR_HUMAN[w1[0]]} — c'est votre fondation la plus faible, et chaque marque est tirée vers le bas par sa fondation la plus faible.`,
      because: `score actuel ${Math.round(w1[1])}/25 sur cette fondation, d'après vos réponses.`,
    },
    {
      action: `Semaines 5-8 : renforcer ${PILLAR_HUMAN[w2[0]]}, juste derrière.`,
      because: `score actuel ${Math.round(w2[1])}/25.`,
    },
    {
      action: "Semaines 9-12 : re-mesurer l'empreinte publique et comparer — le rapport suivant doit montrer la progression, pas la raconter.",
      because: "la collecte publique est re-exécutable à tout moment ; c'est votre preuve de progression.",
    },
  ];

  return { r: pack(r.slice(0, 3)), t: pack(t.slice(0, 3)), i: pack(i.slice(0, 3)), s: pack(s) };
}
