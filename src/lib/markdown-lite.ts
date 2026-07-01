/**
 * Markdown-lite — rendu HTML minimal, pur, zéro dépendance.
 *
 * Périmètre volontairement réduit au sous-ensemble que produisent les
 * composers déterministes (`src/domain/oracle.ts`) :
 *   - titres `## ` (h2) et `### ` (h3)
 *   - listes `- item`
 *   - **gras**, `code` inline
 *   - paragraphe entièrement en italique `_…_` (note d'intention des sections)
 *   - paragraphes séparés par ligne vide (lignes contiguës jointes par <br />)
 *
 * Sécurité XSS : TOUT le texte source est échappé HTML d'abord
 * (`escapeHtml`), les balises générées sont ensuite ajoutées sur le texte
 * déjà échappé — aucune balise source ne peut traverser. Le HTML produit ne
 * contient que h2/h3/ul/li/p/strong/em/code/br, sans attributs.
 */

/** Échappe tout caractère HTML significatif — à appliquer AVANT tout rendu. */
export function escapeHtml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Rendu inline sur une ligne : échappement d'abord, puis `code` et **gras**.
 * L'italique n'est PAS traité inline (trop ambigu avec les underscores de
 * texte libre) — il n'existe qu'au niveau bloc, ligne entière `_…_`.
 */
export function renderInline(text: string): string {
  let out = escapeHtml(text);
  out = out.replace(/`([^`]+)`/g, "<code>$1</code>");
  out = out.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  return out;
}

/**
 * Rend un document markdown-lite en HTML sûr. Déterministe : même entrée,
 * même sortie. Entrée inconnue (syntaxe hors périmètre) = paragraphe simple —
 * jamais d'erreur.
 */
export function renderMarkdownLite(markdown: string): string {
  const lines = markdown.split(/\r?\n/);
  const html: string[] = [];
  let listItems: string[] = [];
  let paragraph: string[] = [];

  const flushList = (): void => {
    if (listItems.length > 0) {
      html.push(`<ul>${listItems.join("")}</ul>`);
      listItems = [];
    }
  };
  const flushParagraph = (): void => {
    if (paragraph.length > 0) {
      html.push(`<p>${paragraph.join("<br />")}</p>`);
      paragraph = [];
    }
  };

  for (const raw of lines) {
    const line = raw.trim();
    if (line === "") {
      flushList();
      flushParagraph();
      continue;
    }

    const h3 = /^###\s+(.*)$/.exec(line);
    if (h3) {
      flushList();
      flushParagraph();
      html.push(`<h3>${renderInline(h3[1] ?? "")}</h3>`);
      continue;
    }
    const h2 = /^##\s+(.*)$/.exec(line);
    if (h2) {
      flushList();
      flushParagraph();
      html.push(`<h2>${renderInline(h2[1] ?? "")}</h2>`);
      continue;
    }
    const li = /^-\s+(.*)$/.exec(line);
    if (li) {
      flushParagraph();
      listItems.push(`<li>${renderInline(li[1] ?? "")}</li>`);
      continue;
    }

    flushList();
    // Ligne entière en italique (note d'intention, données manquantes…).
    const em = /^_(.+)_$/.exec(line);
    paragraph.push(em ? `<em>${renderInline(em[1] ?? "")}</em>` : renderInline(line));
  }
  flushList();
  flushParagraph();
  return html.join("\n");
}
