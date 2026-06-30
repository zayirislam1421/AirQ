import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "turso",
  schema: "./db/schema.ts",
  out: "./db/migrations",
  dbCredentials: {
    url: process.env.TURSO_DATABASE_URL ?? process.env.DATABASE_URL ?? "file:./airq.db",
    authToken: process.env.TURSO_AUTH_TOKEN,
  },
});
