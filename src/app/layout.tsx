import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

/*
 * Fonts UPgraders (self-hosted, variables) — canon ADR-0097 legacy :
 * Clash Display (display) · Satoshi (texte). Mono = stack système
 * déclarée dans globals.css (--font-mono), zéro dépendance CDN.
 */
const clashDisplay = localFont({
  src: "../assets/fonts/upgraders/ClashDisplay-Variable.woff2",
  weight: "200 700",
  display: "swap",
  variable: "--font-display",
});

const satoshi = localFont({
  src: [
    {
      path: "../assets/fonts/upgraders/Satoshi-Variable.woff2",
      weight: "300 900",
      style: "normal",
    },
    {
      path: "../assets/fonts/upgraders/Satoshi-VariableItalic.woff2",
      weight: "300 900",
      style: "italic",
    },
  ],
  display: "swap",
  variable: "--font-text",
});

export const metadata: Metadata = {
  title: {
    default: "UPgraders — l'agence qui transforme des marques en icônes",
    template: "%s · UPgraders",
  },
  description:
    "UPgraders transforme des marques d'Afrique francophone en icônes culturelles — avec La Fusée, son OS de marque : diagnostic ADVE gratuit, Oracle stratégique, exécution.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={`${clashDisplay.variable} ${satoshi.variable}`}>
      <body className="min-h-screen font-sans antialiased">{children}</body>
    </html>
  );
}
