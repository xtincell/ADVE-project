import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "./cn";

/**
 * Bouton UPgraders — variants CVA (jamais de ternaire inline).
 * `buttonVariants` est exporté pour styler un <Link> en bouton.
 */
export const buttonVariants = cva(
  [
    "inline-flex items-center justify-center gap-2 rounded-md font-semibold",
    "transition-colors duration-200 whitespace-nowrap select-none",
    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-coral",
    "disabled:pointer-events-none disabled:opacity-50",
    "[&_svg]:size-[1.1em] [&_svg]:shrink-0",
  ],
  {
    variants: {
      variant: {
        primary:
          "bg-coral text-white shadow-glow-coral hover:bg-coral-hover active:bg-coral-deep",
        outline:
          "border-[1.5px] border-current bg-transparent hover:bg-[color-mix(in_oklab,currentColor_10%,transparent)]",
        ghost:
          "bg-transparent hover:bg-[color-mix(in_oklab,currentColor_8%,transparent)]",
      },
      size: {
        sm: "h-9 px-4 text-sm",
        md: "h-11 px-5 text-[15px]",
        lg: "h-13 px-7 text-base",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  },
);

export type ButtonProps = React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants>;

export function Button({ className, variant, size, type, ...props }: ButtonProps) {
  return (
    <button
      type={type ?? "button"}
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  );
}
