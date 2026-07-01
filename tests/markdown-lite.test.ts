import { describe, expect, it } from "vitest";
import { escapeHtml, renderInline, renderMarkdownLite } from "@/lib/markdown-lite";
import { composeOracle } from "@/domain/oracle";
import { makeRichBrand } from "./fixtures";

describe("escapeHtml — la sécurité d'abord", () => {
  it("échappe les 5 caractères HTML significatifs", () => {
    expect(escapeHtml(`<a href="x" onmouseover='y'>&`)).toBe(
      "&lt;a href=&quot;x&quot; onmouseover=&#39;y&#39;&gt;&amp;",
    );
  });

  it("laisse le texte ordinaire intact", () => {
    expect(escapeHtml("Positionnement premium — 100 % local.")).toBe(
      "Positionnement premium — 100 % local.",
    );
  });
});

describe("renderInline", () => {
  it("rend **gras** en <strong>", () => {
    expect(renderInline("un **mot fort** ici")).toBe("un <strong>mot fort</strong> ici");
  });

  it("rend plusieurs gras sur la même ligne", () => {
    expect(renderInline("**a** et **b**")).toBe("<strong>a</strong> et <strong>b</strong>");
  });

  it("rend `code` en <code>", () => {
    expect(renderInline("champ `A.archetype` vide")).toBe(
      "champ <code>A.archetype</code> vide",
    );
  });

  it("échappe AVANT de poser les balises — jamais de HTML source qui traverse", () => {
    const out = renderInline("**<script>alert(1)</script>**");
    expect(out).toBe("<strong>&lt;script&gt;alert(1)&lt;/script&gt;</strong>");
    expect(out).not.toContain("<script>");
  });
});

describe("renderMarkdownLite — blocs", () => {
  it("rend les titres ## en h2 et ### en h3", () => {
    expect(renderMarkdownLite("## 01 · Executive Summary")).toBe(
      "<h2>01 · Executive Summary</h2>",
    );
    expect(renderMarkdownLite("### Sous-titre")).toBe("<h3>Sous-titre</h3>");
  });

  it("groupe les lignes - consécutives en une seule <ul>", () => {
    expect(renderMarkdownLite("- un\n- deux\n- trois")).toBe(
      "<ul><li>un</li><li>deux</li><li>trois</li></ul>",
    );
  });

  it("sépare deux listes par un paragraphe", () => {
    expect(renderMarkdownLite("- a\n\ntexte\n\n- b")).toBe(
      "<ul><li>a</li></ul>\n<p>texte</p>\n<ul><li>b</li></ul>",
    );
  });

  it("rend l'inline (gras, code) dans les items et titres", () => {
    expect(renderMarkdownLite("- **Archétype** — le Héros")).toBe(
      "<ul><li><strong>Archétype</strong> — le Héros</li></ul>",
    );
    expect(renderMarkdownLite("## Titre **fort**")).toBe("<h2>Titre <strong>fort</strong></h2>");
  });

  it("joint les lignes contiguës d'un paragraphe par <br />", () => {
    expect(renderMarkdownLite("ligne 1\nligne 2")).toBe("<p>ligne 1<br />ligne 2</p>");
  });

  it("rend une ligne entière _italique_ en <em> (note d'intention)", () => {
    expect(renderMarkdownLite("_Le cœur identitaire croisé au positionnement._")).toBe(
      "<p><em>Le cœur identitaire croisé au positionnement.</em></p>",
    );
  });

  it("ne traite PAS l'underscore au milieu d'un texte (pas d'italique inline)", () => {
    expect(renderMarkdownLite("champ operator_amend conservé")).toBe(
      "<p>champ operator_amend conservé</p>",
    );
  });

  it("est déterministe", () => {
    const doc = "## T\n\n- a\n- b\n\ntexte **x**";
    expect(renderMarkdownLite(doc)).toBe(renderMarkdownLite(doc));
  });
});

describe("renderMarkdownLite — sécurité XSS", () => {
  it("neutralise une injection <script> dans un item de liste", () => {
    const out = renderMarkdownLite('- <script>document.cookie</script>\n- <img src=x onerror="pwn()">');
    expect(out).not.toContain("<script");
    expect(out).not.toContain("<img");
    expect(out).toContain("&lt;script&gt;");
    expect(out).toContain("&lt;img src=x onerror=&quot;pwn()&quot;&gt;");
  });

  it("neutralise une injection dans un titre", () => {
    const out = renderMarkdownLite("## <style>*{display:none}</style>");
    expect(out).toBe("<h2>&lt;style&gt;*{display:none}&lt;/style&gt;</h2>");
  });

  it("ne produit que des balises sûres sans attributs, quel que soit le contenu", () => {
    const hostile = [
      "## Titre <b onmouseover=x>",
      "- item `<iframe>`",
      "**gras** <svg/onload=alert(1)>",
      '_note "quoted"_',
    ].join("\n\n");
    const out = renderMarkdownLite(hostile);
    const tags = [...out.matchAll(/<([a-z0-9]+)(\s|>|\/)/gi)].map((m) => (m[1] ?? "").toLowerCase());
    for (const tag of tags) {
      expect(["h2", "h3", "ul", "li", "p", "strong", "em", "code", "br"]).toContain(tag);
    }
    expect(out).not.toMatch(/<[a-z]+\s+[a-z-]+=/i); // aucun attribut généré
  });
});

describe("renderMarkdownLite × composeOracle — le renderer couvre ce que l'Oracle émet", () => {
  it("rend chaque section d'un Oracle riche sans perdre le titre ni les données", () => {
    const doc = composeOracle({ name: "SPAWT", sector: "sport" }, makeRichBrand());
    for (const section of doc.sections) {
      const html = renderMarkdownLite(section.markdown);
      // Le titre traverse escapeHtml (ex. « & » → « &amp; ») — comparaison sur la forme échappée.
      expect(html).toContain(`<h2>${escapeHtml(`${section.number} · ${section.titre}`)}</h2>`);
      expect(html).not.toContain("##"); // plus de syntaxe brute résiduelle
    }
  });
});
