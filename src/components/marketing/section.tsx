import { cn } from "@/components/ui/cn";

/**
 * Blocs de mise en page du site de marque — rythme éditorial hérité du
 * legacy (PageHeader / Section / Eyebrow numéroté) réécrit sur les tokens
 * v7 : sections sombres panda (texture-geo) alternées avec le bone clair.
 */

type Tone = "light" | "dark";

const SECTION_TONES: Record<Tone, string> = {
  light: "bg-bone text-ink",
  dark: "texture-geo bg-ink-0 text-bone",
};

export function Section({
  tone = "light",
  className,
  children,
}: {
  tone?: Tone;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section className={cn(SECTION_TONES[tone], className)}>
      <div className="mx-auto max-w-page px-gutter py-16 sm:py-24">{children}</div>
    </section>
  );
}

export function SectionHeader({
  num,
  eyebrow,
  title,
  lede,
  tone = "light",
}: {
  /** Numéro éditorial « 01 », « 02 »… (registre legacy). */
  num?: string;
  eyebrow: string;
  title: React.ReactNode;
  lede?: React.ReactNode;
  tone?: Tone;
}) {
  return (
    <div className="max-w-2xl">
      <p className="eyebrow text-coral">
        {num ? <span className="mr-2 font-mono normal-case tracking-normal opacity-70">{num}</span> : null}
        {eyebrow}
      </p>
      <h2 className="font-display mt-4 text-3xl font-semibold leading-tight sm:text-4xl">
        {title}
      </h2>
      {lede ? (
        <p className={cn("mt-5 text-lg leading-relaxed", tone === "dark" ? "text-sand" : "text-graphite")}>
          {lede}
        </p>
      ) : null}
    </div>
  );
}

export function PageHero({
  eyebrow,
  title,
  lede,
  children,
}: {
  eyebrow: string;
  title: React.ReactNode;
  lede?: React.ReactNode;
  /** CTAs (liens stylés bouton). */
  children?: React.ReactNode;
}) {
  return (
    <section className="texture-geo relative overflow-hidden bg-ink text-bone">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-44 right-[-12%] h-[420px] w-[420px] rounded-full bg-coral/20 blur-3xl"
      />
      <div className="relative mx-auto max-w-page px-gutter py-20 sm:py-28">
        <p className="eyebrow text-coral">{eyebrow}</p>
        <h1 className="font-display mt-5 max-w-3xl text-4xl font-semibold leading-[1.08] sm:text-5xl">
          {title}
        </h1>
        {lede ? (
          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-sand">{lede}</p>
        ) : null}
        {children ? (
          <div className="mt-9 flex flex-wrap items-center gap-4">{children}</div>
        ) : null}
      </div>
    </section>
  );
}
