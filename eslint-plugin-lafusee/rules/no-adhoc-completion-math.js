"use strict";

/**
 * lafusee/no-adhoc-completion-math
 *
 * Detects the patterns that produced the "UI says complet, sequence
 * fails" bug class: ad-hoc completion arithmetic invented at the call
 * site instead of consuming the canonical `pillar.readiness` tRPC
 * query.
 *
 * Patterns flagged:
 *
 *   1. Comparison `<value> === 100` or `<value> >= 100` where the
 *      identifier hints at completion (`completion`, `completionPct`,
 *      `completionPercentage`, `pct`, `progress`).
 *   2. Division shaped `<filledN> / <totalN>` followed by `* 100` —
 *      the classic "filled/total*100" UI math.
 *   3. Boolean expression `<x>?.validationStatus === "VALIDATED"` OR
 *      `... === "LOCKED"` outside of `src/server/governance/` (the
 *      only legitimate consumers of those raw values are the readiness
 *      module and pillar-gateway).
 *
 * Opt-out: place the comment `// lafusee:allow-adhoc-completion`
 * on the line above the offending statement, with a justification.
 *
 * Severity is configured by the consumer (warn → error end of P4 per
 * REFONTE-PLAN.md).
 */

const COMPLETION_IDENT_RE =
  /^(completion(Pct|Percentage)?|fill(Rate|Pct)?|progress(Pct)?)$/i;

function isCompletionIdent(node) {
  if (!node) return false;
  if (node.type === "Identifier") return COMPLETION_IDENT_RE.test(node.name);
  if (node.type === "MemberExpression") {
    return (
      node.property.type === "Identifier" &&
      COMPLETION_IDENT_RE.test(node.property.name)
    );
  }
  return false;
}

function isExempt(filename) {
  return (
    filename.includes("/src/server/governance/") ||
    filename.includes("/src/server/services/pillar-gateway/") ||
    filename.includes("/src/server/services/pillar-maturity/") ||
    filename.includes("/src/server/services/advertis-scorer/") ||
    filename.includes("/src/domain/") ||
    filename.includes("/eslint-plugin-lafusee/") ||
    filename.includes("/__tests__/") ||
    filename.includes("/tests/")
  );
}

function hasOptOutComment(context, node) {
  const sourceCode = context.sourceCode ?? context.getSourceCode();
  // Strategy 1 : walk up the AST to the enclosing statement / property —
  // the comment is typically placed on the line above the STATEMENT,
  // not directly before the inner BinaryExpression.
  let cursor = node;
  while (cursor) {
    const comments = sourceCode.getCommentsBefore(cursor);
    if (
      comments.some(
        (c) =>
          typeof c.value === "string" &&
          c.value.includes("lafusee:allow-adhoc-completion"),
      )
    ) {
      return true;
    }
    cursor = cursor.parent;
  }
  // Strategy 2 : line-range scan — for sites where the comment is
  // lexically inside a parent expression (ternary consequent, JSX
  // expression container) and ESLint's getCommentsBefore() doesn't
  // associate it with any walked ancestor. Check all line/block comments
  // within the file that end on the line immediately before the math
  // node OR on any preceding line within 3 lines (to absorb nested
  // formatting).
  const allComments = sourceCode.getAllComments();
  const nodeStartLine = node.loc?.start?.line;
  if (typeof nodeStartLine === "number") {
    for (const c of allComments) {
      if (typeof c.value !== "string") continue;
      if (!c.value.includes("lafusee:allow-adhoc-completion")) continue;
      const commentEndLine = c.loc?.end?.line;
      if (typeof commentEndLine !== "number") continue;
      const delta = nodeStartLine - commentEndLine;
      if (delta >= 0 && delta <= 3) return true;
    }
  }
  return false;
}

module.exports = {
  meta: {
    type: "problem",
    docs: {
      description:
        "Forbid ad-hoc completion math; consume pillar.readiness tRPC query instead.",
    },
    messages: {
      compareToHundred:
        "Ad-hoc completion comparison '{{lhs}} === 100' — consume pillar.readiness.gates.DISPLAY_AS_COMPLETE instead.",
      filledOverTotal:
        "Ad-hoc 'filled/total*100' completion math — consume pillar.readiness.byPillar.<key>.completionPct instead.",
      validationLeak:
        "Raw '{{value}}' string compared outside the readiness module — consume pillar.readiness.byPillar.<key>.gates.<gate> instead.",
    },
    schema: [],
  },

  create(context) {
    const filename = context.filename || context.getFilename();
    if (isExempt(filename)) return {};

    return {
      // Pattern 1: <X> === 100 / >= 100 where X looks like completion
      BinaryExpression(node) {
        if (
          (node.operator === "===" ||
            node.operator === "==" ||
            node.operator === ">=") &&
          node.right.type === "Literal" &&
          node.right.value === 100 &&
          isCompletionIdent(node.left) &&
          !hasOptOutComment(context, node)
        ) {
          const sourceCode = context.sourceCode ?? context.getSourceCode();
          context.report({
            node,
            messageId: "compareToHundred",
            data: {
              lhs: sourceCode.getText(node.left),
            },
          });
        }
      },

      // Pattern 2: A.length / B.length * 100  OR  A / B * 100 where A,B
      // are simple identifiers that look like field counts.
      // We trigger on the outer `* 100` BinaryExpression.
      "BinaryExpression[operator='*'][right.value=100]"(node) {
        const left = node.left;
        if (left.type !== "BinaryExpression" || left.operator !== "/") return;
        if (hasOptOutComment(context, node)) return;
        // Heuristic: at least one side is `.length` or named `total*` or `filled*`.
        const looksLikeCount = (n) =>
          (n.type === "MemberExpression" &&
            n.property.type === "Identifier" &&
            n.property.name === "length") ||
          (n.type === "Identifier" &&
            /^(total|filled|done|count|num)/i.test(n.name));
        if (looksLikeCount(left.left) || looksLikeCount(left.right)) {
          context.report({ node, messageId: "filledOverTotal" });
        }
      },

      // Pattern 3: validationStatus === "VALIDATED" | "LOCKED"
      "BinaryExpression[operator='===']"(node) {
        if (node.right.type !== "Literal") return;
        if (node.right.value !== "VALIDATED" && node.right.value !== "LOCKED")
          return;
        const lhs = node.left;
        const isValidationField =
          (lhs.type === "MemberExpression" &&
            lhs.property.type === "Identifier" &&
            lhs.property.name === "validationStatus") ||
          (lhs.type === "Identifier" && lhs.name === "validationStatus");
        if (!isValidationField) return;
        if (hasOptOutComment(context, node)) return;
        context.report({
          node,
          messageId: "validationLeak",
          data: { value: String(node.right.value) },
        });
      },
    };
  },
};
