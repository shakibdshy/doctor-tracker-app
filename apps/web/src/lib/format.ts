/** Deterministic date rendering — no SSR/client timezone mismatch. */
export const dateFormatter = new Intl.DateTimeFormat("en-CA", {
  year: "numeric",
  month: "short",
  day: "2-digit",
  timeZone: "UTC",
});
