import { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";

type HttpError = Error & { statusCode?: number; details?: unknown };

export function errorHandler(
  err: HttpError,
  _req: Request,
  res: Response,
  _next: NextFunction
) {
  let status = err.statusCode ?? 500;
  let message = err.message ?? "Internal server error";
  const body: Record<string, unknown> = { error: message };

  if (err instanceof ZodError) {
    status = 400;
    body.error = "Validation failed";
    body.details = err.flatten().fieldErrors;
  } else if (err.details) {
    body.details = err.details;
  }
  res.status(status).json(body);
}
