import type { Metadata } from "next";

/* Fonts (Clash Display + Satoshi + JetBrains Mono) sont chargées une seule
   fois au RootLayout et héritées ici via les CSS vars --font-*. */

export const metadata: Metadata = {
  title: "La Fusée — Industry OS du marché créatif africain",
  description: "Diagnostic ADVE-RTIS instantané · score /200 · radar 8 piliers · 7 Neteru actifs (Mestor/Artemis/Seshat/Thot/Ptah/Imhotep/Anubis — cap APOGEE atteint).",
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
