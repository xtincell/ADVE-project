import { PILLARS } from "@/domain/pillars";

export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col justify-center gap-8 px-6">
      <p className="text-sm font-semibold uppercase tracking-widest text-coral">
        UPgraders
      </p>
      <h1 className="text-5xl font-bold leading-tight">
        La Fusée<span className="text-coral">.</span>
      </h1>
      <p className="max-w-xl text-lg text-smoke">
        Des marques transformées en icônes culturelles, par l&apos;accumulation
        industrialisée de superfans. Reconstruction v7 en cours — l&apos;ossature
        naît propre, le legacy sert de banque d&apos;organes.
      </p>
      <div className="flex gap-2" aria-label="Cascade ADVE → RTIS">
        {PILLARS.map((p) => (
          <span
            key={p}
            className="flex h-10 w-10 items-center justify-center rounded-lg bg-ink font-mono text-sm text-bone"
          >
            {p}
          </span>
        ))}
      </div>
    </main>
  );
}
