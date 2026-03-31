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
      <label className="block text-sm font-medium text-zinc-300">
        {label}
        {required && <span className="ml-0.5 text-red-400">*</span>}
      </label>

      {children}

      {error && (
        <p className="text-xs text-red-400">{error}</p>
      )}
      {!error && helpText && (
        <p className="text-xs text-zinc-500">{helpText}</p>
      )}
    </div>
  );
}
