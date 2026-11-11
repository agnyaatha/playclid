import type { Metadata, Viewport } from "next";
import { Barlow, Barlow_Condensed } from "next/font/google";
import { Analytics } from "@/ui/analytics/Analytics";
import { ButtonEffects } from "@/ui/ButtonEffects";
import { RegisterServiceWorker } from "@/ui/RegisterServiceWorker";
import { SiteFooter } from "@/ui/SiteFooter";
import { SiteHeader } from "@/ui/SiteHeader";
import { isIndexable, SITE_DESCRIPTION, SITE_KEYWORDS, SITE_NAME, siteUrl } from "@/core/site";
import "./globals.css";

const body = Barlow({ variable: "--font-body", subsets: ["latin"], weight: ["400", "500", "600", "700"] });
const display = Barlow_Condensed({ variable: "--font-display-face", subsets: ["latin"], weight: ["500", "600", "700"] });

/** Applied before first paint, so a returning player never sees a flash of the default theme. */
const APPLY_THEME = `try{var t=JSON.parse(localStorage.getItem("sim-pool:prefs")||"{}").theme;if(t)document.documentElement.dataset.theme=t}catch(e){}`;

export const metadata: Metadata = {
  metadataBase: siteUrl(),
  title: { default: `${SITE_NAME}: snooker, pool and carrom trainer`, template: `%s · ${SITE_NAME}` },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  keywords: SITE_KEYWORDS,
  category: "sports",
  alternates: { canonical: "/" },
  openGraph: { type: "website", siteName: SITE_NAME, locale: "en_GB", url: "/" },
  twitter: { card: "summary_large_image" },
  robots: isIndexable() ? { index: true, follow: true } : { index: false, follow: false },
  appleWebApp: { title: SITE_NAME, capable: true, statusBarStyle: "black-translucent" },
  formatDetection: { telephone: false },
  // Proves ownership to Google Search Console with an HTML tag, when the site has no custom domain to verify by DNS.
  ...(process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION ? { verification: { google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION } } : {}),
};

export const viewport: Viewport = {
  themeColor: "#0b0f0d",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" suppressHydrationWarning className={`${body.variable} ${display.variable} h-full antialiased`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: APPLY_THEME }} />
      </head>
      <body className="flex min-h-full flex-col">
        <RegisterServiceWorker />
        <ButtonEffects />
        <SiteHeader />
        {children}
        <SiteFooter />
        <Analytics />
      </body>
    </html>
  );
}
