import request from 'supertest';
import { createApp } from '../../app';
import { prisma } from '../../db';

const app = createApp();
const describeApi = process.env.DATABASE_URL ? describe : describe.skip;

describeApi('Transactions', () => {
  let agentCode: string;
  let userAId: string;
  let userAPhone: string;
  let userBId: string;
  let userBPhone: string;
  let mainAId: string;
  let mainBId: string;

  beforeAll(async () => {
    const agent = await prisma.agent.upsert({
      where: { code: 'AGENT001' },
      create: { code: 'AGENT001', name: 'Test Agent', status: 'ACTIVE' },
      update: {},
    });
    agentCode = agent.code;

    const ts = Date.now().toString().slice(-8);
    userAPhone = `250788${ts}01`;
    userBPhone = `250788${ts}02`;

    const [userA, userB] = await Promise.all([
      prisma.user.create({
        data: {
          phoneNumber: userAPhone,
          fullName: 'User A',
          kycStatus: 'PENDING',
        },
      }),
      prisma.user.create({
        data: {
          phoneNumber: userBPhone,
          fullName: 'User B',
          kycStatus: 'PENDING',
        },
      }),
    ]);
    userAId = userA.id;
    userBId = userB.id;

    const [accA, accB] = await Promise.all([
      prisma.account.create({
        data: { userId: userAId, type: 'MAIN', currency: 'RWF' },
      }),
      prisma.account.create({
        data: { userId: userBId, type: 'MAIN', currency: 'RWF' },
      }),
    ]);
    mainAId = accA.id;
    mainBId = accB.id;
  });

  afterAll(async () => {
    if (!mainAId || !mainBId || !userAId || !userBId) return;
    await prisma.transaction.deleteMany({
      where: {
        journalEntries: { some: { accountId: { in: [mainAId, mainBId] } } },
      },
    });
    await prisma.account.deleteMany({
      where: { userId: { in: [userAId, userBId] } },
    });
    await prisma.user.deleteMany({ where: { id: { in: [userAId, userBId] } } });
  });

  it('POST /v1/transactions/cash-in credits user', async () => {
    const res = await request(app).post('/v1/transactions/cash-in').send({
      agentCode,
      userPhoneNumber: userAPhone,
      amount: 5000,
    });
    expect(res.status).toBe(201);
    expect(res.body.amount).toBe(5000);
    expect(res.body.newBalance).toBe(5000);
  });

  it('POST /v1/transactions/p2p requires X-User-Id', async () => {
    const res = await request(app)
      .post('/v1/transactions/p2p')
      .send({ toPhoneNumber: userBPhone, amount: 100 });
    expect(res.status).toBe(401);
  });

  it('POST /v1/transactions/p2p transfers to another user', async () => {
    const res = await request(app)
      .post('/v1/transactions/p2p')
      .set('X-User-Id', userAId)
      .send({ toPhoneNumber: userBPhone, amount: 1000 });
    expect(res.status).toBe(201);
    expect(res.body.amount).toBe(1000);
  });

  it('POST /v1/transactions/p2p rejects insufficient balance', async () => {
    const res = await request(app)
      .post('/v1/transactions/p2p')
      .set('X-User-Id', userAId)
      .send({ toPhoneNumber: userBPhone, amount: 1e9 });
    expect(res.status).toBe(500);
    expect(res.body.error).toContain('Insufficient');
  });

  it('GET /v1/transactions/history returns statement', async () => {
    const res = await request(app)
      .get(`/v1/transactions/history?accountId=${mainAId}`)
      .set('X-User-Id', userAId);
    expect(res.status).toBe(200);
    expect(res.body.accountId).toBe(mainAId);
    expect(Array.isArray(res.body.transactions)).toBe(true);
    expect(res.body.transactions.length).toBeGreaterThanOrEqual(2); // cash-in + p2p
  });
});
