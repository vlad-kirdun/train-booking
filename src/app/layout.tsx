import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import { getSiteUrl } from "@/lib/site";

import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  // Makes every `alternates.canonical` below resolve to an absolute URL, which
  // is what a canonical tag has to be.
  metadataBase: new URL(getSiteUrl()),
  title: {
    default: "Train search",
    template: "%s | Train search",
  },
  description:
    "Search trains between cities, compare prices and book seats in a few steps.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
