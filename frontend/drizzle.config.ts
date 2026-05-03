import type { Config } from "drizzle-kit";

// `generate` works without a DATABASE_URL (it only diffs the schema files).
// `migrate` / `push` / `studio` need it — those scripts run via dotenv-cli.
export default {
  schema: "./src/db/schema.ts",
  out: "./drizzle/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "",
  },
  strict: true,
  verbose: true,
} satisfies Config;
