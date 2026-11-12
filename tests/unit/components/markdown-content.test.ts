// @vitest-environment jsdom
import * as React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { MarkdownContent } from "@/components/shared/markdown-content";

beforeEach(() => vi.stubGlobal("React", React));
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

describe("shared Markdown prose — untrusted text, complete structure", () => {
  it("retains every table row, zero and unknown value, and fenced source literally", () => {
    const rows = Array.from({ length: 12 }, (_, i) => `| Ligne ${i} | ${i === 0 ? 0 : "inconnu"} |`);
    render(React.createElement(MarkdownContent, { children:
      "| Élément | Valeur |\n| --- | --- |\n" + rows.join("\n") + "\n\n```text\n<script>literal</script>\n```" }));
    expect(screen.getAllByRole("row")).toHaveLength(13);
    expect(screen.getByRole("cell", { name: "0" })).toBeTruthy();
    expect(screen.getByRole("cell", { name: "Ligne 11" })).toBeTruthy();
    expect(screen.getByText("<script>literal</script>")).toBeTruthy();
    expect(document.querySelector("script")).toBeNull();
  });

  it("does not turn raw HTML, unsafe URLs or generated media into active content", () => {
    const { container } = render(React.createElement(MarkdownContent, { children:
      '<script>alert(1)</script>\n\n[Action](javascript:alert%281%29)\n\n![Média nommé](https://example.invalid/pixel)\n\n[Source](https://example.invalid/doc)' }));
    expect(container.querySelector("script, img, iframe")).toBeNull();
    expect(screen.getByText("Action").tagName).toBe("SPAN");
    expect(screen.getByText("Média nommé")).toBeTruthy();
    const link = screen.getByRole("link", { name: "Source" });
    expect(link.getAttribute("href")).toBe("https://example.invalid/doc");
    expect(link.getAttribute("rel")).toBe("noopener noreferrer");
  });

  it("keeps notes and backlinks within their own message, including their accessible labels", () => {
    render(React.createElement("div", null,
      React.createElement(MarkdownContent, { children: "Source A[^1]\n\n[^1]: Note A" }),
      React.createElement(MarkdownContent, { children: "Source B[^1]\n\n[^1]: Note B" })));
    const elements = [...document.querySelectorAll("[id]")];
    const ids = elements.map(el => el.id);
    expect(new Set(ids).size).toBe(ids.length);
    const links = screen.getAllByRole("link");
    for (const link of links) {
      const href = link.getAttribute("href");
      if (href?.startsWith("#")) expect(document.getElementById(href.slice(1))).toBeTruthy();
      const label = link.getAttribute("aria-describedby");
      if (label) expect(document.getElementById(label)?.textContent).toBe("Notes");
      expect(link.getAttribute("target")).toBeNull();
    }
  });

  it("renders a partial stream and its completion without changing the supplied text", () => {
    const partial = "## Décision\n\n**Une idée";
    const { rerender } = render(React.createElement(MarkdownContent, { children: partial }));
    expect(screen.getByRole("heading", { name: "Décision" })).toBeTruthy();
    const complete = partial + " complète**";
    rerender(React.createElement(MarkdownContent, { children: complete }));
    expect(screen.getByText("Une idée complète").tagName).toBe("STRONG");
    expect(complete).toBe("## Décision\n\n**Une idée complète**");
  });
});
