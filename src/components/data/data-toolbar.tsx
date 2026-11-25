"use client";

import { FolderPlus, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { createProject, createSite } from "@/app/[lang]/(app)/data/actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { fill, useI18n } from "@/i18n/client";
import { INDUSTRIES } from "@/lib/productivity/benchmarks";
import { LIMITS } from "@/lib/usage/limits";

/** Error text for a create action; the limit errors name the limit. */
function createError(errors: Record<string, string>, error: string) {
  const n = error === "siteLimit" ? LIMITS.sites : LIMITS.projects;
  return fill(errors[error] ?? errors.generic, { n });
}

export type SiteOption = { id: string; name: string; projectName: string };
export type ProjectOption = { id: string; name: string };

/** Site picker (URL-driven) plus the "new project" and "new site" forms. */
export function DataToolbar({
  sites,
  projects,
  siteId,
}: {
  sites: SiteOption[];
  projects: ProjectOption[];
  siteId: string | null;
}) {
  const { t: dict, href } = useI18n();
  const t = dict.data;
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const goToSite = (id: string) => startTransition(() => router.replace(`${href("/data")}?site=${encodeURIComponent(id)}`, { scroll: false }));

  return (
    <div className="flex flex-wrap items-end gap-3 px-6 pt-4">
      {sites.length > 0 && (
        <div className="space-y-1.5">
          <Label htmlFor="data-site" className="text-xs text-muted-foreground">
            {t.site}
          </Label>
          <Select value={siteId ?? undefined} onValueChange={goToSite} disabled={pending}>
            <SelectTrigger id="data-site" className="w-72">
              <SelectValue>{sites.find((s) => s.id === siteId)?.name}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {sites.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.name}
                  <span className="ml-2 text-xs text-muted-foreground">{s.projectName}</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
      <div className="flex gap-2">
        <NewProjectDialog onCreated={() => router.refresh()} />
        <NewSiteDialog projects={projects} onCreated={goToSite} />
      </div>
    </div>
  );
}

function NewProjectDialog({ onCreated }: { onCreated: () => void }) {
  const { t: dict } = useI18n();
  const t = dict.data;
  const [open, setOpen] = useState(false);
  const [industry, setIndustry] = useState<(typeof INDUSTRIES)[number]>("General");
  const [pending, startTransition] = useTransition();

  const submit = (form: FormData) =>
    startTransition(async () => {
      try {
        const res = await createProject({
          name: String(form.get("name") ?? ""),
          client: String(form.get("client") ?? ""),
          industry,
        });
        if (!res.ok) return void toast.error(createError(t.errors, res.error));
        toast.success(t.projectForm.done);
        setOpen(false);
        onCreated();
      } catch {
        toast.error(t.errors.generic);
      }
    });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <FolderPlus />
          {t.newProject}
        </Button>
      </DialogTrigger>
      <DialogContent closeLabel={dict.a11y.close}>
        <form action={submit} className="grid gap-4">
          <DialogHeader>
            <DialogTitle>{t.projectForm.title}</DialogTitle>
            <DialogDescription>{t.projectForm.body}</DialogDescription>
          </DialogHeader>
          <Field id="project-name" label={t.projectForm.name}>
            <Input id="project-name" name="name" required maxLength={80} autoFocus />
          </Field>
          <Field id="project-client" label={t.projectForm.client}>
            <Input id="project-client" name="client" required maxLength={80} />
          </Field>
          <Field id="project-industry" label={t.projectForm.industry}>
            <Select value={industry} onValueChange={(v) => setIndustry(v as typeof industry)}>
              <SelectTrigger id="project-industry" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {INDUSTRIES.map((i) => (
                  <SelectItem key={i} value={i}>
                    {dict.industries[i]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              {t.actions.cancel}
            </Button>
            <Button type="submit" disabled={pending}>
              {t.projectForm.submit}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function NewSiteDialog({ projects, onCreated }: { projects: ProjectOption[]; onCreated: (siteId: string) => void }) {
  const { t: dict } = useI18n();
  const t = dict.data;
  const [open, setOpen] = useState(false);
  const [projectId, setProjectId] = useState<string | undefined>(projects[0]?.id);
  const [pending, startTransition] = useTransition();
  const chosen = projects.some((p) => p.id === projectId) ? projectId : projects[0]?.id;

  const submit = (form: FormData) =>
    startTransition(async () => {
      if (!chosen) return;
      try {
        const res = await createSite({
          projectId: chosen,
          name: String(form.get("name") ?? ""),
          city: String(form.get("city") ?? ""),
          floorArea: Number(form.get("floorArea")),
          clearHeight: Number(form.get("clearHeight")),
          dockDoors: Number(form.get("dockDoors")),
        });
        if (!res.ok) return void toast.error(createError(t.errors, res.error));
        toast.success(t.siteForm.done);
        setOpen(false);
        onCreated(res.id);
      } catch {
        toast.error(t.errors.generic);
      }
    });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" disabled={projects.length === 0} title={projects.length === 0 ? t.siteForm.needProject : undefined}>
          <Plus />
          {t.newSite}
        </Button>
      </DialogTrigger>
      <DialogContent closeLabel={dict.a11y.close}>
        <form action={submit} className="grid gap-4">
          <DialogHeader>
            <DialogTitle>{t.siteForm.title}</DialogTitle>
            <DialogDescription>{t.siteForm.body}</DialogDescription>
          </DialogHeader>
          <Field id="site-project" label={t.siteForm.project}>
            <Select value={chosen} onValueChange={setProjectId}>
              <SelectTrigger id="site-project" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {projects.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="site-name" label={t.siteForm.name}>
              <Input id="site-name" name="name" required maxLength={80} autoFocus />
            </Field>
            <Field id="site-city" label={t.siteForm.city}>
              <Input id="site-city" name="city" required maxLength={80} />
            </Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field id="site-area" label={t.siteForm.floorArea}>
              <Input id="site-area" name="floorArea" type="number" required min={1} max={2000000} step="any" defaultValue={12000} />
            </Field>
            <Field id="site-height" label={t.siteForm.clearHeight}>
              <Input id="site-height" name="clearHeight" type="number" required min={1} max={60} step="0.1" defaultValue={10} />
            </Field>
            <Field id="site-docks" label={t.siteForm.dockDoors}>
              <Input id="site-docks" name="dockDoors" type="number" required min={0} max={1000} step={1} defaultValue={8} />
            </Field>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              {t.actions.cancel}
            </Button>
            <Button type="submit" disabled={pending || !chosen}>
              {t.siteForm.submit}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Field({ id, label, children }: { id: string; label: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      {children}
    </div>
  );
}
