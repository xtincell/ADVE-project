"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> {
  indeterminate?: boolean;
}

export const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, indeterminate, ...props }, ref) => {
    const internalRef = React.useRef<HTMLInputElement>(null);
    React.useImperativeHandle(ref, () => internalRef.current as HTMLInputElement);
    React.useEffect(() => {
      if (internalRef.current) internalRef.current.indeterminate = !!indeterminate;
    }, [indeterminate]);
    return (
      <input
        ref={internalRef}
        type="checkbox"
        className={cn(
          "h-4 w-4 cursor-pointer appearance-none rounded-[var(--radius-xs)]",
          "border border-[var(--input-border)] bg-[var(--input-bg)]",
          "checked:bg-[var(--color-accent)] checked:border-[var(--color-accent)]",
          "checked:bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2212%22 height=%2212%22 viewBox=%220 0 12 12%22 fill=%22none%22 stroke=%22%23f5f1ea%22 stroke-width=%222%22><path d=%22M2 6l3 3 5-6%22/></svg>')] checked:bg-no-repeat checked:bg-center",
          "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-ring)]",
          "disabled:opacity-50 disabled:cursor-not-allowed",
          "transition-colors",
          className,
        )}
        {...props}
      />
    );
  },
);
Checkbox.displayName = "Checkbox";
