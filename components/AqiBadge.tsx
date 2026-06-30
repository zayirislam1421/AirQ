/**
 * The single AQI display primitive used everywhere (cards, tables, popups).
 * Always renders number + category label + color — never color alone — so it
 * stays readable for color-vision deficiency. Pass `accessible` to switch palette.
 */
import { bandForAqi, type AqiCategory } from "@/lib/aqi-colors";
import { cn } from "@/lib/utils";

interface Props {
  aqi: number | null;
  category?: AqiCategory | null;
  size?: "sm" | "md" | "lg" | "xl";
  accessible?: boolean;
  className?: string;
}

const sizeClasses = {
  sm: "text-xs px-2 py-0.5 gap-1",
  md: "text-sm px-2.5 py-1 gap-1.5",
  lg: "text-base px-3 py-1.5 gap-2",
  xl: "text-2xl px-5 py-3 gap-2 font-bold",
};

export function AqiBadge({ aqi, category, size = "md", accessible, className }: Props) {
  const band = bandForAqi(aqi);
  const color = band ? (accessible ? band.accessibleColor : band.color) : "#9ca3af";
  const label = category ?? band?.category ?? "No data";
  // Pick readable text color: yellow/light-green bands need dark text.
  const darkText = band ? ["Moderate", "Satisfactory"].includes(band.category) : false;

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full font-medium leading-none",
        sizeClasses[size],
        className,
      )}
      style={{ backgroundColor: color, color: darkText ? "#1a1a1a" : "#ffffff" }}
      title={band?.health}
    >
      <span className="tabular-nums font-semibold">{aqi ?? "—"}</span>
      <span className="opacity-90">{label}</span>
    </span>
  );
}
