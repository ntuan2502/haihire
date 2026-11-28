/**
 * Resolves `DATABASE_URL` either from an explicit override (applying any
 * `POSTGRES_PORT` override to loopback targets) or by deriving it from the
 * core `POSTGRES_USER` / `POSTGRES_PASSWORD` / `POSTGRES_DB` variables.
 */
export function resolveDatabaseUrlFromEnv(
  source: NodeJS.ProcessEnv = process.env,
): string {
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
