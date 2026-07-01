import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "La Fusée — by UPgraders",
  description:
    "L'OS qui transforme des marques en icônes culturelles — Afrique francophone.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
