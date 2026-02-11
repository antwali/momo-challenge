import { prisma } from '../db';
import { getBalance, applyEntries } from './ledger';
import { getOrCreateMainAccount } from './accounts';
import { sendNotification } from './notification';

export type MerchantPayInput = {
  fromUserId: string;
  merchantAccountId: string;
  amount: number;
  idempotencyKey?: string;
};

/**
 * Pay a merchant (transfer from user main to merchant account).
 * Merchant account must exist and have a merchant profile with category (for analytics).
 */
export async function merchantPay(input: MerchantPayInput) {
  if (input.amount <= 0) {
    throw new Error('Amount must be positive.');
  }

  const merchantAccount = await prisma.account.findFirst({
    where: { id: input.merchantAccountId, type: 'MERCHANT' },
    include: {
      merchantProfile: { include: { category: true } },
      user: { select: { phoneNumber: true } },
    },
  });
  const profile = merchantAccount?.merchantProfile;
  if (!merchantAccount || !profile) {
    throw new Error('Merchant account not found.');
  }

  const senderAccount = await getOrCreateMainAccount(input.fromUserId);

  const result = await prisma.$transaction(async (tx) => {
    const balance = await getBalance(senderAccount.id);
    if (balance.lt(input.amount)) {
      throw new Error('Insufficient balance.');
    }
    return applyEntries(tx as Parameters<typeof applyEntries>[0], {
      type: 'MERCHANT_PAY',
      externalRef: input.idempotencyKey,
      metadata: {
        merchantAccountId: merchantAccount.id,
        categoryCode: profile.category.code,
        categoryName: profile.category.name,
      },
      entries: [
        { accountId: senderAccount.id, amount: -input.amount },
        { accountId: merchantAccount.id, amount: input.amount },
      ],
    });
  });

  const merchantPhone = merchantAccount.user?.phoneNumber;
  if (merchantPhone) {
    await sendNotification({
      channel: 'sms',
      to: merchantPhone,
      message: `Payment received: ${input.amount} RWF.`,
    }).catch(() => {});
  }

  return {
    transactionId: result.transactionId,
    fromAccountId: senderAccount.id,
    merchantAccountId: merchantAccount.id,
    amount: input.amount,
    category: profile.category.code,
  };
}
