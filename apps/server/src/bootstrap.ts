import { closeDb } from "@doctor-tracker-app/db";

import { ensureDemoUsers } from "./bootstrap-users";

await ensureDemoUsers();
await closeDb();
