"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface FieldContextValue {
  id: string;
  helperId: string;
  errorId: string;
  invalid: boolean;
}

const FieldContext = React.createContext<FieldContextValue | null>(null);

export function useFieldContext() {
  return React.useContext(FieldContext);
}

export interface FieldProps extends React.HTMLAttributes<HTMLDivElement> {
  invalid?: boolean;
}

export function Field({ className, invalid = false, children, ...props }: FieldProps) {
  const id = React.useId();
  const value = React.useMemo<FieldContextValue>(
    () => ({ id, helperId: `${id}-helper`, errorId: `${id}-error`, invalid }),
    [id, invalid],
  );
  return (
    <FieldContext.Provider value={value}>
      <div className={cn("flex flex-col gap-1.5", className)} {...props}>
        {children}
      </div>
    </FieldContext.Provider>
  );
}

export function FieldHelper({ className, children, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  const ctx = useFieldContext();
  return (
    <p
      id={ctx?.helperId}
      className={cn("text-xs text-[var(--color-foreground-muted)]", className)}
      {...props}
    >
      {children}
    </p>
  );
}

export function FieldError({ className, children, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  const ctx = useFieldContext();
  if (!children) return null;
  return (
    <p
      id={ctx?.errorId}
      role="alert"
      className={cn("text-xs text-[var(--color-error)] flex items-center gap-1", className)}
      {...props}
    >
      <span aria-hidden="true">⚠</span>
      {children}
    </p>
  );
}
