import type { Metadata } from "next";
import { Suspense } from "react";

import { LanguageSwitcher } from "@/components/app/language-switcher";
import { Logo } from "@/components/app/logo";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getDictionary } from "@/i18n/server";
import { LoginForm } from "./login-form";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getDictionary()).auth.title };
}

export default async function LoginPage({ searchParams }: PageProps<"/[lang]/login">) {
  const t = (await getDictionary()).auth;
  return (
    <main className="relative grid min-h-svh place-items-center bg-muted/40 px-4 py-12">
      <div className="absolute right-4 top-4">
        <LanguageSwitcher />
      </div>
      <div className="w-full max-w-sm space-y-6">
        <Logo className="justify-center text-lg" />
        <Card>
          <CardHeader>
            <CardTitle>{t.title}</CardTitle>
            <CardDescription>{t.subtitle}</CardDescription>
          </CardHeader>
          <CardContent>
            <Suspense>
              <LoginFormWithNext searchParams={searchParams} />
            </Suspense>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}

async function LoginFormWithNext({ searchParams }: Pick<PageProps<"/[lang]/login">, "searchParams">) {
  const { next } = await searchParams;
  return <LoginForm next={typeof next === "string" ? next : undefined} />;
}
