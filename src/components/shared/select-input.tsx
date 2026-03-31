"use client";

import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

interface SelectInputProps {
  options: SelectOption[];
  value: string | string[];
  onChange: (value: string | string[]) => void;
  placeholder?: string;
  multiple?: boolean;
  disabled?: boolean;
  className?: string;
}

export function SelectInput({
  options,
  value,
  onChange,
  placeholder = "S\u00e9lectionner...",
  multiple = false,
  disabled = false,
  className,
}: SelectInputProps) {
  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    if (multiple) {
      const selected = Array.from(e.target.selectedOptions, (opt) => opt.value);
      onChange(selected);
    } else {
      onChange(e.target.value);
    }
  };

  return (
    <div className={cn("relative", className)}>
      <select
        value={multiple ? (value as string[]) : (value as string)}
        onChange={handleChange}
        multiple={multiple}
        disabled={disabled}
        className={cn(
          "w-full appearance-none rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 pr-9 text-sm text-white outline-none transition-colors",
          "focus:border-zinc-600 focus:ring-1 focus:ring-zinc-600",
          "disabled:cursor-not-allowed disabled:opacity-50",
          multiple && "py-2 pr-3",
          !multiple && value === "" && "text-zinc-500",
        )}
      >
        {!multiple && <option value="">{placeholder}</option>}
        {options.map((opt) => (
          <option
            key={opt.value}
            value={opt.value}
            disabled={opt.disabled}
          >
            {opt.label}
          </option>
        ))}
      </select>

      {!multiple && (
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
      )}
    </div>
  );
}
