import { createAuth } from "@doctor-tracker-app/auth";
import { createDb } from "@doctor-tracker-app/db";

import { ENV } from "./env.server";

export const db = await createDb(ENV);
export const auth = createAuth(ENV, db);
