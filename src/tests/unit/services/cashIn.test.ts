import { cashIn } from '../../../services/cashIn';
import { Decimal } from 'decimal.js';

const mockAgentFindUnique = jest.fn();
const mockUserFindUnique = jest.fn();
const mockTransaction = jest.fn();

jest.mock('../../../db', () => ({
  prisma: {
    agent: { findUnique: (...args: unknown[]) => mockAgentFindUnique(...args) },
    user: { findUnique: (...args: unknown[]) => mockUserFindUnique(...args) },
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

describe('cashIn', () => {
  const mockTx = {};
  beforeEach(() => {
    mockAgentFindUnique.mockReset();
    mockUserFindUnique.mockReset();
    mockGetOrCreateMainAccount.mockReset();
    mockGetBalance.mockReset();
    mockApplyEntries.mockReset();
    mockTransaction.mockImplementation(async (cb: (tx: unknown) => Promise<unknown>) => cb(mockTx));
  });

  it('throws when amount <= 0', async () => {
    await expect(cashIn({ agentCode: 'A1', userPhoneNumber: '250788', amount: 0 })).rejects.toThrow(
      'Amount must be positive'
    );
    await expect(
      cashIn({ agentCode: 'A1', userPhoneNumber: '250788', amount: -1 })
    ).rejects.toThrow('Amount must be positive');
    expect(mockAgentFindUnique).not.toHaveBeenCalled();
  });

  it('throws when agent invalid or inactive', async () => {
    mockAgentFindUnique.mockResolvedValue(null);
    await expect(
      cashIn({
        agentCode: 'BAD',
        userPhoneNumber: '250788123456',
        amount: 100,
      })
    ).rejects.toThrow('Invalid or inactive agent');
    expect(mockUserFindUnique).not.toHaveBeenCalled();
  });

  it('throws when user not found', async () => {
    mockAgentFindUnique.mockResolvedValue({ id: 'agent-1', code: 'A1' });
    mockUserFindUnique.mockResolvedValue(null);
    await expect(
      cashIn({ agentCode: 'A1', userPhoneNumber: '250788999999', amount: 100 })
    ).rejects.toThrow('User not found');
    expect(mockGetOrCreateMainAccount).not.toHaveBeenCalled();
  });

  it('credits account and returns result', async () => {
    mockAgentFindUnique.mockResolvedValue({ id: 'agent-1', code: 'A1' });
    mockUserFindUnique.mockResolvedValue({
      id: 'user-1',
      phoneNumber: '250788123456',
    });
    mockGetOrCreateMainAccount.mockResolvedValue({ id: 'acc-1' });
    mockApplyEntries.mockResolvedValue({ transactionId: 'tx-1' });
    mockGetBalance.mockResolvedValue(new Decimal(5100));

    const result = await cashIn({
      agentCode: 'A1',
      userPhoneNumber: '  250788123456  ',
      amount: 5000,
    });

    expect(mockTransaction).toHaveBeenCalled();
    expect(mockApplyEntries).toHaveBeenCalledWith(
      mockTx,
      expect.objectContaining({
        type: 'CASH_IN',
        entries: [{ accountId: 'acc-1', amount: 5000 }],
        metadata: { agentId: 'agent-1', agentCode: 'A1' },
      })
    );
    expect(result).toEqual({
      transactionId: 'tx-1',
      accountId: 'acc-1',
      amount: 5000,
      newBalance: 5100,
    });
  });
});
