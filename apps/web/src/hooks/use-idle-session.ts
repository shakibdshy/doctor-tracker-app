"use client";

// Subpath import, not the package root: the root re-exports createAuth,
// whose better-auth/MongoDB tree is server-only and must not reach the
// browser bundle (same convention as @doctor-tracker-app/auth/policy).
import { SESSION_IDLE_SECONDS } from "@doctor-tracker-app/auth/session";
import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { toast } from "sonner";

import { authClient } from "@/lib/auth-client";

const IDLE_MS = SESSION_IDLE_SECONDS * 1000;
// Coalesce input-event storms: re-arming a few times per window is plenty,
// but never let the throttle exceed the window itself — it must stay
// smaller than the window or activity could not push the timer at all.
const RESET_THROTTLE_MS = Math.min(60_000, IDLE_MS / 4);

const ACTIVITY_EVENTS = [
  "pointermove",
  "pointerdown",
  "keydown",
  "wheel",
  "touchstart",
] as const;

/**
 * Client half of the 15-minute idle logout (server half: better-auth's
 * sliding session — both windows come from SESSION_IDLE_SECONDS, ADR-0004).
 * No re-renders: activity lives in a ref, one timer armed at a time.
 * Background tabs throttle timers, so returning to a visibly-stale tab is
 * caught by the visibilitychange elapsed-time check instead of the timer.
 */
export function useIdleSession() {
  const router = useRouter();
  const lastActivityRef = useRef(Date.now());
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const clearTimer = () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };

    const signOut = () => {
      clearTimer();
      toast.info("Signed out due to inactivity");
      authClient.signOut({
        fetchOptions: {
          onSuccess: () => {
            // replace, not push: back must not return to the signed-out page.
            router.replace("/login");
            router.refresh();
          },
          onError: () => {
            // The redirect is the safe outcome even if the call fails; the
            // server session has its own idle window behind it.
            router.replace("/login");
          },
        },
      });
    };

    const arm = () => {
      clearTimer();
      const remaining = lastActivityRef.current + IDLE_MS - Date.now();
      timerRef.current = setTimeout(signOut, Math.max(remaining, 0));
    };

    const onActivity = () => {
      const now = Date.now();
      if (now - lastActivityRef.current < RESET_THROTTLE_MS) return;
      lastActivityRef.current = now;
      arm();
    };

    const onVisibility = () => {
      if (document.visibilityState !== "visible") return;
      if (Date.now() - lastActivityRef.current >= IDLE_MS) {
        signOut();
        return;
      }
      arm();
    };

    for (const event of ACTIVITY_EVENTS) {
      window.addEventListener(event, onActivity, { passive: true });
    }
    document.addEventListener("visibilitychange", onVisibility);
    arm();

    return () => {
      clearTimer();
      for (const event of ACTIVITY_EVENTS) {
        window.removeEventListener(event, onActivity);
      }
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [router]);
}
