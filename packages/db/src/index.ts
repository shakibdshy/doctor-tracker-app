import mongoose from "mongoose";

import { POOL_DEFAULTS, type DatabaseConfig } from "./config";

export async function createDb(env: DatabaseConfig) {
  await mongoose.connect(env.DATABASE_URL, {
    maxPoolSize: env.maxPoolSize ?? POOL_DEFAULTS.maxPoolSize,
    minPoolSize: env.minPoolSize ?? POOL_DEFAULTS.minPoolSize,
    // Idle sockets close after 30s so pools of serverless instances that
    // stopped receiving traffic release their Atlas connections.
    maxIdleTimeMS: env.maxIdleTimeMS ?? POOL_DEFAULTS.maxIdleTimeMS,
    serverSelectionTimeoutMS:
      env.serverSelectionTimeoutMS ?? POOL_DEFAULTS.serverSelectionTimeoutMS,
  });
  return mongoose.connection.getClient().db();
}

/** Close the shared mongoose connection (graceful shutdown). */
export async function closeDb() {
  await mongoose.disconnect();
}

export type Database = Awaited<ReturnType<typeof createDb>>;
