import type { Metadata } from "next";

/* Fonts (Clash Display + Satoshi + JetBrains Mono) sont chargées une seule
   fois au RootLayout et héritées ici via les CSS vars --font-*. */

export const metadata: Metadata = {
  title: "La Fusée — Industry OS du marché créatif africain",
  description: "Diagnostic ADVE instantané · score de marque /200 · radar 8 piliers · feuille de route stratégique. Gratuit, sans engagement.",
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
