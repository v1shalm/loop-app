import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider, ThemeInitScript } from "@/components/theme-provider";
import { ThemedToaster } from "@/components/themed-toaster";
import "sileo/styles.css";
import "./globals.css";

const sans = Geist({
  variable: "--font-sans",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Loop. Share work across your team.",
  description: "A simple, joyful place to assign and finish work together.",
};

// `viewport-fit=cover` lets `env(safe-area-inset-*)` resolve to real values
// inside the iOS notch / home-indicator region. Desktop browsers ignore it.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${sans.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <ThemeInitScript />
      </head>
      <body
        suppressHydrationWarning
        className="min-h-full bg-background text-foreground"
      >
        <ThemeProvider>
          <TooltipProvider>
            {children}
            <ThemedToaster />
          </TooltipProvider>
        </ThemeProvider>
        {/* Placeholder for @vercel/analytics */}
        {/* <Analytics /> */}
      </body>
    </html>
  );
}
