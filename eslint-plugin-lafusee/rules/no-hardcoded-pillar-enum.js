"use strict";

/**
 * lafusee/no-hardcoded-pillar-enum
 *
 * Detects hardcoded `["A","D","V","E","R","T","I","S"]` (or 4-letter ADVE
 * variant) literals outside the canonical home `src/domain/`.
 *
 * Use `import { PILLAR_KEYS, ADVE_KEYS } from "@/domain"` instead.
 */

const SETS = [
  ["A", "D", "V", "E", "R", "T", "I", "S"],
  ["A", "D", "V", "E"],
  ["a", "d", "v", "e", "r", "t", "i", "s"],
  ["a", "d", "v", "e"],
];

function isExempt(filename) {
  return (
    filename.includes("/src/domain/") ||
    filename.includes("/eslint-plugin-lafusee/")
  );
}

function literalArrayMatches(node) {
  if (node.type !== "ArrayExpression") return false;
  const values = [];
  for (const el of node.elements) {
    if (!el || el.type !== "Literal" || typeof el.value !== "string") return false;
    values.push(el.value);
  }
  return SETS.some(
    (set) =>
      set.length === values.length &&
      set.every((v, i) => v === values[i]),
  );
}

module.exports = {
  meta: {
    type: "problem",
    docs: {
      description:
        "Forbid hardcoded ADVERTIS pillar enum literals outside src/domain/.",
    },
    messages: {
      hardcoded:
        "Hardcoded pillar enum literal. Import PILLAR_KEYS / ADVE_KEYS / RTIS_KEYS from '@/domain' instead.",
    },
    schema: [],
  },

  create(context) {
    const filename = context.filename || context.getFilename();
    if (isExempt(filename)) return {};

    return {
      ArrayExpression(node) {
        if (literalArrayMatches(node)) {
          context.report({ node, messageId: "hardcoded" });
        }
      },
    };
  },
};
