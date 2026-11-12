"use client";

import { memo, useId, useMemo } from "react";
import Markdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";

const components: Components = {
  h1: ({ children }) => <h2 className="mt-5 text-lg font-semibold first:mt-0">{children}</h2>,
  h2: ({ children }) => <h3 className="mt-5 text-base font-semibold first:mt-0">{children}</h3>,
  h3: ({ children }) => <h4 className="mt-4 font-semibold first:mt-0">{children}</h4>,
  h4: ({ children }) => <h5 className="mt-4 font-semibold first:mt-0">{children}</h5>,
  h5: ({ children }) => <h6 className="mt-3 font-semibold first:mt-0">{children}</h6>,
  h6: ({ children }) => <h6 className="mt-3 font-semibold first:mt-0">{children}</h6>,
  ul: ({ children }) => <ul className="list-disc space-y-2 pl-5">{children}</ul>,
  ol: ({ children }) => <ol className="list-decimal space-y-2 pl-5">{children}</ol>,
  blockquote: ({ children }) => <blockquote className="border-l-2 border-border pl-4 text-foreground-secondary">{children}</blockquote>,
  pre: ({ children }) => <pre className="max-w-full overflow-x-auto rounded-lg bg-surface-raised p-3 font-mono text-xs">{children}</pre>,
  code: ({ children }) => <code className="rounded bg-surface-raised px-1 font-mono">{children}</code>,
  table: ({ children }) => <div className="max-w-full overflow-x-auto"><table className="w-full border-collapse text-left">{children}</table></div>,
  th: ({ children, style }) => <th style={style} className="border border-border px-3 py-2 font-semibold">{children}</th>,
  td: ({ children, style }) => <td style={style} className="border border-border px-3 py-2 align-top">{children}</td>,
  // A generated text can name media; rendering it must not fetch remote media.
  img: ({ alt }) => <span>{alt}</span>,
};

/** Shared read-only prose renderer. Persistence and clipboard keep the source. */
export const MarkdownContent = memo(function MarkdownContent({ children, className }: {
  children: string;
  className?: string;
}) {
  const id = useId();
  const scopedComponents = useMemo<Components>(() => ({
    ...components,
    h2: ({ children, id: headingId }) => <h3
      id={headingId === "footnote-label" ? `${id}-footnote-label` : headingId}
      className="mt-5 text-base font-semibold first:mt-0">{children}</h3>,
    a: ({ node: _node, children, href, ...props }) => href
      ? <a {...props} href={href} className="text-accent underline underline-offset-2"
        aria-describedby={props["aria-describedby"] === "footnote-label" ? `${id}-footnote-label` : props["aria-describedby"]}
        target={/^(https?:)?\/\//i.test(href) ? "_blank" : undefined}
        rel="noopener noreferrer">{children}</a>
      : <span>{children}</span>,
  }), [id]);
  return <div className={cn("min-w-0 max-w-[70ch] space-y-3 whitespace-normal break-words text-sm leading-relaxed", className)}>
    <Markdown skipHtml remarkPlugins={[remarkGfm]} components={scopedComponents}
      remarkRehypeOptions={{ clobberPrefix: `message-${id}-`, footnoteLabel: "Notes", footnoteLabelProperties: {}, footnoteBackLabel: "Retour à la référence" }}>
      {children}
    </Markdown>
  </div>;
});
