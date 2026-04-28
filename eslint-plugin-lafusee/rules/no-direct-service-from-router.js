"use strict";

/**
 * lafusee/no-direct-service-from-router
 *
 * Files under `src/server/trpc/routers/` may not import from
 * `src/server/services/*` except a small whitelist (governance entry
 * points). The intent is enforced by Mestor (`emitIntent`) — direct
 * service-from-router calls are bypass.
 *
 * Whitelist (cf. REFONTE-PLAN.md, Phase 0):
 *   - mestor              (the dispatcher itself)
 *   - pillar-gateway      (write-and-score atomic operation)
 *   - audit-trail
 *   - operator-isolation
 *   - neteru-shared
 */

const WHITELIST = new Set([
  "mestor",
  "pillar-gateway",
  "audit-trail",
  "operator-isolation",
  "neteru-shared",
]);

const ROUTER_PATH = "/src/server/trpc/routers/";
const SERVICE_PREFIX_ALIAS = "@/server/services/";
const SERVICE_PREFIX_REL = "/server/services/";

function isRouterFile(filename) {
  return filename.includes(ROUTER_PATH);
}

function extractServiceName(specifier) {
  let stripped = null;
  if (specifier.startsWith(SERVICE_PREFIX_ALIAS)) {
    stripped = specifier.slice(SERVICE_PREFIX_ALIAS.length);
  } else if (specifier.includes(SERVICE_PREFIX_REL)) {
    const idx = specifier.indexOf(SERVICE_PREFIX_REL);
    stripped = specifier.slice(idx + SERVICE_PREFIX_REL.length);
  } else {
    return null;
  }
  return stripped.split("/")[0];
}

module.exports = {
  meta: {
    type: "problem",
    docs: {
      description:
        "Forbid direct service imports from tRPC routers; mutations go through mestor.emitIntent.",
    },
    messages: {
      bypass:
        "Router '{{file}}' imports service '{{service}}' directly. Mutations must traverse mestor.emitIntent (cf. REFONTE-PLAN.md Phase 3). Whitelisted services: {{whitelist}}.",
    },
    schema: [],
  },

  create(context) {
    const filename = context.filename || context.getFilename();
    if (!isRouterFile(filename)) return {};

    return {
      ImportDeclaration(node) {
        const specifier = node.source.value;
        const service = extractServiceName(specifier);
        if (!service) return;
        if (WHITELIST.has(service)) return;

        context.report({
          node,
          messageId: "bypass",
          data: {
            file: filename.split("/").pop(),
            service,
            whitelist: [...WHITELIST].join(", "),
          },
        });
      },

      // Catch lazy `await import("@/server/services/foo/...")` too.
      CallExpression(node) {
        if (node.callee.type !== "Import") return;
        const arg = node.arguments[0];
        if (!arg || arg.type !== "Literal" || typeof arg.value !== "string") return;
        const service = extractServiceName(arg.value);
        if (!service || WHITELIST.has(service)) return;
        context.report({
          node,
          messageId: "bypass",
          data: {
            file: filename.split("/").pop(),
            service,
            whitelist: [...WHITELIST].join(", "),
          },
        });
      },
    };
  },
};
