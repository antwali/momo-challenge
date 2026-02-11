import { Request, Response } from "express";
import { z } from "zod";
import { ZodError } from "zod";
import { errorHandler } from "../../../middleware/errorHandler";

function mockRes() {
  const res = { status: jest.fn().mockReturnThis(), json: jest.fn() } as unknown as Response;
  return res;
}

describe("errorHandler", () => {
  const req = {} as Request;

  it("sends 500 and message for generic Error", () => {
    const res = mockRes();
    errorHandler(new Error("Unexpected error occured"), req, res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: "Unexpected error occured" });
  });

  it("sends 500 when error has no message", () => {
    const res = mockRes();
    errorHandler(Object.assign(new Error(), { message: undefined }), req, res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: "Internal server error" }));
  });

  it("sends custom statusCode when present on error", () => {
    const res = mockRes();
    const err = new Error("Bad request") as Error & { statusCode?: number };
    err.statusCode = 400;
    errorHandler(err, req, res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: "Bad request" });
  });

  it("sends 400 and details for ZodError", () => {
    const res = mockRes();
    let zodErr: ZodError;
    try {
      z.object({ name: z.string() }).parse({ name: 123 });
    } catch (e) {
      zodErr = e as ZodError;
    }
    errorHandler(zodErr!, req, res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: "Validation failed",
        details: expect.any(Object),
      })
    );
  });

  it("includes err.details in body when not ZodError", () => {
    const res = mockRes();
    const err = new Error("Nope") as Error & { statusCode?: number; details?: unknown };
    err.statusCode = 422;
    err.details = { field: ["invalid"] };
    errorHandler(err, req, res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(422);
    expect(res.json).toHaveBeenCalledWith({ error: "Nope", details: { field: ["invalid"] } });
  });
});
