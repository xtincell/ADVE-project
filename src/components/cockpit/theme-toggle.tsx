"use client";

/**
 * Mode jour / mode nuit du cockpit (mandat opérateur 2026-07-12 « avoir un
 * mode jour » ; Increment 2b « mode jour par défaut pour la fondatrice »).
 * Le DS UPgraders porte DÉJÀ un thème light complet au niveau tokens
 * (`[data-theme="light"]` — system.css + upgraders.css) : ce composant ne fait
 * que le stamper sur <html> et persister le choix. Cockpit-only — le démontage
 * (sortie du portail) restaure le thème nuit canon.
 *
 * Ordre de préférence : choix explicite persisté en local (localStorage) >
 * préférence du compte (`auth.me.themePreference`, ex. fondateur → jour) >
 * défaut nuit. Un basculement persiste EN LOCAL et sur le compte (défaut
 * cross-appareil) via `auth.setThemePreference`.
 */
import { useEffect, useState } from "react";
import { Sun, Moon } from "lucide-react";
import { trpc } from "@/lib/trpc/client";

const STORAGE_KEY = "lf-cockpit-theme";

type CockpitTheme = "dark" | "light";

function readStored(): CockpitTheme | null {
  if (typeof window === "undefined") return null;
  const v = window.localStorage.getItem(STORAGE_KEY);
  return v === "light" || v === "dark" ? v : null;
}

export function CockpitThemeToggle() {
  const [theme, setTheme] = useState<CockpitTheme>("dark");
  const [resolved, setResolved] = useState(false);
  const me = trpc.auth.me.useQuery(undefined, { staleTime: 5 * 60_000 });
  const setPref = trpc.auth.setThemePreference.useMutation();

  // Résolution initiale : local explicite > préférence compte > nuit.
  useEffect(() => {
    if (resolved) return;
    const stored = readStored();
    if (stored) {
      setTheme(stored);
      setResolved(true);
    } else if (me.data !== undefined) {
      // Le compte a répondu (préférence ou null) — on tranche sans plus attendre.
      setTheme(me.data?.themePreference === "light" ? "light" : "dark");
      setResolved(true);
    }
  }, [resolved, me.data]);

  useEffect(() => {
    const root = document.documentElement;
    if (theme === "light") root.setAttribute("data-theme", "light");
    else root.removeAttribute("data-theme");
    return () => { root.removeAttribute("data-theme"); };
  }, [theme]);

  const next: CockpitTheme = theme === "light" ? "dark" : "light";

  return (
    <button
      type="button"
      className="ck-theme-toggle"
      aria-label={next === "light" ? "Passer en mode jour" : "Passer en mode nuit"}
      title={next === "light" ? "Mode jour" : "Mode nuit"}
      onClick={() => {
        setTheme(next);
        setResolved(true);
        window.localStorage.setItem(STORAGE_KEY, next);
        setPref.mutate({ theme: next });
      }}
    >
      {theme === "light" ? <Moon /> : <Sun />}
    </button>
  );
}
