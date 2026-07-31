"use strict";

/**
 * lafusee/no-ungated-footprint-signal
 *
 * Dans les fichiers de COLLECTE d'empreinte, aucun signal externe ne peut
 * entrer dans les faits d'un rapport sans être passé par le Signal Gateway
 * (`admitSignal`, cf. `src/server/services/seshat/signal-gateway`).
 *
 * ── POURQUOI cette règle existe ──
 *
 * Le 2026-07-30, trois correctifs successifs ont fermé la MÊME classe de bug,
 * canal par canal, chacun découvert APRÈS livraison du précédent :
 *
 *   ADR-0187  site (domaine parqué, mur anti-bot)
 *   ADR-0188  hosts + fiches Google      → trou suivant : les handles sociaux
 *   PR #675   handles sociaux            → et `wikipedia` / `ads`, jamais gardés
 *
 * Le défaut n'était pas dans les règles mais dans leur DISPERSION : le gate
 * d'entité était appelé à onze endroits, et rien ne garantissait le douzième.
 * Colmater canal par canal ne converge pas — le prochain collecteur ajouté
 * oublierait la garde à son tour.
 *
 * Cette règle transforme une discipline en INVARIANT VÉRIFIÉ : le CI refuse
 * un signal écrit sans verdict. C'est ce qui ferme la classe de bug plutôt
 * qu'une instance de plus.
 *
 * ── CE QUI EST DÉTECTÉ ──
 *
 * Dans un fichier de collecte, l'écriture d'un signal (`enrichedExtras.x = …`,
 * `press.push(…)`, `items.push(…)`, `socials.push(…)`) alors que le fichier
 * n'importe même pas `admitSignal`. La règle est volontairement GROSSIÈRE :
 * elle ne prétend pas suivre le flux de données, elle exige que la porte soit
 * connue du fichier — un garde-fou d'architecture, pas un vérificateur formel.
 *
 * ── EXEMPTION ──
 *
 * Marqueur de bloc en tête de fichier, comme les autres règles du plugin :
 *   / * lafusee:no-external-signal — <justification> * /
 * Réservé aux fichiers de collecte qui n'admettent AUCUN signal externe
 * (helpers purs, agrégateurs internes).
 */

/** Fichiers soumis à la règle : la collecte d'empreinte publique. */
const GUARDED_FILE = /src[\\/]server[\\/]services[\\/]quick-intake[\\/](public-enrichment|web-footprint)\.ts$/;

/** Conteneurs de faits : y pousser, c'est publier un signal dans un rapport. */
const SIGNAL_CONTAINERS = new Set(["socials", "press", "items", "articles", "channels"]);

const EXEMPTION = /lafusee:no-external-signal/;

module.exports = {
  meta: {
    type: "problem",
    docs: {
      description:
        "Tout signal externe entrant dans l'empreinte doit passer par admitSignal (Signal Gateway).",
    },
    schema: [],
    messages: {
      ungated:
        "Signal écrit sans passer par le Signal Gateway. Ce fichier publie des faits dans un rapport client mais n'importe pas `admitSignal` — c'est ainsi qu'une fiche Google homonyme est entrée dans le rapport d'un prospect (ADR-0188). Importe `admitSignal` depuis `@/server/services/seshat/signal-gateway` et juge le candidat, ou pose le marqueur `lafusee:no-external-signal` avec sa justification.",
    },
  },

  create(context) {
    const filename = context.filename ?? context.getFilename();
    if (!GUARDED_FILE.test(filename)) return {};

    const source = context.sourceCode ?? context.getSourceCode();
    if (EXEMPTION.test(source.getText())) return {};

    // Le fichier connaît-il la porte ? (import statique ou dynamique)
    let importsGateway = false;
    const offenders = [];

    return {
      ImportDeclaration(node) {
        if (String(node.source.value).includes("signal-gateway")) importsGateway = true;
      },

      // `await import("…/signal-gateway")` — le pattern d'import différé du repo.
      ImportExpression(node) {
        if (node.source.type === "Literal" && String(node.source.value).includes("signal-gateway")) {
          importsGateway = true;
        }
      },

      // enrichedExtras.<signal> = …
      "AssignmentExpression > MemberExpression.left"(node) {
        if (
          node.object.type === "Identifier" &&
          node.object.name === "enrichedExtras" &&
          node.property.type === "Identifier"
        ) {
          offenders.push(node);
        }
      },

      // <container>.push(…) — y compris via un membre imbriqué.
      //
      // Trou mesuré le 2026-07-31 : `footprint.channels.push(…)` (MemberExpression
      // imbriqué) passait sans bruit — la règle n'acceptait qu'un Identifier nu
      // (`channels.push`). Un conteneur de signaux reste un conteneur de signaux,
      // quel que soit le chemin qui y mène.
      "CallExpression > MemberExpression.callee"(node) {
        if (node.property.type !== "Identifier" || node.property.name !== "push") return;
        const container =
          node.object.type === "Identifier"
            ? node.object.name
            : node.object.type === "MemberExpression" && node.object.property.type === "Identifier"
              ? node.object.property.name
              : null;
        if (container && SIGNAL_CONTAINERS.has(container)) {
          offenders.push(node);
        }
      },

      "Program:exit"() {
        if (importsGateway || offenders.length === 0) return;
        // Un seul report par fichier : le défaut est architectural, pas ligne
        // à ligne — inonder la sortie ne dirait rien de plus.
        context.report({ node: offenders[0], messageId: "ungated" });
      },
    };
  },
};
