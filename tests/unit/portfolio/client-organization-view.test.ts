// @vitest-environment jsdom
import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import ClientPage from "@/app/(agency)/agency/clients/[clientId]/page";
vi.mock("next/navigation", () => ({
  useRouter: () => ({}),
  useParams: () => ({ clientId: "wamco" }),
}));
vi.mock("@/lib/trpc/client", () => ({
  trpc: {
    brandClient: {
      get: {
        useQuery: () => ({
          data: {
            name: "Filiale test",
            organizationKind: "GROUP_SUBSIDIARY",
            organizationSourceRefs: [
              {
                id: "source",
                type: "DOCUMENT",
                scope: "Organisation seule",
                statement: "Une pièce décrit la filiale.",
                url: "https://example.test/organisation",
              },
            ],
            parentClient: { name: "Groupe test" },
            country: "NG",
            strategies: [],
            status: "ACTIVE",
          },
        }),
      },
    },
  },
}));
it("shows the relationship, headquarters and supporting document in the native CRM view", () => {
  vi.stubGlobal("React", React);
  render(React.createElement(ClientPage));
  expect(screen.getByText("Filiale du groupe")).toBeTruthy();
  expect(screen.getByText("Organisation parente · Groupe test")).toBeTruthy();
  expect(screen.getByText("Pays du siège · NG")).toBeTruthy();
  fireEvent.click(screen.getByText("Sources du rattachement"));
  expect(screen.getByText("Organisation seule")).toBeTruthy();
  expect(
    screen
      .getByRole("link", { name: "Consulter la source" })
      .getAttribute("href"),
  ).toBe("https://example.test/organisation");
});
