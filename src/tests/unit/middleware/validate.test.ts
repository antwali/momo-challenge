import { Request, Response } from 'express';
import { z } from 'zod';
import { validateBody, getCurrentUserId } from '../../../middleware/validate';

describe('validateBody', () => {
  const schema = z.object({
    name: z.string().min(1),
    count: z.number().int().positive(),
  });

  it('parses valid body and calls next()', () => {
    const middleware = validateBody(schema);
    const req = { body: { name: 'Alice', count: 5 } } as Request;
    const res = {} as Response;
    const next = jest.fn();
    middleware(req, res, next);
    expect(next).toHaveBeenCalledWith();
    expect(req.body).toEqual({ name: 'Alice', count: 5 });
  });

  it('calls next with 400 and details on invalid body', () => {
    const middleware = validateBody(schema);
    const req = { body: { name: '', count: -1 } } as Request;
    const res = {} as Response;
    const next = jest.fn();
    middleware(req, res, next);
    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 400,
        message: 'Validation failed',
        details: expect.any(Object),
      })
    );
  });

  it('calls next(e) for non-ZodError from schema', () => {
    const schemaThatThrows = z.string().transform(() => {
      throw new Error('Custom error');
    });
    const middleware = validateBody(z.object({ x: schemaThatThrows }));
    const req = { body: { x: 'any' } } as Request;
    const next = jest.fn();
    middleware(req, {} as Response, next);
    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });
});

describe('getCurrentUserId', () => {
  it('returns x-user-id header when present', () => {
    const req = { headers: { 'x-user-id': 'user-123' } } as unknown as Request;
    expect(getCurrentUserId(req)).toBe('user-123');
  });

  it('returns null when header missing', () => {
    const req = { headers: {} } as unknown as Request;
    expect(getCurrentUserId(req)).toBeNull();
  });
});
