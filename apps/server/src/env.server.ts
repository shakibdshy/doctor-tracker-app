import "varlock/auto-load";
export { ENV } from "./env";

/**
 * Pool-sizing overrides for createDb, read from plain env vars (operational
 * tuning, not secrets — README → "Connection pool sizing"). Absent or
 * non-numeric values fall through to the db package's driver-safe defaults.
 */
function intEnv(name: string): number | undefined {
  const raw = process.env[name];
  if (!raw) return undefined;
  const value = Number(raw);
  return Number.isFinite(value) && value >= 0 ? value : undefined;
}

export const dbPoolConfig = {
  maxPoolSize: intEnv("DB_MAX_POOL_SIZE"),
  minPoolSize: intEnv("DB_MIN_POOL_SIZE"),
  maxIdleTimeMS: intEnv("DB_MAX_IDLE_TIME_MS"),
  serverSelectionTimeoutMS: intEnv("DB_SERVER_SELECTION_TIMEOUT_MS"),
};
