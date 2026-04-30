import type { Metadata } from "next";
import { Inter_Tight, Fraunces, JetBrains_Mono } from "next/font/google";

const interTight = Inter_Tight({
  subsets: ["latin"],
  variable: "--font-inter-tight",
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  display: "swap",
  style: ["italic", "normal"],
  weight: ["400", "500", "600"],
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
  display: "swap",
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: "La Fusée — Industry OS du marché créatif africain",
  description: "Diagnostic ADVE-RTIS instantané · score /200 · radar 8 piliers · 5 Neteru actifs (Mestor/Artemis/Seshat/Thot/Ptah).",
};

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      data-density="editorial"
      data-portal="marketing"
      className={`${interTight.variable} ${fraunces.variable} ${jetbrainsMono.variable} min-h-screen bg-background text-foreground`}
    >
      {children}
    </div>
  );
}
