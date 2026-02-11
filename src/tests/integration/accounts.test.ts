import request from 'supertest';
import { createApp } from '../../app';
import { prisma } from '../../db';

const app = createApp();
const describeApi = process.env.DATABASE_URL ? describe : describe.skip;

describeApi('Accounts', () => {
  let userId: string;
  let mainAccountId: string;

  beforeAll(async () => {
    const unique = `250788${Date.now().toString().slice(-6)}`;
    const user = await prisma.user.create({
      data: {
        phoneNumber: unique,
        fullName: 'Accounts Test User',
        kycStatus: 'PENDING',
      },
    });
    const account = await prisma.account.create({
      data: { userId: user.id, type: 'MAIN', currency: 'RWF' },
    });
    userId = user.id;
    mainAccountId = account.id;
  });

  afterAll(async () => {
    await prisma.account.deleteMany({ where: { userId } });
    await prisma.user.deleteMany({ where: { id: userId } });
  });

  it('GET /v1/accounts returns 401 without X-User-Id', async () => {
    const res = await request(app).get('/v1/accounts');
    expect(res.status).toBe(401);
  });

  it('GET /v1/accounts returns user accounts with balances', async () => {
    const res = await request(app).get('/v1/accounts').set('X-User-Id', userId);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.accounts)).toBe(true);
    expect(res.body.accounts.length).toBeGreaterThanOrEqual(1);
    const main = res.body.accounts.find((a: { type: string }) => a.type === 'MAIN');
    expect(main).toBeDefined();
    expect(main).toHaveProperty('balance');
  });

  it('POST /v1/accounts/pockets creates SAVINGS pocket', async () => {
    const res = await request(app)
      .post('/v1/accounts/pockets')
      .set('X-User-Id', userId)
      .send({ type: 'SAVINGS' });
    expect(res.status).toBe(201);
    expect(res.body.type).toBe('SAVINGS');
    expect(res.body.userId).toBe(userId);
  });

  it('GET /v1/accounts/:accountId/balance returns balance', async () => {
    const res = await request(app)
      .get(`/v1/accounts/${mainAccountId}/balance`)
      .set('X-User-Id', userId);
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      accountId: mainAccountId,
      currency: 'RWF',
    });
    expect(typeof res.body.balance).toBe('number');
  });

  it('GET /v1/accounts/:accountId/balance returns 404 for wrong account', async () => {
    const res = await request(app)
      .get('/v1/accounts/00000000-0000-0000-0000-000000000000/balance')
      .set('X-User-Id', userId);
    expect(res.status).toBe(404);
  });
});
