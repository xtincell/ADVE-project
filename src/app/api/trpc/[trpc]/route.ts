export const dynamic = "force-dynamic";
// The tRPC catch-all hosts long-running mutations, not just fast queries. The
// public Quick Intake flow (`quickIntake.processIngest` / `processShort` /
// `processIngestPlus`) scrapes a website + Brave + runs an LLM extraction, and
// `quickIntake.complete` runs the full ADVE→RTIS pipeline (~100-130 s). Without
// an explicit cap these were killed at Vercel's short default duration, severing
// the request mid-flight → the browser reports a generic "Load failed" and the
// intake row is left half-written (status stuck IN_PROGRESS, empty responses).
// Match the SSE route's budget (300 s, already proven on this plan) so the heavy
// procedures complete. maxDuration is a CEILING, not a reservation — ordinary
// queries still return in milliseconds.
export const runtime = "nodejs";
export const maxDuration = 300;
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { appRouter } from "@/server/trpc/router";
import { createContext } from "@/server/trpc/context";

const handler = (req: Request) =>
  fetchRequestHandler({
    endpoint: "/api/trpc",
    req,
    router: appRouter,
    createContext: () => createContext({ headers: req.headers }),
  });

export { handler as GET, handler as POST };
