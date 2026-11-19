/**
 * Idle-session window shared by both ends of the portal: better-auth's
 * sliding session (createAuth) and the web idle guard arm the same 15
 * minutes, so client-side sign-out and server-side expiry cannot drift
 * apart (ADR-0004).
 */
export const SESSION_IDLE_SECONDS = 60 * 15;

/**
 * Minimum interval between server-side expiry refreshes (better-auth
 * `session.updateAge`): one minute of activity keeps the session warm
 * without a write on every request.
 */
export const SESSION_REFRESH_SECONDS = 60;
