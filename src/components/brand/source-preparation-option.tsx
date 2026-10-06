"use client";

/** One explicit, initially unchecked choice shared by every source deposit. */
export function SourcePreparationOption({ checked, onChange, disabled = false }: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
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
        <span className="block text-sm font-medium text-foreground">Préparer aussi l’analyse assistée</span>
        <span className="block text-xs text-foreground-muted">
          Facultatif : préparer la recherche dans vos documents et proposer leur classement avec l’IA.
          Sans cette option, la source est conservée et son texte reste consultable, sans appel à l’IA.
        </span>
      </span>
    </label>
  );
}
