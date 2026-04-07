import Anthropic from "@anthropic-ai/sdk";
import { BUSINESS_MODELS, ECONOMIC_MODELS, POSITIONING_ARCHETYPES, BRAND_NATURES } from "@/lib/types/business-context";

export interface IntakeQuestion {
  id: string;
  pillar: string;
  question: string;
  type: "text" | "select" | "multiselect" | "scale";
  options?: string[];
  required: boolean;
  tooltip?: string; // Hover help for non-professionals
}

const getClient = () => new Anthropic();

const PILLAR_NAMES: Record<string, string> = {
  a: "Authenticite",
  d: "Distinction",
  v: "Valeur",
  e: "Engagement",
  r: "Risk — SWOT Interne",
  t: "Track — SWOT Externe",
  i: "Implementation — Potentiel d'action",
  s: "Strategy — Fenetre d'Overton",
};

const QUESTION_BANK: Record<string, IntakeQuestion[]> = {
  // ========================================================================
  // Business context questions — captured before ADVE pillars
  // ========================================================================
  biz: [
    {
      id: "biz_model", pillar: "biz",
      question: "Quel est votre modele d'affaires principal ?",
      tooltip: "Le modele d'affaires decrit comment vous creez et delivrez de la valeur. B2C = vous vendez aux particuliers, B2B = aux entreprises, D2C = directement sans intermediaire.",
      type: "select",
      options: Object.entries(BUSINESS_MODELS).map(([key, m]) => `${key}::${m.label}`),
      required: true,
    },
    {
      id: "biz_nature", pillar: "biz",
      question: "Quelle est la nature de votre marque ?",
      tooltip: "Un festival est un produit-evenement dont l'experience EST l'offre. Un produit est un bien physique ou numerique. Un service est une prestation. Un lieu est un espace d'experience (restaurant, concept store).",
      type: "select",
      options: Object.entries(BRAND_NATURES).map(([key, n]) => `${key}::${n.label}`),
      required: true,
    },
    {
      id: "biz_revenue", pillar: "biz",
      question: "Comment generez-vous principalement vos revenus ? (plusieurs choix possibles)",
      tooltip: "Choisissez tous les moyens par lesquels l'argent entre dans votre entreprise. La plupart des entreprises ont 2-3 sources de revenus differentes.",
      type: "multiselect",
      options: Object.entries(ECONOMIC_MODELS).map(([key, m]) => `${key}::${m.label}`),
      required: true,
    },
    {
      id: "biz_positioning", pillar: "biz",
      question: "Comment positionnez-vous vos prix par rapport au marche ?",
      tooltip: "Comparez vos prix a ceux de vos concurrents directs. Etes-vous moins cher, au meme niveau, ou plus cher qu'eux ?",
      type: "select",
      options: Object.entries(POSITIONING_ARCHETYPES).map(([key, m]) => `${key}::${m.label}`),
      required: true,
    },
    {
      id: "biz_sales_channel", pillar: "biz",
      question: "Comment vendez-vous ?",
      tooltip: "Direct = vous vendez vous-meme au client final (boutique, site web). Intermediaire = vous passez par des distributeurs, grossistes ou revendeurs.",
      type: "select",
      options: [
        "DIRECT::Directement au client final (D2C)",
        "INTERMEDIATED::Via des distributeurs / revendeurs",
        "HYBRID::Les deux (vente directe + distributeurs)",
      ],
      required: true,
    },
    {
      id: "biz_free_element", pillar: "biz",
      question: "Y a-t-il une partie gratuite dans votre offre ?",
      tooltip: "Freemium = une version gratuite limitee pour attirer, puis une version payante complete. Beaucoup de marques offrent du contenu gratuit (blog, videos) pour attirer des clients.",
      type: "select",
      options: [
        "NONE::Non, tout est payant",
        "FREEMIUM::Oui, une version gratuite limitee",
        "CONTENT::Oui, du contenu ou des outils gratuits",
        "AD_SUPPORTED::Oui, un modele finance par la publicite",
      ],
      required: false,
    },
    {
      id: "biz_free_detail", pillar: "biz",
      question: "Si oui, decrivez ce qui est gratuit vs. ce qui est payant.",
      tooltip: "Expliquez simplement : qu'est-ce que les gens peuvent obtenir gratuitement, et a partir de quand doivent-ils payer ?",
      type: "text",
      required: false,
    },
    {
      id: "biz_premium_scope", pillar: "biz",
      question: "Votre positionnement premium/luxe concerne-t-il toute votre gamme ou seulement certains produits ?",
      tooltip: "Premium = plus cher que la moyenne du marche, avec une qualite ou un service superieur. Si vos prix sont dans la moyenne, choisissez 'pas positionne premium'.",
      type: "select",
      options: [
        "FULL::Toute la marque est positionnee premium/luxe",
        "PARTIAL::Seulement certains produits ou lignes",
        "NONE::Nous ne sommes pas positionnes premium/luxe",
      ],
      required: false,
    },
  ],

  // ========================================================================
  // ADVE Pillar questions
  // ========================================================================
  a: [
    { id: "a_vision", pillar: "a", question: "Quelle est la vision de votre marque ? Ou voulez-vous etre dans 10 ans ?", type: "text", required: true, tooltip: "La vision, c'est le reve a long terme. Exemple : 'Devenir la reference africaine du cafe de specialite.' Pensez grand, c'est une boussole, pas un objectif chiffre." },
    { id: "a_mission", pillar: "a", question: "Quelle est votre mission ? Pourquoi votre marque existe-t-elle ?", type: "text", required: true, tooltip: "La mission explique POURQUOI vous faites ce que vous faites, pas CE QUE vous faites. Exemple : 'Rendre le savoir-faire artisanal accessible a tous.'" },
    { id: "a_origin", pillar: "a", question: "Racontez l'histoire de la creation de votre marque.", type: "text", required: false, tooltip: "Chaque marque a un moment declencheur. Qu'est-ce qui vous a pousse a vous lancer ? Un probleme vecu, une passion, une rencontre ? Les clients adorent les histoires vraies." },
    { id: "a_values", pillar: "a", question: "Quelles sont les 3-5 valeurs fondamentales de votre marque ?", type: "text", required: true, tooltip: "Les valeurs sont les principes non-negociables qui guident vos decisions. Evitez les mots creux ('qualite', 'innovation'). Soyez specifique : 'transparence radicale', 'artisanat local'." },
    { id: "a_archetype", pillar: "a", question: "Si votre marque etait une personne, comment la decririez-vous ?", type: "text", required: false, tooltip: "Imaginez votre marque a une soiree : quel genre de personne serait-elle ? Serieuse et experte ? Rebelle et audacieuse ? Chaleureuse et rassurante ? Ca aide a definir votre personnalite." },
  ],
  d: [
    { id: "d_positioning", pillar: "d", question: "Qu'est-ce qui vous rend unique par rapport a vos concurrents ?", type: "text", required: true, tooltip: "Votre 'USP' (Unique Selling Proposition). Completez cette phrase : 'Nous sommes les seuls a ___.' Si vos clients vous quittaient, que ne trouveraient-ils nulle part ailleurs ?" },
    { id: "d_visual", pillar: "d", question: "Comment decririez-vous votre identite visuelle ?", type: "select", options: ["Inexistante", "Basique", "Definie mais incoherente", "Professionnelle et coherente", "Distinctive et memorable"], required: true, tooltip: "L'identite visuelle = logo, couleurs, typographie, style photo. 'Basique' = juste un logo. 'Coherente' = meme style partout. 'Memorable' = on vous reconnait sans voir le logo." },
    { id: "d_voice", pillar: "d", question: "Quel ton utilisez-vous pour communiquer ?", type: "select", options: ["Pas defini", "Formel", "Decontracte", "Inspirant", "Provocateur", "Expert"], required: true, tooltip: "Le ton de voix, c'est COMMENT vous parlez a vos clients. Formel = 'Nous vous proposons...', Decontracte = 'Hey, on a un truc cool pour toi', Expert = 'Selon nos analyses...'" },
    { id: "d_competitors", pillar: "d", question: "Nommez vos 3 principaux concurrents.", type: "text", required: false, tooltip: "Les entreprises que vos clients considerent quand ils ne vous choisissent pas. Meme si vous pensez ne pas en avoir, vos clients ont toujours des alternatives (y compris ne rien acheter)." },
  ],
  v: [
    { id: "v_promise", pillar: "v", question: "Quelle promesse faites-vous a vos clients ?", type: "text", required: true, tooltip: "La promesse client = le resultat que vous garantissez. Pas votre produit, mais le BENEFICE. Exemple : pas 'on vend des matelas' mais 'vous dormirez mieux des la premiere nuit'." },
    { id: "v_products", pillar: "v", question: "Quels sont vos produits/services principaux ?", type: "text", required: true, tooltip: "Listez vos 3-5 offres principales avec une phrase pour chacune. Commencez par celle qui genere le plus de revenus." },
    { id: "v_experience", pillar: "v", question: "Comment evaluez-vous l'experience client que vous offrez ?", type: "scale", required: true, tooltip: "1 = chaotique, le client se debrouille seul. 5 = correct, ca fonctionne. 10 = experience memorable, le client en parle a ses amis. Soyez honnete, c'est un diagnostic !" },
  ],
  e: [
    { id: "e_community", pillar: "e", question: "Avez-vous une communaute autour de votre marque ?", type: "select", options: ["Aucune", "Reseaux sociaux basiques", "Communaute active", "Communaute engagee et fidele"], required: true, tooltip: "Une page Facebook avec des likes n'est pas une communaute. Une communaute ACTIVE = des gens qui commentent, partagent, interagissent entre eux. FIDELE = ils reviennent sans que vous les relanciiez." },
    { id: "e_loyalty", pillar: "e", question: "Quel % de vos clients reviennent regulierement ?", type: "select", options: ["< 10%", "10-30%", "30-50%", "50-70%", "> 70%"], required: true, tooltip: "Sur 100 clients, combien font un deuxieme achat dans les 12 mois ? Si vous ne savez pas exactement, estimez. Moins de 30% = la plupart ne reviennent pas." },
    { id: "e_advocates", pillar: "e", question: "Vos clients recommandent-ils activement votre marque ?", type: "select", options: ["Jamais", "Rarement", "Parfois", "Souvent", "Systematiquement"], required: true, tooltip: "Le bouche-a-oreille : vos clients parlent-ils de vous a leur entourage sans que vous le demandiez ? 'Souvent' = vous recevez regulierement des clients qui disent 'un ami m'a parle de vous'." },
    { id: "e_rituals", pillar: "e", question: "Avez-vous des rituels ou traditions de marque ?", type: "text", required: false, tooltip: "Un rituel de marque = quelque chose de recurrent qui vous est propre. Exemples : un live hebdomadaire, un evenement annuel, un packaging signature, une phrase culte que vos clients connaissent." },
  ],
  r: [
    { id: "r_threats", pillar: "r", question: "Quels sont les 3 plus grands risques pour votre marque ?", type: "text", required: true, tooltip: "Pensez large : un concurrent qui baisse ses prix, un changement de reglementation, la perte d'un fournisseur cle, un bad buzz sur les reseaux, la dependance a un seul client..." },
    { id: "r_crisis", pillar: "r", question: "Avez-vous un plan de gestion de crise ?", type: "select", options: ["Non", "En cours de creation", "Basique", "Complet et teste"], required: true, tooltip: "Un plan de crise = savoir qui fait quoi quand ca tourne mal. Meme un simple document d'une page avec les contacts d'urgence et les etapes a suivre compte comme 'basique'." },
    { id: "r_reputation", pillar: "r", question: "Comment surveillez-vous votre reputation en ligne ?", type: "select", options: ["Pas du tout", "Manuellement parfois", "Outils basiques", "Monitoring avance"], required: true, tooltip: "Tapez-vous regulierement le nom de votre marque sur Google ? Lisez-vous les avis ? 'Manuellement' = vous verifiez de temps en temps. 'Outils' = Google Alerts, Mention, etc." },
  ],
  t: [
    { id: "t_kpis", pillar: "t", question: "Quels KPIs suivez-vous pour votre marque ?", type: "text", required: true, tooltip: "KPI = indicateur chiffre que vous surveillez. Exemples : nombre de ventes par mois, trafic du site web, nombre d'abonnes, taux de satisfaction. Si vous n'en suivez aucun, ecrivez 'aucun'." },
    { id: "t_measurement", pillar: "t", question: "A quelle frequence mesurez-vous la performance de votre marque ?", type: "select", options: ["Jamais", "Annuellement", "Trimestriellement", "Mensuellement", "En continu"], required: true, tooltip: "A quelle frequence regardez-vous vos chiffres ? 'En continu' = un tableau de bord que vous consultez chaque semaine. 'Jamais' = vous naviguez au feeling." },
    { id: "t_nps", pillar: "t", question: "Connaissez-vous votre Net Promoter Score (NPS) ?", type: "select", options: ["Non", "Approximativement", "Oui, mesure regulierement"], required: false, tooltip: "Le NPS mesure la fidelite client avec une seule question : 'Recommanderiez-vous cette marque ?' Note de 0 a 10. Si vous n'avez jamais pose cette question a vos clients, repondez 'Non'." },
  ],
  i: [
    { id: "i_roadmap", pillar: "i", question: "Avez-vous un plan marketing structure ?", type: "select", options: ["Non", "Informel", "Plan annuel", "Plan 3 ans"], required: true, tooltip: "Un plan marketing = un document qui dit : quoi faire, quand, pour qui, avec quel budget. 'Informel' = vous avez des idees mais rien d'ecrit. 'Plan annuel' = un document avec des actions mensuelles." },
    { id: "i_budget", pillar: "i", question: "Quel % de votre CA investissez-vous en marketing/branding ?", type: "select", options: ["< 2%", "2-5%", "5-10%", "10-15%", "> 15%"], required: true, tooltip: "CA = Chiffre d'Affaires (vos revenus totaux). Si vous gagnez 100M FCFA/an et depensez 5M en marketing (pub, design, events, community manager), c'est 5%. La moyenne est 5-10%." },
    { id: "i_team", pillar: "i", question: "Qui gere votre marque au quotidien ?", type: "select", options: ["Personne de dedie", "Le fondateur/DG", "Un responsable marketing", "Une equipe dediee"], required: true, tooltip: "Qui decide du contenu publie, des visuels utilises, des messages envoyes ? Si c'est vous-meme en plus de tout le reste, choisissez 'Le fondateur/DG'." },
  ],
  s: [
    { id: "s_guidelines", pillar: "s", question: "Avez-vous des guidelines de marque documentees ?", type: "select", options: ["Non", "Basiques (logo, couleurs)", "Completes (voix, ton, visuels)", "Bible de marque exhaustive"], required: true, tooltip: "Les guidelines = un document qui explique comment utiliser votre marque : couleurs exactes, taille du logo, ton de voix... 'Bible de marque' = tout est documente en detail pour que n'importe qui puisse communiquer a votre place." },
    { id: "s_coherence", pillar: "s", question: "Sur une echelle de 1-10, a quel point votre communication est-elle coherente sur tous les canaux ?", type: "scale", required: true, tooltip: "Canaux = site web, reseaux sociaux, email, packaging, boutique... 1 = chaque canal dit quelque chose de different. 10 = le meme message, le meme visuel, la meme experience partout." },
    { id: "s_ambition", pillar: "s", question: "Ou voulez-vous que votre marque soit dans 3 ans ?", type: "text", required: true, tooltip: "Soyez concret : nouveau marche geographique ? Doubler le CA ? Devenir leader du secteur ? Lancer une nouvelle gamme ? C'est votre objectif strategique a moyen terme." },
  ],
};

// ========================================================================
// Festival-specific E questions (injected when brandNature === FESTIVAL_IP)
// ========================================================================
const FESTIVAL_E_QUESTIONS: IntakeQuestion[] = [
  { id: "e_festival_concept", pillar: "e", question: "Quel est le concept fondateur de votre festival ? Qu'est-ce qui le rend unique ?", type: "text", required: true, tooltip: "Le concept fondateur, c'est la raison d'etre de votre festival au-dela du divertissement. Exemple : 'Celebrer la musique africaine contemporaine dans des lieux patrimoniaux'. C'est ce qui vous rend irremplacable." },
  { id: "e_festival_frequency", pillar: "e", question: "Quelle est la frequence de votre festival ?", type: "select", options: ["ANNUEL::Annuel (une fois par an)", "SEMESTRIEL::Semestriel (deux fois par an)", "TRIMESTRIEL::Trimestriel", "MENSUEL::Mensuel", "PONCTUEL::Ponctuel / Premiere edition"], required: true, tooltip: "La frequence determine le rythme de la relation avec votre audience. Annuel cree de l'attente, mensuel cree de l'habitude." },
  { id: "e_festival_editions", pillar: "e", question: "Combien d'editions avez-vous deja realisees ?", type: "select", options: ["0::Premiere edition (pas encore lance)", "1-3::1 a 3 editions", "4-10::4 a 10 editions", "10+::Plus de 10 editions"], required: true, tooltip: "Le nombre d'editions indique la maturite de votre festival. Premiere edition = tout a construire. 10+ editions = patrimoine a capitaliser." },
  { id: "e_festival_rituals", pillar: "e", question: "Quels rituels signature voulez-vous creer pour votre festival ? (moments recurrents que les festivaliers attendent)", type: "text", required: true, tooltip: "Les rituels sont les moments que les festivaliers racontent. Exemples : un cri de guerre collectif, une ceremonie d'ouverture unique, un objet collector par edition, un moment secret reserve aux VIP..." },
  { id: "e_festival_parcours", pillar: "e", question: "Decrivez le parcours visiteur ideal de votre festival de A a Z — de l'arrivee au depart.", type: "text", required: true, tooltip: "Pensez experience totale : comment arrivent-ils ? Que voient-ils en premier ? Quels espaces traversent-ils ? Quels temps forts ponctuent la journee ? Comment repartent-ils ? Le diable est dans le detail." },
];

export function getBusinessContextQuestions(): IntakeQuestion[] {
  return QUESTION_BANK.biz ?? [];
}

export async function getAdaptiveQuestions(
  pillar: string,
  existingResponses: Record<string, unknown>,
  businessContext?: { sector?: string; positioning?: string; brandNature?: string }
): Promise<IntakeQuestion[]> {
  const questions = QUESTION_BANK[pillar];
  if (!questions) return [];

  // Inject festival-specific E questions when brandNature is FESTIVAL_IP
  const conditionalQuestions = (pillar === "e" && businessContext?.brandNature === "FESTIVAL_IP")
    ? [...questions, ...FESTIVAL_E_QUESTIONS]
    : questions;

  // Try to generate AI follow-up questions
  try {
    const aiQuestions = await generateAiFollowUps(
      pillar,
      existingResponses,
      businessContext
    );
    return [...conditionalQuestions, ...aiQuestions];
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    console.warn("[AI fallback] question-bank:", reason);
    return conditionalQuestions;
  }
}

/**
 * Ask Claude to generate 1-2 targeted follow-up questions in French
 * based on the user's existing responses and business context.
 * Wrapped with an 8-second timeout.
 */
async function generateAiFollowUps(
  pillar: string,
  existingResponses: Record<string, unknown>,
  businessContext?: { sector?: string; positioning?: string }
): Promise<IntakeQuestion[]> {
  const client = getClient();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8_000);

  try {
    const pillarName = PILLAR_NAMES[pillar] ?? pillar;
    const responseSummary = Object.entries(existingResponses)
      .filter(([, v]) => v !== null && v !== undefined && v !== "")
      .map(([k, v]) => `- ${k}: ${typeof v === "string" ? v : JSON.stringify(v)}`)
      .join("\n");

    const contextInfo = businessContext
      ? `Secteur d'activite: ${businessContext.sector ?? "non specifie"}\nPositionnement: ${businessContext.positioning ?? "non specifie"}`
      : "Contexte business non disponible.";

    const response = await client.messages.create(
      {
        model: "claude-sonnet-4-20250514",
        max_tokens: 512,
        messages: [
          {
            role: "user",
            content: `Tu es Mestor, le guide strategique de La Fusee. Tu accompagnes un dirigeant dans un diagnostic de marque en mode interview conversationnelle.

Ton style:
- Tutoiement chaleureux mais professionnel (comme un mentor bienveillant)
- Questions courtes et directes, pas academiques
- Ton qui pousse a la reflexion ("Et si je te demandais...", "Imaginons que...")
- Toujours lie au business concret, pas a la theorie

On evalue le pilier "${pillarName}" (cle: "${pillar}").

Contexte business:
${contextInfo}

Reponses deja donnees:
${responseSummary || "Aucune reponse encore."}

Genere exactement 1 ou 2 questions de suivi en francais qui:
1. Creusent les lacunes ou zones vagues dans les reponses existantes
2. Utilisent un ton conversationnel de mentor (pas de questionnaire administratif)
3. Poussent a donner des exemples concrets ou des chiffres

Reponds UNIQUEMENT avec un tableau JSON valide. Format:
[{"id":"${pillar}_ai_1","question":"...","type":"text","pillar":"${pillar}","required":false}]`,
          },
        ],
      },
      { signal: controller.signal }
    );

    const text =
      response.content[0]?.type === "text" ? response.content[0].text.trim() : "";

    // Extract JSON array from the response (handle potential markdown wrapping)
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      throw new Error(`No JSON array found in AI response: "${text.slice(0, 100)}"`);
    }

    const parsed: unknown = JSON.parse(jsonMatch[0]);
    if (!Array.isArray(parsed)) {
      throw new Error("AI response is not an array");
    }

    // Validate and sanitize each question
    const validated: IntakeQuestion[] = [];
    for (const item of parsed) {
      if (
        typeof item === "object" &&
        item !== null &&
        typeof (item as Record<string, unknown>).id === "string" &&
        typeof (item as Record<string, unknown>).question === "string" &&
        typeof (item as Record<string, unknown>).pillar === "string"
      ) {
        validated.push({
          id: String((item as Record<string, unknown>).id),
          question: String((item as Record<string, unknown>).question),
          type: "text",
          pillar,
          required: false,
        });
      }
    }

    return validated.slice(0, 2); // Never more than 2 AI questions
  } finally {
    clearTimeout(timeout);
  }
}

export function getAllQuestions(): Record<string, IntakeQuestion[]> {
  return QUESTION_BANK;
}
