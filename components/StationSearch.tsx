"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, MapPin, LocateFixed, Loader2 } from "lucide-react";
import { AqiBadge } from "./AqiBadge";
import type { StationAqiDTO } from "@/lib/types";

type Mode = "stations" | "cities" | "place";

interface CityRow {
  city: string;
  state: string;
  worstAqi: number | null;
  stationCount: number;
  reportingCount: number;
  latitude: number | null;
  longitude: number | null;
}
interface NearbyRow extends StationAqiDTO {
  distanceKm: number;
}
interface GeoResult {
  label: string;
  lat: number;
  lon: number;
}

const MODES: { key: Mode; label: string }[] = [
  { key: "stations", label: "Stations" },
  { key: "cities", label: "Cities" },
  { key: "place", label: "Near a place" },
];

export function StationSearch() {
  const [mode, setMode] = useState<Mode>("stations");
  const [q, setQ] = useState("");
  const router = useRouter();

  return (
    <div className="space-y-3">
      <div className="flex overflow-hidden rounded-lg border text-sm">
        {MODES.map((m) => (
          <button
            key={m.key}
            onClick={() => setMode(m.key)}
            className={`flex-1 px-3 py-2 ${
              mode === m.key ? "bg-primary text-primary-foreground" : "hover:bg-muted"
            }`}
          >
            {m.label}
          </button>
        ))}
      </div>

      {mode === "stations" && <StationMode q={q} setQ={setQ} router={router} />}
      {mode === "cities" && <CityMode q={q} setQ={setQ} router={router} />}
      {mode === "place" && <PlaceMode router={router} />}
    </div>
  );
}

function Box({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 rounded-lg border px-3 py-2">{children}</div>
  );
}

/* ---------- Stations ---------- */
function StationMode({
  q,
  setQ,
  router,
}: {
  q: string;
  setQ: (s: string) => void;
  router: ReturnType<typeof useRouter>;
}) {
  const [all, setAll] = useState<StationAqiDTO[]>([]);
  useEffect(() => {
    fetch("/api/stations").then((r) => r.json()).then((d) => setAll(d.stations ?? []));
  }, []);

  const results = useMemo(() => {
    const term = q.trim().toLowerCase();
    const base = !term
      ? all
      : all.filter(
          (s) =>
            s.name.toLowerCase().includes(term) ||
            s.city.toLowerCase().includes(term) ||
            s.state.toLowerCase().includes(term),
        );
    return base.slice(0, 60);
  }, [q, all]);

  return (
    <>
      <Box>
        <Search className="h-4 w-4 text-muted-foreground" />
        <input
          autoFocus
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search by station, city, or state…"
          className="w-full bg-transparent outline-none"
        />
      </Box>
      <ul className="divide-y rounded-lg border">
        {results.map((s) => (
          <li key={s.stationId}>
            <button
              onClick={() => router.push(`/stations/${s.stationId}`)}
              className="flex w-full items-center gap-3 px-3 py-2.5 text-left hover:bg-muted"
            >
              <span className="flex-1 truncate">
                <span className="font-medium">{s.name}</span>
                <span className="text-muted-foreground"> · {s.city}, {s.state}</span>
              </span>
              <AqiBadge aqi={s.aqi} category={s.category} size="sm" />
            </button>
          </li>
        ))}
        {results.length === 0 && <Empty />}
      </ul>
    </>
  );
}

/* ---------- Cities ---------- */
function CityMode({
  q,
  setQ,
  router,
}: {
  q: string;
  setQ: (s: string) => void;
  router: ReturnType<typeof useRouter>;
}) {
  const [cities, setCities] = useState<CityRow[]>([]);
  useEffect(() => {
    fetch("/api/cities").then((r) => r.json()).then((d) => setCities(d.cities ?? []));
  }, []);

  const results = useMemo(() => {
    const term = q.trim().toLowerCase();
    const base = !term
      ? cities
      : cities.filter(
          (c) =>
            c.city.toLowerCase().includes(term) ||
            c.state.toLowerCase().includes(term),
        );
    return base.slice(0, 60);
  }, [q, cities]);

  return (
    <>
      <Box>
        <Search className="h-4 w-4 text-muted-foreground" />
        <input
          autoFocus
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search a city or state…"
          className="w-full bg-transparent outline-none"
        />
      </Box>
      <ul className="divide-y rounded-lg border">
        {results.map((c) => (
          <li key={`${c.city}-${c.state}`}>
            <button
              onClick={() =>
                router.push(`/map?city=${encodeURIComponent(c.city)}`)
              }
              className="flex w-full items-center gap-3 px-3 py-2.5 text-left hover:bg-muted"
            >
              <span className="flex-1 truncate">
                <span className="font-medium">{c.city}</span>
                <span className="text-muted-foreground"> · {c.state}</span>
                <span className="ml-2 text-xs text-muted-foreground">
                  {c.reportingCount}/{c.stationCount} stations
                </span>
              </span>
              <AqiBadge aqi={c.worstAqi} size="sm" />
            </button>
          </li>
        ))}
        {results.length === 0 && <Empty />}
      </ul>
    </>
  );
}

/* ---------- Near a place (geocode + geolocation) ---------- */
function PlaceMode({ router }: { router: ReturnType<typeof useRouter> }) {
  const [q, setQ] = useState("");
  const [geo, setGeo] = useState<GeoResult[]>([]);
  const [nearby, setNearby] = useState<NearbyRow[] | null>(null);
  const [origin, setOrigin] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounced geocode as the user types.
  useEffect(() => {
    if (debounce.current) clearTimeout(debounce.current);
    const term = q.trim();
    if (term.length < 3) {
      setGeo([]);
      return;
    }
    debounce.current = setTimeout(() => {
      fetch(`/api/geocode?q=${encodeURIComponent(term)}`)
        .then((r) => r.json())
        .then((d) => setGeo(d.results ?? []))
        .catch(() => setGeo([]));
    }, 350);
    return () => {
      if (debounce.current) clearTimeout(debounce.current);
    };
  }, [q]);

  const loadNearby = useCallback(
    async (lat: number, lon: number, label: string) => {
      setLoading(true);
      setGeo([]);
      setOrigin(label);
      try {
        const r = await fetch(`/api/nearby?lat=${lat}&lon=${lon}&limit=10`);
        const d = await r.json();
        setNearby(d.stations ?? []);
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  const useMyLocation = useCallback(() => {
    if (!navigator.geolocation) return;
    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        loadNearby(pos.coords.latitude, pos.coords.longitude, "your location"),
      () => setLoading(false),
      { enableHighAccuracy: false, timeout: 10000 },
    );
  }, [loadNearby]);

  return (
    <>
      <Box>
        <MapPin className="h-4 w-4 text-muted-foreground" />
        <input
          autoFocus
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Type a place, e.g. Connaught Place, Delhi…"
          className="w-full bg-transparent outline-none"
        />
        <button
          onClick={useMyLocation}
          title="Use my location"
          className="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs hover:bg-muted"
        >
          <LocateFixed className="h-3.5 w-3.5" /> Near me
        </button>
      </Box>

      {/* Geocode suggestions */}
      {geo.length > 0 && (
        <ul className="divide-y rounded-lg border">
          {geo.map((g, i) => (
            <li key={i}>
              <button
                onClick={() => loadNearby(g.lat, g.lon, g.label)}
                className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm hover:bg-muted"
              >
                <MapPin className="h-4 w-4 shrink-0 text-muted-foreground" />
                <span className="truncate">{g.label}</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {loading && (
        <div className="flex items-center justify-center gap-2 py-8 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Finding nearest stations…
        </div>
      )}

      {/* Nearest stations */}
      {nearby && !loading && (
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">
            Nearest stations to <span className="font-medium">{origin}</span>:
          </p>
          <ul className="divide-y rounded-lg border">
            {nearby.map((s) => (
              <li key={s.stationId}>
                <button
                  onClick={() => router.push(`/stations/${s.stationId}`)}
                  className="flex w-full items-center gap-3 px-3 py-2.5 text-left hover:bg-muted"
                >
                  <span className="flex-1 truncate">
                    <span className="font-medium">{s.name}</span>
                    <span className="text-muted-foreground"> · {s.city}</span>
                  </span>
                  <span className="text-xs tabular-nums text-muted-foreground">
                    {s.distanceKm.toFixed(1)} km
                  </span>
                  <AqiBadge aqi={s.aqi} category={s.category} size="sm" />
                </button>
              </li>
            ))}
            {nearby.length === 0 && <Empty />}
          </ul>
        </div>
      )}
    </>
  );
}

function Empty() {
  return (
    <li className="px-3 py-6 text-center text-sm text-muted-foreground">No matches.</li>
  );
}
