import type { Metadata } from "next";
import { Geist } from "next/font/google";
import { Toaster } from "sileo";
import { TooltipProvider } from "@/components/ui/tooltip";
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

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${sans.variable} h-full antialiased`}
    >
      <body
        suppressHydrationWarning
        className="min-h-full bg-background text-foreground"
      >
        <TooltipProvider>
          {children}
          <Toaster position="bottom-right" theme="light" />
        </TooltipProvider>
      </body>
    </html>
  );
}
