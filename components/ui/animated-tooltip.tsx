"use client";

import { AnimatePresence, motion } from "framer-motion";
import { bandForAqi } from "@/lib/aqi-colors";

/**
 * Animated map tooltip (adapted from Aceternity UI's tooltip motion, MIT).
 *
 * Positioned absolutely over the map at a pixel point. Because Leaflet markers
 * are canvas-drawn (not DOM), the map captures hover + screen position into
 * state and renders this overlay — a spring pop-in with an AQI-colored accent.
 */
export interface TooltipState {
  name: string;
  aqi: number | null;
  x: number;
  y: number;
}

export function AnimatedMapTooltip({ tip }: { tip: TooltipState | null }) {
  const band = tip ? bandForAqi(tip.aqi) : null;

  return (
    <AnimatePresence>
      {tip && (
        <motion.div
          initial={{ opacity: 0, y: 8, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 6, scale: 0.95 }}
          transition={{ type: "spring", stiffness: 360, damping: 26 }}
          className="pointer-events-none absolute z-[1100] -translate-x-1/2 -translate-y-full"
          style={{ left: tip.x, top: tip.y - 14 }}
        >
          <div className="rounded-lg border bg-background/95 px-3 py-2 shadow-lg backdrop-blur">
            <div className="max-w-[200px] truncate text-xs font-medium">
              {tip.name}
            </div>
            <div className="mt-1 flex items-center gap-1.5">
              <span
                className="inline-block h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: band?.color ?? "#9ca3af" }}
              />
              <span className="text-sm font-semibold tabular-nums">
                {tip.aqi ?? "—"}
              </span>
              <span className="text-xs text-muted-foreground">
                {band?.category ?? "No data"}
              </span>
            </div>
          </div>
          {/* little pointer */}
          <div className="mx-auto h-2 w-2 -translate-y-1 rotate-45 border-b border-r bg-background/95" />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
