import { cn } from "./cn";

/** Select natif stylé DS — suffisant pour les formulaires du funnel. */
export type SelectProps = React.ComponentProps<"select">;

export function Select({ className, children, ...props }: SelectProps) {
  return (
    <select
      className={cn(
        "h-11 w-full appearance-none rounded-sm border border-ink/15 bg-white px-3.5 pr-10 text-[15px] text-ink",
        "bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%20width%3D%2216%22%20height%3D%2216%22%20fill%3D%22none%22%20stroke%3D%22%236b6b6b%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpath%20d%3D%22m4%206%204%204%204-4%22/%3E%3C/svg%3E')] bg-[position:right_12px_center] bg-no-repeat",
        "transition-colors duration-200",
        "focus-visible:border-coral focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-coral/40",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    >
      {children}
    </select>
  );
}
