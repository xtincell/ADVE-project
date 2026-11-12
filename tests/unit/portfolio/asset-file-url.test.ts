import { describe, expect, it } from "vitest";
import { portfolioFileUrl } from "@/domain/portfolio-reference";

describe("fichiers natifs du portefeuille", () => {
  it("conserve le chemin du logo existant et les liens de fichiers distants", () => {
    expect(portfolioFileUrl("/brand/spawt/logos/logo-calico.png")).toBe("/brand/spawt/logos/logo-calico.png");
    expect(portfolioFileUrl("/brand/spawt/fonts/Klinsman-Regular.otf")).toBe("/brand/spawt/fonts/Klinsman-Regular.otf");
    expect(portfolioFileUrl("https://assets.example.com/logo.png?v=2")).toBe("https://assets.example.com/logo.png?v=2");
  });

  it.each([null, "", "logo.png", "javascript:alert(1)", "data:text/html,x", "//outside.example/a", "/\\outside.example/a", "/%2foutside.example/a", "https://user:secret@example.com/a", "https://exa\nmple.com/a"])("refuse les destinations ambiguës ou exécutables : %s", (value) => {
    expect(portfolioFileUrl(value)).toBeNull();
  });
});
