import type { Metadata } from "next";
import { Inter, Playfair_Display, Plus_Jakarta_Sans } from "next/font/google";

import { Footer } from "@/components/layout/footer";
import { Header } from "@/components/layout/header";
import { env } from "@/config/env";
import { siteConfig } from "@/config/site";
import { CookieConsentBanner } from "@/features/cookies/cookie-consent-banner";
import { QueryProvider } from "@/providers/query-provider";

import "./globals.css";

const fontSans = Inter({
  variable: "--font-sans-family",
  subsets: ["latin"],
});

const fontHeading = Playfair_Display({
  variable: "--font-heading-family",
  subsets: ["latin"],
});

const fontButton = Plus_Jakarta_Sans({
  variable: "--font-button-family",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(env.NEXT_PUBLIC_SITE_URL),
  title: {
    default: siteConfig.name,
    template: `%s | ${siteConfig.name}`,
  },
  description: siteConfig.description,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${fontSans.variable} ${fontHeading.variable} ${fontButton.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col font-sans">
        <QueryProvider>
          <Header />
          {children}
          <Footer />
          <CookieConsentBanner />
        </QueryProvider>
      </body>
    </html>
  );
}
