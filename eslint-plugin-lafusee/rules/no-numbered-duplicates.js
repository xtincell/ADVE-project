"use strict";

/**
 * lafusee/no-numbered-duplicates
 *
 * Detects imports from path segments matching `* 2/`, `* 3/`, etc.
 * These are forks-by-rename created when a developer wanted to keep an
 * old version "just in case" — they always become dead weight.
 *
 * The lint rule complements a one-shot `git rm` of existing duplicates
 * (Phase 7). New ones are blocked at PR time.
 */

const NUMBERED_DUP_RE = /\s\d+(\/|$)/;

module.exports = {
  meta: {
    type: "problem",
    docs: {
      description:
        "Forbid imports from numbered-duplicate folders (e.g. 'landing 2/').",
    },
    messages: {
      duplicate:
        "Import from numbered-duplicate path '{{path}}'. Numbered-duplicate folders are banned (cf. REFACTOR-CODE-OF-CONDUCT.md §4). Delete the duplicate or move shared code to src/components/ or src/lib/.",
    },
    schema: [],
  },

  create(context) {
    return {
      ImportDeclaration(node) {
        const specifier = node.source.value;
        if (typeof specifier !== "string") return;
        if (NUMBERED_DUP_RE.test(specifier)) {
          context.report({
            node,
            messageId: "duplicate",
            data: { path: specifier },
          });
        }
      },
      CallExpression(node) {
        if (node.callee.type !== "Import") return;
        const arg = node.arguments[0];
        if (!arg || arg.type !== "Literal" || typeof arg.value !== "string") return;
        if (NUMBERED_DUP_RE.test(arg.value)) {
          context.report({
            node,
            messageId: "duplicate",
            data: { path: arg.value },
          });
        }
      },
    };
  },
};
