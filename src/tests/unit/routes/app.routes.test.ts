/**
 * Covers route handler success paths (res.json, res.status(201)) by mocking services.
 * Must mock before createApp is imported so routes receive mocked dependencies.
 */
import request from 'supertest';

const mockListAccountsWithBalances = jest.fn();
const mockCreatePocket = jest.fn();
const mockGetBalance = jest.fn();
const mockRegister = jest.fn();
const mockCashIn = jest.fn();
const mockP2pTransfer = jest.fn();
const mockPocketTransfer = jest.fn();
const mockMerchantPay = jest.fn();
const mockGetTransactionHistory = jest.fn();
const mockOnboardMerchant = jest.fn();

jest.mock('../../../services/accounts', () => ({
  listAccountsWithBalances: (...args: unknown[]) => mockListAccountsWithBalances(...args),
  createPocket: (...args: unknown[]) => mockCreatePocket(...args),
}));

jest.mock('../../../services/ledger', () => ({
  getBalance: (...args: unknown[]) => mockGetBalance(...args),
}));

jest.mock('../../../services/auth', () => ({
  register: (...args: unknown[]) => mockRegister(...args),
}));

jest.mock('../../../services/cashIn', () => ({
  cashIn: (...args: unknown[]) => mockCashIn(...args),
}));

jest.mock('../../../services/transfer', () => ({
  p2pTransfer: (...args: unknown[]) => mockP2pTransfer(...args),
  pocketTransfer: (...args: unknown[]) => mockPocketTransfer(...args),
}));

jest.mock('../../../services/merchant', () => ({
  merchantPay: (...args: unknown[]) => mockMerchantPay(...args),
}));

jest.mock('../../../services/history', () => ({
  getTransactionHistory: (...args: unknown[]) => mockGetTransactionHistory(...args),
}));

jest.mock('../../../services/merchantOnboard', () => ({
  onboardMerchant: (...args: unknown[]) => mockOnboardMerchant(...args),
}));

const mockAccountFindFirst = jest.fn();
jest.mock('../../../db', () => ({
  prisma: {
    account: {
      findFirst: (...args: unknown[]) => mockAccountFindFirst(...args),
    },
  },
}));

import { createApp } from '../../../app';

const app = createApp();
const userId = '00000000-0000-0000-0000-000000000001';
const accountId = '00000000-0000-0000-0000-000000000002';

describe('routes success paths', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('GET /v1/accounts returns 200 with accounts from listAccountsWithBalances', async () => {
    mockListAccountsWithBalances.mockResolvedValue([{ id: accountId, type: 'MAIN', balance: 100 }]);
    const res = await request(app).get('/v1/accounts').set('X-User-Id', userId);
    expect(res.status).toBe(200);
    expect(res.body.accounts).toHaveLength(1);
    expect(mockListAccountsWithBalances).toHaveBeenCalledWith(userId);
  });

  it('POST /v1/accounts/pockets returns 201 with created pocket', async () => {
    mockCreatePocket.mockResolvedValue({
      id: accountId,
      type: 'SAVINGS',
      userId,
    });
    const res = await request(app)
      .post('/v1/accounts/pockets')
      .set('X-User-Id', userId)
      .send({ type: 'SAVINGS' });
    expect(res.status).toBe(201);
    expect(res.body.type).toBe('SAVINGS');
    expect(mockCreatePocket).toHaveBeenCalledWith(userId, 'SAVINGS');
  });

  it('GET /v1/accounts/:accountId/balance returns 200 with balance', async () => {
    mockAccountFindFirst.mockResolvedValue({ id: accountId, currency: 'RWF' });
    mockGetBalance.mockResolvedValue({ toNumber: () => 500 });
    const res = await request(app)
      .get(`/v1/accounts/${accountId}/balance`)
      .set('X-User-Id', userId);
    expect(res.status).toBe(200);
    expect(res.body.balance).toBe(500);
    expect(res.body.currency).toBe('RWF');
  });

  it('POST /v1/auth/register returns 201 with user and mainAccountId', async () => {
    mockRegister.mockResolvedValue({
      user: { id: userId, phoneNumber: '250788123456', fullName: 'Alice' },
      mainAccountId: accountId,
    });
    const res = await request(app).post('/v1/auth/register').send({
      phoneNumber: '250788123456',
      fullName: 'Alice',
    });
    expect(res.status).toBe(201);
    expect(res.body.mainAccountId).toBe(accountId);
    expect(mockRegister).toHaveBeenCalled();
  });

  it('POST /v1/transactions/cash-in returns 201', async () => {
    mockCashIn.mockResolvedValue({ transactionId: 'tx-1', amount: 1000 });
    const res = await request(app).post('/v1/transactions/cash-in').send({
      agentCode: 'AGENT001',
      userPhoneNumber: '250788123456',
      amount: 1000,
    });
    expect(res.status).toBe(201);
    expect(res.body.transactionId).toBe('tx-1');
  });

  it('POST /v1/transactions/p2p returns 201', async () => {
    mockP2pTransfer.mockResolvedValue({ transactionId: 'tx-1', amount: 100 });
    const res = await request(app)
      .post('/v1/transactions/p2p')
      .set('X-User-Id', userId)
      .send({ toPhoneNumber: '250788999999', amount: 100 });
    expect(res.status).toBe(201);
    expect(mockP2pTransfer).toHaveBeenCalledWith(
      expect.objectContaining({ fromUserId: userId, amount: 100 })
    );
  });

  it('POST /v1/transactions/pocket-transfer returns 201', async () => {
    mockPocketTransfer.mockResolvedValue({ transactionId: 'tx-1' });
    const fromAcc = '10000000-0000-0000-0000-000000000001';
    const toAcc = '20000000-0000-0000-0000-000000000002';
    const res = await request(app)
      .post('/v1/transactions/pocket-transfer')
      .set('X-User-Id', userId)
      .send({ fromAccountId: fromAcc, toAccountId: toAcc, amount: 50 });
    expect(res.status).toBe(201);
    expect(mockPocketTransfer).toHaveBeenCalledWith(
      expect.objectContaining({ fromUserId: userId, amount: 50 })
    );
  });

  it('POST /v1/transactions/merchant returns 201', async () => {
    mockMerchantPay.mockResolvedValue({
      transactionId: 'tx-1',
      category: 'GROCERIES',
    });
    const merchantAcc = '30000000-0000-0000-0000-000000000003';
    const res = await request(app)
      .post('/v1/transactions/merchant')
      .set('X-User-Id', userId)
      .send({ merchantAccountId: merchantAcc, amount: 200 });
    expect(res.status).toBe(201);
    expect(res.body.category).toBe('GROCERIES');
  });

  it('GET /v1/transactions/history returns 200 with result from getTransactionHistory', async () => {
    mockGetTransactionHistory.mockResolvedValue({
      accountId,
      transactions: [],
      count: 0,
    });
    const res = await request(app)
      .get(`/v1/transactions/history?accountId=${accountId}`)
      .set('X-User-Id', userId);
    expect(res.status).toBe(200);
    expect(res.body.accountId).toBe(accountId);
    expect(mockGetTransactionHistory).toHaveBeenCalledWith(
      expect.objectContaining({ accountId, userId })
    );
  });

  it('POST /v1/merchants/onboard returns 201', async () => {
    mockOnboardMerchant.mockResolvedValue({
      userId,
      accountId,
      merchantProfileId: 'profile-1',
      categoryCode: 'GROCERIES',
    });
    const res = await request(app).post('/v1/merchants/onboard').send({
      phoneNumber: '250788111111',
      businessName: 'Store',
      categoryCode: 'GROCERIES',
    });
    expect(res.status).toBe(201);
    expect(res.body.categoryCode).toBe('GROCERIES');
  });
});
