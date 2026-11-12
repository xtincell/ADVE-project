// @vitest-environment jsdom
import * as React from "react";
import { afterEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { initTRPC } from "@trpc/server";
import superjson from "superjson";
import { councilDeliberateInputSchema } from "@/domain/council-input";

const fixture = vi.hoisted(() => ({ calls: 0, draft: "", topic: "" }));
vi.mock("@/server/trpc/router", () => {
  const t = initTRPC.create({ transformer: superjson });
  return { appRouter: t.router({ mestor: t.router({
    councilDeliberate: t.procedure.input(councilDeliberateInputSchema).query(({ input }) => {
      fixture.calls++; fixture.draft = input.draft ?? ""; fixture.topic = input.topic;
      return { status: "UNAVAILABLE", reason: "Réponse longue reçue intégralement." };
    }),
    assistantHistory: t.procedure.query(() => ({ messages: [] })),
  }) }) };
});
vi.mock("@/server/trpc/context", () => ({ createContext: () => ({}) }));
import { POST, GET } from "@/app/api/trpc/[trpc]/route";
import { TRPCProvider } from "@/lib/trpc/client";
import { CouncilDeliberationPanel } from "@/components/cockpit/council-deliberation-panel";

afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

it("delivers a long French answer in a POST body, once per explicit click", async () => {
  vi.stubGlobal("React", React); fixture.calls = 0;
  const requests: Array<{ method: string; url: string }> = [];
  vi.stubGlobal("fetch", vi.fn(async (url: string, init: RequestInit) => {
    const request = new Request(new URL(url, "http://localhost"), init);
    requests.push({ method: request.method, url: request.url });
    return POST(request);
  }));
  const answer = "Référence : édition inconnue — six questions. ".repeat(180);
  const question = "Confronte les sources. ".repeat(150) + "QUESTION_FINALE";
  render(React.createElement(TRPCProvider, null,
    React.createElement(CouncilDeliberationPanel, { strategyId: "fixture", answer, question })));
  expect(requests).toHaveLength(0);
  fireEvent.click(screen.getByRole("button", { name: "Analyse approfondie" }));
  expect(await screen.findByText("Réponse longue reçue intégralement.")).toBeTruthy();
  expect(requests).toHaveLength(1);
  expect(requests[0]).toEqual({ method: "POST", url: "http://localhost/api/trpc/mestor.councilDeliberate?batch=1" });
  expect(fixture.draft).toBe(answer);
  expect(fixture.topic).toBe(question);
  expect(fixture.calls).toBe(1);
});

it("does not enable POST method override for unrelated queries", async () => {
  const url = "http://localhost/api/trpc/mestor.assistantHistory";
  const post = await POST(new Request(url, { method: "POST", headers: { "content-type": "application/json" }, body: "{}" }));
  expect(post.status).toBe(405);
  const get = await GET(new Request(url));
  expect(get.status).toBe(200);
});
