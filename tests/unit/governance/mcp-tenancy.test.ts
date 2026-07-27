/**
 * Anti-drift HARD — ISOLATION INTER-MARQUES de la surface MCP.
 *
 * Incident fondateur (audit MCP externe, 2026-07-27) : `content_calendar_get`
 * appelé avec `strategyId: "spawt-strategy-001"` a renvoyé **8 missions
 * appartenant à quatre marques** (CIMENCAM, Vibranium Glow, UPGRADERS, SPAWT).
 * Le paramètre de portée était accepté puis ignoré — Zod retire les clés
 * inconnues, Prisma ignore `campaignId: undefined`, et la requête ramenait tout.
 * Branché chez un client d'agence, c'est une fuite contractuelle.
 *
 * Deux verrous complémentaires ici :
 *
 *   1. **Structurel** — tout outil qui touche de la donnée de marque déclare
 *      `strategyId` dans son schéma. Sans ça il est soit inatteignable avec une
 *      clé de marque (fail-closed d'`enforceBrandScope`), soit — avec une clé
 *      système — capable de rendre la donnée de toutes les marques.
 *   2. **Comportemental** — un outil qui déclare `strategyId` doit s'en SERVIR :
 *      son handler référence `strategyId`. Déclarer sans filtrer est exactement
 *      le défaut qui a produit la fuite.
 *
 * Les exceptions sont EXPLICITES et justifiées, jamais implicites : un outil
 * réellement transverse porte `scope: "GLOBAL"` (référentiel marché, annuaire
 * Guilde) ou `scope: "SELF_SCOPED"` (énumération des marques visibles, qui lit
 * `__auth` elle-même). Le défaut reste « scopé par marque ».
 */

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { CURATED_MCP_TOOLS } from "@/server/services/anubis/mcp-curated";

const ROOT = join(__dirname, "..", "..", "..");
const MCP_DIR = join(ROOT, "src", "server", "mcp");

interface ParsedTool {
  server: string;
  name: string;
  scope: "BRAND" | "GLOBAL" | "SELF_SCOPED";
  declaresStrategyId: boolean;
  handlerUsesStrategyId: boolean;
  /** Le handler DE CET OUTIL lit-il `__auth` ? (pas le fichier — le bloc). */
  handlerUsesAuth: boolean;
}

/**
 * Découpe un `index.ts` de serveur MCP en blocs d'outils. Analyse textuelle
 * assumée : elle n'exige aucun runtime (pas de DB, pas d'import lourd) et reste
 * lisible — c'est un garde-fou de structure, pas un typeur.
 */
function parseServer(server: string): ParsedTool[] {
  const file = join(MCP_DIR, server, "index.ts");
  const src = readFileSync(file, "utf8");
  const out: ParsedTool[] = [];
  const nameRe = /name:\s*"([a-zA-Z0-9_\-]+)",\s*\n\s*description:/g;
  const starts: Array<{ name: string; at: number }> = [];
  let m: RegExpExecArray | null;
  while ((m = nameRe.exec(src)) !== null) starts.push({ name: m[1]!, at: m.index });

  starts.forEach((s, i) => {
    const block = src.slice(s.at, starts[i + 1]?.at ?? src.length);
    // Deux formes coexistent dans le repo : schéma multi-lignes et schéma sur une
    // seule ligne (`z.object({ strategyId: … })`). Le second échappait à une
    // regex ancrée sur un retour à la ligne — d'où des faux positifs.
    const schemaMatch =
      /inputSchema:\s*z\.object\(\{([\s\S]*?)\n\s*\}\)/.exec(block) ??
      /inputSchema:\s*z\.object\(\{([^\n]*)\}\)/.exec(block);
    const schema = schemaMatch?.[1] ?? "";
    const handlerAt = block.indexOf("handler:");
    const handler = handlerAt >= 0 ? block.slice(handlerAt) : "";
    const scopeMatch = /scope:\s*"(BRAND|GLOBAL|SELF_SCOPED)"/.exec(block);
    out.push({
      server,
      name: s.name,
      scope: (scopeMatch?.[1] as ParsedTool["scope"]) ?? "BRAND",
      declaresStrategyId: /\bstrategyId\b/.test(schema),
      handlerUsesStrategyId: /\bstrategyId\b/.test(handler),
      handlerUsesAuth: /__auth/.test(handler),
    });
  });
  return out;
}

function allServers(): string[] {
  return readdirSync(MCP_DIR).filter((d) => {
    const full = join(MCP_DIR, d);
    return statSync(full).isDirectory() && !d.startsWith("_");
  });
}

const ALL_TOOLS: ParsedTool[] = allServers().flatMap((s) => {
  try {
    return parseServer(s);
  } catch {
    return [];
  }
});

describe("surface MCP — les outils curés sont joignables ET scopés", () => {
  it("le parseur voit bien les outils (garde-fou du test lui-même)", () => {
    expect(ALL_TOOLS.length).toBeGreaterThan(50);
  });

  it("tout outil curé de marque déclare `strategyId`", () => {
    const offenders = CURATED_MCP_TOOLS.filter(({ server, tool }) => {
      const found = ALL_TOOLS.find((t) => t.server === server && t.name === tool);
      if (!found) return false; // absence couverte par le cas suivant
      return found.scope === "BRAND" && !found.declaresStrategyId;
    }).map(({ server, tool }) => `${server}.${tool}`);
    expect(
      offenders,
      "Un outil curé sans `strategyId` est INATTEIGNABLE avec une clé limitée à une marque (fail-closed) — et rend toutes les marques avec une clé système.",
    ).toEqual([]);
  });

  it("chaque outil curé existe réellement", () => {
    const missing = CURATED_MCP_TOOLS.filter(
      ({ server, tool }) => !ALL_TOOLS.some((t) => t.server === server && t.name === tool),
    ).map(({ server, tool }) => `${server}.${tool}`);
    expect(missing, "Outil curé introuvable (renommé ou retiré) — il disparaît silencieusement de tools/list.").toEqual([]);
  });

  it("l'activité de la marque est exposée : campagnes et calendrier", () => {
    const curated = CURATED_MCP_TOOLS.map((t) => `${t.server}.${t.tool}`);
    // Sans campaign_list, aucun campaignId n'est découvrable et TOUS les outils
    // de campagne sont inutilisables. Sans listStrategies, aucun strategyId.
    expect(curated).toContain("advertis.listStrategies");
    expect(curated).toContain("operations.campaign_list");
    expect(curated).toContain("creative.content_calendar_get");
  });
});

describe("surface MCP — un strategyId déclaré est un strategyId utilisé", () => {
  it("aucun outil ne déclare `strategyId` sans s'en servir", () => {
    const offenders = ALL_TOOLS.filter((t) => t.declaresStrategyId && !t.handlerUsesStrategyId).map(
      (t) => `${t.server}.${t.name}`,
    );
    expect(
      offenders,
      "Déclarer un paramètre de portée puis l'ignorer est la fuite exacte de content_calendar_get (4 marques rendues pour 1 demandée).",
    ).toEqual([]);
  });
});

describe("surface MCP — les exceptions de portée sont explicites", () => {
  it("un outil hors-portée-marque porte GLOBAL ou SELF_SCOPED, jamais le silence", () => {
    // Le défaut (`BRAND`) sans `strategyId` reste toléré côté clé système, mais
    // ces outils sont refusés aux clés de marque. On les recense pour qu'aucun
    // n'y tombe par simple oubli : la liste est la dette visible, pas un blanc-seing.
    const brandButUnscopable = ALL_TOOLS.filter((t) => t.scope === "BRAND" && !t.declaresStrategyId).map(
      (t) => `${t.server}.${t.name}`,
    );
    // Aucun de ces outils n'est curé (vérifié plus haut) : ils ne sont joignables
    // que par la longue traîne `lafusee_invoke`, avec une clé système.
    const curated = new Set(CURATED_MCP_TOOLS.map((t) => `${t.server}.${t.tool}`));
    expect(brandButUnscopable.filter((n) => curated.has(n))).toEqual([]);
  });

  it("un outil SELF_SCOPED lit bien `__auth` DANS SON PROPRE BLOC", () => {
    // Le contrôle portait d'abord sur le FICHIER entier. `advertis/index.ts`
    // contient déjà `__auth` dans `amendPillar` — donc tout futur outil
    // SELF_SCOPED ajouté à ce fichier passait sans jamais lire `__auth` :
    // un garde-fou vide (relecture adversariale 2026-07-27).
    const offenders = ALL_TOOLS.filter((t) => t.scope === "SELF_SCOPED")
      .filter((t) => !t.handlerUsesAuth)
      .map((t) => `${t.server}.${t.name}`);
    expect(
      offenders,
      "SELF_SCOPED signifie « je me scope moi-même » — sans lecture de `__auth` dans SON handler, c'est une portée non appliquée.",
    ).toEqual([]);
  });
});

describe("surface MCP — aucune exception ORM ne repart à l'appelant", () => {
  it("le dispatcher est en REFUS PAR DÉFAUT sur les messages d'erreur", () => {
    const src = readFileSync(
      join(ROOT, "src", "server", "services", "anubis", "mcp-server.ts"),
      "utf8",
    );
    expect(src).toMatch(/normalizeToolError/);

    // Première version : une liste NOIRE de motifs Prisma. Elle était poreuse
    // par construction — elle laissait passer P2021 (« The table
    // `public.X` does not exist »), P2022 (colonne), P1000/P1001 (hôte, port et
    // utilisateur de la base) — dont les deux codes qui signalent littéralement
    // la dérive de schéma qu'elle prétendait attraper.
    expect(
      src,
      "Une liste noire de motifs ORM ne peut pas être exhaustive — le défaut doit être le refus.",
    ).not.toMatch(/Unknown field\|Unknown arg/);

    // Le message générique final ne contient AUCUNE variable d'erreur brute :
    // seul `serverName`/`toolName`, que nous contrôlons.
    const fn = src.slice(src.indexOf("function normalizeToolError"));
    const generic = fn.slice(fn.indexOf("return new McpToolError(\n    \"TOOL_ERROR\""));
    expect(generic.slice(0, 300)).not.toMatch(/\braw\b/);
    expect(generic).toMatch(/journalisé/);
  });

  it("le dispatcher valide les paramètres avant d'appeler le handler", () => {
    const src = readFileSync(
      join(ROOT, "src", "server", "services", "anubis", "mcp-server.ts"),
      "utf8",
    );
    // Zod ne tournait NULLE PART : ni les routes REST ni `dispatchTool` ne
    // parsaient. Un `strategyId` « requis » ne l'était donc pas à l'exécution —
    // omis avec une clé système, il donnait `where: { strategyId: undefined }`,
    // que Prisma ignore. Soit la fuite multi-marques par une autre porte.
    expect(src).toMatch(/inputSchema\.safeParse/);
    expect(src).toMatch(/INVALID_PARAMS/);
  });

  it("le dispatcher refuse un appel sans contexte d'authentification", () => {
    const src = readFileSync(
      join(ROOT, "src", "server", "services", "anubis", "mcp-server.ts"),
      "utf8",
    );
    // `enforceBrandScope` retournait les params intacts quand `__auth` était
    // absent — fail-OPEN. `dispatchTool` étant ré-exporté publiquement, c'était
    // un accès non scopé à un import de distance.
    expect(src).toMatch(/if \(!auth\) \{[\s\S]{0,300}throw new Error/);
  });
});
