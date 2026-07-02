import { renderMarkdownLite } from "@/lib/markdown-lite";

/**
 * Corps d'article typographié (registre lecture, plus large que le rendu
 * Oracle de `pillars/markdown-view`). Le HTML injecté est SÛR par
 * construction : `renderMarkdownLite` échappe tout le texte source avant de
 * poser ses propres balises (h2/h3/ul/li/p/strong/em/code/br, sans attributs).
 */
export function PostBody({ markdown }: { markdown: string }) {
  return (
    <div
      className={[
        "max-w-[70ch] text-[17px] leading-relaxed text-graphite",
        "[&_h2]:font-display [&_h2]:text-2xl [&_h2]:font-semibold [&_h2]:tracking-tight [&_h2]:text-ink",
        "[&_h2]:mb-3 [&_h2:not(:first-child)]:mt-10",
        "[&_h3]:font-display [&_h3]:text-lg [&_h3]:font-semibold [&_h3]:text-ink [&_h3]:mt-6 [&_h3]:mb-2",
        "[&_p]:my-5",
        "[&_ul]:my-5 [&_ul]:space-y-2",
        "[&_li]:relative [&_li]:pl-5",
        "[&_li]:before:absolute [&_li]:before:left-0 [&_li]:before:content-['–'] [&_li]:before:font-bold [&_li]:before:text-coral",
        "[&_strong]:font-semibold [&_strong]:text-ink",
        "[&_em]:italic",
        "[&_code]:font-mono [&_code]:text-[13px] [&_code]:rounded-xs [&_code]:bg-ink/6 [&_code]:px-1 [&_code]:py-0.5",
      ].join(" ")}
      // Sûr : sortie de renderMarkdownLite uniquement (texte source échappé).
      dangerouslySetInnerHTML={{ __html: renderMarkdownLite(markdown) }}
    />
  );
}
