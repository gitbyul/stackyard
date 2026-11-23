"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";

import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { cn } from "@/lib/utils";

export type SiteOption = { id: string; name: string; projectName: string };

/** URL-driven site and period filters; previous results stay visible while loading. */
export function ProductivityShell({
  sites,
  siteId,
  period,
  children,
}: {
  sites: SiteOption[];
  siteId: string;
  period: string;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();

  const update = (key: "site" | "period", value: string) => {
    if (!value) return;
    const params = new URLSearchParams(searchParams);
    params.set(key, value);
    startTransition(() => router.replace(`${pathname}?${params}`, { scroll: false }));
  };

  return (
    <>
      <div className="flex flex-wrap items-end gap-x-6 gap-y-4 px-6 pt-4">
        <div className="space-y-1.5">
          <Label htmlFor="prod-site" className="text-xs text-muted-foreground">
            Site
          </Label>
          <Select value={siteId} onValueChange={(v) => update("site", v)}>
            <SelectTrigger id="prod-site" className="w-64">
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
        <div className="space-y-1.5">
          <span className="text-xs text-muted-foreground">Period</span>
          <ToggleGroup type="single" variant="outline" value={period} onValueChange={(v) => update("period", v)}>
            {["30", "60", "90"].map((d) => (
              <ToggleGroupItem key={d} value={d} className="px-3">
                {d} days
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </div>
      </div>
      <div aria-busy={pending} className={cn("transition-opacity", pending && "pointer-events-none opacity-60")}>
        {children}
      </div>
    </>
  );
}
