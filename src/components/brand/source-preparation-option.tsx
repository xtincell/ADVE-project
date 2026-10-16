"use client";

/** Shared explicit choice; source deposits retain their existing default copy. */
export function SourcePreparationOption({ checked, onChange, disabled = false,
  label = "Préparer aussi l’analyse assistée",
  description = "Facultatif : préparer la recherche dans vos documents et proposer leur classement avec l’IA. Sans cette option, la source est conservée et son texte reste consultable, sans appel à l’IA.",
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  label?: string;
  description?: string;
}) {
  return (
    <label className="flex items-start gap-3 rounded-lg border border-border-subtle bg-card p-3">
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
        className="mt-1 accent-accent"
      />
      <span className="space-y-1">
        <span className="block text-sm font-medium text-foreground">{label}</span>
        <span className="block text-xs text-foreground-muted">
          {description}
        </span>
      </span>
    </label>
  );
}
