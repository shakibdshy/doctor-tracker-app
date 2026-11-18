/**
 * Connection settings. The pool knobs are operational tuning, not secrets:
 * deployments size them via plain env vars (`DB_MAX_POOL_SIZE`,
 * `DB_MIN_POOL_SIZE`, `DB_MAX_IDLE_TIME_MS`, `DB_SERVER_SELECTION_TIMEOUT_MS`)
 * without a code change — a long-running host wants a larger warm pool while
 * many serverless instances each hold their own pool against the Atlas
 * connection budget (README → "Connection pool sizing").
 */
export type DatabaseConfig = {
  DATABASE_URL: string;
  maxPoolSize?: number;
  minPoolSize?: number;
  maxIdleTimeMS?: number;
  serverSelectionTimeoutMS?: number;
};

/** Driver-safe defaults applied when the env vars are absent. */
export const POOL_DEFAULTS = {
  maxPoolSize: 10,
  minPoolSize: 0,
  maxIdleTimeMS: 30_000,
  serverSelectionTimeoutMS: 10_000,
} as const;
