import { Request, Response, NextFunction } from "express";
import { ZodSchema, ZodError } from "zod";

export function validateBody<T>(schema: ZodSchema<T>) {
  return (req: Request, _res: Response, next: NextFunction) => {
    try {
      req.body = schema.parse(req.body) as T;
      next();
    } catch (e) {
      if (e instanceof ZodError) {
        next({
          statusCode: 400,
          message: "Validation failed",
          details: e.flatten().fieldErrors,
        });
        return;
      }
      next(e);
    }
  };
}

export function getCurrentUserId(req: Request): string | null {
  return (req.headers["x-user-id"] as string) ?? null;
}
