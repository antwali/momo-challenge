import { prisma } from "../db";
import { getBalance, applyEntries } from "./ledger";
import { getOrCreateMainAccount } from "./accounts";
import { sendNotification } from "./notification";

export type CashInInput = {
  agentCode: string;
  userPhoneNumber: string;
  amount: number;
  idempotencyKey?: string;
};

/**
 * Agent gives physical cash; user receives digital balance (credit to main account).
 * Wrapped in DB transaction so balance update is atomic.
 */
export async function cashIn(input: CashInInput) {
  if (input.amount <= 0) {
    throw new Error("Amount must be positive.");
  }

  const agent = await prisma.agent.findUnique({
    where: { code: input.agentCode, status: "ACTIVE" },
  });
  if (!agent) {
    throw new Error("Invalid or inactive agent.");
  }

  const user = await prisma.user.findUnique({
    where: { phoneNumber: input.userPhoneNumber.replace(/\s+/g, "").trim() },
  });
  if (!user) {
    throw new Error("User not found.");
  }

  const account = await getOrCreateMainAccount(user.id);

  const result = await prisma.$transaction(async (tx) => {
    return applyEntries(
      tx as Parameters<typeof applyEntries>[0],
      {
        type: "CASH_IN",
        externalRef: input.idempotencyKey,
        metadata: { agentId: agent.id, agentCode: agent.code },
        entries: [{ accountId: account.id, amount: input.amount }],
      }
    );
  });

  const newBalance = await getBalance(account.id);

  await sendNotification({
    channel: "sms",
    to: user.phoneNumber,
    message: `You received ${input.amount} RWF. New balance: ${newBalance.toFixed(2)} RWF.`,
  }).catch(() => {});

  return {
    transactionId: result.transactionId,
    accountId: account.id,
    amount: input.amount,
    newBalance: newBalance.toNumber(),
  };
}
