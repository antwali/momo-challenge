import { register } from '../../../services/auth';

const mockFindUnique = jest.fn();
const mockCreate = jest.fn();

jest.mock('../../../db', () => ({
  prisma: {
    user: {
      findUnique: (...args: unknown[]) => mockFindUnique(...args),
      create: (...args: unknown[]) => mockCreate(...args),
    },
  },
}));

const mockGetOrCreateMainAccount = jest.fn();
jest.mock('../../../services/accounts', () => ({
  getOrCreateMainAccount: (...args: unknown[]) => mockGetOrCreateMainAccount(...args),
}));

jest.mock('../../../services/notification', () => ({
  sendNotification: jest.fn().mockResolvedValue(undefined),
}));

describe('auth register', () => {
  beforeEach(() => {
    mockFindUnique.mockReset();
    mockCreate.mockReset();
    mockGetOrCreateMainAccount.mockReset();
  });

  it('throws when phone number already exists', async () => {
    mockFindUnique.mockResolvedValue({
      id: 'user-1',
      phoneNumber: '250788111111',
    });
    await expect(register({ phoneNumber: '250788111111', fullName: 'Test' })).rejects.toThrow(
      'User with this phone number already exists.'
    );
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it('normalizes phone (trims whitespace)', async () => {
    mockFindUnique.mockResolvedValue(null);
    mockCreate.mockResolvedValue({
      id: 'user-new',
      phoneNumber: '250788123456',
      fullName: 'Alice',
      gender: null,
      dateOfBirth: null,
      kycStatus: 'PENDING',
    });
    mockGetOrCreateMainAccount.mockResolvedValue({ id: 'acc-1' });
    await register({ phoneNumber: '  250788123456  ', fullName: 'Alice' });
    expect(mockFindUnique).toHaveBeenCalledWith({
      where: { phoneNumber: '250788123456' },
    });
  });

  it('returns user and mainAccountId when registration succeeds', async () => {
    mockFindUnique.mockResolvedValue(null);
    const user = {
      id: 'user-new',
      phoneNumber: '250788123456',
      fullName: 'Alice',
      gender: 'F',
      dateOfBirth: new Date('1990-05-15'),
      kycStatus: 'PENDING',
    };
    mockCreate.mockResolvedValue(user);
    mockGetOrCreateMainAccount.mockResolvedValue({ id: 'acc-main' });
    const result = await register({
      phoneNumber: '250788123456',
      fullName: 'Alice',
      gender: 'F',
      dateOfBirth: '1990-05-15',
    });
    expect(result.user).toMatchObject({
      phoneNumber: '250788123456',
      fullName: 'Alice',
      gender: 'F',
      kycStatus: 'PENDING',
    });
    expect(result.mainAccountId).toBe('acc-main');
  });
});
