/** Educational copy for the dominant-pollutant explainer (sources + effects). */
import type { Pollutant } from "./aqi";

export const POLLUTANT_INFO: Record<
  Pollutant,
  { label: string; sources: string; effects: string }
> = {
  "PM2.5": {
    label: "Fine particulate matter (<2.5µm)",
    sources: "Vehicle exhaust, crop-residue burning, construction dust, industry.",
    effects: "Penetrates deep into lungs and bloodstream; aggravates heart and respiratory disease.",
  },
  PM10: {
    label: "Coarse particulate matter (<10µm)",
    sources: "Road and construction dust, industrial emissions, windblown soil.",
    effects: "Irritates airways; worsens asthma and bronchitis.",
  },
  NO2: {
    label: "Nitrogen dioxide",
    sources: "Vehicle engines and power plants burning fossil fuels.",
    effects: "Inflames airways; reduces lung function over prolonged exposure.",
  },
  SO2: {
    label: "Sulphur dioxide",
    sources: "Coal and oil combustion, smelters, refineries.",
    effects: "Triggers bronchoconstriction and aggravates asthma.",
  },
  OZONE: {
    label: "Ground-level ozone",
    sources: "Forms in sunlight from vehicle and industrial emissions.",
    effects: "Causes chest pain, coughing, and throat irritation.",
  },
  CO: {
    label: "Carbon monoxide",
    sources: "Incomplete combustion in vehicles and stoves.",
    effects: "Reduces oxygen delivery; causes headaches and dizziness.",
  },
  NH3: {
    label: "Ammonia",
    sources: "Agriculture, fertilizer use, and livestock waste.",
    effects: "Irritates eyes, nose, throat, and respiratory tract.",
  },
};
