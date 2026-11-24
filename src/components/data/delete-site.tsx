"use client";

import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";

import { deleteSite } from "@/app/[lang]/(app)/data/actions";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { fill, useI18n } from "@/i18n/client";

/** Danger zone: deletes the site and everything stored under it. */
export function DeleteSite({ siteId, siteName }: { siteId: string; siteName: string }) {
  const { t: dict, href } = useI18n();
  const t = dict.data;
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const onDelete = () =>
    startTransition(async () => {
      try {
        const res = await deleteSite(siteId);
        if (!res.ok) return void toast.error(t.errors[res.error]);
        toast.success(t.danger.done);
        router.replace(href("/data"));
        router.refresh();
      } catch {
        toast.error(t.errors.generic);
      }
    });

  return (
    <section className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-destructive/30 p-4">
      <div className="space-y-1">
        <h2 className="text-sm font-medium">{t.danger.title}</h2>
        <p className="text-sm text-muted-foreground">{fill(t.danger.body, { site: siteName })}</p>
      </div>
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button variant="outline" size="sm" className="text-destructive" disabled={pending}>
            <Trash2 />
            {t.danger.button}
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{fill(t.danger.confirmTitle, { site: siteName })}</AlertDialogTitle>
            <AlertDialogDescription>{t.danger.confirmBody}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t.actions.cancel}</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={onDelete}>
              {t.danger.button}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}
