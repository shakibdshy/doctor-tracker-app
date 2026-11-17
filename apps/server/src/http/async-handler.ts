import type { NextFunction, Request, RequestHandler, Response } from "express";

type AsyncController = (
  req: Request,
  res: Response,
  next: NextFunction,
) => Promise<unknown>;

/** Wrap an async controller so rejections flow into the central error middleware. */
export function asyncHandler(controller: AsyncController): RequestHandler {
  return (req, res, next) => {
    controller(req, res, next).catch(next);
  };
}
