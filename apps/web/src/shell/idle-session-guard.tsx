"use client";

import { useIdleSession } from "@/hooks/use-idle-session";

/**
 * Arms the idle-session listeners for the authenticated shell. Renders
 * nothing — it exists so the server-component layout can mount the hook.
 */
export default function IdleSessionGuard() {
  useIdleSession();
  return null;
}
