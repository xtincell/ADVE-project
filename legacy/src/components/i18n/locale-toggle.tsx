"use client";

import { Globe } from "lucide-react";
import { cva } from "class-variance-authority";
import { useLocale } from "@/lib/i18n/locale-context";
import { SUPPORTED_LOCALES, LOCALE_LABELS, type Locale } from "@/lib/i18n";

// Compact code shown in the segmented top-bar control.
const SHORT: Record<Locale, string> = { fr: "FR", en: "EN", zh: "中" };

const segment = cva(
  "rounded-md px-2 py-1 text-xs font-semibold transition-colors",
  {
    variants: {
      active: {
        true: "bg-accent/15 text-accent",
        false: "text-foreground-muted hover:bg-background-overlay hover:text-foreground",
      },
    },
    defaultVariants: { active: false },
  },
);

const card = cva(
  "flex items-center justify-between rounded-lg border px-4 py-3 text-sm transition-colors",
  {
    variants: {
      active: {
        true: "border-accent bg-accent/10 text-foreground",
        false: "border-border-subtle text-foreground-secondary hover:border-border hover:text-foreground",
      },
    },
    defaultVariants: { active: false },
  },
);

/**
 * FR / EN / 中文 language switcher. `compact` (default) for the top bar,
 * `full` for the settings page. Persists via the LocaleProvider (cookie +
 * localStorage) so the whole app — landing + cockpit — switches at once.
 */
export function LocaleToggle({ variant = "compact" }: { variant?: "compact" | "full" }) {
  const { locale, setLocale, t } = useLocale();

  if (variant === "full") {
    return (
      <div className="space-y-2">
        {SUPPORTED_LOCALES.map((l) => (
          <button
            key={l}
            type="button"
            onClick={() => setLocale(l)}
            className={card({ active: l === locale })}
            aria-pressed={l === locale}
          >
            <span className="flex items-center gap-2">
              <Globe className="h-4 w-4" />
              {LOCALE_LABELS[l]}
            </span>
            {l === locale ? <span className="text-xs font-semibold text-accent">✓</span> : null}
          </button>
        ))}
      </div>
    );
  }

  return (
    <div
      className="flex items-center gap-0.5 rounded-lg border border-border-subtle bg-background-subtle p-0.5"
      role="group"
      aria-label={t("locale.toggle.aria")}
    >
      <Globe className="ml-1 h-3.5 w-3.5 text-foreground-muted" aria-hidden />
      {SUPPORTED_LOCALES.map((l) => (
        <button
          key={l}
          type="button"
          onClick={() => setLocale(l)}
          className={segment({ active: l === locale })}
          aria-pressed={l === locale}
          title={LOCALE_LABELS[l]}
        >
          {SHORT[l]}
        </button>
      ))}
    </div>
  );
}
