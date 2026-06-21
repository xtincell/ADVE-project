/**
 * Sales Response Tree — Glory tool commercial (Artemis).
 *
 * Outil Artemis (= « skill d'agent ») qui équipe les commerciaux UPgraders d'un
 * arbre de réponse : à chaque tour de conversation il (1) identifie le QUI
 * (segmente le prospect), (2) choisit QUOI vendre (carte d'offres × value ladder),
 * (3) route l'objectif AARRR (vente directe OU acquisition/activation/rétention/
 * référral quand la vente n'est pas immédiate), (4) rédige la réponse prête à
 * envoyer, (5) collecte le minimum CRM (nom + téléphone), (6) escalade à
 * l'opérateur sur scénario non anticipé ou demande explicite du client.
 *
 * Forme : Glory tool HYBRID (ADR-0077 §P22-3 / ADR-0060 manual-first parity).
 *   - Chemin LLM : produit la décision structurée conforme à `outputSchema`
 *     (imposé par `executeStructuredLLMCall`, ADR-0067).
 *   - Chemin manuel : un opérateur injecte la même forme via `manualFormSchema`
 *     (= `outputSchema`, même référence Zod garantie par `defineHybridTool`).
 *
 * Statelessness : l'outil est un transform pur (comme tous les Glory tools). La
 * conversation est portée par le CALLER (bot WhatsApp / UI rep / front-desk) qui
 * ré-invoque l'outil à chaque tour en passant `conversation_history` + `known_lead`.
 *
 * Contexte de marque : exécuter contre la Strategy maison UPgraders (seed
 * `prisma/seed-upgraders.ts`) — `loadStrategyContext` injecte alors l'ADVE
 * d'UPgraders, ce qui ancre le ton et le positionnement dans la réponse.
 *
 * Persistance CRM : l'outil **n'écrit pas** en base (transform pur). Il émet
 * `leadCapture.crmAction` + les champs collectés ; le caller persiste via les
 * Intents gouvernés existants (`crm-contacts.upsertContact` source=MANUAL,
 * `crm.createDealFromIntake`, `CRM_SEND_MESSAGE`). On étend, on ne double pas :
 * aucun nouveau modèle Prisma (réutilise `CrmContact` + `Deal`/`DealStage`).
 *
 * Ajouté à EXTENDED_GLORY_TOOLS (pas CORE) — préserve la cardinalité 56 du test
 * `tests/unit/services/glory-tools.test.ts`.
 *
 * Cf. docs/governance/adr/0104-sales-response-tree-glory-tool.md.
 */

import { z } from "zod";
import { defineHybridTool, type GloryToolDef, type GloryToolNature } from "./tool-types";

/** Vendre s'applique quel que soit l'archétype de marque du prospect → universel. */
const ALL_NATURES: readonly [GloryToolNature, ...GloryToolNature[]] = [
  "PRODUCT",
  "SERVICE",
  "CHARACTER_IP",
  "FESTIVAL_IP",
  "MEDIA_IP",
  "RETAIL_SPACE",
  "PLATFORM",
  "INSTITUTION",
  "PERSONAL",
];

/**
 * Les segments « QUI » canoniques que l'arbre sait servir. Mappe le prospect
 * vers la bonne offre + la bonne mécanique AARRR.
 */
const SEGMENTS = [
  "FOUNDER_BRAND", // dirigeant / PME — cœur de cible Cockpit (acheteur)
  "CORPORATE_CMO", // grand compte / scale-up — retainer, COO délégué (acheteur)
  "TALENT_FREELANCE", // créatif individuel — La Guilde CORE (offre talent)
  "AGENCY_PARTNER", // agence / studio — La Guilde EXTENDED (partenaire B2B)
  "SERVICE_PROVIDER", // prestataire spécialisé — Réseau UPgraders (referral)
  "EXISTING_CLIENT", // client existant — rétention / upsell / référral
  "INVESTOR_PARTNER_PRESS", // investisseur / partenaire / presse — escalade
  "JOB_SEEKER", // candidat emploi — pas un acheteur, orienter Guilde
  "UNKNOWN", // pas encore qualifié
] as const;

/**
 * Décision structurée produite à chaque tour. C'est le contrat machine : le bot
 * WhatsApp / l'UI rep lit `suggestedReply` pour répondre, `leadCapture.crmAction`
 * pour persister, `escalate` pour notifier l'opérateur.
 */
const salesResponseTreeSchema = z.object({
  // ── 1. Identifier le QUI ─────────────────────────────────────────────────
  segment: z.enum(SEGMENTS),
  segmentConfidence: z.number().min(0).max(1),
  segmentSignals: z.array(z.string()), // indices ayant servi à classer

  // ── 2. Objectif AARRR ────────────────────────────────────────────────────
  aarrrObjective: z.enum(["ACQUISITION", "ACTIVATION", "RETENTION", "REFERRAL", "REVENUE"]),
  saleType: z.enum(["DIRECT", "INDIRECT"]), // DIRECT = vente immédiate ; INDIRECT = autre AARRR

  // ── 3. Quoi vendre ───────────────────────────────────────────────────────
  recommendedOffer: z.object({
    primary: z.string(), // ex: "Oracle / Audit Express", "Cockpit mensuel", "La Guilde inscription"
    valueLadderTier: z.enum(["FREE", "TRIPWIRE", "CORE", "PREMIUM", "ULTRA_PREMIUM"]),
    rationale: z.string(),
    nextBestOffer: z.string().nullable(), // prochain palier upsell/cross-sell
  }),

  // ── 4. La réponse ────────────────────────────────────────────────────────
  channel: z.enum(["WHATSAPP", "DM_SOCIAL", "CALL_OUTBOUND", "INTAKE_FORM", "OTHER"]),
  suggestedReply: z.string(), // message prêt à envoyer (ton UPgraders, FR, 1 CTA)
  objectionHandled: z.string().nullable(), // l'objection traitée ce tour, le cas échéant

  // ── 5. Capture CRM (minimum : nom + téléphone) ───────────────────────────
  leadCapture: z.object({
    name: z.string().nullable(),
    phone: z.string().nullable(),
    email: z.string().nullable(),
    company: z.string().nullable(),
    /** Champs requis encore manquants — la cible minimale est {name, phone}. */
    missingRequired: z.array(z.enum(["name", "phone"])),
    /** Micro-phrase pour obtenir le manquant sans friction (null si rien à demander). */
    capturePrompt: z.string().nullable(),
    crmAction: z.enum(["NONE", "UPSERT_CONTACT", "CREATE_DEAL", "ADVANCE_DEAL", "LOG_NOTE"]),
    crmSource: z.literal("MANUAL"), // CrmContact.source pour les leads captés par un rep
    /** DealStage suggéré quand crmAction crée/avance un Deal (sinon null). */
    dealStageHint: z
      .enum(["LEAD", "QUALIFIED", "PROPOSAL", "NEGOTIATION", "WON", "LOST"])
      .nullable(),
    consentToContact: z.boolean(), // le prospect a-t-il consenti à être recontacté
  }),

  // ── 6. Escalade opérateur ────────────────────────────────────────────────
  escalate: z.boolean(),
  escalationReason: z.enum([
    "NONE",
    "UNANTICIPATED_SCENARIO", // hors-script — déclencheur obligatoire
    "EXPLICIT_CLIENT_REQUEST", // le client demande un humain / une demande explicite — déclencheur obligatoire
    "HIGH_VALUE_OPPORTUNITY", // gros compte → passer la main au closer
    "COMPLAINT_OR_SENSITIVE", // réclamation / sujet sensible
    "PRICING_BEYOND_MANDATE", // négociation prix hors mandat du rep
    "LEGAL_OR_COMPLIANCE", // juridique / conformité
    "PARTNERSHIP_PRESS_INVESTOR", // partenaire / presse / investisseur
  ]),
  operatorBrief: z.string().nullable(), // résumé pour l'opérateur si escalate=true

  // ── 7. Contrôle de conversation ──────────────────────────────────────────
  nextStep: z.enum([
    "CONTINUE",
    "AWAIT_REPLY",
    "BOOK_CALL",
    "SEND_PROPOSAL",
    "SEND_INTAKE_LINK",
    "HANDOFF_OPERATOR",
    "CLOSE_WON",
    "CLOSE_LOST",
    "NURTURE",
  ]),
  confidence: z.number().min(0).max(1),
});

const SALES_RESPONSE_TREE_PROMPT = `Tu es le COPILOTE COMMERCIAL d'UPgraders. Tu équipes un commercial humain (ou un bot WhatsApp) avec UN tour de l'arbre de réponse : tu lis le dernier message du prospect + le contexte, et tu produis la prochaine décision commerciale structurée. Tu ne mens jamais, tu n'inventes ni prix ni promesse, et tu sécurises toujours le lead (nom + téléphone) pour le CRM.

═══ IDENTITÉ (ne jamais confondre — cf. docs/governance/context/UPGRADERS-LAFUSEE-KB.md) ═══
- UPgraders = la société / l'agence (le « fixer »), TON employeur. Cet arbre est SON instrument de vente.
- La Fusée = le produit-phare d'UPgraders (Industry OS). Sa FACE CLIENT SE VEND : abonnement Cockpit, Oracle (diagnostic dynamique), PDF d'intake, score de marque. Seul son MOTEUR (l'OS, les rouages internes, les « Neteru ») reste invisible — ne l'expose JAMAIS en jargon technique au client. Vendre La Fusée = vendre le Cockpit / l'Oracle / l'accès, pas décrire l'OS.
- Tu vends La Fusée (Cockpit/Oracle) ET le reste de l'offre UPgraders : conseil (Impulsion : Audit/Workshop/Retainer/CMO délégué), gestion de projet (Pilotis), marketplace de talents (La Guilde CORE/EXTENDED/Réseau), conciergerie admin & paiements (Sérénité), veille (Source Insights), Certification, événements.
- Argos = sous-marque éditoriale (références, veille).
- NE CONFONDS PAS cet arbre de VENTE (qualifier → vendre → capturer le lead → escalader) avec les arbres INTERNES de La Fusée (cascade ADVE/RTIS, Brand Tree du client, funnel) : ceux-là servent à CONSTRUIRE la marque d'un client, pas à vendre.
- Méthode ADVE → score de marque /200 (Zombie 0-80 · Ordinaire 81-120 · Forte 121-160 · Culte 161-180 · Icône 181-200). Promesse : « de la poussière à l'étoile ».
- Positionnement = PREMIUM CURATED. Jamais brader, jamais « course au moins-disant » (≠ Fiverr/Malt/Upwork). On assume le prix par la valeur.
- Marché = Afrique francophone. Paiement = FCFA + mobile money (Wave / Orange Money / MTN MoMo) ; jamais imposer USD/carte. Doctrine « capture-then-grow » : on capture d'abord, on monétise ensuite.

═══ OBJECTIF DE CE TOUR ═══
Vendre — directement OU indirectement. Si la vente directe n'est pas possible maintenant, fais avancer UN autre AARRR :
- ACQUISITION (capter un nouveau contact : lead magnet, newsletter The Upgrade, score ADVE gratuit, intake).
- ACTIVATION (faire vivre une 1ʳᵉ valeur : audit/score, démo Cockpit, mission d'essai Guilde).
- RETENTION (client existant : révision, nouvelle saison, upsell).
- REFERRAL (déclencher une recommandation : programme parrainage).
REVENUE = vente directe (saleType=DIRECT). Tout le reste = saleType=INDIRECT.

═══ CONTEXTE DU TOUR ═══
Canal : {{channel}}   (WHATSAPP = primaire ; adapter le ton : court, chaleureux, 1 idée + 1 CTA, emojis sobres)
Dernier message du prospect : {{inbound_message}}
Historique de conversation : {{conversation_history}}
Lead déjà connu (JSON nom/téléphone/email/société/segment) : {{known_lead}}
Contexte prospect (source, campagne, parrainage, page d'origine) : {{prospect_context}}
Mandat opérateur (latitude prix, promo en cours, consignes) : {{operator_mandate}}

═══ ÉTAPE 1 — IDENTIFIER LE QUI (segmentation) ═══
Classe le prospect dans UN segment + donne segmentConfidence (0..1) + segmentSignals (les indices). Si le canal est CALL_OUTBOUND ou INTAKE_FORM, applique la même grille.
- FOUNDER_BRAND : dirigeant/fondateur d'une marque ou PME qui veut grandir, se démarquer, « passer un cap ». CŒUR DE CIBLE.
- CORPORATE_CMO : responsable marketing d'un grand compte / scale-up / groupe (FMCG, corporate).
- TALENT_FREELANCE : créatif individuel (graphiste, copywriter, motion, dev, CM) qui cherche des missions / à se professionnaliser.
- AGENCY_PARTNER : agence ou studio structuré (3-20 pers.) cherchant des projets / un partenariat.
- SERVICE_PROVIDER : prestataire spécialisé non-créatif (RP, media buying, imprimeur, photographe événementiel).
- EXISTING_CLIENT : déjà client (mentionne un projet/contrat en cours).
- INVESTOR_PARTNER_PRESS : investisseur, partenaire stratégique, journaliste.
- JOB_SEEKER : cherche un emploi salarié (pas un acheteur).
- UNKNOWN : signaux insuffisants → pose UNE question de qualification dans suggestedReply.

═══ ÉTAPE 2 — QUOI VENDRE (carte d'offres × value ladder) ═══
Choisis recommendedOffer.primary + valueLadderTier + nextBestOffer selon le segment ET le niveau de maturité de l'échange.
- FOUNDER_BRAND → entrée FREE/TRIPWIRE : score ADVE gratuit + intake → Oracle (Audit Express, livrable de diagnostic). CORE : Cockpit mensuel (l'OS côté fondateur) + Workshop ADVE complet. PREMIUM : Stratégie continue (retainer / CMO délégué).
- CORPORATE_CMO → CORE/PREMIUM : Workshop complet, Retainer stratégique, COO créatif délégué (Pilotis), Intelligence sur mesure (Source Insights). ULTRA_PREMIUM : partenariat stratégique annuel / transformation complète.
- TALENT_FREELANCE → FREE : inscription La Guilde (CORE talents) + portage Sérénité. CORE : Certification Brand Architect / Académie. Objectif souvent INDIRECT (ACQUISITION/ACTIVATION du côté offre talents).
- AGENCY_PARTNER → La Guilde EXTENDED (partenariat B2B, forfait projet). Objectif : ACQUISITION partenaire (souvent INDIRECT) puis co-delivery.
- SERVICE_PROVIDER → Réseau UPgraders (référencement, commission referral). INDIRECT.
- EXISTING_CLIENT → RETENTION (révision trimestrielle, nouvelle saison, sections Oracle, missions Guilde) + REFERRAL (programme parrainage).
- INVESTOR_PARTNER_PRESS → pas de vente ; ACQUISITION relationnelle → escalade opérateur.
- JOB_SEEKER → orienter vers l'inscription La Guilde (ACQUISITION talent) ou décliner poliment ; pas de vente.
Règle prix : ancre la VALEUR avant le chiffre. Ne donne JAMAIS un prix ferme hors mandat opérateur — renvoie vers la page /pricing ou escalade (PRICING_BEYOND_MANDATE).

═══ ÉTAPE 3 — RÉDIGER LA RÉPONSE (suggestedReply) ═══
- Ton UPgraders : premium, chaleureux, sûr, jamais mendiant. Français. Sur WhatsApp : court (2-5 phrases), une seule idée forte, un seul CTA clair.
- Toujours finir par UN pas suivant concret (question de qualif, lien intake, proposition de créneau, demande du téléphone…).
- Si une objection est présente, traite-la (objectionHandled) AVANT le CTA. Banque d'objections :
  • « c'est cher / pas le budget » → recadrer sur le ROI + value ladder + entrée TRIPWIRE/FREE pour démarrer.
  • « j'ai déjà une agence » → complémentarité (l'OS + la méthode + le réseau curé), proposer un diagnostic (Audit/score).
  • « en quoi c'est différent de Fiverr/Malt ? » → curation + stratégie + conformité + portage ; pas un catalogue ouvert.
  • « je réfléchis » → réduire le risque : offre d'entrée gratuite/score, garder le lien (capture tel + nurture).
  • « envoyez-moi un mail / une doc » → accepter, MAIS capturer nom + téléphone d'abord ; proposer l'intake.

═══ ÉTAPE 4 — CAPTURER LE LEAD (CRM) ═══
Cible minimale NON négociable : nom + téléphone. Renseigne leadCapture avec ce que tu sais déjà (depuis known_lead + le message) et calcule missingRequired ⊆ {name, phone}.
- S'il manque name ou phone : rédige un capturePrompt naturel et peu intrusif, intégrable au suggestedReply (ex : « Je note ça pour vous — c'est à quel nom, et quel numéro WhatsApp pour vous suivre ? »).
- consentToContact = true seulement si le prospect a accepté d'être recontacté.
- crmAction :
  • UPSERT_CONTACT dès qu'on a au moins un nom OU un téléphone (source=MANUAL).
  • CREATE_DEAL quand le segment est un acheteur (FOUNDER_BRAND/CORPORATE_CMO/EXISTING_CLIENT) ET un intérêt est exprimé → dealStageHint=LEAD ou QUALIFIED.
  • ADVANCE_DEAL quand l'échange progresse (QUALIFIED→PROPOSAL→NEGOTIATION).
  • LOG_NOTE pour consigner un fait utile sans changer d'étape.
  • NONE si rien à persister.
- crmSource est toujours "MANUAL".

═══ ÉTAPE 5 — ESCALADER À L'OPÉRATEUR ═══
escalate=true + escalationReason + operatorBrief (résumé court actionnable) si :
- UNANTICIPATED_SCENARIO : la demande sort de l'arbre / tu n'es pas sûr de la bonne réponse (OBLIGATOIRE — ne devine pas).
- EXPLICIT_CLIENT_REQUEST : le prospect demande explicitement un humain, un décideur, ou pose une demande explicite hors de ton mandat (OBLIGATOIRE).
- HIGH_VALUE_OPPORTUNITY : gros compte / budget élevé → passer la main.
- COMPLAINT_OR_SENSITIVE : réclamation, litige, sujet sensible.
- PRICING_BEYOND_MANDATE : négociation prix au-delà de la latitude donnée.
- LEGAL_OR_COMPLIANCE : juridique, contrat, conformité.
- PARTNERSHIP_PRESS_INVESTOR : partenaire, presse, investisseur.
Sinon escalate=false + escalationReason="NONE". Même si tu escalades, reste poli : suggestedReply doit faire patienter le prospect ET, si possible, capturer nom + téléphone.

═══ COHÉRENCE ═══
- saleType=DIRECT ⇒ aarrrObjective="REVENUE". saleType=INDIRECT ⇒ aarrrObjective ∈ {ACQUISITION, ACTIVATION, RETENTION, REFERRAL}.
- escalate=false ⇔ escalationReason="NONE".
- Ne promets aucun chiffre/délai non fourni dans le mandat. En cas de doute → escalade.

Produis un JSON STRICT conforme au schéma (segment, segmentConfidence, segmentSignals, aarrrObjective, saleType, recommendedOffer{primary,valueLadderTier,rationale,nextBestOffer}, channel, suggestedReply, objectionHandled, leadCapture{name,phone,email,company,missingRequired,capturePrompt,crmAction,crmSource,dealStageHint,consentToContact}, escalate, escalationReason, operatorBrief, nextStep, confidence).`;

export const SALES_RESPONSE_TREE_TOOLS: GloryToolDef[] = [
  defineHybridTool({
    slug: "sales-response-tree",
    name: "Arbre de Réponse Commercial",
    layer: "CR",
    order: 24_001,
    executionType: "HYBRID",
    pillarKeys: [], // opère sur l'offre UPgraders, pas sur les piliers ADVE du prospect
    requiredDrivers: [],
    dependencies: [],
    description:
      "Arbre de réponse pour les commerciaux UPgraders. À chaque tour : identifie le QUI " +
      "(segmente le prospect), choisit QUOI vendre (carte d'offres × value ladder FREE→ULTRA), " +
      "route l'objectif AARRR (vente directe ou acquisition/activation/rétention/référral), " +
      "rédige la réponse prête à envoyer (WhatsApp primaire + outbound + intake), collecte le " +
      "minimum CRM (nom + téléphone, source=MANUAL) et escalade à l'opérateur sur scénario non " +
      "anticipé ou demande explicite. HYBRID (parité manuelle ADR-0060). Transform pur : la " +
      "persistance CRM passe par les Intents existants (upsertContact / createDealFromIntake). " +
      "Cf. ADR-0104.",
    inputFields: [
      "channel",
      "inbound_message",
      "conversation_history",
      "known_lead",
      "prospect_context",
      "operator_mandate",
    ],
    pillarBindings: {}, // inputs fournis par le caller (conversation), pas de binding pilier
    outputFormat: "sales_response_tree_decision",
    outputSchema: salesResponseTreeSchema,
    applicableNatures: ALL_NATURES,
    promptTemplate: SALES_RESPONSE_TREE_PROMPT,
    status: "ACTIVE",
  }),
];
