"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Timeline playback engine for the scrubber.
 *
 * Index-based (discrete frames), driven by requestAnimationFrame + a time
 * accumulator — NOT setInterval, which drifts and janks on 120Hz displays and
 * keeps running in background tabs. Wall-clock delta advances `index` by
 * `speed` frames per `MS_PER_FRAME`; loop is OFF by default (stops at the end,
 * like Windy/NASA Worldview for data-integrity domains).
 */

const MS_PER_FRAME = 900; // base cadence at 1x

interface Options {
  frameCount: number;
  loop?: boolean;
}

export function usePlayback({ frameCount, loop = false }: Options) {
  const [index, setIndex] = useState(() => Math.max(0, frameCount - 1)); // start at "now"
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);

  const rafRef = useRef<number | null>(null);
  const lastTsRef = useRef<number | null>(null);
  const accRef = useRef(0);
  // Mirror state into refs so the rAF loop reads fresh values without re-subscribing.
  const indexRef = useRef(index);
  const speedRef = useRef(speed);
  indexRef.current = index;
  speedRef.current = speed;

  // Clamp when the frame count changes (new snapshots arrive).
  useEffect(() => {
    setIndex((i) => Math.min(i, Math.max(0, frameCount - 1)));
  }, [frameCount]);

  const stop = useCallback(() => {
    setPlaying(false);
    if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    lastTsRef.current = null;
    accRef.current = 0;
  }, []);

  useEffect(() => {
    if (!playing) return;

    const tick = (ts: number) => {
      if (lastTsRef.current == null) lastTsRef.current = ts;
      const delta = ts - lastTsRef.current;
      lastTsRef.current = ts;
      accRef.current += delta * speedRef.current;

      while (accRef.current >= MS_PER_FRAME) {
        accRef.current -= MS_PER_FRAME;
        let next = indexRef.current + 1;
        if (next >= frameCount) {
          if (loop) {
            next = 0;
          } else {
            indexRef.current = frameCount - 1;
            setIndex(frameCount - 1);
            setPlaying(false);
            return; // reached the end
          }
        }
        indexRef.current = next;
        setIndex(next);
      }
      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
      lastTsRef.current = null;
    };
  }, [playing, frameCount, loop]);

  const toggle = useCallback(() => {
    if (frameCount <= 1) return;
    setPlaying((p) => {
      const next = !p;
      // Restarting from the end? jump to start.
      if (next && indexRef.current >= frameCount - 1) {
        setIndex(0);
        indexRef.current = 0;
      }
      lastTsRef.current = null;
      accRef.current = 0;
      return next;
    });
  }, [frameCount]);

  const step = useCallback(
    (dir: 1 | -1) => {
      stop();
      setIndex((i) => Math.min(frameCount - 1, Math.max(0, i + dir)));
    },
    [frameCount, stop],
  );

  /** Jump to the latest frame ("Now") and stop. */
  const snapToNow = useCallback(() => {
    stop();
    setIndex(Math.max(0, frameCount - 1));
  }, [frameCount, stop]);

  /** Manual scrub (from the slider) pauses playback. */
  const scrubTo = useCallback(
    (i: number) => {
      if (playing) stop();
      setIndex(Math.min(frameCount - 1, Math.max(0, i)));
    },
    [playing, stop, frameCount],
  );

  return { index, playing, speed, setSpeed, toggle, step, snapToNow, scrubTo };
}
