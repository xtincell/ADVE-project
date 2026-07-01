import { cn } from "./cn";

export type InputProps = React.ComponentProps<"input">;

export function Input({ className, ...props }: InputProps) {
  return (
    <input
      className={cn(
        "h-11 w-full rounded-sm border border-ink/15 bg-white px-3.5 text-[15px] text-ink",
        "placeholder:text-smoke-2",
        "transition-colors duration-200",
        "focus-visible:border-coral focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-coral/40",
        "disabled:cursor-not-allowed disabled:opacity-50",
        "aria-[invalid=true]:border-coral-deep",
        className,
      )}
      {...props}
    />
  );
}
