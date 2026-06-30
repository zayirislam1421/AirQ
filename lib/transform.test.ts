import { describe, it, expect } from "vitest";
import {
  cleanNumber,
  parseLastUpdate,
  normalizePollutant,
  cleanRecord,
  contentHash,
} from "./transform";
import type { RawAqiRecord } from "./types";

describe("cleanNumber", () => {
  it("parses numeric strings", () => {
    expect(cleanNumber("70")).toBe(70);
    expect(cleanNumber("25.6")).toBe(25.6);
  });
  it("treats NA / empty / null as null", () => {
    expect(cleanNumber("NA")).toBeNull();
    expect(cleanNumber("na")).toBeNull();
    expect(cleanNumber("")).toBeNull();
    expect(cleanNumber("  ")).toBeNull();
    expect(cleanNumber(null)).toBeNull();
    expect(cleanNumber(undefined)).toBeNull();
  });
  it("rejects non-numeric garbage", () => {
    expect(cleanNumber("abc")).toBeNull();
  });
});

describe("parseLastUpdate", () => {
  it("converts IST DD-MM-YYYY HH:MM:SS to ISO UTC", () => {
    // 01-07-2026 00:00:00 IST == 2026-06-30T18:30:00Z
    expect(parseLastUpdate("01-07-2026 00:00:00")).toBe("2026-06-30T18:30:00.000Z");
  });
  it("returns null on malformed input", () => {
    expect(parseLastUpdate("2026-07-01")).toBeNull();
    expect(parseLastUpdate("NA")).toBeNull();
    expect(parseLastUpdate(null)).toBeNull();
  });
});

describe("normalizePollutant", () => {
  it("maps known and aliased pollutants", () => {
    expect(normalizePollutant("PM2.5")).toBe("PM2.5");
    expect(normalizePollutant("o3")).toBe("OZONE");
    expect(normalizePollutant("OZONE")).toBe("OZONE");
    expect(normalizePollutant("PM25")).toBe("PM2.5");
  });
  it("returns null for unknown pollutants", () => {
    expect(normalizePollutant("XYZ")).toBeNull();
  });
});

describe("cleanRecord", () => {
  const raw: RawAqiRecord = {
    country: "India",
    state: " Bihar ",
    city: "Patna",
    station: "Samanpura, Patna - BSPCB",
    last_update: "01-07-2026 00:00:00",
    latitude: "25.596727",
    longitude: "85.085624",
    pollutant_id: "PM2.5",
    min_value: "46",
    max_value: "122",
    avg_value: "70",
  };

  it("cleans and types a full record", () => {
    const c = cleanRecord(raw)!;
    expect(c.state).toBe("Bihar"); // trimmed
    expect(c.pollutant).toBe("PM2.5");
    expect(c.avg).toBe(70);
    expect(c.latitude).toBeCloseTo(25.596727);
    expect(c.sourceLastUpdate).toBe("2026-06-30T18:30:00.000Z");
  });

  it("turns NA values into null", () => {
    const c = cleanRecord({ ...raw, avg_value: "NA", min_value: "NA" })!;
    expect(c.avg).toBeNull();
    expect(c.min).toBeNull();
  });

  it("drops records with unknown pollutants", () => {
    expect(cleanRecord({ ...raw, pollutant_id: "XYZ" })).toBeNull();
  });
});

describe("contentHash", () => {
  const mk = (avg: number) => [
    {
      state: "Bihar",
      city: "Patna",
      station: "S",
      latitude: 1,
      longitude: 2,
      sourceLastUpdate: null,
      pollutant: "PM2.5" as const,
      min: null,
      max: null,
      avg,
    },
  ];
  it("is stable for identical content", () => {
    expect(contentHash(mk(70))).toBe(contentHash(mk(70)));
  });
  it("changes when values change", () => {
    expect(contentHash(mk(70))).not.toBe(contentHash(mk(80)));
  });
  it("is order-independent", () => {
    const a = [...mk(70), ...mk(80)];
    const b = [...mk(80), ...mk(70)];
    expect(contentHash(a)).toBe(contentHash(b));
  });
});
