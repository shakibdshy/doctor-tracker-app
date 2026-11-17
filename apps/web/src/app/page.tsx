import { redirect } from "next/navigation";

import { getSessionServer } from "@/lib/session";

// The portal has no public landing page: signed-in visitors land on the
// dashboard, everyone else on login.
export default async function Home() {
  const session = await getSessionServer();
  redirect(session?.user ? "/dashboard" : "/login");
}
