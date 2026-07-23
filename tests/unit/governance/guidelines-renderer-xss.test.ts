/**
 * Verrou HARD — le renderer de guidelines échappe le contenu tenant (anti-XSS).
 *
 * Classe (audit adversarial round-8) : `exportHtml`/`generateGuidelines`
 * (`guidelines-renderer/index.ts`) produit un document HTML rendu BRUT
 * (`dangerouslySetInnerHTML`) sur la page PUBLIQUE `/shared/guidelines/[token]`
 * (lien partageable, NON authentifié) ET dans le cockpit. Le titre
 * `<title>${doc.title}</title>` — `doc.title` = « Guidelines de marque — <nom de
 * marque> », le nom étant ÉDITABLE par le fondateur — était interpolé SANS
 * échappement. Un fondateur posant un nom de marque `</title><script>…`
 * obtenait un XSS stocké sur l'origine de l'app, livré à quiconque ouvre le lien
 * (opérateur, autre fondateur, prospect). Tous les AUTRES points d'interpolation
 * passaient déjà par `escapeHtml` — seul le `<title>` du builder HTML (pas celui
 * du builder PDF, lui déjà échappé) avait été oublié.
 *
 * Analyse TEXTUELLE (comme les autres verrous du repo). La revue reste
 * responsable de la sémantique de `escapeHtml`.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const SRC = readFileSync(
  join(process.cwd(), "src/server/services/guidelines-renderer/index.ts"),
  "utf8",
);

describe("guidelines-renderer — échappement anti-XSS (round-8 HARD)", () => {
  it("aucun `${doc.title}` nu — doit passer par escapeHtml(doc.title)", () => {
    // La forme nue introduit la faille ; seule `escapeHtml(doc.title)` est admise.
    expect(SRC).not.toMatch(/\$\{doc\.title\}/);
  });

  it("chaque <title> interpolé passe par escapeHtml", () => {
    const titles = [...SRC.matchAll(/<title>\$\{([^}]*)\}<\/title>/g)];
    expect(
      titles.length,
      "aucun <title> interpolé trouvé — le renderer a changé de forme, revoir ce verrou",
    ).toBeGreaterThan(0);
    for (const m of titles) {
      expect(m[1], `<title> interpolé sans escapeHtml : \${${m[1]}}`).toContain("escapeHtml");
    }
  });

  it("les tags d'asset interpolés passent par escapeHtml (défense en profondeur)", () => {
    // Clés pillarTags = codes piliers aujourd'hui, mais aucune chaîne dérivée de
    // donnée ne doit être interpolée sans escapeHtml.
    expect(SRC).not.toMatch(/<span class="tag">\$\{k\.toUpperCase\(\)\}<\/span>/);
    expect(SRC).not.toMatch(/<td>\$\{topTags \|\| /);
  });

  it("escapeHtml couvre les 5 caractères de rupture HTML", () => {
    const fn = SRC.match(/function escapeHtml\(str: string\): string \{([\s\S]*?)\n\}/);
    expect(fn, "escapeHtml introuvable").toBeTruthy();
    const body = fn![1] ?? "";
    expect(body).toContain('/&/g, "&amp;"');
    expect(body).toContain('/</g, "&lt;"');
    expect(body).toContain('/>/g, "&gt;"');
    expect(body).toContain('/"/g, "&quot;"');
    expect(body).toContain("/'/g, \"&#039;\"");
  });

  it("la page publique partagée rend bien la sortie du renderer (contexte du verrou)", () => {
    const page = readFileSync(
      join(process.cwd(), "src/app/(shared)/shared/guidelines/[token]/page.tsx"),
      "utf8",
    );
    expect(page).toContain("exportHtml(");
    expect(page).toContain("dangerouslySetInnerHTML");
  });
});
