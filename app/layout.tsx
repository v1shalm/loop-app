import type { Metadata, Viewport } from "next";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider, ThemeInitScript } from "@/components/theme-provider";
import { ThemedToaster } from "@/components/themed-toaster";
import "sileo/styles.css";
import "./globals.css";

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
      className="h-full antialiased"
      suppressHydrationWarning
    >
      <head>
        {/* Switzer via Fontshare. preconnect to cdn.fontshare.com cuts
            the woff2 fetch handshake; the css endpoint at api.fontshare
            returns the @font-face block pointing at the CDN. Only the
            four weights the UI actually uses (400/500/600/700) so the
            font payload stays small. */}
        <link rel="preconnect" href="https://api.fontshare.com" />
        <link
          rel="preconnect"
          href="https://cdn.fontshare.com"
          crossOrigin="anonymous"
        />
        <link
          rel="stylesheet"
          href="https://api.fontshare.com/v2/css?f[]=switzer@400,500,600,700&display=swap"
        />
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
