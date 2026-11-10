import type { Metadata, Viewport } from "next";
import { Fraunces, Hanken_Grotesk } from "next/font/google";
import { RegisterServiceWorker } from "@/ui/RegisterServiceWorker";
import { SiteHeader } from "@/ui/SiteHeader";
import "./globals.css";

const body = Hanken_Grotesk({ variable: "--font-body", subsets: ["latin"] });
const display = Fraunces({ variable: "--font-display-face", subsets: ["latin"], axes: ["opsz", "SOFT"] });

export const metadata: Metadata = {
  title: { default: "Cue Sports Trainer", template: "%s · Cue Sports Trainer" },
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
    <html lang="en" className={`${body.variable} ${display.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <RegisterServiceWorker />
        <SiteHeader />
        {children}
      </body>
    </html>
  );
}
