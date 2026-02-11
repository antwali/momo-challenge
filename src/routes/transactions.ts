import { Router } from 'express';
import { z } from 'zod';
import { validateBody, getCurrentUserId } from '../middleware/validate';
import { cashIn } from '../services/cashIn';
import { p2pTransfer, pocketTransfer } from '../services/transfer';
import { merchantPay } from '../services/merchant';
import { getTransactionHistory } from '../services/history';

const router = Router();

const idempotencyKey = () => z.string().uuid().optional();

const cashInSchema = z.object({
  agentCode: z.string().min(1),
  userPhoneNumber: z.string().min(9),
  amount: z.number().positive(),
  idempotencyKey: idempotencyKey(),
});

router.post('/cash-in', validateBody(cashInSchema), async (req, res, next) => {
  try {
    const result = await cashIn(req.body);
    res.status(201).json(result);
  } catch (e) {
    next(e);
  }
});

const p2pSchema = z.object({
  toPhoneNumber: z.string().min(9),
  amount: z.number().positive(),
  idempotencyKey: idempotencyKey(),
});

router.post('/p2p', async (req, res, next) => {
  try {
    const userId = getCurrentUserId(req);
    if (!userId) {
      return res.status(401).json({ error: 'X-User-Id header required' });
    }
    const body = p2pSchema.parse(req.body);
    const result = await p2pTransfer({ ...body, fromUserId: userId });
    res.status(201).json(result);
  } catch (e) {
    next(e);
  }
});

const pocketTransferSchema = z.object({
  fromAccountId: z.string().uuid(),
  toAccountId: z.string().uuid(),
  amount: z.number().positive(),
  idempotencyKey: idempotencyKey(),
});

router.post('/pocket-transfer', async (req, res, next) => {
  try {
    const userId = getCurrentUserId(req);
    if (!userId) {
      return res.status(401).json({ error: 'X-User-Id header required' });
    }
    const body = pocketTransferSchema.parse(req.body);
    const result = await pocketTransfer({
      ...body,
      fromUserId: userId,
    });
    res.status(201).json(result);
  } catch (e) {
    next(e);
  }
});

const merchantPaySchema = z.object({
  merchantAccountId: z.string().uuid(),
  amount: z.number().positive(),
  idempotencyKey: idempotencyKey(),
});

router.post('/merchant', async (req, res, next) => {
  try {
    const userId = getCurrentUserId(req);
    if (!userId) {
      return res.status(401).json({ error: 'X-User-Id header required' });
    }
    const body = merchantPaySchema.parse(req.body);
    const result = await merchantPay({ ...body, fromUserId: userId });
    res.status(201).json(result);
  } catch (e) {
    next(e);
  }
});

const historyQuerySchema = z.object({
  accountId: z.string().uuid(),
  fromDate: z.string().optional(),
  toDate: z.string().optional(),
  type: z.string().optional(),
  limit: z.coerce.number().min(1).max(100).optional(),
  offset: z.coerce.number().min(0).optional(),
});

router.get('/history', async (req, res, next) => {
  try {
    const userId = getCurrentUserId(req);
    if (!userId) {
      return res.status(401).json({ error: 'X-User-Id header required' });
    }
    const q = historyQuerySchema.parse(req.query);
    const result = await getTransactionHistory({
      ...q,
      userId,
    });
    res.json(result);
  } catch (e) {
    next(e);
  }
});

export default router;
