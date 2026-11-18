import { computeDashboardSummary, type DashboardSummary } from "./service";

export type DashboardCache<T> = {
  get: () => Promise<T>;
  invalidate: () => void;
};

/**
 * The summary is read-heavy and write-rare, so responses are cached in
 * process memory: TTL for baseline reuse, plus a generation counter — every
 * patient/doctor mutation bumps it — so own writes reflect immediately
 * instead of after the TTL. On serverless each warm instance holds its own
 * copy; the TTL bounds how far a cross-instance read can lag (README →
 * "Dashboard caching").
 */
export const DASHBOARD_TTL_MS = 60_000;

export function createDashboardCache<T>(
  compute: () => Promise<T>,
  ttlMs: number = DASHBOARD_TTL_MS,
): DashboardCache<T> {
  let generation = 0;
  let entry: { generation: number; data: T; expiresAt: number } | null = null;

  return {
    async get() {
      if (entry && entry.generation === generation && Date.now() < entry.expiresAt) {
        return entry.data;
      }
      const data = await compute();
      entry = { generation, data, expiresAt: Date.now() + ttlMs };
      return data;
    },
    invalidate() {
      generation += 1;
    },
  };
}

export const dashboardCache = createDashboardCache<DashboardSummary>(computeDashboardSummary);

/** The controller's cached entry point for GET /api/v1/dashboard. */
export const getDashboardSummary = () => dashboardCache.get();

/** Every patient/doctor create, update, and delete calls this. */
export function invalidateDashboardCache(): void {
  dashboardCache.invalidate();
}
