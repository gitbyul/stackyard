"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";

import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { CUT_PRESETS } from "@/lib/analysis/presets";
import { fill, useI18n } from "@/i18n/client";
import { cn } from "@/lib/utils";

export type SiteOption = { id: string; name: string; projectName: string; client: string };

export type FilterValues = {
  site: string;
  period: string;
  metric: string;
  cut: string;
};

/**
 * Owns the URL-driven filters. While a new slice loads, the previous results
 * stay on screen at reduced opacity instead of flashing a skeleton.
 */
export function AnalysisShell({
  sites,
  values,
  children,
}: {
  sites: SiteOption[];
  values: FilterValues;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();

  function update(key: keyof FilterValues, value: string) {
    if (!value || value === values[key]) return;
    const params = new URLSearchParams(searchParams);
    params.set(key, value);
    startTransition(() => router.replace(`${pathname}?${params}`, { scroll: false }));
  }

  const { t: dict } = useI18n();
  const t = dict.analysis;
  const presetLabel = (p?: (typeof CUT_PRESETS)[number]) =>
    p ? ("standard" in p ? `${p.label} (${t.filters.standard})` : p.label) : "";

  const byProject = Map.groupBy(sites, (s) => `${s.projectName} · ${s.client}`);

  return (
    <>
      <div className="flex flex-wrap items-end gap-x-6 gap-y-4 px-6 pt-4">
        <Field label={t.filters.site} htmlFor="filter-site">
          <Select value={values.site} onValueChange={(v) => update("site", v)}>
            <SelectTrigger id="filter-site" className="w-64">
              {/* Explicit label: the items live in a portal that isn't mounted until opened. */}
              <SelectValue>{sites.find((s) => s.id === values.site)?.name}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {[...byProject].map(([group, items]) => (
                <SelectGroup key={group}>
                  <SelectLabel>{group}</SelectLabel>
                  {items.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectGroup>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <Field label={t.filters.period}>
          <ToggleGroup
            type="single"
            variant="outline"
            value={values.period}
            onValueChange={(v) => update("period", v)}
            aria-label={t.filters.period}
          >
            {["30", "60", "90"].map((d) => (
              <ToggleGroupItem key={d} value={d} className="px-3">
                {fill(dict.common.days, { n: d })}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </Field>

        <Field label={t.filters.rankBy}>
          <ToggleGroup
            type="single"
            variant="outline"
            value={values.metric}
            onValueChange={(v) => update("metric", v)}
            aria-label={t.filters.rankBy}
          >
            <ToggleGroupItem value="units" className="px-3">
              {t.filters.units}
            </ToggleGroupItem>
            <ToggleGroupItem value="lines" className="px-3">
              {t.filters.lines}
            </ToggleGroupItem>
          </ToggleGroup>
        </Field>

        <Field label={t.filters.cut} htmlFor="filter-cut">
          <Select value={values.cut} onValueChange={(v) => update("cut", v)}>
            <SelectTrigger id="filter-cut" className="w-44">
              <SelectValue>{presetLabel(CUT_PRESETS.find((p) => p.value === values.cut))}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {CUT_PRESETS.map((p) => (
                <SelectItem key={p.value} value={p.value}>
                  {presetLabel(p)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      </div>
      <div
        aria-busy={pending}
        className={cn("transition-opacity duration-200", pending && "pointer-events-none opacity-60")}
      >
        {children}
      </div>
    </>
  );
}

function Field({ label, htmlFor, children }: { label: string; htmlFor?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={htmlFor} className="text-xs text-muted-foreground">
        {label}
      </Label>
      {children}
    </div>
  );
}
