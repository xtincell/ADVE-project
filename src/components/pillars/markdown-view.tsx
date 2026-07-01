import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/components/ui/cn";
import { renderMarkdownLite } from "@/lib/markdown-lite";

/**
 * Rendu typographié du markdown-lite (sections Oracle). Le HTML injecté est
 * SÛR par construction : `renderMarkdownLite` échappe tout le texte source
 * avant de poser ses propres balises (h2/h3/ul/li/p/strong/em/code/br,
 * sans attributs) — cf. src/lib/markdown-lite.ts + tests XSS.
 */
const markdownViewVariants = cva(
  [
    "text-[15px] leading-relaxed",
    "[&_h2]:font-display [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:tracking-tight",
    "[&_h2]:mb-3 [&_h2:not(:first-child)]:mt-6",
    "[&_h3]:font-display [&_h3]:text-base [&_h3]:font-semibold [&_h3]:mt-4 [&_h3]:mb-2",
    "[&_p]:my-2.5",
    "[&_ul]:my-2.5 [&_ul]:space-y-1.5",
    "[&_li]:relative [&_li]:pl-5",
    "[&_li]:before:absolute [&_li]:before:left-0 [&_li]:before:content-['–'] [&_li]:before:font-bold",
    "[&_strong]:font-semibold",
    "[&_em]:italic [&_em]:opacity-85",
    "[&_code]:font-mono [&_code]:text-[12px] [&_code]:rounded-xs [&_code]:px-1 [&_code]:py-0.5",
  ],
  {
    variants: {
      tone: {
        dark: [
          "text-sand",
          "[&_h2]:text-bone [&_h3]:text-bone [&_strong]:text-sand-2",
          "[&_li]:before:text-coral [&_code]:bg-white/10 [&_code]:text-sand-2",
        ],
        light: [
          "text-graphite",
          "[&_h2]:text-ink [&_h3]:text-ink [&_strong]:text-ink",
          "[&_li]:before:text-coral [&_code]:bg-ink/6 [&_code]:text-graphite",
        ],
      },
    },
    defaultVariants: { tone: "dark" },
  },
);

export type MarkdownViewProps = VariantProps<typeof markdownViewVariants> & {
  markdown: string;
  className?: string;
};

export function MarkdownView({ markdown, tone, className }: MarkdownViewProps) {
  return (
    <div
      className={cn(markdownViewVariants({ tone }), className)}
      // Sûr : sortie de renderMarkdownLite uniquement (texte source échappé).
      dangerouslySetInnerHTML={{ __html: renderMarkdownLite(markdown) }}
    />
  );
}
