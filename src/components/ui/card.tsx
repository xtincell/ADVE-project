import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "./cn";

/** Carte bento UPgraders — surfaces claire (défaut), panda ou contour. */
export const cardVariants = cva("rounded-lg", {
  variants: {
    tone: {
      light: "bg-white text-ink shadow-card",
      dark: "bg-ink-2 text-bone border border-line",
      outline: "border border-ink/10 bg-transparent",
    },
    padding: {
      none: "p-0",
      sm: "p-4",
      md: "p-6",
      lg: "p-8",
    },
  },
  defaultVariants: {
    tone: "light",
    padding: "md",
  },
});

export type CardProps = React.ComponentProps<"div"> &
  VariantProps<typeof cardVariants>;

export function Card({ className, tone, padding, ...props }: CardProps) {
  return (
    <div className={cn(cardVariants({ tone, padding }), className)} {...props} />
  );
}

export function CardHeader({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("flex flex-col gap-1.5", className)} {...props} />;
}

export function CardTitle({ className, ...props }: React.ComponentProps<"h3">) {
  return (
    <h3
      className={cn("font-display text-xl font-semibold leading-tight", className)}
      {...props}
    />
  );
}

export function CardDescription({
  className,
  ...props
}: React.ComponentProps<"p">) {
  return <p className={cn("text-sm text-smoke", className)} {...props} />;
}

export function CardContent({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("pt-4", className)} {...props} />;
}

export function CardFooter({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("flex items-center gap-3 pt-6", className)} {...props} />;
}
