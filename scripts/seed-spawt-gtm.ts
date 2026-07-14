/**
 * seed-spawt-gtm.ts — injecte le Go-To-Market v2 de SPAWT au bon endroit de son
 * ADVE (calendrier de lancement + fournisseur email) et arme la 1ère publication
 * (J0 = lancement du quiz La Meute) planifiée AUJOURD'HUI.
 *
 * Source : SPAWT_GTM_v2.pptx (14 slides, cycle 13/07 → 01/09/2026, Abidjan).
 * Mandat opérateur 2026-07-13 : « le GTM doit être injecté au bon endroit de son
 * advertis, la 1ère publication fired aujourd'hui, chaque publication avec son
 * brief (illustration + copy visuel + copy publication), et branche l'infra SPAWT
 * aux bons endroits ».
 *
 * IDEMPOTENT : upsert sur `@@unique([strategyId, sourceInitiativeId])`.
 *
 * ── SÉCURITÉ ──────────────────────────────────────────────────────────────────
 * Aucune clé API n'est écrite en dur. La clé Brevo est lue depuis l'env
 * `SPAWT_BREVO_API_KEY` (ou la carte « Fournisseur email » dans Réglages →
 * Connexions, qui la valide et la stocke). Sans clé → le connecteur est laissé
 * honnêtement non configuré (aucune donnée inventée).
 *
 * Exécution : `npx tsx scripts/seed-spawt-gtm.ts` (nécessite SPAWT déjà seedé —
 * `npm run db:seed:spawt`).
 */

import { PrismaClient, type Prisma } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

function makeDb(): PrismaClient {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL not set — Prisma 7 driver adapter requires it.");
  }
  return new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
}

const db = makeDb();

const SPAWT_STRATEGY_ID = "spawt-strategy";
const QUIZ_URL = "https://quizz.spawt.online";

/**
 * Cadre canon de la campagne Go-To-Market (ADR-0119). Le GTM v2 n'était injecté
 * que comme `BrandAction`s (calendrier) — il n'apparaissait donc PAS dans
 * l'onglet Campagnes (qui liste des `Campaign`). On matérialise ici la campagne
 * canon `GTM_90` et on lui rattache toutes les actions + les jalons datés.
 * Idempotent par (strategyId, canonType, routeKey).
 */
const GTM_CAMPAIGN = {
  name: "Go-To-Market — Lancement La Meute",
  routeKey: "SPAWT_GTM_V2",
  canonType: "GTM_90",
  code: "GTM-SPAWT-V2",
  startDate: "2026-07-13", // J0 — soft launch
  endDate: "2026-09-01", // Bilan de cycle
  aarrrPrimary: "ACQUISITION", // waitlist / leads via le quiz La Meute
  aarrrSecondary: "REFERRAL", // parrainage / k-factor > 0,3 (objectif GTM)
};

/**
 * Jalons datés (les « échéances » attendues dans la vue campagne). Dérivés des
 * rituels de gouvernance + décisions du GTM v2. `isGateReview` = décision
 * go/no-go structurante.
 */
interface GtmMilestone {
  title: string;
  dueDate: string;
  phase: string;
  isGateReview: boolean;
}
const GTM_MILESTONES: GtmMilestone[] = [
  { title: "SPAWT REVIEW — owners, budget mkt, scope V1.1", dueDate: "2026-07-16", phase: "S1 · Soft launch", isGateReview: false },
  { title: "BETA FERMÉE — invitations waitlist → app (50-100)", dueDate: "2026-07-31", phase: "S2-3 · Amplification", isGateReview: false },
  { title: "SPAWT REVIEW PRÉSENTIEL — go/no-go ouverture publique", dueDate: "2026-08-13", phase: "S4-5 · Sprint Abidjan", isGateReview: true },
  { title: "BILAN DE CYCLE — scale ou itérer", dueDate: "2026-09-01", phase: "S6-7 · Bilan", isGateReview: true },
];

/** Propriétés numériques SPAWT (GTM slide 12 « Liens & accès »). Publiques. */
const SPAWT_PROPERTIES = [
  { key: "quiz", label: "Quiz La Meute (acquisition / waitlist)", url: QUIZ_URL },
  { key: "app", label: "App mobile SPAWT (MVP V1)", url: "http://ia20lafri5ayk0jje9m1kz9x.76.13.128.23.sslip.io" },
  { key: "admin", label: "Console admin (leads, galerie, export)", url: "https://admin.spawt.online" },
  { key: "app_preview", label: "App preview", url: "https://app-preview.spawt.online" },
  { key: "instagram", label: "Instagram @spawt.ci", url: "https://instagram.com/spawt.ci" },
  { key: "facebook", label: "Facebook @spawt.ci", url: "https://facebook.com/spawt.ci" },
];

/**
 * Actions datées du GTM v2 (rétroplanning slides 5-9). Chacune devient une
 * `BrandAction` du calendrier « Plan d'actions » (selected: true). `status`
 * reflète l'avancement réel déclaré au 10/07 (FAIT → EXECUTED, sinon ACCEPTED).
 * Dates 2026, cycle 13/07 → 01/09.
 */
interface GtmAction {
  key: string;
  title: string;
  description: string;
  start: string; // ISO date
  end?: string;
  status: "EXECUTED" | "ACCEPTED";
  touchpoint: "DIGITAL" | "OWNED" | "EARNED" | "BTL";
  phase: string;
}

const GTM_ACTIONS: GtmAction[] = [
  // S0 — Rampe (10-12 juil)
  { key: "s0-quiz-cable", title: "Quiz câblé : Brevo + parrainage + dashboard", description: "quizz.spawt.online live : capture, liste Brevo « Meute », parrainage + bouton WhatsApp, dashboard leads temps réel.", start: "2026-07-10", status: "EXECUTED", touchpoint: "DIGITAL", phase: "S0 · Rampe" },
  { key: "s0-build8", title: "Build 8 : validation device + verdict WhatsApp", description: "APK build 8 (crash fiches lieu corrigé, ouverture animée, photo de profil, compteur Spawts) validé par Stéphanie.", start: "2026-07-12", status: "ACCEPTED", touchpoint: "OWNED", phase: "S0 · Rampe" },
  { key: "s0-kit-j0", title: "Kit J0 prêt + garnir @spawt.ci", description: "Message WhatsApp type + cartes d'archétypes ; comptes @spawt.ci garnis (6-9 posts cartes / Moka) avant J0.", start: "2026-07-12", status: "ACCEPTED", touchpoint: "OWNED", phase: "S0 · Rampe" },
  // S1 — Soft launch (13-19 juil) — J0 aujourd'hui
  { key: "s1-j0-launch", title: "J0 — lancement quiz au cercle 1 (réseaux CI)", description: "Le quiz part dans les réseaux CI. À partir de là, un seul réflexe : le dashboard, pas les impressions. (La publication sociale J0 est armée séparément.)", start: "2026-07-13", status: "ACCEPTED", touchpoint: "EARNED", phase: "S1 · Soft launch" },
  { key: "s1-relance-j3", title: "Relance J+3 cercle 1 + 1er rapport funnel", description: "Relance du cercle 1 ; premier rapport funnel (visite → quiz → lead → partage).", start: "2026-07-16", status: "ACCEPTED", touchpoint: "EARNED", phase: "S1 · Soft launch" },
  { key: "s1-review", title: "SPAWT REVIEW : owners, budget mkt, scope V1.1", description: "Rituel gouvernance jeudi 19h (visio) : owners, budget marketing, scope V1.1, remboursement 609 $ avancés.", start: "2026-07-16", status: "ACCEPTED", touchpoint: "OWNED", phase: "S1 · Soft launch" },
  // S2-3 — Amplification + beta (20 juil - 2 août)
  { key: "s23-otp", title: "Compte Termii + OTP réel (fin du mock)", description: "Crédits SMS Termii (25-50 USD), OTP réel de bout en bout.", start: "2026-07-24", status: "ACCEPTED", touchpoint: "DIGITAL", phase: "S2-3 · Amplification" },
  { key: "s23-inventaire", title: "Import inventaire admin (R30) + seed 30-50 lieux ⚠ critique", description: "Chemin critique : import admin + 30-50 lieux réels. Escaladé en Review si ça glisse.", start: "2026-07-24", status: "ACCEPTED", touchpoint: "DIGITAL", phase: "S2-3 · Amplification" },
  { key: "s23-createurs", title: "Créateurs vague 1 : shortlist 5, brief + kit, contrats", description: "5 micro-créateurs CI (réf. 15-50k F), brief + kit + contrats (50 % signature 25/07).", start: "2026-07-25", status: "ACCEPTED", touchpoint: "EARNED", phase: "S2-3 · Amplification" },
  { key: "s23-brevo1", title: "Campagne Brevo #1 (« la beta arrive »)", description: "1ʳᵉ campagne email liste « Meute » : la beta fermée arrive.", start: "2026-07-30", status: "ACCEPTED", touchpoint: "OWNED", phase: "S2-3 · Amplification" },
  { key: "s23-beta", title: "BETA FERMÉE : invitations waitlist → app (50-100)", description: "Jalon : beta fermée invitée depuis la waitlist, sur inventaire réel. 500-800 leads cumulés, k-factor > 0,3.", start: "2026-07-31", status: "ACCEPTED", touchpoint: "DIGITAL", phase: "S2-3 · Amplification" },
  // S4-5 — Sprint Abidjan (4-18 août)
  { key: "s45-independance", title: "Activation semaine de l'indépendance (terrain)", description: "Quiz + parrainage dans les lieux réels, semaine de l'indépendance (7/08) — pic de sorties food.", start: "2026-08-05", end: "2026-08-09", status: "ACCEPTED", touchpoint: "BTL", phase: "S4-5 · Sprint Abidjan" },
  { key: "s45-inventaire-terrain", title: "Inventaire terrain : photos, horaires, prix FCFA", description: "Collecte terrain : photos, horaires, prix moyens FCFA, garbadromes.", start: "2026-08-05", end: "2026-08-15", status: "ACCEPTED", touchpoint: "BTL", phase: "S4-5 · Sprint Abidjan" },
  { key: "s45-partenaires", title: "5-10 lieux partenaires signés + kits QR posés", description: "Signatures lieux partenaires + kits QR imprimés à Abidjan (20-40k FCFA).", start: "2026-08-15", status: "ACCEPTED", touchpoint: "BTL", phase: "S4-5 · Sprint Abidjan" },
  { key: "s45-review-presentiel", title: "SPAWT REVIEW PRÉSENTIEL — go/no-go public", description: "Jeu 13/08 19h à Abidjan : décision go / no-go d'ouverture publique (track fermé Play Store) sur les chiffres du sprint.", start: "2026-08-13", status: "ACCEPTED", touchpoint: "OWNED", phase: "S4-5 · Sprint Abidjan" },
  // S6-7 — Bilan (19 août - 1er sept)
  { key: "s67-unit-economics", title: "Unit economics réels : CPL, k-factor, rétention J7/J14", description: "Mesure : CPL, k-factor, rétention J7/J14, conversion waitlist→app.", start: "2026-08-28", status: "ACCEPTED", touchpoint: "DIGITAL", phase: "S6-7 · Bilan" },
  { key: "s67-brevo2", title: "Campagne Brevo #2 + plan d'acquisition payée chiffré", description: "2ᵉ campagne + plan d'acquisition payée chiffré (si go).", start: "2026-08-28", status: "ACCEPTED", touchpoint: "OWNED", phase: "S6-7 · Bilan" },
  { key: "s67-bilan", title: "BILAN DE CYCLE : scale ou itérer", description: "Mar 01/09 : décision de cycle — ouvrir au public et scaler l'acquisition, ou itérer le funnel.", start: "2026-09-01", status: "ACCEPTED", touchpoint: "OWNED", phase: "S6-7 · Bilan" },
];

/** J0 — la première publication (aujourd'hui), avec brief intégré. */
const J0_PUBLICATION = {
  sourceInitiativeId: "gtm-v2-pub-j0-quiz-launch",
  targets: ["FACEBOOK", "INSTAGRAM"],
  // Copy de PUBLICATION (légende du post).
  text:
    "🍽️ Abidjan, ta carte du bon goût arrive.\n\n" +
    "Découvre ton Palais : fais le quiz La Meute, trouve ton archétype gourmand, " +
    "partage ta carte et rassemble ta meute. Les premiers inscrits entrent dans la beta.\n\n" +
    "👉 Fais le quiz : " + QUIZ_URL + "\n\n" +
    "#SPAWT #Abidjan #BonGoût #LaMeute #FoodCI",
  linkUrl: QUIZ_URL,
  // Copy du VISUEL (texte DANS l'image).
  visualCopy: "QUEL PALAIS ES-TU ?\nSPAWT — La carte du bon goût\nFais le quiz →",
  // Brief créatif intégré (direction pour ILLUSTRER — générateur ou designer).
  brief:
    "Format : flip card archétype 1080×1350 (vertical IG/FB feed). " +
    "Héros : Moka, la mascotte SPAWT (23 poses dispo) — expression gourmande et curieuse, " +
    "invite à découvrir SON Palais. Ambiance : food scene Abidjan AUTHENTIQUE (maquis, garba, " +
    "attiéké, ambiance de rue) — surtout pas de banque d'images générique. " +
    "Palette : identité SPAWT. Composition : carte d'archétype teaser (recto de la flip card) " +
    "avec le texte du visuel bien lisible ; CTA « Fais le quiz » clair. " +
    "Objectif : l'asset viral partageable n°1 — donner envie de faire le quiz et de partager sa carte. " +
    "Décliner en 1-2 variantes d'archétypes pour les stories.",
};

export async function seedSpawtGtm() {
  const strategy = await db.strategy.findUnique({
    where: { id: SPAWT_STRATEGY_ID },
    select: { id: true, userId: true, name: true, currencyCode: true },
  });
  if (!strategy) {
    throw new Error(
      `Stratégie ${SPAWT_STRATEGY_ID} introuvable — lance d'abord « npm run db:seed:spawt ».`,
    );
  }
  const ownerId = strategy.userId;
  console.log(`→ SPAWT trouvé (${strategy.name}, owner ${ownerId})`);

  // ── 0. Paternité partagée de SPAWT ──────────────────────────────────────────
  // Stéphanie Bidje = FONDATRICE → OWNER de la marque (full accès, Strategy.userId).
  // Alexandre (head of growth, ex-owner du seed) → collaborateur DIGITAL_DIRECTOR
  // (accès plein, en plus de son god-mode) : la paternité de la stratégie est
  // partagée. Mot de passe initial de Stéphanie « 12345678 » (invitation à le
  // changer ensuite). ADR-0129/0131.
  const stephanieEmail = "stephanie@spawt.online";
  // Invitation à personnaliser le mot de passe : active TANT QUE le mot de passe
  // provisoire « 12345678 » est en usage (jamais de nag après personnalisation).
  const existingSteph = await db.user.findUnique({ where: { email: stephanieEmail }, select: { hashedPassword: true } });
  const stillTempPwd = existingSteph?.hashedPassword
    ? await bcrypt.compare("12345678", existingSteph.hashedPassword)
    : true;
  const stephanie = await db.user.upsert({
    where: { email: stephanieEmail },
    // Re-seed : garantit le mode jour par défaut ; l'invitation ne persiste que
    // si le mot de passe provisoire est toujours actif (Increment 2b).
    update: { themePreference: "light", passwordChangeInvited: stillTempPwd },
    create: {
      email: stephanieEmail,
      name: "Stéphanie Bidje",
      hashedPassword: await bcrypt.hash("12345678", 12),
      role: "USER",
      themePreference: "light", // fondatrice → cockpit lumineux par défaut
      passwordChangeInvited: true, // mot de passe provisoire « 12345678 » à personnaliser
    },
    select: { id: true },
  });
  // Stéphanie devient propriétaire ; l'ancien propriétaire du seed devient
  // co-auteur de la stratégie (paternité partagée).
  const previousOwnerId = ownerId;
  await db.strategy.update({
    where: { id: SPAWT_STRATEGY_ID },
    data: { userId: stephanie.id },
  });
  if (previousOwnerId && previousOwnerId !== stephanie.id) {
    await db.strategyCollaborator.upsert({
      where: { strategyId_userId: { strategyId: SPAWT_STRATEGY_ID, userId: previousOwnerId } },
      update: { role: "DIGITAL_DIRECTOR", status: "ACTIVE", revokedAt: null },
      create: {
        strategyId: SPAWT_STRATEGY_ID,
        userId: previousOwnerId,
        role: "DIGITAL_DIRECTOR",
        status: "ACTIVE",
        grantedByUserId: stephanie.id,
        note: "Head of Growth — paternité partagée de la stratégie (GTM v2).",
      },
    });
  }
  console.log(
    `→ Paternité SPAWT : Stéphanie Bidje = OWNER (login ${stephanieEmail}) · ` +
      `ancien propriétaire = co-auteur DIGITAL_DIRECTOR.`,
  );

  // ── 0.5 Campagne canon GTM_90 (la campagne visible dans l'onglet Campagnes) ─
  // Sans ce cadre `Campaign`, le GTM n'existait qu'en `BrandAction`s (calendrier)
  // et n'apparaissait donc PAS dans l'onglet Campagnes. On matérialise la campagne
  // canon (ADR-0119) puis on lui rattache les actions + jalons.
  const currency = strategy.currencyCode ?? "XAF";
  const campaignId = await upsertGtmCampaign(currency);
  console.log(`→ Campagne canon GTM_90 « ${GTM_CAMPAIGN.name} » (${campaignId})`);

  // ── 1. Fournisseur email Brevo ─────────────────────────────────────────────
  // On HONORE un connecteur déjà renseigné (par l'UI Connexions) — on n'écrase
  // jamais une clé saisie à la main. On ne (ré)écrit QUE si SPAWT_BREVO_API_KEY
  // est fournie ET qu'aucun connecteur n'existe. Jamais de clé en dur (repo).
  const existingBrevo = await db.brandEmailConnector.findUnique({
    where: { strategyId: SPAWT_STRATEGY_ID },
    select: { status: true, provider: true },
  });
  const brevoKey = process.env.SPAWT_BREVO_API_KEY?.trim();
  if (existingBrevo) {
    console.log(`→ Brevo : connecteur déjà présent (${existingBrevo.provider}, ${existingBrevo.status}) — préservé.`);
  } else if (brevoKey && brevoKey.length >= 20) {
    await db.brandEmailConnector.create({
      data: {
        strategyId: SPAWT_STRATEGY_ID,
        provider: "BREVO",
        apiKey: brevoKey,
        fromEmail: process.env.SPAWT_FROM_EMAIL ?? "hello@spawt.online",
        fromName: "SPAWT",
        status: "ACTIVE",
      },
    });
    console.log("→ Brevo : connecteur créé ACTIVE (clé depuis SPAWT_BREVO_API_KEY).");
  } else {
    console.log(
      "→ Brevo : aucun connecteur + pas de SPAWT_BREVO_API_KEY → " +
        "colle la clé dans Réglages → Connexions → Fournisseur email (elle est validée et stockée).",
    );
  }

  // ── 2. Propriétés numériques SPAWT (référence, dans le calendrier « accès ») ─
  const propsList = SPAWT_PROPERTIES.map((p) => `• ${p.label} : ${p.url}`).join("\n");
  await upsertAction({
    strategyId: SPAWT_STRATEGY_ID,
    campaignId,
    sourceInitiativeId: "gtm-v2-toolbox-acces",
    title: "Boîte à outils & accès SPAWT (GTM v2)",
    description: `Liens & accès de l'équipe (GTM slide 12) :\n${propsList}`,
    start: "2026-07-10",
    status: "EXECUTED",
    touchpoint: "OWNED",
    phase: "S0 · Rampe",
    extraMeta: { properties: SPAWT_PROPERTIES },
  });
  console.log(`→ Propriétés SPAWT référencées (${SPAWT_PROPERTIES.length})`);

  // ── 3. Calendrier GTM (BrandAction, plan d'actions) ─────────────────────────
  let calCount = 0;
  for (const a of GTM_ACTIONS) {
    await upsertAction({
      strategyId: SPAWT_STRATEGY_ID,
      campaignId,
      sourceInitiativeId: `gtm-v2-${a.key}`,
      title: a.title,
      description: a.description,
      start: a.start,
      end: a.end,
      status: a.status,
      touchpoint: a.touchpoint,
      phase: a.phase,
    });
    calCount += 1;
  }
  console.log(`→ Calendrier GTM injecté (${calCount} actions, cycle 13/07→01/09)`);

  // ── 4. Publication J0 planifiée AUJOURD'HUI (brief + copy visuel + copy) ─────
  // Heure future du jour (now + 3 h) → SCHEDULED, le cron la fire une fois les
  // réseaux connectés (retry en attente de connexion, fix 2026-07-13).
  const scheduleAt = new Date(Date.now() + 3 * 60 * 60 * 1000);
  const socialPublish: Prisma.InputJsonValue = {
    targets: J0_PUBLICATION.targets,
    text: J0_PUBLICATION.text,
    linkUrl: J0_PUBLICATION.linkUrl,
    imageUrl: "/brand/spawt/social/post-quiz-1.png", // visuel officiel du quiz J0 (kit de marque) — requis pour Instagram
    scheduleAt: scheduleAt.toISOString(),
    requestedByUserId: stephanie.id, // la fondatrice/owner porte la publication
    pending: true,
    brief: J0_PUBLICATION.brief,
    visualCopy: J0_PUBLICATION.visualCopy,
    results: [],
  };
  const title = `Publication : ${J0_PUBLICATION.text.slice(0, 70)}…`;
  await db.brandAction.upsert({
    where: {
      strategyId_sourceInitiativeId: {
        strategyId: SPAWT_STRATEGY_ID,
        sourceInitiativeId: J0_PUBLICATION.sourceInitiativeId,
      },
    },
    update: {
      status: "SCHEDULED",
      selected: true,
      campaignId,
      timingStart: scheduleAt,
      metadata: { socialPublish, phase: "S1 · Soft launch", channel: "SOCIAL" } as Prisma.InputJsonValue,
    },
    create: {
      strategyId: SPAWT_STRATEGY_ID,
      campaignId,
      sourceInitiativeId: J0_PUBLICATION.sourceInitiativeId,
      title,
      description: J0_PUBLICATION.text.slice(0, 500),
      touchpoint: "DIGITAL",
      source: "OPERATOR_MANUAL",
      status: "SCHEDULED",
      selected: true,
      timingStart: scheduleAt,
      metadata: { socialPublish, phase: "S1 · Soft launch", channel: "SOCIAL" } as Prisma.InputJsonValue,
    },
  });
  console.log(
    `→ Publication J0 ARMÉE pour aujourd'hui ${scheduleAt.toLocaleString("fr-FR")} ` +
      `(FACEBOOK + INSTAGRAM, brief + copy visuel + copy publication, lien ${QUIZ_URL})`,
  );
  console.log(
    "  ⚠ Connecte Facebook/Instagram (Cockpit → Réglages → Connexions) AVANT l'échéance : " +
      "sans connexion la publication reste EN ATTENTE et partira dès que tu connectes (le cron réessaie).",
  );

  // ── 5. Jalons datés de la campagne (les « échéances » de la vue campagne) ───
  let msCount = 0;
  for (const m of GTM_MILESTONES) {
    await upsertMilestone(campaignId, m);
    msCount += 1;
  }
  console.log(`→ Jalons campagne posés (${msCount} échéances : SPAWT REVIEWs, beta, go/no-go, bilan)`);

  // ── 6. Filet de sécurité : rattache TOUTE action GTM restée orpheline ───────
  // (idempotence — au cas où une action gtm-v2-* aurait été créée avant ce cadre).
  const attached = await db.brandAction.updateMany({
    where: { strategyId: SPAWT_STRATEGY_ID, sourceInitiativeId: { startsWith: "gtm-v2-" }, campaignId: null },
    data: { campaignId },
  });
  if (attached.count > 0) {
    console.log(`→ ${attached.count} action(s) GTM orpheline(s) rattachée(s) à la campagne.`);
  }

  // ── 7. Réconciliation des deux campagnes SPAWT (ADR-0144) ──────────────────
  // Le seed historique a créé une campagne « 12 Mois » placeholder (données
  // inventées LIVE / 30M / jan-déc) portant 3 Missions, EN PLUS de cette
  // campagne GTM canon (dates + budget réels). On réconcilie sur GTM_90 : les
  // missions y sont rattachées, les tâches du Sprint Abidjan (S4-5) sont liées à
  // la Mission 2 (metadata.missionKey → rétroplanning founder cliquable), et le
  // placeholder aux données inventées est archivé. Idempotent.
  const MISSION_IDS = [
    "spawt-mission-1-cadrage",
    "spawt-mission-2-activation",
    "spawt-mission-3-consolidation",
  ];
  const reparented = await db.mission.updateMany({
    where: { id: { in: MISSION_IDS }, strategyId: SPAWT_STRATEGY_ID },
    data: { campaignId },
  });
  const M2 = "spawt-mission-2-activation";
  const sprintActions = await db.brandAction.findMany({
    where: { strategyId: SPAWT_STRATEGY_ID, sourceInitiativeId: { startsWith: "gtm-v2-s45-" } },
    select: { id: true, metadata: true },
  });
  for (const a of sprintActions) {
    const meta = { ...((a.metadata ?? {}) as Record<string, unknown>), missionKey: M2 };
    await db.brandAction.update({ where: { id: a.id }, data: { metadata: meta as Prisma.InputJsonValue } });
  }
  const archived = await db.campaign.updateMany({
    where: { id: "spawt-campaign-lancement" },
    data: { state: "ARCHIVED", status: "ARCHIVED" },
  });
  console.log(
    `→ Réconciliation : ${reparented.count} mission(s) → GTM_90 ; ` +
      `${sprintActions.length} tâche(s) Sprint Abidjan → Mission 2 ; ` +
      `${archived.count} placeholder « 12 Mois » archivé(s).`,
  );

  console.log(
    "\n✅ GTM SPAWT v2 injecté + campagne canon visible dans l'onglet Campagnes. " +
      "Le cron social-sync ?mode=publish fera partir J0.",
  );
}

/**
 * Upsert idempotent de la campagne canon GTM_90 (par strategyId + canonType +
 * routeKey). Budget volontairement laissé null : aucun budget global agrégé
 * n'est déclaré dans le GTM v2 (honnêteté — on n'invente pas de chiffre).
 */
async function upsertGtmCampaign(currency: string): Promise<string> {
  const data = {
    name: GTM_CAMPAIGN.name,
    canonType: GTM_CAMPAIGN.canonType,
    routeKey: GTM_CAMPAIGN.routeKey,
    aarrrPrimary: GTM_CAMPAIGN.aarrrPrimary,
    aarrrSecondary: GTM_CAMPAIGN.aarrrSecondary,
    isAlwaysOn: false,
    budgetCurrency: currency,
    startDate: new Date(GTM_CAMPAIGN.startDate),
    endDate: new Date(GTM_CAMPAIGN.endDate),
    objectives: {
      description:
        "Lancement de La Meute à Abidjan (cycle 13/07 → 01/09) : quiz d'acquisition, " +
        "soft launch, beta fermée, sprint terrain semaine de l'indépendance, puis bilan de cycle.",
      primary: "Acquisition — waitlist / leads via le quiz La Meute",
      secondary: "Parrainage — k-factor > 0,3 (croissance organique)",
    } as Prisma.InputJsonValue,
  };
  const existing = await db.campaign.findFirst({
    where: {
      strategyId: SPAWT_STRATEGY_ID,
      canonType: GTM_CAMPAIGN.canonType,
      routeKey: GTM_CAMPAIGN.routeKey,
    },
    select: { id: true },
  });
  if (existing) {
    await db.campaign.update({ where: { id: existing.id }, data });
    return existing.id;
  }
  const created = await db.campaign.create({
    data: {
      strategyId: SPAWT_STRATEGY_ID,
      ...data,
      code: GTM_CAMPAIGN.code,
      // Soft launch en cours (J0 = 13/07) → la campagne est active.
      state: "LIVE",
      status: "ACTIVE",
    },
    select: { id: true },
  });
  return created.id;
}

/** Upsert idempotent d'un jalon (par campaignId + titre). */
async function upsertMilestone(campaignId: string, m: GtmMilestone): Promise<void> {
  const existing = await db.campaignMilestone.findFirst({
    where: { campaignId, title: m.title },
    select: { id: true },
  });
  const data = {
    dueDate: new Date(m.dueDate),
    phase: m.phase,
    isGateReview: m.isGateReview,
  };
  if (existing) {
    await db.campaignMilestone.update({ where: { id: existing.id }, data });
    return;
  }
  await db.campaignMilestone.create({
    data: { campaignId, title: m.title, status: "PENDING", ...data },
  });
}

interface UpsertActionArgs {
  strategyId: string;
  campaignId: string;
  sourceInitiativeId: string;
  title: string;
  description: string;
  start: string;
  end?: string;
  status: "EXECUTED" | "ACCEPTED";
  touchpoint: string;
  phase: string;
  extraMeta?: Record<string, unknown>;
}

async function upsertAction(a: UpsertActionArgs) {
  const metadata = { phase: a.phase, gtm: "v2", ...(a.extraMeta ?? {}) } as Prisma.InputJsonValue;
  await db.brandAction.upsert({
    where: {
      strategyId_sourceInitiativeId: { strategyId: a.strategyId, sourceInitiativeId: a.sourceInitiativeId },
    },
    update: {
      title: a.title,
      description: a.description,
      status: a.status,
      selected: true,
      campaignId: a.campaignId,
      touchpoint: a.touchpoint,
      timingStart: new Date(a.start),
      timingEnd: a.end ? new Date(a.end) : null,
      metadata,
    },
    create: {
      strategyId: a.strategyId,
      campaignId: a.campaignId,
      sourceInitiativeId: a.sourceInitiativeId,
      title: a.title,
      description: a.description,
      source: "SEED",
      status: a.status,
      selected: true,
      touchpoint: a.touchpoint,
      timingStart: new Date(a.start),
      timingEnd: a.end ? new Date(a.end) : null,
      metadata,
    },
  });
}

// Runner CLI (`npm run db:seed:spawt-gtm`) — jamais à l'import (endpoint tunnel).
if (
  typeof process !== "undefined" &&
  Array.isArray(process.argv) &&
  typeof process.argv[1] === "string" &&
  /seed-spawt-gtm/.test(process.argv[1])
) {
  seedSpawtGtm()
    .then(() => db.$disconnect())
    .then(() => process.exit(0))
    .catch(async (e) => {
      console.error("❌ seed-spawt-gtm:", e);
      await db.$disconnect();
      process.exit(1);
    });
}
