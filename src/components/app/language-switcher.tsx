"use client";

import { Check, Languages } from "lucide-react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useI18n } from "@/i18n/client";
import { LOCALE_COOKIE, LOCALE_LABEL, LOCALES, switchLocalePath, type Locale } from "@/i18n/config";

/** Remember an explicit choice so bare URLs (/, /dashboard…) open in it. */
function rememberLocale(locale: Locale) {
  document.cookie = `${LOCALE_COOKIE}=${locale}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
}

/**
 * Switches the UI language by swapping the /{lang} segment of the current
 * URL (query string kept) and remembers the choice for bare URLs. The path is
 * read at click time rather than with usePathname(), so pages that render
 * this can still prerender.
 */
export function LanguageSwitcher({ compact = false }: { compact?: boolean }) {
  const { locale, t } = useI18n();
  const router = useRouter();

  const switchTo = (to: Locale) => {
    if (to === locale) return;
    rememberLocale(to);
    const { pathname, search, hash } = window.location;
    router.push(`${switchLocalePath(pathname, to)}${search}${hash}`);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size={compact ? "icon" : "sm"} className={compact ? "size-8" : undefined} aria-label={t.lang.label}>
          <Languages />
          {!compact && <span>{LOCALE_LABEL[locale]}</span>}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">{t.lang.label}</DropdownMenuLabel>
        {LOCALES.map((l) => (
          <DropdownMenuItem key={l} onSelect={() => switchTo(l)} lang={l}>
            <Check className={l === locale ? "opacity-100" : "opacity-0"} aria-hidden />
            {LOCALE_LABEL[l]}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
