"use client";

/**
 * Mode jour / mode nuit du cockpit (mandat opérateur 2026-07-12 « avoir un
 * mode jour »). Le DS UPgraders porte DÉJÀ un thème light complet au niveau
 * tokens (`[data-theme="light"]` — system.css + upgraders.css) : ce composant
 * ne fait que le stamper sur <html> et persister le choix. Cockpit-only —
 * le démontage (sortie du portail) restaure le thème nuit canon.
 */
import { useEffect, useState } from "react";
import { Sun, Moon } from "lucide-react";

const STORAGE_KEY = "lf-cockpit-theme";

type CockpitTheme = "dark" | "light";

function readStored(): CockpitTheme {
  if (typeof window === "undefined") return "dark";
  return window.localStorage.getItem(STORAGE_KEY) === "light" ? "light" : "dark";
}

export function CockpitThemeToggle() {
  const [theme, setTheme] = useState<CockpitTheme>("dark");

  // Hydratation : applique le choix persisté au montage.
  useEffect(() => {
    const stored = readStored();
    setTheme(stored);
  }, []);

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
        window.localStorage.setItem(STORAGE_KEY, next);
      }}
    >
      {theme === "light" ? <Moon /> : <Sun />}
    </button>
  );
}
