import { Router } from 'express';
import { validateBody, getCurrentUserId } from '../middleware/validate';
import { register } from '../services/auth';
import { z } from 'zod';

const registerSchema = z.object({
  phoneNumber: z.string().min(9).max(20),
  fullName: z.string().min(1).max(200),
  gender: z.enum(['M', 'F', 'O']).optional(),
  dateOfBirth: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
});

const router = Router();

router.post('/register', validateBody(registerSchema), async (req, res, next) => {
  try {
    const result = await register(req.body);
    res.status(201).json(result);
  } catch (e) {
    next(e);
  }
});

export default router;
