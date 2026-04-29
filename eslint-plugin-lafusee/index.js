/**
 * eslint-plugin-lafusee — governance lint rules.
 *
 * 4 rules. All registered as `lafusee/<name>`. Severities are configured by
 * the consumer (see `eslint.config.js`) — the rules themselves are neutral.
 */

"use strict";

const noDirectServiceFromRouter = require("./rules/no-direct-service-from-router");
const noCrossPortalImport = require("./rules/no-cross-portal-import");
const noHardcodedPillarEnum = require("./rules/no-hardcoded-pillar-enum");
const noNumberedDuplicates = require("./rules/no-numbered-duplicates");
const noAdhocCompletionMath = require("./rules/no-adhoc-completion-math");

module.exports = {
  meta: {
    name: "eslint-plugin-lafusee",
    version: "0.2.0",
  },
  rules: {
    "no-direct-service-from-router": noDirectServiceFromRouter,
    "no-cross-portal-import": noCrossPortalImport,
    "no-hardcoded-pillar-enum": noHardcodedPillarEnum,
    "no-numbered-duplicates": noNumberedDuplicates,
    "no-adhoc-completion-math": noAdhocCompletionMath,
  },
};
