/**
 * Anti-drift HARD — un secret ne sort pas du serveur.
 *
 * Cinq lectures renvoyaient la ligne entière d'un modèle porteur de secrets :
 *
 *   src/server/mcp/advertis-inbound  getConnectorStatus   → ExternalConnector.config (MCP !)
 *   src/server/trpc/routers/connectors  list / get / stats → ExternalConnector.config
 *   src/server/services/anubis/social-audit  getSocialConnectors → config (via tRPC)
 *   src/server/trpc/routers/driver  getSocialConnection  → SocialConnection.accessToken
 *   src/server/trpc/routers/driver  getMediaConnection   → MediaPlatformConnection.credentials
 *
 * La règle existait pourtant, écrite noir sur blanc dans `anubis.listCredentials` :
 * « ⚠️ JAMAIS `config` ici — sécurité ADR-0021 ». Elle n'était appliquée qu'à cet
 * endroit-là. Une passe anti-IDOR antérieure (2026-07-22) avait fermé QUI peut
 * lire ces lignes sans jamais toucher à CE QUI en sort.
 *
 * D'où ce test, et sa forme : il ne vérifie pas les cinq sites corrigés — il
 * refuse la FAMILLE. Toute lecture d'un modèle à secrets depuis une surface qui
 * répond à un client (tRPC, MCP, routes API) doit porter un `select`. Sans
 * `select`, Prisma renvoie tout, y compris le champ ajouté au modèle demain.
 */

import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import {
  CONNECTOR_PUBLIC_SELECT,
  MEDIA_CONNECTION_PUBLIC_SELECT,
  SOCIAL_CONNECTION_PUBLIC_SELECT,
  describeConnectorConfig,
} from "@/server/services/anubis/connector-projection";

const ROOT = join(__dirname, "..", "..", "..");

/**
 * Modèles dont une colonne porte un secret (jeton, clé, cryptogramme).
 * `mcpApiKey` en fait partie : `keyHash` ne doit jamais sortir non plus.
 */
const SECRET_MODELS = [
  "externalConnector",
  "socialConnection",
  "mediaPlatformConnection",
  "mcpApiKey",
  "mcpOAuthClient",
  "mcpOAuthToken",
] as const;

/** Champs qui ne doivent jamais figurer dans une projection publique. */
const SECRET_FIELDS = [
  "config",
  "errorLog",
  "accessToken",
  "refreshToken",
  "credentials",
  "keyHash",
  "clientSecretHash",
] as const;

/** Surfaces qui répondent à un client. Les services internes en sont exclus. */
const CLIENT_FACING_DIRS = [
  join(ROOT, "src", "server", "trpc", "routers"),
  join(ROOT, "src", "server", "mcp"),
  join(ROOT, "src", "app", "api"),
];

function walkTs(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) walkTs(full, out);
    else if (entry.name.endsWith(".ts") || entry.name.endsWith(".tsx")) out.push(full);
  }
  return out;
}

function clientFacingFiles(): string[] {
  return CLIENT_FACING_DIRS.flatMap((d) => walkTs(d));
}

/**
 * Repère `db.<model>.findX({ … })` et rend le corps de l'objet d'options, en
 * équilibrant les accolades — une regex plate se ferait piéger par le premier
 * `}` d'un `where` imbriqué et déclarerait « pas de select » à tort.
 */
function readCalls(source: string, model: string): { body: string; line: number }[] {
  const out: { body: string; line: number }[] = [];
  const opener = new RegExp(`\\.${model}\\.(findMany|findUnique|findFirst|findUniqueOrThrow|findFirstOrThrow)\\s*\\(\\s*\\{`, "g");
  let m: RegExpExecArray | null;
  while ((m = opener.exec(source)) !== null) {
    const start = source.indexOf("{", m.index + m[0].length - 1);
    let depth = 0;
    let end = start;
    for (let i = start; i < source.length; i++) {
      const ch = source[i];
      if (ch === "{") depth++;
      else if (ch === "}") {
        depth--;
        if (depth === 0) {
          end = i;
          break;
        }
      }
    }
    out.push({
      body: source.slice(start, end + 1),
      line: source.slice(0, m.index).split("\n").length,
    });
  }
  return out;
}

describe("les projections publiques ne portent aucun secret", () => {
  it("aucune liste blanche n'expose un champ à secret", () => {
    const selects = {
      CONNECTOR_PUBLIC_SELECT,
      SOCIAL_CONNECTION_PUBLIC_SELECT,
      MEDIA_CONNECTION_PUBLIC_SELECT,
    };
    for (const [name, sel] of Object.entries(selects)) {
      for (const field of SECRET_FIELDS) {
        expect(Object.keys(sel), `${name} expose ${field}`).not.toContain(field);
      }
    }
  });

  it("describeConnectorConfig rend les NOMS de clés, jamais les valeurs", () => {
    const d = describeConnectorConfig({ accessToken: "SECRET-abc123", boardId: 42 });
    expect(d.configured).toBe(true);
    expect(d.configKeys).toEqual(["accessToken", "boardId"]);
    expect(JSON.stringify(d)).not.toContain("SECRET-abc123");
  });

  it("une config vide ou absente n'est pas « configurée »", () => {
    expect(describeConnectorConfig(null)).toEqual({ configured: false, configKeys: [] });
    expect(describeConnectorConfig({})).toEqual({ configured: false, configKeys: [] });
    // Un tableau n'est pas une config — on ne veut pas d'index numériques.
    expect(describeConnectorConfig(["x"])).toEqual({ configured: false, configKeys: [] });
  });
});

describe("HARD — toute lecture client-facing d'un modèle à secrets est projetée", () => {
  const files = clientFacingFiles();

  it("trouve bien les surfaces à scanner (garde anti-glob-vide)", () => {
    // Sans cette assertion, un glob cassé rendrait la suite verte à vide —
    // exactement le genre de faux positif que ce test existe pour empêcher.
    expect(files.length).toBeGreaterThan(50);
  });

  it("aucune lecture sans `select`", () => {
    const offenders: string[] = [];
    for (const file of files) {
      const src = readFileSync(file, "utf8");
      for (const model of SECRET_MODELS) {
        for (const call of readCalls(src, model)) {
          if (!/\bselect\s*:/.test(call.body)) {
            offenders.push(`${file.replace(`${ROOT}/`, "")}:${call.line} — ${model} sans select`);
          }
        }
      }
    }
    expect(offenders, offenders.join("\n")).toEqual([]);
  });

  it("aucune lecture ne demande explicitement un champ à secret", () => {
    const offenders: string[] = [];
    for (const file of files) {
      const src = readFileSync(file, "utf8");
      for (const model of SECRET_MODELS) {
        for (const call of readCalls(src, model)) {
          const selectAt = call.body.indexOf("select");
          if (selectAt === -1) continue;
          const selectBody = call.body.slice(selectAt);
          for (const field of SECRET_FIELDS) {
            if (new RegExp(`\\b${field}\\s*:\\s*true`).test(selectBody)) {
              offenders.push(
                `${file.replace(`${ROOT}/`, "")}:${call.line} — ${model}.${field} sélectionné`,
              );
            }
          }
        }
      }
    }
    expect(offenders, offenders.join("\n")).toEqual([]);
  });
});
