import { prisma } from "../db";
import { getBalance, applyEntries } from "./ledger";
import { getOrCreateMainAccount } from "./accounts";
import { sendNotification } from "./notification";

export type P2PInput = {
  fromUserId: string;
  toPhoneNumber: string;
  amount: number;
  idempotencyKey?: string;
};

/**
 * P2P transfer: debit sender main account, credit receiver main account.
 * Double-entry in one transaction; rolls back on any failure (e.g. insufficient balance).
 */
export async function p2pTransfer(input: P2PInput) {
  if (input.amount <= 0) {
    throw new Error("Amount must be positive.");
  }

  const toUser = await prisma.user.findUnique({
    where: { phoneNumber: input.toPhoneNumber.replace(/\s+/g, "").trim() },
  });
  if (!toUser) {
    throw new Error("Recipient not found.");
  }
  if (toUser.id === input.fromUserId) {
    throw new Error("Cannot transfer to yourself.");
  }

  const senderAccount = await getOrCreateMainAccount(input.fromUserId);
  const receiverAccount = await getOrCreateMainAccount(toUser.id);

  const result = await prisma.$transaction(async (tx) => {
    const balance = await getBalance(senderAccount.id);
    if (balance.lt(input.amount)) {
      throw new Error("Insufficient balance.");
    }
    return applyEntries(
      tx as Parameters<typeof applyEntries>[0],
      {
        type: "P2P",
        externalRef: input.idempotencyKey,
        metadata: {},
        entries: [
          { accountId: senderAccount.id, amount: -input.amount },
          { accountId: receiverAccount.id, amount: input.amount },
        ],
      }
    );
  });

  const [sender, receiver] = await Promise.all([
    prisma.user.findUnique({ where: { id: input.fromUserId } }),
    prisma.user.findUnique({ where: { id: toUser.id } }),
  ]);

  await sendNotification({
    channel: "sms",
    to: toUser.phoneNumber,
    message: `You received ${input.amount} RWF from ${sender?.fullName ?? "a user"}.`,
  }).catch(() => {});

  return {
    transactionId: result.transactionId,
    fromAccountId: senderAccount.id,
    toAccountId: receiverAccount.id,
    amount: input.amount,
    receiverName: receiver?.fullName,
  };
}

export type PocketTransferInput = {
  fromUserId: string;
  fromAccountId: string;
  toAccountId: string;
  amount: number;
  idempotencyKey?: string;
};

/**
 * Move money from one pocket to another (e.g. Main -> Savings).
 * Both accounts must belong to the same user.
 */
export async function pocketTransfer(input: PocketTransferInput) {
  if (input.amount <= 0) {
    throw new Error("Amount must be positive.");
  }

  const [fromAcc, toAcc] = await Promise.all([
    prisma.account.findFirst({
      where: { id: input.fromAccountId, userId: input.fromUserId },
    }),
    prisma.account.findFirst({
      where: { id: input.toAccountId, userId: input.fromUserId },
    }),
  ]);

  if (!fromAcc || !toAcc) {
    throw new Error("One or both accounts not found or do not belong to you.");
  }
  if (fromAcc.id === toAcc.id) {
    throw new Error("Source and destination must be different.");
  }

  const result = await prisma.$transaction(async (tx) => {
    const balance = await getBalance(fromAcc.id);
    if (balance.lt(input.amount)) {
      throw new Error("Insufficient balance.");
    }
    return applyEntries(
      tx as Parameters<typeof applyEntries>[0],
      {
        type: "POCKET_TRANSFER",
        externalRef: input.idempotencyKey,
        metadata: { fromType: fromAcc.type, toType: toAcc.type },
        entries: [
          { accountId: fromAcc.id, amount: -input.amount },
          { accountId: toAcc.id, amount: input.amount },
        ],
      }
    );
  });

  return {
    transactionId: result.transactionId,
    fromAccountId: fromAcc.id,
    toAccountId: toAcc.id,
    amount: input.amount,
  };
}
