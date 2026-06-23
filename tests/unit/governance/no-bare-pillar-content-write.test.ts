/**
 * Anti-drift — KEYSTONE C5 : écriture de `Pillar.content` hors Pillar Gateway interdite.
 *
 * # Le trou que ce test ferme (PROPAGATION-MAP §6b, hole C5)
 *
 *   « aucun test CI n'impose l'écriture pilier via gateway → "single write
 *     point" = convention, pas invariant. Combiné à C1-C4, Q3 (non-bypass)
 *     n'est pas enforced. »
 *
 * Le Pillar Gateway (`src/server/services/pillar-gateway/index.ts`,
 * `writePillar` / `writePillarAndScore`) est le **chokepoint unique** d'écriture
 * du contenu pilier (LOI 1 du CdC v4). Lui seul exécute, dans une transaction :
 * validation Zod + `PillarVersion` + scoring + cascade staleness + auto-approval
 * + `pillar.written` event. **Toute écriture `Pillar.content` brute hors gateway
 * est un trou** : elle saute le scoring, le versioning, la cascade et l'author
 * trail — une modif aval peut alors casser une dépendance silencieusement.
 *
 * Le sibling `no-bare-writepillar.test.ts` garde le *helper* `writePillar()` ;
 * CE test garde les écritures **Prisma brutes** `db.pillar.{create,update,
 * upsert,updateMany,createMany}({ content })`. Ensemble ils transforment la
 * convention « single write point » en invariant CI (Q3 non-bypass).
 *
 * # Mécanisme d'exception formalisé — « à mes risques et périls »
 *
 * Une écriture brute légitime (bootstrap, rollback, god-mode, point d'entrée
 * intake pas encore reroute) DOIT être inscrite dans
 * `ALLOWED_BARE_PILLAR_CONTENT_WRITES` ci-dessous. Chaque entrée est un **risque
 * explicitement accepté** : elle porte le hole id PROPAGATION-MAP, une raison,
 * et `reroutePlanned` (true = dette à résorber via le gateway, false = légitime
 * par design). Ajouter une écriture brute SANS l'inscrire ici fait échouer la CI.
 * Inscrire une entrée qui ne pointe plus sur une écriture réelle la fait échouer
 * aussi (purge des exceptions périmées) — l'allowlist ne peut pas pourrir.
 *
 * C'est l'équivalent code-level du « full auto à mes risques » : un bypass n'est
 * jamais invisible, il est déclaré, justifié et traçable.
 *
 * # Exemptions automatiques (pas une écriture de contenu)
 *
 *   - Fichiers sous `src/server/services/pillar-gateway/` — c'est LE chokepoint,
 *     ses écritures sont canoniques par définition.
 *   - `content: {}` (objet vide, éventuellement `as ...`) — pré-création /
 *     reset de la *ligne* pilier ; le contenu réel arrive ensuite via le gateway.
 *     Le gateway lui-même utilise cet idiome (`upsert … create: { content: {} }`).
 *   - Écritures de métadonnées seules (`staleAt`, `completionLevel`,
 *     `validationStatus`, `fieldCertainty`, `commentary`, `confidence`,
 *     `pendingRecos`, `currentVersion`) — pas de `content:` dans le payload.
 *
 * # Hors périmètre (par design)
 *
 *   - `prisma/seed-*.ts`, `scripts/**` (hole C4) — bootstrap déploiement, hors
 *     `src/` runtime, naturellement exclus du walk. C4 reste « par-design non
 *     gardé » (cf. PROPAGATION-MAP §6b).
 *
 * Mode HARD (baseline=0) — toute violation bloque le merge.
 */

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = join(__dirname, "..", "..", "..");
const SRC = join(ROOT, "src");

/** Le Pillar Gateway EST le chokepoint — ses écritures de contenu sont canoniques. */
const GATEWAY_DIR = "src/server/services/pillar-gateway/";

/**
 * Écritures `Pillar.content` brutes légitimes hors gateway — chacune un risque
 * explicitement accepté (« à mes risques et périls »). Format : POSIX path
 * relatif au repo root + numéro de ligne du `.pillar.<method>(`.
 *
 * `hole`           — id du registre PROPAGATION-MAP §6b (ou "—" si non catalogué).
 * `reroutePlanned` — true : dette à router via le gateway (P2+) ; false : légitime
 *                    par design (rollback, god-mode best-effort, seed-on-create).
 */
interface AcceptedBareWrite {
  file: string;
  line: number;
  hole: string;
  reason: string;
  reroutePlanned: boolean;
}

const ALLOWED_BARE_PILLAR_CONTENT_WRITES: ReadonlyArray<AcceptedBareWrite> = [
  // C1 (conversion intake → Strategy, quick-intake.ts) — ✅ rerouté via le gateway
  //   (`seedPillarFromIntake` → `writePillar`, ADR-0103/P2-b). Plus aucune écriture
  //   brute ici : les 3 entrées C1 ont été retirées (preuve du reroute).
  // C2 (infer-needs-human-fields.ts) — ✅ rerouté via le gateway (`writePillar`
  //   REPLACE_FULL + targetStatus AI_PROPOSED ; fieldCertainty = métadonnée écrite à
  //   part). Entrée C2 retirée (le content write brut n'existe plus).
  {
    file: "src/server/trpc/routers/canon-sync.ts",
    line: 144,
    hole: "C3",
    reason:
      "Canon-sync god-mode : écrit le pilier S (bloc computed) direct après recompute. Best-effort, push manuel god-mode. Reroute via gateway souhaitable mais basse priorité.",
    reroutePlanned: true,
  },
  {
    file: "src/server/trpc/routers/canon-sync.ts",
    line: 154,
    hole: "C3",
    reason:
      "Canon-sync god-mode : matérialise le vecteur de score dans un pilier pseudo-`vector` (pas un pilier ADVE/RTIS canonique — projection de score). Légitime hors gateway (le gateway ne gère que les 8 piliers métier).",
    reroutePlanned: false,
  },
  {
    file: "src/server/trpc/routers/strategy.ts",
    line: 78,
    hole: "—",
    reason:
      "Seed ADVE à la création de marque (client.addBrand voisin) : amorce a/d/v depuis le business-context, e/r/t/i/s vides. Bootstrap de ligne au create. Reroute via gateway = dette P2.",
    reroutePlanned: true,
  },
  {
    file: "src/server/services/boot-sequence/index.ts",
    line: 210,
    hole: "—",
    reason:
      "Boot-sequence : normalise le content pilier (legacy → schéma courant) avant scoring. Migration de forme, pas mutation métier. Reroute via gateway = dette P2.",
    reroutePlanned: true,
  },
  {
    file: "src/server/services/pillar-versioning/index.ts",
    line: 73,
    hole: "—",
    reason:
      "Primitive de rollback : restaure le content d'un `PillarVersion` déjà validé. Sous-service du gateway (createVersion y est appelé) ; la restauration d'une version antérieure est un retour à un état déjà scoré.",
    reroutePlanned: false,
  },
  {
    file: "src/server/services/rtis-protocols/strategy.ts",
    line: 713,
    hole: "—",
    reason:
      "Protocole S (lien I→S, ADR-0088) : writeback status-only du blob I — promeut les actions selectedFromI en SELECTED_FOR_ROADMAP avant d'agréger computePillarS, puis re-matérialise BrandAction. Promotion de statut, pas mutation de contenu métier (n'affecte pas le cache completionLevel/D-2). Reroute via gateway = dette P2.",
    reroutePlanned: true,
  },
];

interface BareWrite {
  file: string;
  line: number;
}

const PILLAR_WRITE_RE =
  /\.pillar\.(?:create|update|upsert|updateMany|createMany)\s*\(/g;

/**
 * À partir de l'index du `(` ouvrant, retourne la sous-chaîne des arguments
 * jusqu'au `)` correspondant (balanced-paren, en ignorant le contenu des
 * littéraux de chaîne pour ne pas être trompé par une `(` dans une string).
 */
function extractCallArgs(text: string, openParenIdx: number): string {
  let depth = 0;
  let i = openParenIdx;
  let quote: string | null = null;
  for (; i < text.length; i++) {
    const ch = text[i]!;
    if (quote) {
      if (ch === "\\") {
        i++; // skip escaped char
        continue;
      }
      if (ch === quote) quote = null;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === "`") {
      quote = ch;
      continue;
    }
    if (ch === "(") depth++;
    else if (ch === ")") {
      depth--;
      if (depth === 0) return text.slice(openParenIdx, i + 1);
    }
  }
  return text.slice(openParenIdx); // unbalanced (shouldn't happen) — scan all
}

/**
 * true si le payload écrit `content` à une valeur AUTRE qu'un objet vide.
 * `content: {}` / `content: { }` / `content: ({}) as X` → false (lifecycle de
 * ligne, pas écriture de contenu).
 */
function hasNonEmptyContentWrite(callArgs: string): boolean {
  const re = /\bcontent\s*:/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(callArgs)) !== null) {
    const after = callArgs.slice(m.index + m[0].length).replace(/^\s*/, "");
    // Objet vide littéral (éventuellement parenthésé) → exempt.
    if (/^\(?\s*\{\s*\}/.test(after)) continue;
    return true;
  }
  return false;
}

function* walkFiles(dir: string): Generator<string> {
  for (const entry of readdirSync(dir)) {
    if (entry === "node_modules" || entry === ".next" || entry.startsWith(".")) continue;
    const full = join(dir, entry);
    const s = statSync(full);
    if (s.isDirectory()) {
      yield* walkFiles(full);
    } else if (
      s.isFile() &&
      (full.endsWith(".ts") || full.endsWith(".tsx")) &&
      !full.endsWith(".test.ts") &&
      !full.endsWith(".test.tsx") &&
      !full.endsWith(".d.ts")
    ) {
      yield full;
    }
  }
}

function findBareContentWrites(): BareWrite[] {
  const out: BareWrite[] = [];
  for (const file of walkFiles(SRC)) {
    const rel = relative(ROOT, file).replace(/\\/g, "/");
    if (rel.startsWith(GATEWAY_DIR)) continue; // the chokepoint itself

    const text = readFileSync(file, "utf-8");
    const lines = text.split("\n");
    PILLAR_WRITE_RE.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = PILLAR_WRITE_RE.exec(text)) !== null) {
      const lineNo = text.slice(0, m.index).split("\n").length;
      const lineText = (lines[lineNo - 1] ?? "").trim();
      // Skip commented references (line comment or block-comment continuation).
      if (lineText.startsWith("//") || lineText.startsWith("*")) continue;

      const openParenIdx = m.index + m[0].length - 1; // index of "("
      const args = extractCallArgs(text, openParenIdx);
      if (hasNonEmptyContentWrite(args)) {
        out.push({ file: rel, line: lineNo });
      }
    }
  }
  return out;
}

describe("KEYSTONE C5 — no bare Pillar.content write outside the gateway", () => {
  it("every non-empty Pillar.content write outside the gateway is an accepted-risk allowlist entry", () => {
    const writes = findBareContentWrites();
    const unexpected = writes.filter(
      (w) =>
        !ALLOWED_BARE_PILLAR_CONTENT_WRITES.some(
          (a) => a.file === w.file && a.line === w.line,
        ),
    );

    if (unexpected.length > 0) {
      const msg = unexpected.map((w) => `  ${w.file}:${w.line}`).join("\n");
      throw new Error(
        `${unexpected.length} écriture(s) \`Pillar.content\` brute(s) hors gateway détectée(s) hors allowlist :\n${msg}\n\n` +
          `→ Router via \`writePillarAndScore\` (pillar-gateway) — sinon scoring/versioning/cascade sautés (PROPAGATION-MAP §6b C5).\n` +
          `→ Si le bypass est intentionnel, inscrire l'entrée dans ALLOWED_BARE_PILLAR_CONTENT_WRITES avec hole + reason + reroutePlanned (« à mes risques et périls »).`,
      );
    }
    expect(unexpected).toEqual([]);
  });

  it("allowlist entries point to a real bare content write (no stale exception)", () => {
    const writes = findBareContentWrites();
    const stale = ALLOWED_BARE_PILLAR_CONTENT_WRITES.filter(
      (a) => !writes.some((w) => w.file === a.file && w.line === a.line),
    );
    if (stale.length > 0) {
      const msg = stale
        .map((s) => `  ${s.file}:${s.line} (${s.hole}: ${s.reason})`)
        .join("\n");
      throw new Error(
        `${stale.length} entrée(s) ALLOWED_BARE_PILLAR_CONTENT_WRITES pointent sur un site qui n'écrit plus de contenu — purger ou corriger la ligne :\n${msg}`,
      );
    }
    expect(stale).toEqual([]);
  });

  it("the gateway itself is the single canonical content writer (sanity)", () => {
    // The gateway must contain the canonical content persist. If this ever
    // moves out of the gateway, the invariant above is meaningless.
    const gateway = readFileSync(
      join(SRC, "server/services/pillar-gateway/index.ts"),
      "utf-8",
    );
    expect(gateway).toContain("content: newContent as Prisma.InputJsonValue");
  });

  it("documents the remaining accepted-risk reroute debt (C1 already done)", () => {
    const reroute = ALLOWED_BARE_PILLAR_CONTENT_WRITES.filter((a) => a.reroutePlanned);
    expect(reroute.length).toBeGreaterThan(0); // C2 + uncatalogued still pending
    // C1 (intake conversion) was rerouted via the gateway (P2-b) — no longer here.
    expect(ALLOWED_BARE_PILLAR_CONTENT_WRITES.some((a) => a.hole === "C1")).toBe(false);
  });
});
