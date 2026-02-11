import { prisma } from '../db';
import { getBalance } from './ledger';

const MAIN = 'MAIN';
const SAVINGS = 'SAVINGS';
const SCHOOL_FEES = 'SCHOOL_FEES';
const MERCHANT = 'MERCHANT';

export const accountTypes = [MAIN, SAVINGS, SCHOOL_FEES, MERCHANT] as const;

/**
 * Get or create main account for a user (used after register).
 */
export async function getOrCreateMainAccount(userId: string) {
  let account = await prisma.account.findFirst({
    where: { userId, type: MAIN },
  });
  if (!account) {
    account = await prisma.account.create({
      data: { userId, type: MAIN, currency: 'RWF' },
    });
  }
  return account;
}

/**
 * List accounts (pockets) for a user with balances.
 */
export async function listAccountsWithBalances(userId: string) {
  const accounts = await prisma.account.findMany({
    where: { userId },
    orderBy: { type: 'asc' },
  });
  const withBalances = await Promise.all(
    accounts.map(async (a) => ({
      ...a,
      balance: (await getBalance(a.id)).toNumber(),
    }))
  );
  return withBalances;
}

/**
 * Create a secondary pocket (e.g. SAVINGS, SCHOOL_FEES) for a user.
 */
export async function createPocket(userId: string, type: 'SAVINGS' | 'SCHOOL_FEES') {
  const existing = await prisma.account.findFirst({
    where: { userId, type },
  });
  if (existing) {
    throw new Error(`Pocket type ${type} already exists for this user.`);
  }
  return prisma.account.create({
    data: { userId, type, currency: 'RWF' },
  });
}
