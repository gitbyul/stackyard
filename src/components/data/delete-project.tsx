"use client";

import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useId, useState, useTransition } from "react";
import { toast } from "sonner";

import { deleteProject } from "@/app/[lang]/(app)/data/actions";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { fill, useI18n } from "@/i18n/client";

/**
 * Danger zone of a project: deletes it with every site and dataset under it.
 * The project code has to be typed to confirm, since this removes far more
 * than one site.
 */
export function DeleteProject({
  projectId,
  projectName,
  projectCode,
  siteCount,
}: {
  projectId: string;
  projectName: string;
  projectCode: string;
  siteCount: number;
}) {
  const { t: dict, fmt, href } = useI18n();
  const t = dict.projects.danger;
  const router = useRouter();
  const inputId = useId();
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState("");
  const [pending, startTransition] = useTransition();
  const matches = typed.trim().toUpperCase() === projectCode.toUpperCase();

  const onDelete = () =>
    startTransition(async () => {
      try {
        const res = await deleteProject(projectId);
        if (!res.ok) return void toast.error(t.notFound);
        toast.success(fill(t.done, { project: projectName }));
        setOpen(false);
        router.replace(href("/projects"));
        router.refresh();
      } catch {
        toast.error(dict.data.errors.generic);
      }
    });

  return (
    <section className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-destructive/30 p-4">
      <div className="space-y-1">
        <h2 className="text-sm font-medium">{t.title}</h2>
        <p className="text-sm text-muted-foreground">
          {fill(siteCount > 0 ? t.body : t.bodyEmpty, { project: projectName, n: fmt.number(siteCount) })}
        </p>
      </div>
      <AlertDialog
        open={open}
        onOpenChange={(next) => {
          if (pending) return;
          setOpen(next);
          if (!next) setTyped("");
        }}
      >
        <AlertDialogTrigger asChild>
          <Button variant="outline" size="sm" className="text-destructive">
            <Trash2 />
            {t.button}
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <form
            className="grid gap-4"
            onSubmit={(e) => {
              e.preventDefault();
              if (matches && !pending) onDelete();
            }}
          >
            <AlertDialogHeader>
              <AlertDialogTitle>{fill(t.confirmTitle, { project: projectName })}</AlertDialogTitle>
              <AlertDialogDescription>
                {fill(siteCount > 0 ? t.confirmBody : t.confirmBodyEmpty, { n: fmt.number(siteCount) })}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="grid gap-1.5">
              <Label htmlFor={inputId}>{fill(t.typeCode, { code: projectCode })}</Label>
              <Input
                id={inputId}
                value={typed}
                onChange={(e) => setTyped(e.target.value)}
                placeholder={projectCode}
                autoComplete="off"
                spellCheck={false}
                autoFocus
                className="font-mono"
              />
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel type="button" disabled={pending}>
                {dict.data.actions.cancel}
              </AlertDialogCancel>
              <Button type="submit" variant="destructive" disabled={!matches || pending}>
                {pending ? t.deleting : t.button}
              </Button>
            </AlertDialogFooter>
          </form>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}
