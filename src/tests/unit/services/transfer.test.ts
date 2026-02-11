import { p2pTransfer, pocketTransfer } from '../../../services/transfer';
import { Decimal } from 'decimal.js';

const mockUserFindUnique = jest.fn();
const mockAccountFindFirst = jest.fn();
const mockTransaction = jest.fn();

jest.mock('../../../db', () => ({
  prisma: {
    user: { findUnique: (...args: unknown[]) => mockUserFindUnique(...args) },
    account: {
      findFirst: (...args: unknown[]) => mockAccountFindFirst(...args),
    },
    $transaction: (cb: (tx: unknown) => Promise<unknown>) => mockTransaction(cb),
  },
}));

const mockGetOrCreateMainAccount = jest.fn();
const mockGetBalance = jest.fn();
const mockApplyEntries = jest.fn();

jest.mock('../../../services/accounts', () => ({
  getOrCreateMainAccount: (...args: unknown[]) => mockGetOrCreateMainAccount(...args),
}));

jest.mock('../../../services/ledger', () => ({
  getBalance: (...args: unknown[]) => mockGetBalance(...args),
  applyEntries: (...args: unknown[]) => mockApplyEntries(...args),
}));

jest.mock('../../../services/notification', () => ({
  sendNotification: jest.fn().mockResolvedValue(undefined),
}));

const mockTx = {};

describe('p2pTransfer', () => {
  beforeEach(() => {
    mockUserFindUnique.mockReset();
    mockGetOrCreateMainAccount.mockReset();
    mockGetBalance.mockReset();
    mockApplyEntries.mockReset();
    mockTransaction.mockImplementation(async (cb: (tx: unknown) => Promise<unknown>) => cb(mockTx));
  });

  it('throws when amount <= 0', async () => {
    await expect(
      p2pTransfer({ fromUserId: 'u1', toPhoneNumber: '250788', amount: 0 })
    ).rejects.toThrow('Amount must be positive');
  });

  it('throws when recipient not found', async () => {
    mockUserFindUnique.mockResolvedValue(null);
    await expect(
      p2pTransfer({
        fromUserId: 'u1',
        toPhoneNumber: '250788999999',
        amount: 100,
      })
    ).rejects.toThrow('Recipient not found');
  });

  it('throws when transferring to self', async () => {
    mockUserFindUnique.mockResolvedValue({
      id: 'u1',
      phoneNumber: '250788123456',
    });
    await expect(
      p2pTransfer({
        fromUserId: 'u1',
        toPhoneNumber: '250788123456',
        amount: 100,
      })
    ).rejects.toThrow('Cannot transfer to yourself');
  });

  it('throws when insufficient balance', async () => {
    mockUserFindUnique.mockResolvedValue({
      id: 'u2',
      phoneNumber: '250788123457',
    });
    mockGetOrCreateMainAccount
      .mockResolvedValueOnce({ id: 'acc-sender' })
      .mockResolvedValueOnce({ id: 'acc-receiver' });
    mockGetBalance.mockResolvedValue(new Decimal(50));
    await expect(
      p2pTransfer({
        fromUserId: 'u1',
        toPhoneNumber: '250788123457',
        amount: 100,
      })
    ).rejects.toThrow('Insufficient balance');
    expect(mockApplyEntries).not.toHaveBeenCalled();
  });

  it('transfers and returns result', async () => {
    mockUserFindUnique
      .mockResolvedValueOnce({ id: 'u2', phoneNumber: '250788123457' })
      .mockResolvedValueOnce({ id: 'u1', fullName: 'Alice' })
      .mockResolvedValueOnce({ id: 'u2', fullName: 'Bob' });
    mockGetOrCreateMainAccount
      .mockResolvedValueOnce({ id: 'acc-sender' })
      .mockResolvedValueOnce({ id: 'acc-receiver' });
    mockGetBalance.mockResolvedValue(new Decimal(500));
    mockApplyEntries.mockResolvedValue({ transactionId: 'tx-1' });

    const result = await p2pTransfer({
      fromUserId: 'u1',
      toPhoneNumber: '250788123457',
      amount: 100,
    });

    expect(mockApplyEntries).toHaveBeenCalledWith(
      mockTx,
      expect.objectContaining({
        type: 'P2P',
        entries: [
          { accountId: 'acc-sender', amount: -100 },
          { accountId: 'acc-receiver', amount: 100 },
        ],
      })
    );
    expect(result).toMatchObject({
      transactionId: 'tx-1',
      fromAccountId: 'acc-sender',
      toAccountId: 'acc-receiver',
      amount: 100,
    });
  });
});

describe('pocketTransfer', () => {
  beforeEach(() => {
    mockAccountFindFirst.mockReset();
    mockGetBalance.mockReset();
    mockApplyEntries.mockReset();
    mockTransaction.mockImplementation(async (cb: (tx: unknown) => Promise<unknown>) => cb(mockTx));
  });

  it('throws when amount <= 0', async () => {
    await expect(
      pocketTransfer({
        fromUserId: 'u1',
        fromAccountId: 'acc-main',
        toAccountId: 'acc-savings',
        amount: 0,
      })
    ).rejects.toThrow('Amount must be positive');
  });

  it('throws when one or both accounts not found', async () => {
    mockAccountFindFirst.mockResolvedValueOnce({ id: 'acc-main' }).mockResolvedValueOnce(null);
    await expect(
      pocketTransfer({
        fromUserId: 'u1',
        fromAccountId: 'acc-main',
        toAccountId: 'acc-savings',
        amount: 100,
      })
    ).rejects.toThrow('One or both accounts not found');
  });

  it('throws when source and destination are the same', async () => {
    mockAccountFindFirst
      .mockResolvedValueOnce({ id: 'acc-1', type: 'MAIN' })
      .mockResolvedValueOnce({ id: 'acc-1', type: 'MAIN' });
    await expect(
      pocketTransfer({
        fromUserId: 'u1',
        fromAccountId: 'acc-1',
        toAccountId: 'acc-1',
        amount: 100,
      })
    ).rejects.toThrow('Source and destination must be different');
  });

  it('throws when insufficient balance', async () => {
    mockAccountFindFirst
      .mockResolvedValueOnce({ id: 'acc-main', type: 'MAIN' })
      .mockResolvedValueOnce({ id: 'acc-savings', type: 'SAVINGS' });
    mockGetBalance.mockResolvedValue(new Decimal(50));
    await expect(
      pocketTransfer({
        fromUserId: 'u1',
        fromAccountId: 'acc-main',
        toAccountId: 'acc-savings',
        amount: 100,
      })
    ).rejects.toThrow('Insufficient balance');
  });

  it('transfers between pockets and returns result', async () => {
    mockAccountFindFirst
      .mockResolvedValueOnce({ id: 'acc-main', type: 'MAIN' })
      .mockResolvedValueOnce({ id: 'acc-savings', type: 'SAVINGS' });
    mockGetBalance.mockResolvedValue(new Decimal(200));
    mockApplyEntries.mockResolvedValue({ transactionId: 'tx-1' });

    const result = await pocketTransfer({
      fromUserId: 'u1',
      fromAccountId: 'acc-main',
      toAccountId: 'acc-savings',
      amount: 100,
    });

    expect(result).toEqual({
      transactionId: 'tx-1',
      fromAccountId: 'acc-main',
      toAccountId: 'acc-savings',
      amount: 100,
    });
  });
});
