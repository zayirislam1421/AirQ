import { describe, it, expect } from "vitest";
import { haversineKm } from "./geo";

describe("haversineKm", () => {
  it("is zero for identical points", () => {
    expect(haversineKm(28.6, 77.2, 28.6, 77.2)).toBeCloseTo(0, 5);
  });

  it("computes Delhi → Mumbai distance (~1150 km)", () => {
    // Delhi (28.61, 77.21) to Mumbai (19.08, 72.88)
    const d = haversineKm(28.61, 77.21, 19.08, 72.88);
    expect(d).toBeGreaterThan(1100);
    expect(d).toBeLessThan(1200);
  });

  it("is symmetric", () => {
    const a = haversineKm(13.08, 80.27, 17.39, 78.49);
    const b = haversineKm(17.39, 78.49, 13.08, 80.27);
    expect(a).toBeCloseTo(b, 6);
  });
});
