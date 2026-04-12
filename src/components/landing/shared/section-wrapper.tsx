"use client";

import { useScrollReveal } from "@/hooks/use-scroll-reveal";
import { cn } from "@/lib/utils";

interface SectionWrapperProps {
  id?: string;
  children: React.ReactNode;
  className?: string;
  /** Full-width background (children still constrained) */
  fullWidth?: boolean;
  /** Max width class — defaults to max-w-6xl */
  maxWidth?: string;
  /** Disable scroll-reveal animation */
  noReveal?: boolean;
}

export function SectionWrapper({
  id,
  children,
  className,
  fullWidth = false,
  maxWidth = "max-w-6xl",
  noReveal = false,
}: SectionWrapperProps) {
  const ref = useScrollReveal<HTMLElement>();

  return (
    <section
      id={id}
      ref={noReveal ? undefined : ref}
      className={cn(
        "relative px-6 py-24 sm:py-32 lg:py-40",
        className,
      )}
    >
      {fullWidth ? (
        children
      ) : (
        <div className={cn("mx-auto", maxWidth)}>{children}</div>
      )}
    </section>
  );
}
