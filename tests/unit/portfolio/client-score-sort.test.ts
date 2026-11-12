// @vitest-environment jsdom
import React from "react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import ClientsPage from "@/app/(agency)/agency/clients/page";

const client = (name: string, vectors: unknown[]) => ({
  id: name,
  name,
  status: "ACTIVE",
  createdAt: "2026-11-01T00:00:00.000Z",
  _count: { strategies: vectors.length },
  strategies: vectors.map((advertis_vector, index) => ({ id: `${name}-${index}`, advertis_vector })),
});

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock("@/lib/trpc/client", () => ({
  trpc: {
    brandClient: {
      list: {
        useQuery: () => ({
          isLoading: false,
          data: {
            items: [
              client("Sans score", [null]),
              client("Zéro mesuré", [{ composite: 0 }]),
              client("Mesuré", [{ composite: 120 }]),
            ],
          },
        }),
      },
    },
  },
}));

beforeEach(() => vi.stubGlobal("React", React));
afterEach(cleanup);

const order = () =>
  screen
    .getAllByRole("row")
    .slice(1)
    .map((row) => within(row).getAllByRole("cell")[0]!.querySelector("p")?.textContent);

it("keeps an unscored client after every measured score, in both sort directions", () => {
  render(React.createElement(ClientsPage));
  const header = screen.getByRole("columnheader", { name: /Score ADVE moyen/ });

  fireEvent.click(header);
  expect(order()).toEqual(["Zéro mesuré", "Mesuré", "Sans score"]);
  expect(screen.getAllByText("Non évalué")).toHaveLength(1);

  fireEvent.click(header);
  expect(order()).toEqual(["Mesuré", "Zéro mesuré", "Sans score"]);
});

it("averages the two measured brands, the zero included, and leaves the unscored one out", () => {
  render(React.createElement(ClientsPage));
  expect(screen.getByText("60/200")).toBeTruthy();
});
