"use client";

import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

/**
 * Subtle aurora background (adapted from Aceternity UI, MIT). A soft animated
 * gradient wash — atmospheric without competing with the data on top.
 */
export function AuroraBackground({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl border",
        className,
      )}
    >
      <div className="pointer-events-none absolute inset-0 overflow-hidden opacity-50 dark:opacity-40">
        <div className="aurora-blob absolute -left-1/4 top-0 h-[40rem] w-[40rem] rounded-full bg-emerald-400/30 blur-3xl" />
        <div className="aurora-blob-2 absolute right-0 top-1/4 h-[34rem] w-[34rem] rounded-full bg-sky-400/30 blur-3xl" />
        <div className="aurora-blob-3 absolute bottom-0 left-1/3 h-[30rem] w-[30rem] rounded-full bg-indigo-400/25 blur-3xl" />
      </div>
      <div className="relative">{children}</div>
    </div>
  );
}
