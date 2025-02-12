import "@/styles/globals.css";
import Head from "next/head";

import {
  Space_Grotesk as FontSans,
  Noto_Serif as FontSerif,
} from "next/font/google";

import { Toaster as SonnerToaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { TRPCReactProvider } from "@/lib/trpc/react";
import { cn } from "@/lib/utils";
import { Analytics } from "@vercel/analytics/react";
import HolyLoader from "holy-loader";
import { SessionProvider } from "next-auth/react";
import { ThemeProvider } from "next-themes";
import { ViewTransitions } from "next-view-transitions";
import { type ReactNode, Suspense } from "react";
import { PageTracker } from "react-page-tracker";
import { ErrorToast } from "../primitives/error-toast";
import { JsonLd } from "../primitives/json-ld";

const fontSerif = FontSerif({
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
  subsets: ["latin"],
  variable: "--font-serif",
});

const fontSans = FontSans({
  display: "swap",
  subsets: ["latin"],
  variable: "--font-sans",
});

export function RootLayout({ children }: { children: ReactNode }) {
  return (
    <ViewTransitions>
      <Head>
        {/* React Scan */}
        <script src="https://unpkg.com/react-scan/dist/auto.global.js" async />
      </Head>
      <html lang="en" suppressHydrationWarning>
        <body
          className={cn(
            "min-h-screen antialiased",
            "font-sans font-normal leading-relaxed",
            fontSans.variable,
            fontSerif.variable
          )}
        >
          <JsonLd organization website />
          <HolyLoader
            showSpinner
            height={"3px"}
            color={"linear-gradient(90deg, #FF61D8, #8C52FF, #5CE1E6, #FF61D8)"}
          />
          <PageTracker />
          <SessionProvider>
            <TRPCReactProvider>
              <ThemeProvider attribute="class" defaultTheme="dark">
                <TooltipProvider delayDuration={100}>
                  {/* Content */}
                  {children}

                  {/* Metrics - Below children to avoid blocking */}
                  <Analytics />

                  {/* Toast - Display messages to the user */}
                  <SonnerToaster />

                  <Suspense>
                    <ErrorToast />
                  </Suspense>
                </TooltipProvider>
              </ThemeProvider>
            </TRPCReactProvider>
          </SessionProvider>
        </body>
      </html>
    </ViewTransitions>
  );
}
