import Link from "next/link";

import { cn } from "@/lib/utils";

/** Three stacked pallets in isometric-ish blocks; the top one is the signal color. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={cn("size-6", className)}>
      <rect x="3" y="15" width="18" height="5" rx="1" className="fill-primary" />
      <rect x="5" y="9" width="14" height="5" rx="1" className="fill-primary/60" />
      <rect x="7" y="3" width="10" height="5" rx="1" className="fill-signal" />
    </svg>
  );
}

export function Logo({ href = "/", className }: { href?: string; className?: string }) {
  return (
    <Link href={href} className={cn("flex items-center gap-2 font-semibold tracking-tight", className)}>
      <LogoMark />
      <span>Stackyard</span>
    </Link>
  );
}
