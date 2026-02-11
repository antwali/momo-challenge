import { Decimal } from "decimal.js";
import { prisma } from "../db";

/** Type of the client passed into prisma.$transaction(callback) */
type TransactionClient = Parameters<Parameters<typeof prisma.$transaction>[0]>[0];

const CURRENCY = "RWF";

export type LedgerEntry = {
  accountId: string;
  amount: number; // positive = credit, negative = debit
  currency?: string;
};

/**
 * Get current balance for an account (sum of all journal entries).
 * Uses indexed (account_id, created_at) for efficient history; aggregate is still fast with index.
 */
export async function getBalance(accountId: string): Promise<Decimal> {
  const result = await prisma.journalEntry.aggregate({
    _sum: { amount: true },
    where: { accountId },
  });
  const sum = result._sum.amount;
  return sum != null ? new Decimal(sum) : new Decimal(0);
}

/**
 * Apply a set of ledger entries in a single DB transaction (double-entry: sum must be 0).
 * Used for cash-in, p2p, pocket transfer, merchant pay.
 */
export async function applyEntries(
  tx: TransactionClient,
  params: {
    type: string;
    entries: LedgerEntry[];
    externalRef?: string;
    metadata?: Record<string, unknown>;
  }
): Promise<{ transactionId: string }> {
  const { type, entries, externalRef, metadata } = params;
  const sum = entries.reduce((acc, e) => acc + e.amount, 0);
  if (Math.abs(sum) > 1e-9) {
    throw new Error("Ledger entries must sum to zero (double-entry).");
  }

  const transaction = await tx.transaction.create({
    data: {
      externalRef: externalRef ?? undefined,
      type,
      status: "COMPLETED",
      metadata: metadata ? JSON.parse(JSON.stringify(metadata)) : undefined,
      completedAt: new Date(),
    },
  });

  await tx.journalEntry.createMany({
    data: entries.map((e) => ({
      transactionId: transaction.id,
      accountId: e.accountId,
      amount: new Decimal(e.amount),
      currency: e.currency ?? CURRENCY,
    })),
  });

  return { transactionId: transaction.id };
}
