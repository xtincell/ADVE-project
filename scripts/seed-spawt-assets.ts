/**
 * Seed — coffre de marque SPAWT (assets officiels fournis par l'opératrice).
 *
 * « Exploiter les assets de marque » (mandat opérateur 2026-07-13) : les
 * fichiers officiels (logos, mascotte Moka, photos, boards social, icônes,
 * bible de personnage) vivent dans `public/brand/spawt/` (committés) ; ce seed
 * les inscrit dans le coffre (`BrandAsset`) de la marque `spawt-strategy` pour
 * qu'ils soient EXPLOITÉS par le système :
 *   - le logo principal (LOGO_FINAL ACTIVE) → dashboard, sidebar, page publique
 *     (résolu par `cockpit.getBrandIdentity` : LOGO_FINAL ACTIVE en tête) ;
 *   - la palette (CHROMATIC_STRATEGY ACTIVE) → accent cockpit (ADR-0130) ;
 *   - Moka ×N + photos + boards → coffre / bibliothèque d'actifs, réutilisables
 *     dans les publications (le visuel J0 = `post-quiz-1.png`, câblé côté GTM) ;
 *   - la bible de Moka (PERSONA) → doctrine de personnage dans le coffre.
 *
 * Honnête : un enregistrement n'est créé QUE si le fichier existe réellement
 * sur le disque (aucune fabrication). Idempotent : (strategyId, kind, name).
 *
 * Exécution : `npm run db:seed:spawt-assets` (depuis la racine du repo).
 */

import { readdirSync, existsSync } from "node:fs";
import path from "node:path";
import { PrismaClient, BrandAssetState } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import type { Prisma } from "@prisma/client";

const STRATEGY_ID = "spawt-strategy";
const PUBLIC_DIR = path.join(process.cwd(), "public", "brand", "spawt");
const URL_BASE = "/brand/spawt";

function makeDb(): PrismaClient {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL not set — Prisma 7 driver adapter requires it.");
  return new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
}

/** Libellés FR des poses de Moka (bible de personnage). */
const MOKA_LABELS: Record<string, string> = {
  "moka-salut": "salut (pose canonique)",
  "moka-cherche": "cherche",
  "moka-coupdecoeur": "coup de cœur",
  "moka-regale": "se régale",
  "moka-partage": "partage",
  "moka-recommande": "recommande",
  "moka-curieux": "curieux",
  "moka-vadrouille": "en vadrouille",
  "moka-carte": "carte",
  "moka-menu": "menu",
  "moka-gold": "gold / premium",
  "moka-celebration": "célébration (level up)",
  "moka-ambiance": "ambiance (date)",
  "moka-bof": "bof / mitigé",
  "moka-offre": "offre",
  "moka-promo": "promo",
  "moka-reservation": "réservation confirmée",
  "moka-notification": "notification",
  "moka-merci": "merci",
  "moka-confiance": "confiance / sécurité",
  "moka-erreur": "erreur / oups",
  "moka-dodo": "dodo (fermé)",
  "moka-meteo": "météo",
  "moka-profil-pont-ado": "profil",
  "moka-walking": "en marche",
};

const LOGO_LABELS: Record<string, string> = {
  "logo-cat-horizontal": "lockup horizontal (chat + wordmark + tagline) — identité principale",
  "logo-calico": "marque figurative Moka (calico)",
  "logo-cat-icon-nostars": "icône chat (sans étoiles)",
  "logo-icon": "icône d'app (pin + chat)",
  "logo-map-horizontal": "lockup horizontal (motif carte)",
  "logo-map-icon": "icône carte",
  "logo-map-vertical": "lockup vertical (motif carte)",
  "logo-contour-horizontal": "contour horizontal (monochrome)",
  "logo-contour-icon": "contour icône",
  "logo-contour-vertical": "contour vertical",
  "logo-contour-wordmark": "contour wordmark",
  "logo-tagline": "tagline seule",
  "logo-wordmark-only": "wordmark seul",
  "logo-wordmark-tagline": "wordmark + tagline",
  "logo-wordmark": "wordmark",
  "splash-icon": "écran de démarrage — icône",
  "splash-wordmark-tagline": "écran de démarrage — wordmark + tagline",
};

const PHOTO_LABELS: Record<string, string> = {
  "photo-restaurant": "restaurant (ambiance)",
  "photo-cocktails": "cocktails",
  "photo-cheers": "cheers (trinquer)",
};

const SOCIAL_LABELS: Record<string, string> = {
  "post-quiz-1": "post quiz « archétype foodie » (visuel J0)",
  "post-quiz-2": "post quiz — variante",
  "board-social-1": "board créatif social 1",
  "board-social-2": "board créatif social 2",
};

/** Palette officielle SPAWT (déclarée en pilier V + bible Moka + logo). */
const PALETTE = {
  accent: "#C8A44E", // SPAWT Gold — CTAs, tagline, étoiles, accent cockpit (ADR-0130)
  primary: "#0A0A0A", // SPAWT Black — dominante
  full: ["#0A0A0A", "#C8A44E", "#2D6B4F", "#FAFAF8", "#E89A39", "#EFE8DC"],
  note: "SPAWT Black + Gold + Chat Green + Blanc cassé (+ Amber, Crème). Source : brand book officiel v1.0 (2026).",
};

// Système typographique officiel (brand book v1.0) : Klinsman = police EXCLUSIVE
// (titres, corps, UI, wordmark, archétypes) ; Gotham = support (texte, légendes).
const FONT_FILES: Array<{ file: string; family: "Klinsman" | "Gotham"; weight: string; mime: string }> = [
  { file: "Klinsman-Light.otf", family: "Klinsman", weight: "Light 300", mime: "font/otf" },
  { file: "Klinsman-Regular.otf", family: "Klinsman", weight: "Regular 400", mime: "font/otf" },
  { file: "Klinsman-Bold.otf", family: "Klinsman", weight: "Bold 700", mime: "font/otf" },
  { file: "Gotham-Book.ttf", family: "Gotham", weight: "Book 400", mime: "font/ttf" },
  { file: "Gotham-Medium.ttf", family: "Gotham", weight: "Medium 500", mime: "font/ttf" },
  { file: "Gotham-Bold.ttf", family: "Gotham", weight: "Bold 700", mime: "font/ttf" },
];

const MOKA_BIBLE = `# Moka — bible de personnage (mascotte SPAWT)

Moka est une **chatte calico** (tricolore) : pelage blanc cassé dominant, larges
taches charbon (#0A0A0A) et roux doré / or (#C8A44E), tache dorée sur l'œil ;
museau blanc, grands yeux ronds amicaux ; silhouette ronde et douce, queue
touffue tricolore. Style **illustration mascotte moderne, plat (flat), contours
nets**, ombrage minimal et chaleureux — pas de 3D, pas de photoréalisme.
Tempérament : complice, gourmande, taquine, élégante (« la carte du bon goût »).

23 poses canoniques (composant CatBubble) : salut (fixe), cherche, coup de cœur,
se régale, partage, recommande, curieux, en vadrouille, carte, menu, gold,
célébration, ambiance, bof, offre, promo, réservation, notification, merci,
confiance, erreur, dodo, météo.`;

async function ensureAsset(
  db: PrismaClient,
  a: {
    name: string;
    kind: string;
    family: string;
    state: string;
    pillarSource: string;
    fileUrl?: string;
    mimeType?: string;
    summary: string;
    content?: Prisma.InputJsonValue;
    metadata?: Prisma.InputJsonValue;
  },
): Promise<"created" | "skipped"> {
  const existing = await db.brandAsset.findFirst({
    where: { strategyId: STRATEGY_ID, kind: a.kind, name: a.name },
    select: { id: true },
  });
  if (existing) return "skipped";
  await db.brandAsset.create({
    data: {
      strategyId: STRATEGY_ID,
      name: a.name,
      kind: a.kind,
      family: a.family,
      state: a.state as BrandAssetState,
      pillarSource: a.pillarSource,
      fileUrl: a.fileUrl ?? null,
      mimeType: a.mimeType ?? null,
      summary: a.summary,
      content: a.content ?? undefined,
      metadata: (a.metadata ?? { provenance: "Kit de marque officiel SPAWT (fourni par l'opératrice, 2026-07-13)" }) as Prisma.InputJsonValue,
    },
  });
  return "created";
}

function listFiles(sub: string, exts: string[]): string[] {
  const dir = path.join(PUBLIC_DIR, sub);
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((f) => exts.some((e) => f.toLowerCase().endsWith(e)) && !f.startsWith("."))
    .sort();
}

function stem(file: string): string {
  return file.replace(/\.[^.]+$/, "");
}

function humanize(s: string): string {
  const t = s.replace(/[-_]/g, " ").trim();
  return t.charAt(0).toUpperCase() + t.slice(1);
}

// Exportée pour l'endpoint /api/admin/seed-brands (runtime app, client injecté).
// Ne crée pas/ne ferme pas la connexion, n'appelle JAMAIS process.exit
// (tuerait le serveur) : les absences (strategy manquante, dossier non lisible
// au runtime standalone) retournent un `note` honnête au lieu d'un STOP.
export async function seedSpawtAssets(
  db: PrismaClient,
): Promise<{ created: number; skipped: number; note?: string }> {
  console.log(`\n[SPAWT assets] strategy=${STRATEGY_ID} · source=${PUBLIC_DIR}`);

  const strategy = await db.strategy.findUnique({ where: { id: STRATEGY_ID }, select: { id: true, name: true } });
  if (!strategy) {
    const note = `Strategy "${STRATEGY_ID}" absente — lancer le seed complet d'abord`;
    console.warn(`[SKIP] ${note}`);
    return { created: 0, skipped: 0, note };
  }
  if (!existsSync(PUBLIC_DIR)) {
    // En image standalone, public/ peut ne pas être au cwd → non énumérable ici
    // (les fichiers sont servis en HTTP mais pas lisibles par readdir).
    const note = `${PUBLIC_DIR} introuvable au runtime — assets non enrôlés`;
    console.warn(`[SKIP] ${note}`);
    return { created: 0, skipped: 0, note };
  }

  let created = 0;
  let skipped = 0;
  const bump = (r: "created" | "skipped") => (r === "created" ? created++ : skipped++);

  // ── 1. Logos (LOGO_FINAL) — le lockup horizontal est ACTIVE (identité) ──
  for (const file of listFiles("logos", [".png", ".svg"])) {
    const s = stem(file);
    if (s.startsWith("moka")) continue; // mascotte rangée plus bas, pas un logo
    const isPrimary = s === "logo-cat-horizontal";
    bump(
      await ensureAsset(db, {
        name: `Logo SPAWT — ${LOGO_LABELS[s] ?? humanize(s)}`,
        kind: "LOGO_FINAL",
        family: "MATERIAL",
        state: isPrimary ? "ACTIVE" : "SELECTED",
        pillarSource: "D",
        fileUrl: `${URL_BASE}/logos/${file}`,
        mimeType: file.endsWith(".svg") ? "image/svg+xml" : "image/png",
        summary: isPrimary
          ? "Logo principal SPAWT — Moka dans le pin + wordmark + « La carte du bon goût ». Identité affichée au dashboard, à la sidebar et sur la page publique."
          : `Variante du système de logo SPAWT (${LOGO_LABELS[s] ?? humanize(s)}).`,
      }),
    );
  }

  // ── 2. Mascotte Moka (KV_VISUAL) — poses depuis logos/ + mascots/ ──
  const mokaFiles = [
    ...listFiles("logos", [".png"]).filter((f) => stem(f).startsWith("moka")).map((f) => ["logos", f] as const),
    ...listFiles("mascots", [".png"]).map((f) => ["mascots", f] as const),
  ];
  for (const [sub, file] of mokaFiles) {
    const s = stem(file);
    const label = MOKA_LABELS[s] ?? humanize(s.replace(/^moka-?/, ""));
    bump(
      await ensureAsset(db, {
        name: `Moka — ${label}`,
        kind: "KV_VISUAL",
        family: "MATERIAL",
        state: "ACTIVE",
        pillarSource: "V",
        fileUrl: `${URL_BASE}/${sub}/${file}`,
        mimeType: "image/png",
        summary: `Mascotte Moka (chatte calico) — pose « ${label} ». Détourée, réutilisable dans les publications et l'UI.`,
      }),
    );
  }

  // ── 3. Photos (KV_VISUAL) ──
  for (const file of listFiles("photos", [".png", ".jpg", ".jpeg"])) {
    const s = stem(file);
    bump(
      await ensureAsset(db, {
        name: `Photo SPAWT — ${PHOTO_LABELS[s] ?? humanize(s.replace(/^photo-?/, ""))}`,
        kind: "KV_VISUAL",
        family: "MATERIAL",
        state: "ACTIVE",
        pillarSource: "V",
        fileUrl: `${URL_BASE}/photos/${file}`,
        mimeType: "image/png",
        summary: `Photographie de marque SPAWT (${PHOTO_LABELS[s] ?? humanize(s)}).`,
      }),
    );
  }

  // ── 4. Social (KV_VISUAL) — post-quiz-1 = visuel J0 ──
  for (const file of listFiles("social", [".png", ".jpg", ".jpeg"])) {
    const s = stem(file);
    bump(
      await ensureAsset(db, {
        name: `Social SPAWT — ${SOCIAL_LABELS[s] ?? humanize(s)}`,
        kind: "KV_VISUAL",
        family: "MATERIAL",
        state: "ACTIVE",
        pillarSource: "V",
        fileUrl: `${URL_BASE}/social/${file}`,
        mimeType: "image/png",
        summary: `Visuel réseaux sociaux SPAWT (${SOCIAL_LABELS[s] ?? humanize(s)}).`,
      }),
    );
  }

  // ── 5. Jeu d'icônes (un seul enregistrement « pack », pas 151 lignes) ──
  const icons = listFiles("icons", [".svg", ".png"]);
  if (icons.length > 0) {
    bump(
      await ensureAsset(db, {
        name: `SPAWT — jeu d'icônes UI (${icons.length})`,
        kind: "GENERIC",
        family: "INTELLECTUAL",
        state: "ACTIVE",
        pillarSource: "V",
        summary: `Jeu d'icônes officiel SPAWT — ${icons.length} fichiers sous ${URL_BASE}/icons/.`,
        content: { count: icons.length, baseUrl: `${URL_BASE}/icons/`, files: icons.slice(0, 200) } as Prisma.InputJsonValue,
      }),
    );
  }

  // ── 6. Bible de personnage Moka (PERSONA, intellectuel) ──
  bump(
    await ensureAsset(db, {
      name: "Moka — bible de personnage (mascotte)",
      kind: "PERSONA",
      family: "INTELLECTUAL",
      state: "ACTIVE",
      pillarSource: "A",
      summary: "Doctrine de la mascotte Moka (chatte calico) : apparence, style, tempérament, 23 poses canoniques.",
      content: { markdown: MOKA_BIBLE, poses: Object.values(MOKA_LABELS) } as Prisma.InputJsonValue,
    }),
  );

  // ── 7. Palette (CHROMATIC_STRATEGY ACTIVE) → accent cockpit (ADR-0130) ──
  bump(
    await ensureAsset(db, {
      name: "Palette SPAWT — or & noir",
      kind: "CHROMATIC_STRATEGY",
      family: "INTELLECTUAL",
      state: "ACTIVE",
      pillarSource: "V",
      summary: "Palette officielle SPAWT : noir profond dominant, or (accent), émeraude, crème.",
      content: { accent: PALETTE.accent, primary: PALETTE.primary, full: PALETTE.full, note: PALETTE.note } as Prisma.InputJsonValue,
    }),
  );

  // ── 8. Fichiers de police (MATERIAL) — servis en HTTP, téléchargeables ──
  for (const f of FONT_FILES) {
    bump(
      await ensureAsset(db, {
        name: `Police ${f.family} — ${f.weight}`,
        kind: "GENERIC",
        family: "MATERIAL",
        state: "ACTIVE",
        pillarSource: "D",
        fileUrl: `${URL_BASE}/fonts/${f.file}`,
        mimeType: f.mime,
        summary: `Fichier de police officiel SPAWT — ${f.family} ${f.weight} (brand book v1.0).`,
      }),
    );
  }

  // ── 9. Système typographique (TYPOGRAPHY_SYSTEM ACTIVE) → zone « typo » ──
  const fontUrls = (fam: "Klinsman" | "Gotham") =>
    FONT_FILES.filter((f) => f.family === fam).map((f) => `${URL_BASE}/fonts/${f.file}`);
  bump(
    await ensureAsset(db, {
      name: "Système typographique SPAWT — Klinsman + Gotham",
      kind: "TYPOGRAPHY_SYSTEM",
      family: "INTELLECTUAL",
      state: "ACTIVE",
      pillarSource: "D",
      summary:
        "Klinsman = police EXCLUSIVE (titres, corps, UI, wordmark, archétypes). Gotham = support (texte, légendes). Brand book v1.0.",
      content: {
        primary: {
          family: "Klinsman",
          role: "Police exclusive — titres, corps, UI, wordmark, archétypes",
          weights: ["Light 300", "Regular 400", "Bold 700"],
          files: fontUrls("Klinsman"),
        },
        secondary: {
          family: "Gotham",
          role: "Support — corps, paragraphes, UI, légendes",
          weights: ["Book 400", "Medium 500", "Bold 700"],
          files: fontUrls("Gotham"),
        },
        baseUrl: `${URL_BASE}/fonts/`,
        source: "Brand book officiel SPAWT v1.0 (2026)",
      } as Prisma.InputJsonValue,
    }),
  );

  // ── 10. Brand book officiel (BRAND_GUIDELINES) — livrable MAJEUR, pair de
  // l'Oracle (ORACLE_DOCUMENT). Le PDF officiel v1.0 (40 pages) ingéré tel quel
  // (source FILE/OFFICIAL, pas un draft LLM) + le canon structuré extrait. ──
  bump(
    await ensureAsset(db, {
      name: "Brand book officiel SPAWT — v1.0",
      kind: "BRAND_GUIDELINES",
      family: "INTELLECTUAL",
      state: "ACTIVE",
      pillarSource: "D",
      fileUrl: `${URL_BASE}/SPAWT-brandbook-v2.pdf`,
      mimeType: "application/pdf",
      summary:
        "Brand book officiel SPAWT v1.0 (40 pages) : brand story, contrat SPAWT, dialecte, voix & ton, système Palais, 13 archétypes, 5 stades de maturité, 3 modes UX, personas, identité visuelle (logo, palette, typo Klinsman+Gotham). Document de référence — livrable majeur pair de l'Oracle.",
      content: {
        version: "v1.0 (2026)",
        source: "Brand book officiel fourni par l'opératrice (PDF 40 pages)",
        mission: "Nous tuons le temps perdu à chercher où sortir manger.",
        vision: "Ne plus jamais regretter un restaurant. Plus jamais le goumin d'un mauvais restau.",
        positioning:
          "Pour les foodies urbains d'Abidjan qui en ont marre de perdre du temps à chercher où manger, SPAWT est le compagnon de découverte culinaire communautaire qui recommande le bon lieu au bon moment grâce au Palais.",
        values: ["Sécurité", "Universalisme", "Bienveillance", "Stimulation"],
        personality: ["Direct", "Complice", "Curieux", "Indépendant", "Authentique"],
        colors: {
          primary: "#0A0A0A (SPAWT Black)",
          gold: "#C8A44E (SPAWT Gold)",
          green: "#2D6B4F (Chat Green)",
          offWhite: "#FAFAF8 (Blanc cassé)",
          amber: "#E89A39 (Amber Warm)",
          sand: "#EFE8DC (Crème Sable)",
        },
        typography: { primary: "Klinsman (exclusive)", secondary: "Gotham (support)" },
        logo: {
          primary: "Vertical Carte (standard) — wordmark Klinsman + tagline dorée",
          icon: "Icône Carte + 3 étoiles (favicons/app)",
          alternate: "Calico (mascotte) — usages spéciaux/événements",
          clearSpace: "1.5× hauteur du 'S' ; min print 20mm / digital 64px",
        },
        mascot: "Moka — chatte calico (tricolore), 23 poses canoniques",
        sections: [
          "01 Brand Story", "02 Le Contrat SPAWT", "03 Le Dialecte", "04 Brand Voice & Tone",
          "05 Système Palais", "06 Les 13 Archétypes", "07 Les 5 Stades de Maturité",
          "08 Les 3 Modes UX", "09 Personas", "10 Logo Guidelines", "11 Color Palette", "12 Typography",
        ],
      } as Prisma.InputJsonValue,
      metadata: { provenance: "Brand book officiel SPAWT v1.0 — PDF fourni par l'opératrice (2026-07-14)", source: "OFFICIAL" },
    }),
  );

  console.log(`[OK] SPAWT assets : ${created} créé(s), ${skipped} déjà présent(s).`);
  const total = await db.brandAsset.count({ where: { strategyId: STRATEGY_ID } });
  console.log(`[OK] Coffre SPAWT : ${total} actif(s) au total.`);
  return { created, skipped };
}

// Runner CLI (`npm run db:seed:spawt-assets`) — jamais à l'import (endpoint).
if (
  typeof process !== "undefined" &&
  Array.isArray(process.argv) &&
  typeof process.argv[1] === "string" &&
  /seed-spawt-assets/.test(process.argv[1])
) {
  const cliDb = makeDb();
  seedSpawtAssets(cliDb)
    .then(() => cliDb.$disconnect())
    .then(() => process.exit(0))
    .catch((e: unknown) => {
      console.error(e);
      process.exit(1);
    });
}
