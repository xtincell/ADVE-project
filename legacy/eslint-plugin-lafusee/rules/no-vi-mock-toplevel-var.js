/**
 * lafusee/no-vi-mock-toplevel-var
 *
 * Interdit `vi.mock("...", () => ...)` dont la factory référence un binding
 * déclaré au top-level (const/let/var) sans passer par `vi.hoisted(...)`.
 *
 * `vi.mock()` est hoistée par vitest avant les imports + initialisations top-level.
 * Le binding référencé n'existe donc pas encore quand la factory s'exécute :
 * `ReferenceError: Cannot access 'foo' before initialization`.
 *
 * Pattern correct :
 *   const { foo } = vi.hoisted(() => ({ foo: vi.fn() }));
 *   vi.mock("@/lib/x", () => ({ x: foo }));
 *
 * Pattern interdit :
 *   const foo = vi.fn();                         // top-level binding
 *   vi.mock("@/lib/x", () => ({ x: foo }));      // référence le binding → crash
 */

"use strict";

module.exports = {
  meta: {
    type: "problem",
    docs: {
      description:
        "Forbid vi.mock() factories referencing top-level bindings not declared via vi.hoisted()",
      category: "Possible Errors",
    },
    schema: [],
    messages: {
      ref: "vi.mock() factory references top-level binding '{{name}}' which is not vi.hoisted(). " +
        "Wrap the binding: const {{ {{name}} }} = vi.hoisted(() => ({ {{name}}: vi.fn() })); " +
        "Otherwise vitest hoists vi.mock() before initialization → ReferenceError at runtime.",
    },
  },
  create(context) {
    const filename = context.filename || context.getFilename?.() || "";
    if (!/\.test\.(ts|tsx|js|jsx|mjs|cjs)$/.test(filename)) return {};

    /** Map<name, "hoisted" | "plain">. Top-level only. */
    const topLevelBindings = new Map();

    function isViHoistedCall(init) {
      return (
        init &&
        init.type === "CallExpression" &&
        init.callee.type === "MemberExpression" &&
        init.callee.object.type === "Identifier" &&
        init.callee.object.name === "vi" &&
        init.callee.property.type === "Identifier" &&
        init.callee.property.name === "hoisted"
      );
    }

    function collectNames(idNode, isHoisted) {
      if (!idNode) return;
      if (idNode.type === "Identifier") {
        topLevelBindings.set(idNode.name, isHoisted ? "hoisted" : "plain");
      } else if (idNode.type === "ObjectPattern") {
        for (const prop of idNode.properties) {
          if (prop.type === "Property") collectNames(prop.value, isHoisted);
          else if (prop.type === "RestElement") collectNames(prop.argument, isHoisted);
        }
      } else if (idNode.type === "ArrayPattern") {
        for (const el of idNode.elements) collectNames(el, isHoisted);
      }
    }

    function isViMockCall(node) {
      return (
        node.type === "CallExpression" &&
        node.callee.type === "MemberExpression" &&
        node.callee.object.type === "Identifier" &&
        node.callee.object.name === "vi" &&
        node.callee.property.type === "Identifier" &&
        node.callee.property.name === "mock"
      );
    }

    return {
      Program(program) {
        for (const stmt of program.body) {
          if (stmt.type === "VariableDeclaration") {
            for (const decl of stmt.declarations) {
              const hoisted = isViHoistedCall(decl.init);
              collectNames(decl.id, hoisted);
            }
          }
        }
      },
      CallExpression(node) {
        if (!isViMockCall(node)) return;
        const factory = node.arguments[1];
        if (!factory || (factory.type !== "ArrowFunctionExpression" && factory.type !== "FunctionExpression")) return;

        const sourceCode = context.sourceCode || context.getSourceCode();
        const factoryTokens = sourceCode.getTokens(factory);
        for (const tok of factoryTokens) {
          if (tok.type !== "Identifier") continue;
          const kind = topLevelBindings.get(tok.value);
          if (kind === "plain") {
            context.report({ node: tok, messageId: "ref", data: { name: tok.value } });
          }
        }
      },
    };
  },
};
