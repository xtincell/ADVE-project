"use strict";

/**
 * lafusee/no-cross-portal-import
 *
 * The four portals + the public intake route group are sealed against
 * each other. A file under `(console)` may not import from `(agency)`,
 * `(creator)`, `(cockpit)`, `(intake)` and vice-versa.
 *
 * Shared UI lives under `src/components/` (or `src/lib/`) — that's the
 * legitimate way to deduplicate.
 */

const PORTALS = ["console", "agency", "creator", "cockpit", "intake"];
const PORTAL_RE = /\((console|agency|creator|cockpit|intake)\)/;

function detectPortal(filepath) {
  const m = filepath.match(PORTAL_RE);
  return m ? m[1] : null;
}

module.exports = {
  meta: {
    type: "problem",
    docs: {
      description:
        "Forbid imports between the four portals + public intake route group.",
    },
    messages: {
      cross:
        "Cross-portal import: '{{from}}' file imports a path that resolves into '{{to}}'. Portals are sealed; share via src/components/ or src/lib/.",
    },
    schema: [],
  },

  create(context) {
    const filename = context.filename || context.getFilename();
    const fromPortal = detectPortal(filename);
    if (!fromPortal) return {};

    return {
      ImportDeclaration(node) {
        const specifier = node.source.value;
        if (typeof specifier !== "string") return;
        const toPortal = detectPortal(specifier);
        if (toPortal && toPortal !== fromPortal && PORTALS.includes(toPortal)) {
          context.report({
            node,
            messageId: "cross",
            data: { from: fromPortal, to: toPortal },
          });
        }
      },
    };
  },
};
