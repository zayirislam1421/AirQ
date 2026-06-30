import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

/** Bento grid (adapted from Aceternity UI, MIT). */
export function BentoGrid({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        "grid grid-cols-1 gap-4 md:grid-cols-3 md:auto-rows-[12rem]",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function BentoItem({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-xl border bg-card p-5 shadow-sm transition-shadow hover:shadow-md",
        className,
      )}
    >
      {children}
    </div>
  );
}
