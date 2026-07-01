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
 *
 * File-level exemption markers (block comment `/​* lafusee:<name> [— justification] *​/`):
 *   - `lafusee:strangler-active` — transitional Phase 0 migration per ADR-0004.
 *     Marker removed when router is fully migrated to mestor.emitIntent.
 *   - `lafusee:governed-active` — router IS fully governed via governedProcedure.
 *     Direct service imports are utility/type bindings, not bypass.
 *   - `lafusee:governance-router` — meta-router for IntentEmission audit/replay.
 *   - `lafusee:public-auth` — public-procedure router pre-authentication
 *     (no operatorId yet to bind governance against).
 *   - `lafusee:public-payment-init` — public payment init with IntakePayment
 *     row providing own audit trail.
 *
 * Other exemptions:
 *   - `import type { ... }` — type-only imports have no runtime effect
 *     and don't constitute a governance bypass.
 */

const WHITELIST = new Set([
  "mestor",
  "pillar-gateway",
  "audit-trail",
  "operator-isolation",
  "neteru-shared",
  "error-vault",
]);

const EXEMPTION_MARKER_RE = /\/\*\s*lafusee:(?:strangler-active|governed-active|governance-router|public-auth|public-payment-init)\b/;

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

    // File-level exemption: lafusee marker (strangler/governed/etc).
    const sourceCode = context.sourceCode ?? context.getSourceCode();
    const fileText = sourceCode.getText();
    if (EXEMPTION_MARKER_RE.test(fileText)) return {};

    return {
      ImportDeclaration(node) {
        // Type-only imports have no runtime effect — not a bypass.
        if (node.importKind === "type") return;

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
