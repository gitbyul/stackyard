"use client";

import { ArrowLeft, SearchX } from "lucide-react";
import Link from "next/link";

import { Logo } from "@/components/app/logo";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/i18n/client";

/**
 * 404 page in the visitor's language: unknown URLs, and projects, layouts or
 * process maps that don't exist or belong to someone else (see proxy.ts).
 */
export default function NotFound() {
  const { t, href } = useI18n();
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 px-6 py-24 text-center">
      <title>{`${t.notFound.title} · Stackyard`}</title>
      <Logo />
      <SearchX className="size-10 text-muted-foreground" aria-hidden />
      <div className="max-w-md space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">{t.notFound.title}</h1>
        <p className="text-muted-foreground">{t.notFound.body}</p>
      </div>
      <div className="flex flex-wrap justify-center gap-2">
        <Button asChild>
          <Link href={href("/projects")}>
            <ArrowLeft /> {t.notFound.projects}
          </Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href={href("/")}>{t.notFound.home}</Link>
        </Button>
      </div>
    </main>
  );
}
