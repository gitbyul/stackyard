import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { notFound } from "next/navigation";

import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { I18nProvider } from "@/i18n/client";
import { INTL_LOCALE, isLocale, LOCALES } from "@/i18n/config";
import { dictionaries } from "@/i18n/dictionaries";
import "../globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

/** Absolute base for share links: the production domain on Vercel, localhost otherwise. */
function siteUrl() {
  const host = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  return new URL(host ? `https://${host}` : "http://localhost:3000");
}

// Prerender every page shell once per language.
export function generateStaticParams() {
  return LOCALES.map((lang) => ({ lang }));
}

export async function generateMetadata({ params }: LayoutProps<"/[lang]">): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) return {};
  const t = dictionaries[lang].meta;
  return {
    metadataBase: siteUrl(),
    title: { default: t.title, template: "%s · Stackyard" },
    description: t.description,
    alternates: {
      canonical: `/${lang}`,
      languages: Object.fromEntries(LOCALES.map((l) => [INTL_LOCALE[l], `/${l}`])),
    },
    openGraph: {
      type: "website",
      siteName: "Stackyard",
      title: t.title,
      description: t.description,
      locale: INTL_LOCALE[lang].replace("-", "_"),
    },
    twitter: { card: "summary_large_image", title: t.title, description: t.description },
  };
}

export default async function RootLayout({ children, params }: LayoutProps<"/[lang]">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  return (
    <html lang={lang} className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <I18nProvider locale={lang} dictionary={dictionaries[lang]}>
          <TooltipProvider>{children}</TooltipProvider>
        </I18nProvider>
        <Toaster containerAriaLabel={dictionaries[lang].a11y.notifications} />
      </body>
    </html>
  );
}
