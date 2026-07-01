import { cn } from "@/lib/utils";

interface FormFieldProps {
  label: string;
  error?: string;
  required?: boolean;
  helpText?: string;
  children: React.ReactNode;
  className?: string;
}

export function FormField({
  label,
  error,
  required,
  helpText,
  children,
  className,
}: FormFieldProps) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <label className="block text-sm font-medium text-foreground-secondary">
        {label}
        {required && <span className="ml-0.5 text-error">*</span>}
      </label>

      {children}

      {error && (
        <p className="text-xs text-error">{error}</p>
      )}
      {!error && helpText && (
        <p className="text-xs text-foreground-muted">{helpText}</p>
      )}
    </div>
  );
}
