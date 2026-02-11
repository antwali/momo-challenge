import { prisma } from '../db';

export type HistoryFilters = {
  accountId: string;
  userId: string; // ensure account belongs to user
  fromDate?: string; // ISO date
  toDate?: string;
  type?: string;
  limit?: number;
  offset?: number;
};

/**
 * Transaction history for an account (statement).
 * Uses indexed (account_id, created_at) for efficient range scans.
 */
export async function getTransactionHistory(filters: HistoryFilters) {
  const account = await prisma.account.findFirst({
    where: { id: filters.accountId, userId: filters.userId },
  });
  if (!account) {
    throw new Error('Account not found.');
  }

  const from = filters.fromDate ? new Date(filters.fromDate) : undefined;
  const to = filters.toDate ? new Date(filters.toDate) : undefined;
  const limit = Math.min(filters.limit ?? 50, 100);
  const offset = filters.offset ?? 0;

  const where: {
    accountId: string;
    createdAt?: { gte?: Date; lte?: Date };
    transaction?: { type: string };
  } = { accountId: filters.accountId };
  if (from || to) {
    where.createdAt = {};
    if (from) where.createdAt.gte = from;
    if (to) where.createdAt.lte = to;
  }
  if (filters.type) {
    where.transaction = { type: filters.type };
  }

  const entries = await prisma.journalEntry.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: limit,
    skip: offset,
    include: {
      transaction: true,
      account: {
        select: {
          id: true,
          type: true,
          user: { select: { fullName: true, phoneNumber: true } },
        },
      },
    },
  });

  const byTransaction = new Map<
    string,
    { transaction: (typeof entries)[0]['transaction']; entries: typeof entries }
  >();
  for (const e of entries) {
    const list = byTransaction.get(e.transactionId) ?? {
      transaction: e.transaction,
      entries: [],
    };
    list.entries.push(e);
    byTransaction.set(e.transactionId, list);
  }

  const items = Array.from(byTransaction.values()).map(({ transaction, entries: es }) => {
    const myEntry = es.find((x) => x.accountId === filters.accountId)!;
    return {
      transactionId: transaction.id,
      type: transaction.type,
      status: transaction.status,
      amount: myEntry.amount.toNumber(),
      currency: myEntry.currency,
      createdAt: transaction.createdAt,
      metadata: transaction.metadata,
    };
  });

  return {
    accountId: filters.accountId,
    from: from?.toISOString(),
    to: to?.toISOString(),
    count: items.length,
    transactions: items,
  };
}
