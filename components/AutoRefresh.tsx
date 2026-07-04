"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export function AutoRefresh({ intervalMs = 30_000 }: { intervalMs?: number }) {
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;

    const refresh = async () => {
      try {
        const res = await fetch("/api/ingest", { cache: "no-store" });
        if (!res.ok) return;
      } catch {
        return;
      }

      if (!cancelled) {
        router.refresh();
      }
    };

    const handleVisibility = () => {
      if (!document.hidden) {
        void refresh();
      }
    };

    const id = window.setInterval(() => {
      void refresh();
    }, intervalMs);

    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("focus", handleVisibility);
    void refresh();

    return () => {
      cancelled = true;
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("focus", handleVisibility);
    };
  }, [intervalMs, router]);

  return null;
}
