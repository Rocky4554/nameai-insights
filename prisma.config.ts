import "dotenv/config";
import { defineConfig, env } from "prisma/config";

// NOTE: @prisma/config@7.9.0's Datasource type only has `url` and
// `shadowDatabaseUrl` — there is no `directUrl` field (unlike some Prisma 7
// docs/skills, which describe a slightly different point release). This
// works out fine because the CLI (migrate/introspect, via this file) and the
// runtime PrismaClient (via src/db/client.ts's driver adapter) read from
// entirely separate connections now:
//   - This file's `url` → DIRECT_URL (bypasses PgBouncer; migrations need this)
//   - The adapter in src/db/client.ts → DATABASE_URL (pooled, PgBouncer)
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: env("DIRECT_URL"),
  },
});
