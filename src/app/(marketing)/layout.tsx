import type { Metadata } from "next";

/* Fonts (Clash Display + Satoshi + JetBrains Mono) sont chargées une seule
   fois au RootLayout et héritées ici via les CSS vars --font-*. */

export const metadata: Metadata = {
  title: {
    default: "UPgraders — Cabinet de conseil & stratégie · La passion pour propulseur",
    template: "%s",
  },
  description:
    "UPgraders fait de votre marque la référence de son marché, en Afrique francophone : stratégie, création et mesure, avec La Guilde et la plateforme La Fusée. Depuis 2017 — Douala · Abidjan.",
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
