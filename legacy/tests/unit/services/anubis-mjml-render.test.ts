import { describe, it, expect } from "vitest";
import { renderMjml } from "@/server/services/anubis/mjml-render";

describe("Anubis deterministic MJML-subset renderer", () => {
  it("wraps a full document with doctype + utf-8 + viewport", () => {
    const { html } = renderMjml("<mjml><mj-body><mj-section><mj-column><mj-text>Hi</mj-text></mj-column></mj-section></mj-body></mjml>");
    expect(html).toContain("<!doctype html>");
    expect(html).toContain('charset="utf-8"');
    expect(html).toContain("width=device-width");
    expect(html).toContain("Hi");
  });

  it("renders a button as a table-wrapped anchor with href", () => {
    const { html } = renderMjml(
      '<mjml><mj-body><mj-section><mj-column><mj-button href="https://x.test/r">Voir</mj-button></mj-column></mj-section></mj-body></mjml>',
    );
    expect(html).toContain('href="https://x.test/r"');
    expect(html).toContain("Voir");
    expect(html).toContain("<a ");
  });

  it("renders mj-image with src/alt", () => {
    const { html } = renderMjml(
      '<mjml><mj-body><mj-section><mj-column><mj-image src="https://x.test/a.png" alt="Logo" /></mj-column></mj-section></mj-body></mjml>',
    );
    expect(html).toContain('src="https://x.test/a.png"');
    expect(html).toContain('alt="Logo"');
  });

  it("extracts an mj-preview preheader", () => {
    const { html, preview } = renderMjml(
      "<mjml><mj-head><mj-preview>Aperçu court</mj-preview></mj-head><mj-body><mj-section><mj-column><mj-text>Corps</mj-text></mj-column></mj-section></mj-body></mjml>",
    );
    expect(preview).toBe("Aperçu court");
    expect(html).toContain("Aperçu court");
    expect(html).toContain("mso-hide:all");
  });

  it("is deterministic: identical input → identical output", () => {
    const src = "<mjml><mj-body><mj-section><mj-column><mj-text>Stable</mj-text></mj-column></mj-section></mj-body></mjml>";
    expect(renderMjml(src).html).toBe(renderMjml(src).html);
  });

  it("treats raw HTML (no mj tags) as a fragment and never throws", () => {
    const { html } = renderMjml("<p>Bonjour <strong>monde</strong></p>");
    expect(html).toContain("<p>Bonjour <strong>monde</strong></p>");
    expect(html).toContain("<!doctype html>");
  });

  it("renders two columns side by side", () => {
    const { html } = renderMjml(
      "<mjml><mj-body><mj-section><mj-column><mj-text>Gauche</mj-text></mj-column><mj-column><mj-text>Droite</mj-text></mj-column></mj-section></mj-body></mjml>",
    );
    expect(html).toContain("Gauche");
    expect(html).toContain("Droite");
    // both columns produce <td> cells inside one <tr>
    expect((html.match(/<td/g) ?? []).length).toBeGreaterThanOrEqual(2);
  });

  it("handles empty / non-string input gracefully", () => {
    expect(renderMjml("").html).toBe("");
    // @ts-expect-error testing runtime guard
    expect(renderMjml(null).html).toBe("");
  });
});
