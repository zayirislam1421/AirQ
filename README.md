<div align="center">

# 🌬️ AirQ India

### Real-time **_and_** historical Air Quality Index for monitoring stations across India

Computes the official **CPCB AQI** the government feed doesn't provide — and builds the
time series the feed can't, so you can _scrub backwards through air-quality history_ 🕹️ on an interactive map.

<br/>

![Next.js](https://img.shields.io/badge/Next.js_14-000000?style=for-the-badge&logo=nextdotjs&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![Drizzle](https://img.shields.io/badge/Drizzle_ORM-C5F74F?style=for-the-badge&logo=drizzle&logoColor=black)
![SQLite](https://img.shields.io/badge/libSQL_/_Turso-4FF8D2?style=for-the-badge&logo=sqlite&logoColor=black)
![Leaflet](https://img.shields.io/badge/Leaflet-199900?style=for-the-badge&logo=leaflet&logoColor=white)
![Tailwind](https://img.shields.io/badge/Tailwind-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)

![Tests](https://img.shields.io/badge/tests-40_passing-3fb950?style=flat-square&logo=vitest&logoColor=white)
![Stations](https://img.shields.io/badge/stations-~500-blue?style=flat-square&logo=googlemaps&logoColor=white)
![Pollutants](https://img.shields.io/badge/pollutants-7-orange?style=flat-square)
![Deploy](https://img.shields.io/badge/deploy-Vercel-black?style=flat-square&logo=vercel&logoColor=white)

<br/>

🧭 [Overview](#-overview) &nbsp;·&nbsp; ✨ [Features](#-features) &nbsp;·&nbsp; 🏗️ [Architecture](#️-architecture) &nbsp;·&nbsp; 🚀 [Quick start](#-quick-start) &nbsp;·&nbsp; 🔌 [API](#-api-reference) &nbsp;·&nbsp; 🧮 [AQI](#-how-the-aqi-is-computed) &nbsp;·&nbsp; ☁️ [Deploy](#️-deployment-vercel--turso)

</div>

---

## 🧭 Overview

India's [data.gov.in real-time AQI feed](https://www.data.gov.in/resource/real-time-air-quality-index-various-locations)
has two gaps. This project turns **both into features**:

| 📥 The feed gives you… | ✅ …so AirQ India adds |
| --- | --- |
| **Raw pollutant concentrations**, _not_ an AQI number | 🧮 A from-scratch **CPCB National AQI engine** — sub-index per pollutant → station AQI → dominant pollutant |
| **Only "right now"** — no history, every fetch overwrites | 🕹️ **Scheduled snapshots into a database**, building the time series that powers a **timeline scrubber** |

The result is a **single Next.js app**, deployable to Vercel as one service: the
"backend" is route handlers under `app/api/`, the database is **SQLite**
(libSQL/Turso in production, a local file in dev) accessed through **Drizzle**, and
ingestion runs as a **Vercel Cron** job.

> [!NOTE]
> **Why no AQI in the "Air Quality Index" feed?** 🤔 The feed reports raw µg/m³
> concentrations for PM2.5, PM10, NO₂, SO₂, CO, O₃ and NH₃. The AQI is a _derived_
> index — we compute it with the CPCB breakpoint method in [`lib/aqi.ts`](lib/aqi.ts).

---

## ✨ Features

| | Feature | What it does |
| :-: | --- | --- |
| 📊 | **National dashboard** | Auto-rotating 🌍 3D globe of all stations, the current worst-AQI station, and most/least-polluted city rankings in a bento layout. |
| 🗺️ | **Map + timeline scrubber** | 500+ canvas-rendered stations colored by CPCB band. **Play or drag through past snapshots** ⏯️ and watch AQI ripple across the country — animated hover tooltips, "jump to now". |
| 📈 | **Station detail** | AQI gauge, a dominant-pollutant explainer (sources & health effects), per-pollutant cards, and a historical trend chart with a range brush. |
| 🔍 | **Three-mode search** | **Stations** (fuzzy), **Cities** (rollups), and **Near a place** 🌍 — type any address → geocoded → nearest stations by distance, or tap **“Near me”** 📍 for geolocation. |
| ⚖️ | **Compare** | Two stations side by side — gauges and pollutant bars. |
| ♿ | **Trust & accessibility** | AQI always shown as _number + label + color_ (never color alone) · 🌗 dark mode · honest "insufficient data" instead of fabricated numbers. |

---

## 🏗️ Architecture

```
                        data.gov.in CPCB AQI feed  (hourly batch, raw µg/m³, "NA" gaps)
                                      ▲  fetch + page
              Vercel Cron ───────────┤  (every 15 min → GET /api/ingest)
                                      │
   ┌───────────────────────────────────▼──────────────────────────────────────┐
   │ Next.js app  (one deploy on Vercel)                                        │
   │                                                                            │
   │   lib/ingest.ts        fetch → transform → load                            │
   │     • clean   "NA" → null · str → float · parse IST dates                  │
   │     • compute CPCB AQI + dominant pollutant   (lib/aqi.ts)                 │
   │     • dedup   skip byte-identical snapshots (content hash)                 │
   │                                   │                                        │
   │                          ┌────────▼─────────┐                              │
   │                          │  SQLite (Drizzle) │  Turso/libSQL in prod,      │
   │                          │  append-only      │  local file in dev          │
   │                          └────────┬─────────┘                              │
   │                                   │                                        │
   │   RSC pages ◄── read DB directly ─┤                                        │
   │   route handlers (app/api/*) ◄────┘  serve client islands & cron           │
   │                                                                            │
   │   Dashboard · Map + Scrubber · Station detail · Search · Compare           │
   └────────────────────────────────────────────────────────────────────────────┘
```

#### 🧱 Design principles

- 🧩 **Logic lives in `lib/`, framework-free and unit-tested.** Route handlers and
  pages are thin callers — swapping the data source or AQI math touches only `lib/`.
- 📚 **Append-only snapshots.** Each run inserts a `snapshots` row plus its `readings`
  and computed `station_aqi`. History accumulates; nothing is overwritten — that's
  what the scrubber animates.
- ⚡ **The scrubber never refetches per frame.** The whole bounded series loads once
  as a columnar payload; playback (rAF + time accumulator, _not_ `setInterval`)
  restyles Leaflet markers imperatively, so it stays smooth.

#### 🧰 Tech stack

| Layer | Choice |
| --- | --- |
| 🖼️ Framework | Next.js 14 (App Router, RSC) + TypeScript |
| 🔌 API | Next.js Route Handlers + Zod validation |
| 🗄️ Database | SQLite via **libSQL/Turso** + **Drizzle ORM** |
| ⏰ Scheduling | Vercel Cron → `/api/ingest` |
| 🗺️ Map | react-leaflet + Leaflet (canvas markers) |
| 📈 Charts | Recharts (+ LTTB downsampling) |
| 🌍 Globe / motion | cobe + Framer Motion |
| 🎨 UI | Tailwind CSS, shadcn-style primitives, Aceternity-derived globe/aurora/bento |
| 🧪 Tests | Vitest |

---

## 🚀 Quick start

> [!IMPORTANT]
> **Prerequisites:** Node `20+` and a free [data.gov.in](https://data.gov.in) API key.
> The bundled sample key is capped at **10 rows**; a registered key returns **~3,500**. 🔑

```bash
# 1️⃣  Install
npm install

# 2️⃣  Configure — set your data.gov.in key
cp .env.local.example .env.local        # then edit DATAGOV_API_KEY

# 3️⃣  Create the local SQLite schema
npx drizzle-kit migrate

# 4️⃣  Pull a first snapshot (~3,500 records)
export $(grep -v '^#' .env.local | xargs)   # tsx doesn't auto-load .env.local
npm run ingest

# 5️⃣  Run
npm run dev      # → http://localhost:3000  🎉
```

> [!TIP]
> The **timeline scrubber and trend charts need multiple snapshots** to shine. 🕹️
> Each `npm run ingest` adds one (identical consecutive snapshots are de-duped).
> Run it a few times over a while — or let the cron run in production — to
> accumulate scrubable history.

#### 📜 Scripts

| Command | Description |
| --- | --- |
| 🟢 `npm run dev` | Start the dev server |
| 📦 `npm run build` | Production build (also type-checks the whole project) |
| 🧪 `npm test` | Run the Vitest suite — **40 tests**: AQI engine, transform, downsampling, geo |
| 🔄 `npm run ingest` | Pull one snapshot now (`-- --catchup` bypasses dedup for backfill) |
| 🗄️ `npm run db:generate` / `db:migrate` | Generate / apply Drizzle migrations |

---

## 🗂️ Project structure

```
weatherApp/
├─ app/
│  ├─ page.tsx                 # 📊 Dashboard (RSC) — globe hero, KPIs, rankings
│  ├─ map/                     # 🗺️ Map + timeline scrubber
│  ├─ stations/[id]/           # 📈 Station detail + trends
│  ├─ search/  ·  compare/     # 🔍 Search (3 modes) · ⚖️ side-by-side compare
│  └─ api/                     # 🔌 Route handlers = the backend (see API reference)
│
├─ lib/                        # 🧩 Framework-free logic (unit-tested)
│  ├─ aqi.ts          ⭐       # CPCB AQI engine — breakpoints, sub-index, dominant
│  ├─ aqi-colors.ts   ⭐       # Single source of truth for AQI bands + colors
│  ├─ ingest.ts                # fetch → transform → load, snapshot dedup
│  ├─ datagov.ts               # data.gov.in client (paging, retries, timeout)
│  ├─ transform.ts             # cleaning: NA→null, IST date parse, content hash
│  ├─ queries.ts               # all read queries (shared by pages + handlers)
│  ├─ downsample.ts            # LTTB downsampling for trend charts
│  ├─ geo.ts                   # Haversine distance (nearest-station search)
│  ├─ pollutant-info.ts        # health/sources copy for the explainer
│  └─ config.ts                # refresh cadence (single source of truth)
│
├─ components/
│  ├─ Scrubber.tsx · usePlayback.ts · StationMap.tsx   # 🕹️ the hero scrubber
│  ├─ AqiGlobe.tsx · AqiBadge.tsx · AqiDial.tsx · TrendChart.tsx
│  ├─ MapExplorer.tsx · StationSearch.tsx · CompareView.tsx
│  └─ ui/                      # card, slider, animated-tooltip, aurora, bento
│
├─ db/  schema.ts · client.ts · migrations/            # 🗄️ Drizzle + libSQL
└─ vercel.json                 # ⏰ Cron schedule
```

---

## 🔌 API reference

All read endpoints serve JSON; RSC pages also read the DB directly via Drizzle.

| Method | Endpoint | Purpose |
| :-: | --- | --- |
| `GET` | `/api/health` | ❤️ Liveness + last snapshot time |
| `GET` | `/api/ingest` | ⏰ **Cron-triggered** ingestion (guarded by `CRON_SECRET`; `?force=1` skips dedup) |
| `GET` | `/api/meta` | 🏷️ Distinct states/cities/pollutants + snapshot timestamps |
| `GET` | `/api/stations` | 📍 Latest AQI per station — filter by `state`, `city`, `category` |
| `GET` | `/api/stations/{id}` | 🔬 One station: current readings + AQI + dominant pollutant |
| `GET` | `/api/stations/{id}/trends` | 📈 LTTB-downsampled history (`pollutant`, `from`, `to`, `points`) |
| `GET` | `/api/cities` | 🏙️ City-level rollups (worst/avg AQI, reporting counts); `?q=` filters |
| `GET` | `/api/rankings` | 🏆 Most/least-polluted cities (`order=worst\|best`) |
| `GET` | `/api/map` | 🗺️ Lightweight markers `{lat, lon, aqi, category}` |
| `GET` | `/api/timeline` | 🕹️ Columnar payload for the scrubber (loaded once, animated client-side) |
| `GET` | `/api/nearby` | 📡 Stations nearest to `?lat=&lon=`, by distance |
| `GET` | `/api/geocode` | 🌍 Place → coordinates (OpenStreetMap Nominatim proxy, India-biased) |
| `GET` | `/api/compare` | ⚖️ Side-by-side detail for `?ids=a,b` |

---

## 🧮 How the AQI is computed

Following the **CPCB National Air Quality Index** method ([`lib/aqi.ts`](lib/aqi.ts)):

1. 📐 Each pollutant's concentration maps to a **0–500 sub-index** via official
   breakpoint tables and linear interpolation.
2. 🔝 The **station AQI = the maximum sub-index**; the pollutant achieving it is the
   **dominant pollutant**.
3. 🛡️ An AQI is reported only when **≥3 pollutants** are available **and** at least one
   is PM2.5 or PM10 — otherwise it's honestly "insufficient data".

<div align="center">

| AQI | Category | | AQI | Category |
| :-: | --- | :-: | :-: | --- |
| `0–50` | 🟢 **Good** | | `201–300` | 🟠 **Poor** |
| `51–100` | 🟩 **Satisfactory** | | `301–400` | 🔴 **Very Poor** |
| `101–200` | 🟡 **Moderate** | | `401–500` | 🟤 **Severe** |

</div>

---

## ☁️ Deployment (Vercel + Turso)

1. 🗄️ Create a [Turso](https://turso.tech) database; set `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN` in Vercel.
2. 🔑 Set `DATAGOV_API_KEY` and a random `CRON_SECRET`.
3. 🧬 Apply migrations against Turso: `drizzle-kit migrate` with the Turso URL.
4. 🚀 Deploy. `vercel.json` runs `/api/ingest` every **15 minutes**.

#### ⏱️ Refresh frequency — why 15 minutes

Measured feed behavior (2026-07): the CPCB feed publishes **one hourly batch** (every
record stamped on the hour, e.g. `03:00:00`) and lags real-time by up to **~90 minutes**.

- 🕐 **The data only changes ~hourly**, so polling faster can't make it fresher — it
  only shortens how long after each batch we notice it.
- 🎯 **15 min bounds that detection lag to ≤15 min** — imperceptible for hourly data —
  while avoiding the ~690 wasted (de-duped) no-op polls/day a 2-min cadence would burn.
- 🔧 Tune in `vercel.json` + `lib/config.ts` (keep them in sync). `*/10` is a fine
  aggressive variant; `0 * * * *` is the cheapest.

> [!WARNING]
> **Sub-daily cron requires a Vercel Pro plan.** 💳 The Hobby (free) tier runs cron at
> most once per day. Local `npm run ingest` has no limit.

---

## 🔐 Environment variables

| Variable | Required | Description |
| --- | :-: | --- |
| `DATAGOV_API_KEY` | ✅ | Your data.gov.in key (sample key is 10-row capped) |
| `DATAGOV_RESOURCE_ID` | ➖ | Defaults to the CPCB AQI resource |
| `DATABASE_URL` | ➖ | Local SQLite file (default `file:./airq.db`) |
| `TURSO_DATABASE_URL` / `TURSO_AUTH_TOKEN` | 🔒 prod | Turso connection (production DB) |
| `CRON_SECRET` | 🔒 prod | Bearer token guarding `/api/ingest` |

---

## ⚠️ Known data caveats

- 💨 **CO is excluded from the AQI.** The feed's CO values aren't in CPCB's mg/m³ unit
  (observed 2–111, median ~29) and would falsely pin ~15% of stations at AQI 500. CO is
  still stored and displayed; PM2.5/PM10 drive the index, which is CPCB-valid without CO.
  See [`lib/aqi.ts`](lib/aqi.ts).
- 🚫 **"Insufficient data" is real.** A station with <3 AQI-eligible pollutants, or
  all-`NA` values, reports no AQI rather than a fabricated number.
- ⏳ **The feed itself lags** real-time by up to ~90 minutes (see above).

---

<div align="center">

Built with the CPCB open-data feed 🇮🇳

data © [data.gov.in](https://data.gov.in) &nbsp;·&nbsp; maps © [OpenStreetMap](https://www.openstreetmap.org) &nbsp;·&nbsp; geocoding © [Nominatim](https://nominatim.org)

<sub>Made with 🌬️ for cleaner air</sub>

</div>
