"use client";

import { Slider } from "@/components/ui/slider";
import { usePlayback } from "./usePlayback";
import { formatIST } from "@/lib/utils";
import { Play, Pause, SkipBack, SkipForward, Radio } from "lucide-react";
import { useEffect } from "react";

/**
 * Timeline scrubber bar. Owns the playback engine and reports the current frame
 * index up via `onFrame` so the parent can drive the map imperatively.
 */

const SPEEDS = [1, 2, 4];

interface Props {
  timestamps: string[];
  onFrame: (index: number) => void;
}

export function Scrubber({ timestamps, onFrame }: Props) {
  const n = timestamps.length;
  const { index, playing, speed, setSpeed, toggle, step, snapToNow, scrubTo } =
    usePlayback({ frameCount: n });

  // Push every index change to the parent (map restyle is cheap/imperative).
  useEffect(() => {
    onFrame(index);
  }, [index, onFrame]);

  const isLive = index === n - 1;
  const single = n <= 1;

  return (
    <div className="rounded-xl border bg-card p-3 shadow-sm">
      <div className="mb-2 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            aria-label={playing ? "Pause" : "Play"}
            onClick={toggle}
            disabled={single}
            className="inline-flex h-9 w-9 items-center justify-center rounded-md border hover:bg-muted disabled:opacity-40"
          >
            {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          </button>
          <button
            aria-label="Step back"
            onClick={() => step(-1)}
            disabled={single}
            className="inline-flex h-9 w-9 items-center justify-center rounded-md border hover:bg-muted disabled:opacity-40"
          >
            <SkipBack className="h-4 w-4" />
          </button>
          <button
            aria-label="Step forward"
            onClick={() => step(1)}
            disabled={single}
            className="inline-flex h-9 w-9 items-center justify-center rounded-md border hover:bg-muted disabled:opacity-40"
          >
            <SkipForward className="h-4 w-4" />
          </button>
          <div className="ml-1 flex overflow-hidden rounded-md border text-xs">
            {SPEEDS.map((s) => (
              <button
                key={s}
                onClick={() => setSpeed(s)}
                className={`px-2 py-1.5 ${speed === s ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
              >
                {s}x
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="font-mono text-sm tabular-nums">
            {formatIST(timestamps[index])} <span className="text-muted-foreground">IST</span>
          </span>
          <button
            onClick={snapToNow}
            disabled={isLive}
            className={`inline-flex items-center gap-1 rounded-md border px-2.5 py-1.5 text-xs ${
              isLive ? "text-muted-foreground" : "hover:bg-muted"
            }`}
          >
            <Radio className="h-3 w-3" /> Now
          </button>
        </div>
      </div>

      <Slider
        value={[index]}
        min={0}
        max={Math.max(0, n - 1)}
        step={1}
        onValueChange={([v]) => scrubTo(v)}
        disabled={single}
        aria-label="Timeline"
      />
      <div className="mt-1 flex justify-between text-[11px] text-muted-foreground">
        <span>{n ? formatIST(timestamps[0]) : "—"}</span>
        <span>
          {single
            ? "Only one snapshot yet — history builds as ingestion runs"
            : `${n} snapshots`}
        </span>
        <span>{n ? formatIST(timestamps[n - 1]) : "—"}</span>
      </div>
    </div>
  );
}
