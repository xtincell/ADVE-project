/**
 * lafusee/design-token-only
 *
 * Interdit les classes Tailwind couleur brutes (`text-zinc-*`, `bg-violet-*`,
 * `text-emerald-*`, etc.) dans les fichiers `src/components/**` (sauf
 * `primitives/**` autorisés à consommer Tier 2 directement).
 *
 * Cf. DESIGN-SYSTEM.md §4 + ADR-0013.
 */

"use strict";

const FORBIDDEN_RE = /\b(text|bg|border|ring|fill|stroke|outline)-(zinc|violet|emerald|amber|sky|cyan|teal|fuchsia|pink|rose|orange|lime|green|red|blue|gray|slate|stone|neutral)-(50|100|200|300|400|500|600|700|800|900|950)\b/;

module.exports = {
  meta: {
    type: "problem",
    docs: {
      description: "Disallow raw Tailwind color classes outside primitives/styles",
      category: "Stylistic Issues",
    },
    schema: [],
    messages: {
      raw: "Raw Tailwind color class \"{{cls}}\" is forbidden. Use a semantic DS token (text-foreground, bg-accent, border-border, etc.). Cf. DESIGN-SYSTEM.md §4.",
    },
  },
  create(context) {
    const filename = context.filename || context.getFilename?.() || "";
    if (filename.includes("/primitives/") || filename.includes("/styles/") || filename.includes(".test.") || filename.includes(".stories.") || filename.includes(".manifest.")) {
      return {};
    }

    function check(node, value) {
      if (typeof value !== "string") return;
      const m = FORBIDDEN_RE.exec(value);
      if (m) {
        context.report({ node, messageId: "raw", data: { cls: m[0] } });
      }
    }

    return {
      Literal(node) {
        if (typeof node.value === "string") check(node, node.value);
      },
      TemplateElement(node) {
        check(node, node.value?.cooked ?? node.value?.raw);
      },
    };
  },
};
