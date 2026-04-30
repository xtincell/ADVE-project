/**
 * lafusee/no-direct-lucide-import
 *
 * Interdit `import { X } from "lucide-react"` dans les fichiers hors
 * `src/components/primitives/icon.tsx`. Force l'utilisation du wrapper
 * `<Icon name="..." />` qui consomme les tokens sizing + RTL mirror.
 *
 * Cf. DESIGN-SYSTEM.md §17.B5 + design-tokens/component.md (Icon section).
 */

"use strict";

module.exports = {
  meta: {
    type: "problem",
    docs: {
      description: "Force usage of <Icon /> wrapper instead of direct lucide-react import",
      category: "Stylistic Issues",
    },
    schema: [],
    messages: {
      direct: "Direct import from 'lucide-react' is forbidden. Use the <Icon name=\"...\" /> wrapper from @/components/primitives.",
    },
  },
  create(context) {
    const filename = context.filename || context.getFilename?.() || "";
    if (filename.endsWith("/primitives/icon.tsx") || filename.endsWith("/primitives/icon.test.tsx")) {
      return {};
    }
    return {
      ImportDeclaration(node) {
        if (node.source.value === "lucide-react") {
          context.report({ node, messageId: "direct" });
        }
      },
    };
  },
};
