import { can, type Capability, type Session } from "@doctor-tracker-app/auth";
import { fromNodeHeaders } from "better-auth/node";
import type { Request, RequestHandler } from "express";

import { AppError } from "../http/errors";
import { auth } from "../services";

export type AuthedRequest = Request & {
  user?: Session["user"];
  session?: Session["session"];
};

/** Resolve the better-auth session from the incoming request, if any. */
export async function getSession(req: Request): Promise<Session | null> {
  const session = await auth.api.getSession({
    headers: fromNodeHeaders(req.headers),
  });
  return session ?? null;
}

/** Gate for every /api/v1 route: reject unauthenticated requests with a 401 envelope. */
export const requireAuth: RequestHandler = async (req, _res, next) => {
  const session = await getSession(req);
  if (!session) {
    next(AppError.unauthorized());
    return;
  }
  const authed = req as AuthedRequest;
  authed.user = session.user;
  authed.session = session.session;
  next();
};

/**
 * Capability gate: enforce the role × capability matrix (packages/auth/policy)
 * on a route. The server is the authority — the UI only hides what this denies.
 */
export function requireCapability(capability: Capability): RequestHandler {
  return (req, _res, next) => {
    const user = (req as AuthedRequest).user;
    if (!user) {
      next(AppError.unauthorized());
      return;
    }
    if (!can(user.role, capability)) {
      next(AppError.forbidden());
      return;
    }
    next();
  };
}
