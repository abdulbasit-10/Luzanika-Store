import type { Metadata } from "next";
import { Geist } from "next/font/google";

import { env } from "@/config/env";
import { siteConfig } from "@/config/site";
import { QueryProvider } from "@/providers/query-provider";

import "./globals.css";

const fontSans = Geist({
  variable: "--font-sans-family",
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
    <html lang="en" className={`${fontSans.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col font-sans">
        <QueryProvider>{children}</QueryProvider>
      </body>
    </html>
  );
}
