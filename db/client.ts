/**
 * libSQL/Turso client singleton + Drizzle binding.
 *
 * - Production (Vercel): set TURSO_DATABASE_URL + TURSO_AUTH_TOKEN.
 * - Local dev: omit them and it falls back to a local SQLite file
 *   (DATABASE_URL or ./airq.db) with WAL pragmas for concurrent read/write.
 *
 * The client is cached on globalThis to survive Next.js hot-reload / serverless
 * function reuse without opening a new connection per invocation.
 */

import { drizzle, type LibSQLDatabase } from "drizzle-orm/libsql";
import { createClient, type Client } from "@libsql/client";
import * as schema from "./schema";

const LOCAL_FILE = process.env.DATABASE_URL ?? "file:./airq.db";

function makeClient(): Client {
  const url = process.env.TURSO_DATABASE_URL ?? LOCAL_FILE;
  const authToken = process.env.TURSO_AUTH_TOKEN;
  const client = createClient({ url, authToken });

  // Local file only: enable WAL so the cron writer and readers don't block.
  if (!process.env.TURSO_DATABASE_URL) {
    client.executeMultiple(
      "PRAGMA journal_mode=WAL; PRAGMA synchronous=NORMAL; PRAGMA temp_store=MEMORY;",
    ).catch(() => {
      /* pragmas are best-effort; ignore on engines that reject them */
    });
  }
  return client;
}

const g = globalThis as unknown as {
  __libsql?: Client;
  __db?: LibSQLDatabase<typeof schema>;
};

export const libsql: Client = g.__libsql ?? (g.__libsql = makeClient());
export const db: LibSQLDatabase<typeof schema> =
  g.__db ?? (g.__db = drizzle(libsql, { schema }));

export { schema };
