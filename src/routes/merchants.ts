import { Router } from 'express';
import { z } from 'zod';
import { validateBody } from '../middleware/validate';
import { onboardMerchant } from '../services/merchantOnboard';

const router = Router();

const onboardSchema = z.object({
  phoneNumber: z.string().min(9),
  businessName: z.string().min(1),
  categoryCode: z.string().min(1),
});

router.post('/onboard', validateBody(onboardSchema), async (req, res, next) => {
  try {
    const result = await onboardMerchant(req.body);
    res.status(201).json(result);
  } catch (e) {
    next(e);
  }
});

export default router;
