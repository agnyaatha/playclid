import type { Metadata, Viewport } from "next";
import { Barlow, Barlow_Condensed } from "next/font/google";
import { RegisterServiceWorker } from "@/ui/RegisterServiceWorker";
import { SiteHeader } from "@/ui/SiteHeader";
import "./globals.css";

const body = Barlow({ variable: "--font-body", subsets: ["latin"], weight: ["400", "500", "600", "700"] });
const display = Barlow_Condensed({ variable: "--font-display-face", subsets: ["latin"], weight: ["500", "600", "700"] });

/** Applied before first paint, so a returning player never sees a flash of the default theme. */
const APPLY_THEME = `try{var t=JSON.parse(localStorage.getItem("sim-pool:prefs")||"{}").theme;if(t)document.documentElement.dataset.theme=t}catch(e){}`;

export const metadata: Metadata = {
  title: { default: "Table Craft", template: "%s · Table Craft" },
  description: "Learn snooker, pool and carrom with a physics-based practice table, guided drills and a beginner curriculum.",
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
        <SiteHeader />
        {children}
      </body>
    </html>
  );
}
