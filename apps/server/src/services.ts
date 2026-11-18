import { createAuth } from "@doctor-tracker-app/auth";
import { createDb } from "@doctor-tracker-app/db";

import { dbPoolConfig, ENV } from "./env.server";

export const db = await createDb({ DATABASE_URL: ENV.DATABASE_URL, ...dbPoolConfig });
export const auth = createAuth(ENV, db);
