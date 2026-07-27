/**
 * Anti-drift HARD — comptes, secrets et suppression.
 *
 * Trois invariants, chacun né d'un incident ou d'un piège réel :
 *
 * 1. **Un mot de passe ne transite JAMAIS par l'`IntentEmission`.** Le spine
 *    (ADR-0124) persiste le payload verbatim dans une chaîne de hachage
 *    inaltérable : un secret qui y entre y reste pour toujours, lisible par
 *    quiconque lit l'audit. C'est pourquoi `createBrandLogin` et
 *    `resetPassword` n'utilisent PAS `governedProcedure` (qui persiste l'input
 *    tel quel) mais `openEmission` avec un payload redacté.
 *
 * 2. **Une écriture Prisma sans `select` rend la LIGNE ENTIÈRE** — donc
 *    `hashedPassword`. C'est la classe de fuite trouvée au round 4 sur les
 *    connecteurs (`create`/`update`/`upsert` échoïsaient le secret). Toute
 *    écriture sur `user` dans ce routeur porte un `select` explicite.
 *
 * 3. **La purge d'un compte est fail-closed sur la propriété.** Supprimer un
 *    compte qui possède une marque l'orphelinerait ; la relation
 *    `Strategy.user` est requise, donc la suppression échouerait de toute
 *    façon — mais tard, et avec un message Prisma illisible. Le refus est
 *    explicite, nommé, et précède la suppression.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { INTENT_KIND_BY_NAME } from "@/server/governance/intent-kinds";

const ROOT = join(__dirname, "..", "..", "..");
const accounts = readFileSync(join(ROOT, "src", "server", "trpc", "routers", "accounts.ts"), "utf8");

/** Corps d'une procédure, du nom jusqu'à la suivante. */
function procedure(name: string): string {
  const start = accounts.indexOf(`${name}:`);
  expect(start, `procédure ${name} absente`).toBeGreaterThan(-1);
  const rest = accounts.slice(start + name.length);
  const next = rest.search(/\n {2}[a-zA-Z]+: (adminProcedure|governedProcedure|createTRPCRouter)/);
  return next === -1 ? rest : rest.slice(0, next);
}

describe("le secret ne sort jamais par l'émission", () => {
  it("`resetPassword` n'est PAS un `governedProcedure` (il persisterait l'input verbatim)", () => {
    expect(accounts).toMatch(/resetPassword:\s*adminProcedure/);
    expect(accounts).not.toMatch(/resetPassword:\s*governedProcedure/);
  });

  it("le payload émis par `resetPassword` ne contient pas le mot de passe", () => {
    const seg = procedure("resetPassword");
    const payload = seg.slice(seg.indexOf("openEmission"), seg.indexOf("try {"));
    expect(payload).toMatch(/kind:\s*"ADMIN_RESET_USER_PASSWORD"/);
    // Le booléen `generated` dit qu'un mot de passe a été généré — il ne le
    // révèle pas. Toute autre mention est une fuite.
    expect(payload).not.toMatch(/\bpassword\b(?!Change)/i);
  });

  it("`createBrandLogin` garde la même discipline (régression ADR-0140)", () => {
    const seg = procedure("createBrandLogin");
    const payload = seg.slice(seg.indexOf("openEmission"), seg.indexOf("try {"));
    expect(payload).not.toMatch(/input\.password|password:/);
  });

  it("aucune écriture `db.user` sans `select` explicite (une ligne entière porte l'empreinte)", () => {
    const offenders: string[] = [];
    const lines = accounts.split("\n");
    lines.forEach((line, i) => {
      if (!/db\.user\.(update|create|upsert)\(/.test(line)) return;
      // Bloc de l'appel : jusqu'à la ligne qui referme au même niveau.
      const block = lines.slice(i, i + 14).join("\n");
      if (!/select:\s*\{/.test(block)) offenders.push(`accounts.ts:${i + 1} — ${line.trim()}`);
    });
    expect(offenders, `écriture(s) sans select :\n${offenders.join("\n")}`).toEqual([]);
  });
});

describe("la purge d'un compte est fail-closed", () => {
  it("refuse un compte qui POSSÈDE une marque", () => {
    const seg = procedure("purgeAccount");
    expect(seg).toMatch(/user\.Strategy\.length > 0/);
    expect(seg).toMatch(/Transfère la propriété avant/);
    // Le refus doit précéder la suppression, sinon il ne protège rien.
    expect(seg.indexOf("user.Strategy.length > 0")).toBeLessThan(seg.indexOf("db.user.delete"));
  });

  it("refuse un compte ADMIN/OPERATOR et l'auto-suppression", () => {
    const seg = procedure("purgeAccount");
    expect(seg).toMatch(/user\.role === "ADMIN" \|\| user\.role === "OPERATOR"/);
    expect(seg).toMatch(/user\.id === actor\.id/);
  });

  it("est gouvernée et réservée à l'opérateur", () => {
    expect(accounts).toMatch(/purgeAccount:\s*governedProcedure/);
    const seg = procedure("purgeAccount");
    expect(seg.slice(0, 400)).toMatch(/requireOperator:\s*true/);
  });
});

describe("les deux kinds sont au registre, sous INFRASTRUCTURE", () => {
  for (const kind of ["ADMIN_RESET_USER_PASSWORD", "ADMIN_PURGE_USER_ACCOUNT"]) {
    it(kind, () => {
      const entry = INTENT_KIND_BY_NAME.get(kind);
      expect(entry, `${kind} absent du registre`).toBeTruthy();
      expect(entry!.governor).toBe("INFRASTRUCTURE");
      expect(entry!.handler).toBe("accounts");
    });
  }
});

describe("l'inventaire ne rend pas d'empreinte", () => {
  it("`hashedPassword` est réduit à un booléen avant de sortir", () => {
    const seg = procedure("inventory");
    expect(seg).toMatch(/hasPassword:\s*Boolean\(u\.hashedPassword\)/);
    // La projection de sortie est un `map` explicite : aucun `...u` qui
    // réémettrait la ligne entière.
    expect(seg).not.toMatch(/\.\.\.u[,\s}]/);
  });
});

describe("propriétaire et collaborateur ne coexistent pas sur la même marque", () => {
  it("`createBrandLogin` en mode OWNER ne repose pas de ligne de collaboration", () => {
    // `transferBrandOwnership` la supprime explicitement (« redondante au
    // mieux, trompeuse au pire ») : les deux voies d'attribution de la
    // propriété doivent produire le même état final.
    const seg = procedure("createBrandLogin");
    const idx = seg.indexOf('input.attachAs === "OWNER"');
    expect(idx).toBeGreaterThan(-1);
    expect(seg).toMatch(/attachAs === "OWNER"\s*\?\s*\(await db\.strategyCollaborator\.deleteMany/);
  });

  it("`transferBrandOwnership` la supprime aussi", () => {
    const seg = procedure("transferBrandOwnership");
    expect(seg).toMatch(/db\.strategyCollaborator\.deleteMany\(\{\s*where:\s*\{\s*strategyId:[\s\S]{0,80}userId:\s*user\.id/);
  });
});
