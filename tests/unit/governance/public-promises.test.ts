/**
 * Anti-drift CI — promesses publiques (F16 Shinkiro, recette du 11 novembre 2026).
 *
 * Recette : `docs/governance/RECEPTION-PROMESSES-PUBLIQUES.md`. Chaque motif
 * ci-dessous est une affirmation qu'une page publique (sans connexion)
 * faisait sur ce que La Fusée fait, garantit ou coûte, et que le code ou les
 * réceptions démentent. Le texte a été corrigé pour dire ce qui est vrai ;
 * ce verrou empêche le retour de la formule.
 *
 * Il ne remplace ni la lecture native des pages ni la recette d'un cycle
 * client complet : il garde seulement les formules déjà retirées.
 *
 * Méthode : commentaires retirés, puis recherche des motifs dans le reste du
 * fichier (littéraux, texte JSX, dictionnaires i18n).
 */

import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = join(__dirname, "../../..");

function walk(dir: string): string[] {
  if (!existsSync(dir)) return [];
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    if (statSync(p).isDirectory()) out.push(...walk(p));
    else if (/\.(tsx|ts)$/.test(entry) && !/\.test\.tsx?$/.test(entry)) out.push(p);
  }
  return out;
}

/**
 * Retire `/* … *\/` (dont `{/* … *\/}`) et les lignes `// …` — jamais `https://`.
 * Les sauts de ligne sont gardés pour que les numéros de ligne restent exacts.
 */
function stripComments(src: string): string {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, (block) => block.replace(/[^\n]/g, ""))
    .split("\n")
    .map((line) => (/^\s*\/\//.test(line) ? "" : line))
    .join("\n");
}

/** Toutes les surfaces publiques porteuses de promesses (hors portails connectés). */
const PUBLIC_SURFACES = [
  ...walk(join(ROOT, "src/app/(marketing)")),
  ...walk(join(ROOT, "src/app/(public)")),
  ...walk(join(ROOT, "src/components/landing")),
  ...walk(join(ROOT, "src/components/upgraders")),
  ...walk(join(ROOT, "src/components/marketing")),
  ...walk(join(ROOT, "src/components/laguilde")),
  join(ROOT, "src/app/(intake)/score/page.tsx"),
  join(ROOT, "src/lib/i18n/pages/intake-entry.ts"),
  join(ROOT, "src/lib/i18n/pages/intake-result.ts"),
  join(ROOT, "src/lib/i18n/pages/scorer.ts"),
  join(ROOT, "src/lib/i18n/pages/leaderboard.ts"),
].filter((f) => existsSync(f));

/** Formules retirées : motif → ce que le code ou les réceptions établissent. */
const RETRACTED: Array<{ name: string; re: RegExp; truth: string }> = [
  {
    name: "rapport garanti en 15 minutes",
    re: /tombe en 15 minutes|15 minutes plus tard|rapport web en 15|Résultat : 15 minutes|diagnostic en 15 min|palier en 15 min|en quinze minutes|15 minutes pour le rapport|prend 15 minutes|se rend en 15 minutes|Diagnostic : 15 minutes|GRATUIT · 15 MIN|gratuit · 15 min/i,
    truth: "durée jamais mesurée sur le parcours complet ; génération mesurée à 364 s en local (508)",
  },
  {
    name: "verdict immédiat",
    re: /verdict immédiat/i,
    truth: "le rapport est généré après le questionnaire et peut prendre plusieurs minutes",
  },
  {
    name: "analyse en 30 à 60 secondes",
    re: /30 à 60 secondes|30-60 sec|30 to 60 seconds|30-60 秒|30 到 60 秒/i,
    truth: "import mesuré à 364 358 ms en local (réception 508)",
  },
  {
    name: "production livrée en 48 h",
    re: /livrables\) = 48h/,
    truth: "aucun cycle de production client complet reçu",
  },
  {
    name: "délais de résultat non reçus",
    re: /Premiers livrables : 30 jours|30 jours pour les premiers livrables|90 jours pour le premier palier|premier palier mesurable 90 jours|6-12 mois/,
    truth: "aucun cycle client complet ni palier atteint n'est reçu",
  },
  {
    name: "radar 8 piliers au diagnostic gratuit",
    re: /[Rr]adar 8 piliers/,
    truth: "le diagnostic gratuit trace un radar des 4 piliers ADVE (résultat intake)",
  },
  {
    name: "stratégie qui se met à jour seule",
    re: /se met(tent)? à jour seules?|qui se pilote seule|se pilote seul\b/,
    truth: "l'actualisation est demandée ; le socle ADVE ne change que par décision humaine",
  },
  {
    name: "état système affiché sans mesure",
    re: /SYSTEM · NOMINAL/,
    truth: "libellé statique, sans lien avec /status",
  },
  {
    name: "tâches planifiées inexistantes",
    re: /CRON · |DEFEND_LEGACY|STABILIZE_BASE|DETECT_PULSE|EXPAND_SECTOR\b|sentinelles cron/,
    truth: "seules MAINTAIN_APOGEE, DEFEND_OVERTON et EXPAND_TO_ADJACENT_SECTOR existent",
  },
  {
    name: "écarts chiffrés inventés",
    re: /vs benchmark|secteurs suivis en continu/,
    truth: "aucune étude ni mesure derrière ces chiffres d'illustration",
  },
  {
    name: "affectation automatique des talents",
    re: /sans dispatch humain|matching automatique|matchées automatiquement|Missions dispatchées|missions se dispatchent/i,
    truth: "une affectation reste une proposition à confirmer",
  },
  {
    name: "verrou budgétaire universel",
    re: /chaque franc passe par un verrou|Chaque dépense validée/i,
    truth: "le contrôle de coût porte sur les opérations gouvernées, pas sur chaque dépense",
  },
  {
    name: "garanties de stockage non établies",
    // La liste contractuelle des sous-traitants (DPA §7) n'est pas visée : sa
    // mise à jour est une décision du propriétaire (recette, cas ouverts).
    re: /briefs sont chiffrés au repos|Aucun cross-tenant possible|AES-256 \(PostgreSQL managé\)|infrastructure Supabase\/PostgreSQL managée|\(fournisseur managé\)|Coffre applicatif chiffré|stockés chiffrés dans un coffre/,
    truth: "base PostgreSQL auto-hébergée ; configurations de connecteurs stockées en JSON non chiffré",
  },
  {
    name: "journal sans données personnelles",
    re: /ne contient jamais de données personnelles|sans exposer de données personnelles en clair/,
    truth: "le journal conserve l'entrée des opérations, dont certains noms et numéros",
  },
  {
    name: "hébergeurs abandonnés",
    re: /Vercel Inc\.|Base de données : Supabase/,
    truth: "production sur serveur privé Coolify depuis le 5 juillet 2026",
  },
  {
    name: "commissions par palier client",
    re: /Hub-Escrow sont dégressives/,
    truth: "les taux de commission dépendent du palier du talent, pas du client",
  },
  {
    name: "talents vérifiés",
    re: /agences de prod vérifiés/,
    truth: "l'inscription à La Guilde est ouverte, sans vérification du profil",
  },
  {
    name: "rien n'est envoyé",
    re: /rien n(&apos;|'|’)est envoyé sans votre accord/,
    truth: "le formulaire transmet déjà nom, email et marque à /api/contact",
  },
  {
    name: "pénalités et constat SLA automatiques",
    re: /imputés automatiquement|est mécanique, lisible par le client/,
    truth: "aucun calcul d'avoir ni vue de constat SLA dans le code",
  },
  {
    name: "changelog horaire",
    re: /cron horaire/,
    truth: "page statique régénérée à la construction de l'image",
  },
  {
    name: "score complet promis par le radar ADVE",
    re: /your full brand score \/200 \(execution pillars included\)|品牌总分 \/200（含执行支柱）/,
    truth: "le /100 mesure la complétude du dossier ADVE (texte FR)",
  },
];

describe("Promesses publiques — formules retirées (F16)", () => {
  it("scanne un périmètre public non vide", () => {
    expect(PUBLIC_SURFACES.length).toBeGreaterThan(60);
  });

  it("aucune promesse démentie ne revient sur une page publique", () => {
    const violations: string[] = [];
    for (const file of PUBLIC_SURFACES) {
      const rel = relative(ROOT, file);
      const lines = stripComments(readFileSync(file, "utf-8")).split("\n");
      lines.forEach((line, i) => {
        for (const { name, re, truth } of RETRACTED) {
          const m = line.match(re);
          if (m) violations.push(`${rel}:${i + 1} [${name}] « ${m[0]} » — ${truth}`);
        }
      });
    }
    expect(violations, `Promesse publique démentie :\n${violations.join("\n")}`).toEqual([]);
  });
});

describe("Page /status — aucun état « opérationnel » sans mesure", () => {
  const status = stripComments(readFileSync(join(ROOT, "src/app/(public)/status/page.tsx"), "utf-8"));

  it("délègue le verdict au calcul partagé", () => {
    expect(status).toMatch(/derivePublicStatus\(/);
  });

  it("ne remplace plus une lecture échouée par zéro", () => {
    expect(status).not.toMatch(/\.catch\(\(\) => 0\)/);
    expect(status).not.toMatch(/successRate: 100/);
  });

  it("dit « configuré » et non « actif » pour un moyen de paiement non éprouvé", () => {
    expect(status).not.toMatch(/✓ actif/);
  });
});
