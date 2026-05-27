import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider, ThemeInitScript } from "@/components/theme-provider";
import { ThemedToaster } from "@/components/themed-toaster";
import "sileo/styles.css";
import "./globals.css";

// Self-hosted Inter (only the four weights the UI uses). next/font
// inlines the @font-face, eliminates the render-blocking Google Fonts
// request, and reserves metrics so there's no layout shift on swap.
const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  variable: "--font-inter",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://loop-tist.vercel.app"),
  title: "Loop. Share work across your team.",
  description: "A simple, joyful place to assign and finish work together.",
  openGraph: {
    title: "Loop. Share work across your team.",
    description:
      "A simple, joyful place to assign and finish work together.",
    url: "https://loop-tist.vercel.app",
    siteName: "Loop",
    images: [
      {
        url: "/screens/dark/my-work.png",
        width: 1440,
        height: 880,
        alt: "Loop My Work screen showing tasks grouped by when they're due",
      },
    ],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Loop. Share work across your team.",
    description:
      "A simple, joyful place to assign and finish work together.",
    images: ["/screens/dark/my-work.png"],
  },
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
  // Resolve the Supabase origin at render time so we can issue a
  // preconnect for the first auth + postgrest request. `new URL` is safe
  // server-side; falls through to null when the env var is missing so
  // the layout still renders during a misconfigured local boot.
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseOrigin = supabaseUrl
    ? (() => {
        try {
          return new URL(supabaseUrl).origin;
        } catch {
          return null;
        }
      })()
    : null;

  return (
    <html
      lang="en"
      className={`h-full antialiased ${inter.variable}`}
      suppressHydrationWarning
    >
      <head>
        {/* Supabase preconnect — covers REST, auth, AND realtime (all
            share the project's `*.supabase.co` origin). crossOrigin is
            required because supabase-js sends the apikey header on
            every request, which makes them CORS-credentialed; without
            crossOrigin set here the preconnected socket is discarded
            and the browser opens a fresh one anyway. */}
        {supabaseOrigin && (
          <link
            rel="preconnect"
            href={supabaseOrigin}
            crossOrigin="anonymous"
          />
        )}
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
