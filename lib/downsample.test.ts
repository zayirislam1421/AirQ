import { describe, it, expect } from "vitest";
import { lttb, type Point } from "./downsample";

const series = (n: number): Point[] =>
  Array.from({ length: n }, (_, i) => ({
    t: new Date(Date.UTC(2026, 0, 1, i)).toISOString(),
    value: Math.sin(i / 5) * 100 + 150,
  }));

describe("lttb", () => {
  it("returns input unchanged when under threshold", () => {
    const s = series(10);
    expect(lttb(s, 800)).toHaveLength(10);
  });

  it("downsamples to roughly the threshold", () => {
    const s = series(5000);
    const out = lttb(s, 500);
    expect(out.length).toBeLessThanOrEqual(510);
    expect(out.length).toBeGreaterThan(400);
  });

  it("always keeps first and last points", () => {
    const s = series(2000);
    const out = lttb(s, 200);
    expect(out[0].t).toBe(s[0].t);
    expect(out[out.length - 1].t).toBe(s[s.length - 1].t);
  });

  it("preserves a sharp spike (the whole point of LTTB)", () => {
    const s = series(1000);
    s[500] = { t: s[500].t, value: 9999 }; // inject spike
    const out = lttb(s, 100);
    expect(out.some((p) => p.value === 9999)).toBe(true);
  });

  it("breaks the line across null gaps with a null marker", () => {
    const s: Point[] = [
      ...series(500),
      { t: "2026-02-01T00:00:00.000Z", value: null },
      ...series(500).map((p) => ({ ...p, t: p.t.replace("2026", "2027") })),
    ];
    const out = lttb(s, 200);
    expect(out.some((p) => p.value === null)).toBe(true);
  });
});
