import type { Metadata } from "next";
import { Fraunces, Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { LogoLockup } from "@/components/logo";

const fontDisplay = Fraunces({
  subsets: ["latin"],
  weight: ["600", "700", "800", "900"],
  variable: "--font-display",
  display: "swap",
});

const fontSans = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "KUY'S Tapsihan | Smart Ordering System",
  description:
    "Self-service kiosk and QR ordering for KUY'S Tapsihan, Lower Bicutan, Taguig.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${fontDisplay.variable} ${fontSans.variable}`}>
      <body className="min-h-screen bg-background font-sans text-foreground antialiased">
        <Providers>
          <header className="fixed inset-x-0 top-0 z-50 h-14 border-b border-black/10 bg-primary shadow-md">
            <div className="mx-auto flex h-full max-w-6xl items-center justify-between px-4 sm:px-6">
              <LogoLockup variant="light" />
              <span className="hidden text-xs font-medium uppercase tracking-[0.2em] text-secondary/90 sm:block">
                Smart Ordering System
              </span>
            </div>
          </header>
          {/* Spacer so page content starts below the fixed header instead of under it. */}
          <div className="h-14" aria-hidden="true" />
          {children}
        </Providers>
      </body>
    </html>
  );
}
