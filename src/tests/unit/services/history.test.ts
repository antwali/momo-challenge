import { getTransactionHistory } from '../../../services/history';

const mockAccountFindFirst = jest.fn();
const mockJournalEntryFindMany = jest.fn();

jest.mock('../../../db', () => ({
  prisma: {
    account: {
      findFirst: (...args: unknown[]) => mockAccountFindFirst(...args),
    },
    journalEntry: {
      findMany: (...args: unknown[]) => mockJournalEntryFindMany(...args),
    },
  },
}));

describe('history getTransactionHistory', () => {
  beforeEach(() => {
    mockAccountFindFirst.mockReset();
    mockJournalEntryFindMany.mockReset();
  });

  it('throws when account not found or not owned by user', async () => {
    mockAccountFindFirst.mockResolvedValue(null);
    await expect(getTransactionHistory({ accountId: 'acc-1', userId: 'user-1' })).rejects.toThrow(
      'Account not found.'
    );
    expect(mockJournalEntryFindMany).not.toHaveBeenCalled();
  });

  it('returns transactions shape when account exists', async () => {
    mockAccountFindFirst.mockResolvedValue({ id: 'acc-1', userId: 'user-1' });
    mockJournalEntryFindMany.mockResolvedValue([
      {
        id: 'e1',
        accountId: 'acc-1',
        amount: { toNumber: () => -100 },
        currency: 'RWF',
        transactionId: 'tx-1',
        transaction: { id: 'tx-1', type: 'P2P', status: 'COMPLETED' },
        account: {},
      },
    ]);
    const result = await getTransactionHistory({
      accountId: 'acc-1',
      userId: 'user-1',
    });
    expect(result.accountId).toBe('acc-1');
    expect(result.transactions).toHaveLength(1);
    expect(result.transactions[0]).toMatchObject({
      transactionId: 'tx-1',
      type: 'P2P',
      status: 'COMPLETED',
      amount: -100,
    });
  });

  it('builds where with fromDate and toDate when provided', async () => {
    mockAccountFindFirst.mockResolvedValue({ id: 'acc-1', userId: 'user-1' });
    mockJournalEntryFindMany.mockResolvedValue([]);
    await getTransactionHistory({
      accountId: 'acc-1',
      userId: 'user-1',
      fromDate: '2025-01-01',
      toDate: '2025-01-31',
    });
    expect(mockJournalEntryFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          accountId: 'acc-1',
          createdAt: {
            gte: new Date('2025-01-01'),
            lte: new Date('2025-01-31'),
          },
        }),
      })
    );
  });

  it('builds where with transaction type when provided', async () => {
    mockAccountFindFirst.mockResolvedValue({ id: 'acc-1', userId: 'user-1' });
    mockJournalEntryFindMany.mockResolvedValue([]);
    await getTransactionHistory({
      accountId: 'acc-1',
      userId: 'user-1',
      type: 'P2P',
    });
    expect(mockJournalEntryFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          accountId: 'acc-1',
          transaction: { type: 'P2P' },
        }),
      })
    );
  });

  it('respects limit and offset', async () => {
    mockAccountFindFirst.mockResolvedValue({ id: 'acc-1', userId: 'user-1' });
    mockJournalEntryFindMany.mockResolvedValue([]);
    await getTransactionHistory({
      accountId: 'acc-1',
      userId: 'user-1',
      limit: 10,
      offset: 5,
    });
    expect(mockJournalEntryFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 10, skip: 5 })
    );
  });
});
