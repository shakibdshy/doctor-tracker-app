import mongoose from "mongoose";

import type { DatabaseConfig } from "./config";

export async function createDb(env: DatabaseConfig) {
  await mongoose.connect(env.DATABASE_URL);
  return mongoose.connection.getClient().db();
}

/** Close the shared mongoose connection (graceful shutdown). */
export async function closeDb() {
  await mongoose.disconnect();
}

export type Database = Awaited<ReturnType<typeof createDb>>;
