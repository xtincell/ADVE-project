import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "./cn";

/**
 * EmptyState honnête — l'écran dit ce qui n'existe pas encore, sans données
 * inventées (doctrine « trou affiché honnêtement » reconduite du legacy).
 */
export const emptyStateVariants = cva(
  "flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed px-8 py-16 text-center",
  {
    variants: {
      tone: {
        dark: "border-line bg-ink-2/50 text-sand",
        light: "border-ink/15 bg-bone-2/60 text-smoke",
      },
    },
    defaultVariants: {
      tone: "dark",
    },
  },
);

export type EmptyStateProps = React.ComponentProps<"div"> &
  VariantProps<typeof emptyStateVariants> & {
    icon?: React.ReactNode;
    title: string;
    description: string;
  };

export function EmptyState({
  className,
  tone,
  icon,
  title,
  description,
  children,
  ...props
}: EmptyStateProps) {
  return (
    <div className={cn(emptyStateVariants({ tone }), className)} {...props}>
      {icon ? (
        <span className="mb-1 opacity-60 [&_svg]:size-8" aria-hidden>
          {icon}
        </span>
      ) : null}
      <h2 className="font-display text-lg font-semibold">{title}</h2>
      <p className="max-w-sm text-sm leading-relaxed opacity-80">{description}</p>
      {children}
    </div>
  );
}
