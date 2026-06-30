import type { Metadata } from "next";
import localFont from "next/font/local";
import { JetBrains_Mono } from "next/font/google";
import Script from "next/script";
import "@/styles/globals.css";
import { Providers } from "./providers";
import { getServerLocale } from "@/lib/i18n/server";

/* ── UPgraders DS fonts — Clash Display (display) + Satoshi (text), self-hosted ── */
const satoshi = localFont({
  src: [
    { path: "../assets/fonts/upgraders/Satoshi-Variable.woff2", weight: "300 900", style: "normal" },
    { path: "../assets/fonts/upgraders/Satoshi-VariableItalic.woff2", weight: "300 900", style: "italic" },
  ],
  variable: "--font-satoshi",
  display: "swap",
});

const clashDisplay = localFont({
  src: "../assets/fonts/upgraders/ClashDisplay-Variable.woff2",
  weight: "200 700",
  variable: "--font-clash",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  variable: "--font-jetbrains-mono",
  display: "swap",
});

// Domaine canonique — surchargé en prod via NEXT_PUBLIC_BASE_URL. metadataBase
// rend ABSOLUS les URLs OG/canonical (sinon Next warn + previews sociales cassées).
const SITE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? "https://lafusee-app.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "La Fusée — Industry OS du marché créatif africain",
    template: "%s · La Fusée",
  },
  description:
    "L'infrastructure méthodologique qui transforme les marques en icônes culturelles — méthode ADVE/RTIS, Oracle stratégique, pilotage de marque. Par UPgraders.",
  applicationName: "La Fusée",
  manifest: "/manifest.webmanifest",
  keywords: [
    "stratégie de marque", "marketing Afrique", "marché créatif africain",
    "ADVE", "branding", "UPgraders", "La Fusée", "agence créative",
  ],
  authors: [{ name: "UPgraders" }],
  robots: { index: true, follow: true },
  openGraph: {
    type: "website",
    siteName: "La Fusée",
    locale: "fr_FR",
    url: SITE_URL,
    title: "La Fusée — Industry OS du marché créatif africain",
    description:
      "L'infrastructure méthodologique qui transforme les marques en icônes culturelles.",
  },
  twitter: {
    card: "summary_large_image",
    title: "La Fusée — Industry OS",
    description: "L'infrastructure méthodologique du marché créatif africain.",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "La Fusée",
  },
};

export const viewport = {
  themeColor: "#0d0d0d",
  colorScheme: "dark" as const,
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getServerLocale();
  // JSON-LD sitewide — Organization (UPgraders) + WebSite (La Fusée) pour les
  // rich results Google. Inoffensif sur les pages privées (noindex de toute façon).
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${SITE_URL}#org`,
        name: "UPgraders",
        url: SITE_URL,
        description: "Agence et Industry OS du marché créatif africain — méthode ADVE/RTIS.",
        brand: { "@type": "Brand", name: "La Fusée" },
      },
      {
        "@type": "WebSite",
        "@id": `${SITE_URL}#website`,
        url: SITE_URL,
        name: "La Fusée",
        inLanguage: "fr-FR",
        publisher: { "@id": `${SITE_URL}#org` },
      },
    ],
  };
  return (
    <html lang={locale} className={`${satoshi.variable} ${clashDisplay.variable} ${jetbrainsMono.variable} dark`}>
      <body className="min-h-screen font-sans antialiased">
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
        <Providers initialLocale={locale}>{children}</Providers>
        <Script id="register-sw" strategy="afterInteractive">
          {`
            if ("serviceWorker" in navigator && location.protocol === "https:") {
              window.addEventListener("load", function () {
                navigator.serviceWorker.register("/sw.js").catch(function () { return undefined; });
              });
            }
          `}
        </Script>
      </body>
    </html>
  );
}
