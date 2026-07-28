/**
 * Anti-drift HARD — aucun hook après un retour anticipé.
 *
 * `react-hooks/rules-of-hooks` est actif sur tout `src/`… et **ne voit aucun
 * hook tRPC**. Son heuristique reconnaît `useX()` et `Namespace.useX()` ; ici
 * les hooks s'écrivent `trpc.payment.mySubscriptions.useQuery()` — trois niveaux
 * d'accès. Vérifié en soumettant le cas exact au linter : 0 erreur. Or le
 * cockpit est ENTIÈREMENT bâti sur des hooks tRPC : la garde du repo laissait
 * donc passer toute sa surface cliente.
 *
 * Le défaut qu'elle laisse passer n'est pas théorique. Deux pages en sont
 * mortes, silencieusement :
 *
 *   - `/cockpit/insights/diagnostics` (le score détaillé, pilier par pilier) ;
 *   - `/cockpit/settings` (le compte du fondateur).
 *
 * Motif identique : un `useQuery`/`useMutation` déclaré APRÈS un `if (loading)
 * return <Skeleton/>`. Premier rendu : N hooks. Second : N+1. React lève
 * « Rendered more hooks than during the previous render », la frontière d'erreur
 * remplace la page par « Une erreur est survenue ». **Le serveur répond 200** —
 * ni `tsc`, ni le lint, ni les tests unitaires ne peuvent le voir. Seule
 * l'ouverture de la page le montre (cf. skill `nefer-ship` §5-bis).
 *
 * Ce test rejoue la règle correctement, sur l'AST TypeScript : dans le corps
 * DIRECT d'une fonction, aucun appel `use*` ne doit suivre un `return`
 * conditionnel. Les fonctions imbriquées sont ignorées — un composant enfant a
 * son propre rendu.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { globSync } from "node:fs";
import ts from "typescript";

const ROOT = join(__dirname, "..", "..", "..");

const HOOK = /^use[A-Z]/;

function calleeName(expr: ts.Expression): string | null {
  if (ts.isIdentifier(expr)) return expr.text;
  if (ts.isPropertyAccessExpression(expr)) return expr.name.text;
  return null;
}

type FnLike =
  | ts.FunctionDeclaration
  | ts.FunctionExpression
  | ts.ArrowFunction
  | ts.MethodDeclaration;

function isFunctionLike(n: ts.Node): n is FnLike {
  return (
    ts.isFunctionDeclaration(n) ||
    ts.isFunctionExpression(n) ||
    ts.isArrowFunction(n) ||
    ts.isMethodDeclaration(n)
  );
}

function findHookCall(node: ts.Node, stopAtNestedFn: boolean): ts.CallExpression | null {
  let found: ts.CallExpression | null = null;
  const visit = (n: ts.Node) => {
    if (found) return;
    if (stopAtNestedFn && isFunctionLike(n)) return;
    if (ts.isCallExpression(n)) {
      const name = calleeName(n.expression);
      if (name && HOOK.test(name)) {
        found = n;
        return;
      }
    }
    ts.forEachChild(n, visit);
  };
  visit(node);
  return found;
}

/** Un `return` nu, ou un `if (…) return …` — les deux formes de garde. */
function isEarlyReturn(stmt: ts.Statement): boolean {
  if (ts.isReturnStatement(stmt)) return true;
  if (ts.isIfStatement(stmt)) {
    const branchReturns = (b: ts.Statement | undefined): boolean => {
      if (!b) return false;
      if (ts.isReturnStatement(b)) return true;
      if (ts.isBlock(b)) return b.statements.some((s) => ts.isReturnStatement(s));
      return false;
    };
    return branchReturns(stmt.thenStatement) || branchReturns(stmt.elseStatement);
  }
  return false;
}

export function scanSource(rel: string, text: string): string[] {
  const sf = ts.createSourceFile(rel, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const out: string[] = [];

  const checkBody = (body: ts.Block) => {
    let sawReturn = false;
    for (const stmt of body.statements) {
      if (sawReturn) {
        const hook = findHookCall(stmt, /* stopAtNestedFn */ true);
        if (hook) {
          const { line } = sf.getLineAndCharacterOfPosition(hook.getStart(sf));
          out.push(`${rel}:${line + 1} — ${hook.expression.getText(sf)}()`);
        }
      }
      if (isEarlyReturn(stmt)) sawReturn = true;
    }
  };

  const visit = (n: ts.Node) => {
    if (isFunctionLike(n) && n.body && ts.isBlock(n.body)) {
      if (findHookCall(n.body, false)) checkBody(n.body);
    }
    ts.forEachChild(n, visit);
  };
  visit(sf);
  return out;
}

describe("aucun hook après un retour anticipé", () => {
  it("le scanner reconnaît le défaut (auto-test — un verrou jamais rouge n'atteste rien)", () => {
    const bad = `
      export default function Page() {
        const q = trpc.a.b.useQuery();
        if (q.isLoading) return null;
        const m = trpc.c.d.useMutation({});
        return m;
      }`;
    expect(scanSource("cas.tsx", bad)).toHaveLength(1);
  });

  it("le scanner n'accuse PAS un composant enfant déclaré après un retour", () => {
    const ok = `
      export default function Page() {
        const q = trpc.a.b.useQuery();
        if (q.isLoading) return null;
        function Row() { const m = trpc.c.d.useMutation({}); return m; }
        return Row;
      }`;
    expect(scanSource("cas.tsx", ok)).toHaveLength(0);
  });

  it("le scanner n'accuse PAS un hook déclaré avant la garde", () => {
    const ok = `
      export default function Page() {
        const q = trpc.a.b.useQuery();
        const m = trpc.c.d.useMutation({});
        if (q.isLoading) return null;
        return m;
      }`;
    expect(scanSource("cas.tsx", ok)).toHaveLength(0);
  });

  it("aucune surface du repo ne place un hook après une garde", () => {
    const files = globSync("src/**/*.tsx", { cwd: ROOT }) as unknown as string[];
    expect(files.length).toBeGreaterThan(100); // le scan couvre bien la surface
    const violations = files.flatMap((rel) => scanSource(rel, readFileSync(join(ROOT, rel), "utf8")));
    expect(violations, `hook(s) après un retour anticipé :\n${violations.join("\n")}`).toEqual([]);
  });
});
