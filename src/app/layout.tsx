import type { Metadata } from "next";
import localFont from "next/font/local";
import { JetBrains_Mono } from "next/font/google";
import Script from "next/script";
import { SpeedInsights } from "@vercel/speed-insights/next";
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

export const metadata: Metadata = {
  title: "La Fusée — Industry OS",
  description: "L'infrastructure méthodologique du marché créatif africain",
  manifest: "/manifest.webmanifest",
  applicationName: "La Fusée",
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
  return (
    <html lang={locale} className={`${satoshi.variable} ${clashDisplay.variable} ${jetbrainsMono.variable} dark`}>
      <body className="min-h-screen font-sans antialiased">
        <Providers initialLocale={locale}>{children}</Providers>
        <SpeedInsights />
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
