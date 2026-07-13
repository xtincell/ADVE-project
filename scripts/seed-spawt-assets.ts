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
import { PrismaClient } from "@prisma/client";
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
  accent: "#D4AF37", // or — CTAs, tagline, étoiles
  primary: "#0A0A0A", // noir profond — dominante
  full: ["#0A0A0A", "#D4AF37", "#50C878", "#F8F6F0"],
  note: "Noir profond + or + émeraude + crème (source : ADVE pilier V + bible Moka).",
};

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
      state: a.state,
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

async function main() {
  const db = makeDb();
  console.log(`\n[SPAWT assets] strategy=${STRATEGY_ID} · source=${PUBLIC_DIR}`);

  const strategy = await db.strategy.findUnique({ where: { id: STRATEGY_ID }, select: { id: true, name: true } });
  if (!strategy) {
    console.error(`[STOP] Strategy "${STRATEGY_ID}" introuvable — lance d'abord \`npm run db:seed:spawt\`.`);
    await db.$disconnect();
    process.exit(1);
  }
  if (!existsSync(PUBLIC_DIR)) {
    console.error(`[STOP] ${PUBLIC_DIR} introuvable — exécute ce seed depuis la racine du repo (les assets sont committés dans public/brand/spawt/).`);
    await db.$disconnect();
    process.exit(1);
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

  console.log(`[OK] SPAWT assets : ${created} créé(s), ${skipped} déjà présent(s).`);
  const total = await db.brandAsset.count({ where: { strategyId: STRATEGY_ID } });
  console.log(`[OK] Coffre SPAWT : ${total} actif(s) au total.`);
  await db.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
