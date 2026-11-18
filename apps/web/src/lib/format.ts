/** Deterministic date rendering — no SSR/client timezone mismatch. */
export const dateFormatter = new Intl.DateTimeFormat("en-CA", {
  year: "numeric",
  month: "short",
  day: "2-digit",
  timeZone: "UTC",
});

/** Up-to-two-letter initials for avatar chips. */
export function initialsOf(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]!.toUpperCase())
    .join("");
}
