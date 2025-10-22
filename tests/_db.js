import postgres from "postgres";

export function createSqlClient() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is required before running database scripts.");
  }

  const shouldUseSSL =
    process.env.DATABASE_SSL !== "disable" &&
    !/localhost|127\.0\.0\.1/.test(connectionString);

  return postgres(
    connectionString,
    shouldUseSSL
      ? {
          ssl: {
            rejectUnauthorized: false,
          },
        }
      : {},
  );
}

export async function closeSqlClient(sql) {
  // Gracefully close the underlying connection pool when scripts finish.
  await sql.end({ timeout: 5 }).catch(() => {
    // ignore; pool may already be closed when process exits quickly.
  });
}
