"use client";

import { AlertTriangle } from "lucide-react";
import { Geist, Inter } from "next/font/google";
import { useEffect } from "react";
import { StatusPageBody } from "@/components/status-page";
import { Button, LinkButton } from "@/components/ui/button";
import { DARK_THEME, LIGHT_THEME, THEME_COOKIE_NAME } from "@/lib/theme";
import { cn } from "@/lib/utils";
import "./globals.css";

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-geist",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

const themeScript = `(function(){var m=document.cookie.match(/${THEME_COOKIE_NAME}=([^;]+)/);document.documentElement.setAttribute("data-theme",m&&m[1]==="${DARK_THEME}"?"${DARK_THEME}":"${LIGHT_THEME}")})()`;

type GlobalErrorProps = {
  error: Error & { digest?: string };
  reset?: () => void;
  unstable_retry?: () => void;
};

export default function GlobalError({ error, reset, unstable_retry }: GlobalErrorProps) {
  const retry = unstable_retry ?? reset;

  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html
      lang="en"
      data-theme={LIGHT_THEME}
      suppressHydrationWarning
      className={cn("h-full antialiased font-sans", geist.variable, inter.variable)}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body
        className="flex min-h-full flex-col items-center justify-center px-5 py-12 text-base-content"
        suppressHydrationWarning
      >
        <div className="mx-auto flex w-full max-w-6xl flex-col items-center gap-3">
          <StatusPageBody
            icon={AlertTriangle}
            title="Something went wrong"
            description="A critical error occurred. Try again, or return home if the problem continues."
          >
            <div className="flex flex-wrap items-center justify-center gap-3">
              {retry ? (
                <Button onPress={retry} className="transition-transform active:scale-[0.96]">
                  Try again
                </Button>
              ) : null}
              <LinkButton
                href="/"
                variant="outline"
                className="transition-transform active:scale-[0.96]"
              >
                Back to home
              </LinkButton>
            </div>
          </StatusPageBody>
        </div>
      </body>
    </html>
  );
}
