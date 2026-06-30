/**
 * Largest-Triangle-Three-Buckets (LTTB) downsampling for time-series charts.
 *
 * Keeps visually significant points (peaks/troughs) — critical so AQI spikes
 * survive — while reducing a series to ~`threshold` points. Based on Sveinn
 * Steinarsson's algorithm.
 *
 * Our series may contain nulls (missing snapshots). LTTB needs numeric points,
 * so we segment on nulls: each contiguous non-null run is downsampled
 * proportionally, and a single null marker is preserved between segments so the
 * chart line breaks across gaps instead of drawing a false straight line.
 */

export interface Point {
  t: string;
  value: number | null;
}

function lttbSegment(data: { t: string; value: number }[], threshold: number) {
  const n = data.length;
  if (threshold >= n || threshold < 3) return data;

  const sampled: typeof data = [data[0]]; // always keep first
  const bucketSize = (n - 2) / (threshold - 2);
  let a = 0; // index of previously selected point

  for (let i = 0; i < threshold - 2; i++) {
    // Average point of the next bucket (used as triangle's third vertex).
    const avgRangeStart = Math.floor((i + 1) * bucketSize) + 1;
    const avgRangeEnd = Math.min(Math.floor((i + 2) * bucketSize) + 1, n);
    let avgX = 0;
    let avgY = 0;
    const avgLen = avgRangeEnd - avgRangeStart;
    for (let j = avgRangeStart; j < avgRangeEnd; j++) {
      avgX += j;
      avgY += data[j].value;
    }
    avgX /= avgLen;
    avgY /= avgLen;

    // Current bucket range to choose a point from.
    const rangeStart = Math.floor(i * bucketSize) + 1;
    const rangeEnd = Math.floor((i + 1) * bucketSize) + 1;
    const pointA = data[a];

    let maxArea = -1;
    let chosen = rangeStart;
    for (let j = rangeStart; j < rangeEnd; j++) {
      const area = Math.abs(
        (a - avgX) * (data[j].value - pointA.value) -
          (a - j) * (avgY - pointA.value),
      );
      if (area > maxArea) {
        maxArea = area;
        chosen = j;
      }
    }
    sampled.push(data[chosen]);
    a = chosen;
  }

  sampled.push(data[n - 1]); // always keep last
  return sampled;
}

export function lttb(points: Point[], threshold: number): Point[] {
  if (points.length <= threshold) return points;

  // Split into contiguous non-null segments.
  const segments: { t: string; value: number }[][] = [];
  let cur: { t: string; value: number }[] = [];
  for (const p of points) {
    if (p.value == null) {
      if (cur.length) segments.push(cur);
      cur = [];
    } else {
      cur.push({ t: p.t, value: p.value });
    }
  }
  if (cur.length) segments.push(cur);
  if (!segments.length) return points;

  const total = segments.reduce((s, seg) => s + seg.length, 0);
  const out: Point[] = [];
  segments.forEach((seg, i) => {
    const quota = Math.max(3, Math.round((seg.length / total) * threshold));
    const ds = lttbSegment(seg, quota);
    out.push(...ds);
    // Insert a null marker between segments to break the line over gaps.
    if (i < segments.length - 1) {
      out.push({ t: seg[seg.length - 1].t, value: null });
    }
  });
  return out;
}
