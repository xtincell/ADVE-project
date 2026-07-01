import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "./cn";

export const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-xs px-2.5 py-1 text-xs font-bold uppercase tracking-wider [&_svg]:size-3.5",
  {
    variants: {
      variant: {
        coral: "bg-coral/12 text-coral",
        gold: "bg-gold/15 text-gold-deep",
        neutral: "bg-ink/6 text-graphite",
        outline: "border border-current text-smoke",
        inverse: "bg-white/10 text-sand-2",
      },
    },
    defaultVariants: {
      variant: "neutral",
    },
  },
);

export type BadgeProps = React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants>;

export function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}
