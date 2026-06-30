/** Semicircular AQI gauge. Pure SVG, server-renderable. */
import { bandForAqi, type AqiCategory } from "@/lib/aqi-colors";

interface Props {
  aqi: number | null;
  category: AqiCategory | null;
}

export function AqiDial({ aqi, category }: Props) {
  const band = bandForAqi(aqi);
  const max = 500;
  const pct = aqi != null ? Math.min(aqi, max) / max : 0;
  // Semicircle: 180° arc, radius 80, center (100,100).
  const r = 80;
  const circumference = Math.PI * r; // half circle
  const dash = circumference * pct;

  return (
    <div className="flex flex-col items-center">
      <svg viewBox="0 0 200 110" className="w-56">
        {/* track */}
        <path
          d="M 20 100 A 80 80 0 0 1 180 100"
          fill="none"
          stroke="hsl(var(--muted))"
          strokeWidth="14"
          strokeLinecap="round"
        />
        {/* value arc */}
        {aqi != null && (
          <path
            d="M 20 100 A 80 80 0 0 1 180 100"
            fill="none"
            stroke={band?.color ?? "#9ca3af"}
            strokeWidth="14"
            strokeLinecap="round"
            strokeDasharray={`${dash} ${circumference}`}
          />
        )}
      </svg>
      <div className="-mt-10 text-center">
        <div
          className="text-4xl font-bold tabular-nums"
          style={{ color: band?.color }}
        >
          {aqi ?? "—"}
        </div>
        <div className="text-sm font-medium">{category ?? "No data"}</div>
      </div>
    </div>
  );
}
