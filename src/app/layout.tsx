import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

const description =
  "Warehouse design studio: ABC movement analysis, 3D rack layouts, slotting, labour benchmarks and process maps on one set of project data.";

/** Absolute base for share links: the production domain on Vercel, localhost otherwise. */
function siteUrl() {
  const host = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  return new URL(host ? `https://${host}` : "http://localhost:3000");
}

export const metadata: Metadata = {
  metadataBase: siteUrl(),
  title: { default: "Stackyard: warehouse design studio", template: "%s · Stackyard" },
  description,
  openGraph: {
    type: "website",
    siteName: "Stackyard",
    title: "Stackyard: warehouse design studio",
    description,
  },
  twitter: { card: "summary_large_image", title: "Stackyard: warehouse design studio", description },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <TooltipProvider>{children}</TooltipProvider>
        <Toaster />
      </body>
    </html>
  );
}
