const SAFE_DB_IDENTIFIER_RE = /^[a-zA-Z0-9_]+$/;

export function isSafeTestDatabaseName(dbName: string): boolean {
  return dbName.trim().toLowerCase().includes("test");
}

export function extractDatabaseName(databaseUrl: string): string {
  const parsed = new URL(databaseUrl);
  return parsed.pathname.replace(/^\//, "");
}

export function assertValidPgIdentifier(identifier: string): string {
  if (!SAFE_DB_IDENTIFIER_RE.test(identifier)) {
    throw new Error(`Invalid PostgreSQL identifier: "${identifier}"`);
  }
  return identifier;
}

export function applyLocalPostgresPort(
  databaseUrl: string,
  postgresPort?: string,
): string {
  if (!postgresPort?.trim()) return databaseUrl;
  const port = postgresPort.trim();
  if (databaseUrl.includes("@localhost:")) {
    return databaseUrl.replace(/@localhost:\d+/, `@localhost:${port}`);
  }
  if (databaseUrl.includes("@127.0.0.1:")) {
    return databaseUrl.replace(/@127.0.0.1:\d+/, `@127.0.0.1:${port}`);
  }
  return databaseUrl;
}

export function resolveTestDatabaseUrl(
  rawDatabaseUrl: string,
  options?: { overrideTestUrl?: string; postgresPort?: string },
): string {
  const overrideUrl = options?.overrideTestUrl?.trim();
  if (overrideUrl) {
    const resolved = applyLocalPostgresPort(overrideUrl, options?.postgresPort);
    const dbName = extractDatabaseName(resolved);
    if (!isSafeTestDatabaseName(dbName)) {
      throw new Error(
        `Unsafe override database "${dbName}": test database name must contain "test".`,
      );
    }
    return resolved;
  }

  if (!rawDatabaseUrl?.trim()) {
    return rawDatabaseUrl;
  }

  const withPort = applyLocalPostgresPort(
    rawDatabaseUrl.trim(),
    options?.postgresPort,
  );
  const parsed = new URL(withPort);
  const currentName = parsed.pathname.replace(/^\//, "");
  if (isSafeTestDatabaseName(currentName)) {
    return parsed.toString();
  }

  const baseName = currentName.replace(/_db$/i, "") || "haihire";
  parsed.pathname = `/${baseName}_test_db`;
  return parsed.toString();
}
