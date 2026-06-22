import type { Metadata } from "next";

/* Fonts (Clash Display + Satoshi + JetBrains Mono) sont chargées une seule
   fois au RootLayout et héritées ici via les CSS vars --font-*. */

export const metadata: Metadata = {
  title: {
    default: "UPgraders — Cabinet de conseil & stratégie · La passion pour propulseur",
    template: "%s",
  },
  description:
    "UPgraders industrialise la production de marques en Afrique francophone : conseil stratégique (ADVE/RTIS), réseau de talents curatés (La Guilde) et l'Industry OS La Fusée. Depuis 2017 — Douala · Abidjan.",
};

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      data-density="editorial"
      data-portal="marketing"
      className="min-h-screen bg-background text-foreground"
    >
      {children}
    </div>
  );
}
