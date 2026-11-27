import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import { defineConfig } from "prisma/config";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../../.env") });
dotenv.config();

/** Resolves `DATABASE_URL` directly or derives it from `POSTGRES_*` variables. */
function resolveDatabaseUrl(source: NodeJS.ProcessEnv = process.env): string {
  const rawPostgresPort = source.POSTGRES_PORT?.trim();
  const explicitUrl = source.DATABASE_URL?.trim() || "";

  if (explicitUrl) {
    if (rawPostgresPort && explicitUrl.includes("@localhost:")) {
      return explicitUrl.replace(
        /@localhost:\d+/,
        `@localhost:${rawPostgresPort}`,
      );
    }
    if (rawPostgresPort && explicitUrl.includes("@127.0.0.1:")) {
      return explicitUrl.replace(
        /@127.0.0.1:\d+/,
        `@127.0.0.1:${rawPostgresPort}`,
      );
    }
    return explicitUrl;
  }

  const user = source.POSTGRES_USER?.trim();
  const password = source.POSTGRES_PASSWORD?.trim();
  const db = source.POSTGRES_DB?.trim();
  if (!user || !password || !db) {
    return "";
  }

  const host = source.POSTGRES_HOST?.trim() || "localhost";
  const port = rawPostgresPort || "5432";
  return `postgresql://${encodeURIComponent(user)}:${encodeURIComponent(password)}@${host}:${port}/${db}?schema=public`;
}

const datasourceUrl = resolveDatabaseUrl(process.env);
if (!datasourceUrl) {
  throw new Error(
    "Missing database configuration: set DATABASE_URL or POSTGRES_USER/POSTGRES_PASSWORD/POSTGRES_DB.",
  );
}

export default defineConfig({
  schema: "src/prisma/schema.prisma",
  datasource: {
    url: datasourceUrl,
  },
});
