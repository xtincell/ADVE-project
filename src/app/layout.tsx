import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "@/styles/globals.css";
import { Providers } from "./providers";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
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
  themeColor: "#09090b",
  colorScheme: "dark" as const,
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={`${inter.variable} dark`}>
      <body className="min-h-screen font-sans antialiased">
        <Providers>{children}</Providers>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ("serviceWorker" in navigator && location.protocol === "https:") {
                window.addEventListener("load", function () {
                  navigator.serviceWorker.register("/sw.js").catch(function () { return undefined; });
                });
              }
            `,
          }}
        />
      </body>
    </html>
  );
}
