import { describe, it, expect } from "vitest";
import {
  subIndex,
  computeStationAqi,
  type PollutantReading,
  type Pollutant,
} from "./aqi";
import { bandForAqi, categoryForAqi, colorForAqi } from "./aqi-colors";

describe("subIndex", () => {
  it("maps the lower bound of a band to its lower index", () => {
    // PM2.5 0–30 -> 0–50, so 0 conc => index 0
    expect(subIndex("PM2.5", 0)).toBe(0);
  });

  it("maps the upper bound of a band to its upper index", () => {
    // PM2.5 0–30 -> 0–50, so conc 30 => index 50
    expect(subIndex("PM2.5", 30)).toBe(50);
  });

  it("linearly interpolates within a band", () => {
    // PM2.5 31–60 -> 51–100. Midpoint conc ~45.5 => ~75.
    // At conc 45: ((100-51)/(60-31))*(45-31)+51 = (49/29)*14+51 ≈ 74.66 -> 75
    expect(subIndex("PM2.5", 45)).toBe(75);
  });

  it("computes a known Moderate PM2.5 value", () => {
    // conc 70 in band 61–90 -> 101–200:
    // (99/29)*(70-61)+101 = 3.4138*9+101 ≈ 131.7 -> 132
    expect(subIndex("PM2.5", 70)).toBe(132);
  });

  it("clamps concentrations above the top band to 500", () => {
    expect(subIndex("PM2.5", 9999)).toBe(500);
  });

  it("returns null for null, NaN, and negative inputs", () => {
    expect(subIndex("PM2.5", null)).toBeNull();
    expect(subIndex("PM2.5", undefined)).toBeNull();
    expect(subIndex("PM2.5", NaN)).toBeNull();
    expect(subIndex("PM2.5", -5)).toBeNull();
  });

  it("handles PM10 band boundaries", () => {
    expect(subIndex("PM10", 50)).toBe(50);
    expect(subIndex("PM10", 100)).toBe(100);
    expect(subIndex("PM10", 250)).toBe(200);
  });
});

describe("computeStationAqi", () => {
  const full = (over: Partial<Record<Pollutant, number | null>> = {}): PollutantReading[] => {
    const base: Record<Pollutant, number | null> = {
      "PM2.5": 70, // si ~132
      PM10: 120, // band 101–250 -> 101–200
      NO2: 30, // si <=50
      SO2: 5,
      OZONE: 31,
      CO: 0.5,
      NH3: 10,
      ...over,
    };
    return (Object.keys(base) as Pollutant[]).map((p) => ({
      pollutant: p,
      avg: base[p],
    }));
  };

  it("returns AQI = max sub-index and names the dominant pollutant", () => {
    const r = computeStationAqi(full());
    expect(r.aqi).toBe(132); // PM2.5 dominates this set
    expect(r.dominantPollutant).toBe("PM2.5");
    expect(r.category).toBe("Moderate");
  });

  it("picks PM10 as dominant when it has the highest sub-index", () => {
    const r = computeStationAqi(full({ "PM2.5": 10, PM10: 300 }));
    // PM10 300 in 251–350 -> 201–300 => ~248
    expect(r.dominantPollutant).toBe("PM10");
    expect(r.category).toBe("Poor");
  });

  it("returns nulls when fewer than 3 pollutants are present", () => {
    const r = computeStationAqi([
      { pollutant: "PM2.5", avg: 70 },
      { pollutant: "PM10", avg: 120 },
    ]);
    expect(r.aqi).toBeNull();
    expect(r.dominantPollutant).toBeNull();
    // sub-indices still surfaced for debugging/tooltips
    expect(r.subIndices["PM2.5"]).toBe(132);
  });

  it("returns nulls when neither PM2.5 nor PM10 is present (CPCB rule)", () => {
    const r = computeStationAqi([
      { pollutant: "NO2", avg: 30 },
      { pollutant: "SO2", avg: 5 },
      { pollutant: "OZONE", avg: 31 },
      { pollutant: "NH3", avg: 10 },
    ]);
    expect(r.aqi).toBeNull();
    expect(Object.keys(r.subIndices).length).toBe(4); // computed, just not valid
  });

  it("treats all-NA readings as insufficient data", () => {
    const r = computeStationAqi(full({ "PM2.5": null, PM10: null, NO2: null, SO2: null, OZONE: null, CO: null, NH3: null }));
    expect(r.aqi).toBeNull();
    expect(r.category).toBeNull();
    expect(r.dominantPollutant).toBeNull();
  });

  it("excludes CO from the AQI max but still surfaces its sub-index", () => {
    // CO 50 would be 500 in the mg/m³ table; it must NOT drive the AQI.
    const r = computeStationAqi(full({ CO: 50 }));
    expect(r.dominantPollutant).not.toBe("CO");
    expect(r.aqi).toBe(132); // still PM2.5-driven
    expect(r.subIndices.CO).toBeDefined(); // computed for display
  });

  it("does not count CO toward the 3-pollutant minimum", () => {
    // Only PM2.5 + CO eligible-wise: PM2.5 counts, CO doesn't -> insufficient.
    const r = computeStationAqi([
      { pollutant: "PM2.5", avg: 70 },
      { pollutant: "CO", avg: 50 },
    ]);
    expect(r.aqi).toBeNull();
  });

  it("ignores NA pollutants but still computes from the rest", () => {
    const r = computeStationAqi(full({ NO2: null, SO2: null }));
    expect(r.aqi).toBe(132);
    expect(r.subIndices).not.toHaveProperty("NO2");
  });
});

describe("aqi-colors", () => {
  it("resolves bands at boundaries", () => {
    expect(bandForAqi(50)?.category).toBe("Good");
    expect(bandForAqi(51)?.category).toBe("Satisfactory");
    expect(bandForAqi(200)?.category).toBe("Moderate");
    expect(bandForAqi(201)?.category).toBe("Poor");
    expect(bandForAqi(500)?.category).toBe("Severe");
  });

  it("clamps values above 500 into Severe", () => {
    expect(categoryForAqi(750)).toBe("Severe");
  });

  it("returns null/gray for invalid AQI", () => {
    expect(bandForAqi(null)).toBeNull();
    expect(categoryForAqi(-1)).toBeNull();
    expect(colorForAqi(null)).toBe("#9ca3af");
  });

  it("returns the standard and accessible colors", () => {
    expect(colorForAqi(25)).toBe("#009865");
    expect(colorForAqi(25, true)).toBe("#1a9850");
  });
});
