import { env } from "cloudflare:workers";
import { drizzle } from "drizzle-orm/d1";
import * as schema from "./schema";

export function getDb() {
  if (!env.DB) {
    throw new Error(
      "Cloudflare D1 binding `DB` is unavailable. Add the `d1_databases` binding to wrangler.json and point `database_id` at your D1 database.",
    );
  }

  return drizzle(env.DB, { schema });
}
