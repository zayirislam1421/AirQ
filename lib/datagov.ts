/**
 * Client for the data.gov.in real-time AQI resource.
 *
 * Handles pagination (limit/offset), retries with backoff, and a timeout per
 * request. Returns raw string records — cleaning happens in the transform step.
 */

import type { RawAqiRecord } from "./types";

const DEFAULT_RESOURCE = "3b01bcb8-0b14-4abf-b6f2-c1bfd384ba69";
// Public sample key shipped by data.gov.in; override via env for higher limits.
const SAMPLE_KEY = "579b464db66ec23bdd000001cdd3946e44ce4aad7209ff7b23ac571b";

const PAGE_SIZE = 1000;
const MAX_PAGES = 20; // safety cap (~20k rows; feed is ~3.5k)
const REQUEST_TIMEOUT_MS = 20_000;
const MAX_RETRIES = 3;

interface ApiResponse {
  total?: number;
  count?: number;
  records?: RawAqiRecord[];
}

function config() {
  return {
    apiKey: process.env.DATAGOV_API_KEY ?? SAMPLE_KEY,
    resourceId: process.env.DATAGOV_RESOURCE_ID ?? DEFAULT_RESOURCE,
  };
}

async function fetchPage(offset: number): Promise<ApiResponse> {
  const { apiKey, resourceId } = config();
  const url = new URL(`https://api.data.gov.in/resource/${resourceId}`);
  url.searchParams.set("api-key", apiKey);
  url.searchParams.set("format", "json");
  url.searchParams.set("limit", String(PAGE_SIZE));
  url.searchParams.set("offset", String(offset));

  let lastErr: unknown;
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), REQUEST_TIMEOUT_MS);
    try {
      const res = await fetch(url, { signal: ctrl.signal });
      if (!res.ok) throw new Error(`data.gov.in HTTP ${res.status}`);
      return (await res.json()) as ApiResponse;
    } catch (err) {
      lastErr = err;
      // exponential backoff: 0.5s, 1s, 2s
      await new Promise((r) => setTimeout(r, 500 * 2 ** (attempt - 1)));
    } finally {
      clearTimeout(timer);
    }
  }
  throw new Error(
    `Failed to fetch offset ${offset} after ${MAX_RETRIES} retries: ${String(lastErr)}`,
  );
}

/** Fetch every record by paging until the feed is exhausted. */
export async function fetchAllRecords(): Promise<RawAqiRecord[]> {
  const all: RawAqiRecord[] = [];
  for (let page = 0; page < MAX_PAGES; page++) {
    const data = await fetchPage(page * PAGE_SIZE);
    const records = data.records ?? [];
    all.push(...records);
    if (records.length < PAGE_SIZE) break; // last page
  }
  return all;
}
