import { Router } from 'express';
import { z } from 'zod';
import { getCurrentUserId } from '../middleware/validate';
import { listAccountsWithBalances, createPocket } from '../services/accounts';
import { getBalance } from '../services/ledger';

const router = Router();

router.get('/', async (req, res, next) => {
  try {
    const userId = getCurrentUserId(req);
    if (!userId) {
      return res.status(401).json({ error: 'X-User-Id header required' });
    }
    const accounts = await listAccountsWithBalances(userId);
    res.json({ accounts });
  } catch (e) {
    next(e);
  }
});

const createPocketSchema = z.object({
  type: z.enum(['SAVINGS', 'SCHOOL_FEES']),
});

router.post('/pockets', async (req, res, next) => {
  try {
    const userId = getCurrentUserId(req);
    if (!userId) {
      return res.status(401).json({ error: 'X-User-Id header required' });
    }
    const { type } = createPocketSchema.parse(req.body);
    const account = await createPocket(userId, type);
    res.status(201).json(account);
  } catch (e) {
    next(e);
  }
});

router.get('/:accountId/balance', async (req, res, next) => {
  try {
    const userId = getCurrentUserId(req);
    if (!userId) {
      return res.status(401).json({ error: 'X-User-Id header required' });
    }
    const { accountId } = req.params;
    const { prisma } = await import('../db');
    const account = await prisma.account.findFirst({
      where: { id: accountId, userId },
    });
    if (!account) {
      return res.status(404).json({ error: 'Account not found' });
    }
    const balance = await getBalance(account.id);
    res.json({
      accountId: account.id,
      balance: balance.toNumber(),
      currency: account.currency,
    });
  } catch (e) {
    next(e);
  }
});

export default router;
