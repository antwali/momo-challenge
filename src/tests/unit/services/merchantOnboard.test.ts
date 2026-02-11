import { onboardMerchant } from '../../../services/merchantOnboard';

const mockCategoryFindUnique = jest.fn();
const mockUserFindUnique = jest.fn();
const mockUserUpsert = jest.fn();
const mockAccountCreate = jest.fn();
const mockProfileCreate = jest.fn();

jest.mock('../../../db', () => ({
  prisma: {
    merchantCategory: {
      findUnique: (...args: unknown[]) => mockCategoryFindUnique(...args),
    },
    user: {
      findUnique: (...args: unknown[]) => mockUserFindUnique(...args),
      upsert: (...args: unknown[]) => mockUserUpsert(...args),
    },
    account: { create: (...args: unknown[]) => mockAccountCreate(...args) },
    merchantProfile: {
      create: (...args: unknown[]) => mockProfileCreate(...args),
    },
  },
}));

describe('merchantOnboard onboardMerchant', () => {
  beforeEach(() => {
    mockCategoryFindUnique.mockReset();
    mockUserFindUnique.mockReset();
    mockUserUpsert.mockReset();
    mockAccountCreate.mockReset();
    mockProfileCreate.mockReset();
  });

  it('throws when category not found', async () => {
    mockCategoryFindUnique.mockResolvedValue(null);
    await expect(
      onboardMerchant({
        phoneNumber: '250788123456',
        businessName: 'Shop',
        categoryCode: 'UNKNOWN',
      })
    ).rejects.toThrow('Category UNKNOWN not found');
    expect(mockUserUpsert).not.toHaveBeenCalled();
  });

  it('throws when user already has a merchant account', async () => {
    mockCategoryFindUnique.mockResolvedValue({
      id: 'cat-1',
      code: 'GROCERIES',
    });
    mockUserFindUnique.mockResolvedValue({
      id: 'user-1',
      accounts: [{ id: 'acc-m', type: 'MERCHANT' }],
    });
    await expect(
      onboardMerchant({
        phoneNumber: '250788123456',
        businessName: 'Shop',
        categoryCode: 'GROCERIES',
      })
    ).rejects.toThrow('User already has a merchant account');
    expect(mockAccountCreate).not.toHaveBeenCalled();
  });

  it('creates user, account and profile when new merchant', async () => {
    mockCategoryFindUnique.mockResolvedValue({
      id: 'cat-1',
      code: 'GROCERIES',
    });
    mockUserFindUnique.mockResolvedValue(null);
    mockUserUpsert.mockResolvedValue({
      id: 'user-new',
      phoneNumber: '250788123456',
      fullName: 'Mumo Store',
    });
    mockAccountCreate.mockResolvedValue({
      id: 'acc-merchant',
      userId: 'user-new',
      type: 'MERCHANT',
    });
    mockProfileCreate.mockResolvedValue({
      id: 'profile-1',
      accountId: 'acc-merchant',
      categoryId: 'cat-1',
      businessName: 'Mumo Store',
    });

    const result = await onboardMerchant({
      phoneNumber: '  250788123456  ',
      businessName: 'Mumo Store',
      categoryCode: 'GROCERIES',
    });

    expect(mockUserUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { phoneNumber: '250788123456' },
        create: expect.objectContaining({
          phoneNumber: '250788123456',
          fullName: 'Mumo Store',
          kycStatus: 'PENDING',
        }),
      })
    );
    expect(mockAccountCreate).toHaveBeenCalledWith({
      data: { userId: 'user-new', type: 'MERCHANT', currency: 'RWF' },
    });
    expect(mockProfileCreate).toHaveBeenCalledWith({
      data: {
        accountId: 'acc-merchant',
        categoryId: 'cat-1',
        businessName: 'Mumo Store',
      },
    });
    expect(result).toEqual({
      userId: 'user-new',
      accountId: 'acc-merchant',
      merchantProfileId: 'profile-1',
      categoryCode: 'GROCERIES',
    });
  });

  it('allows onboarding when user exists but has no merchant account', async () => {
    mockCategoryFindUnique.mockResolvedValue({ id: 'cat-1', code: 'FUEL' });
    mockUserFindUnique.mockResolvedValue({ id: 'user-1', accounts: [] });
    mockUserUpsert.mockResolvedValue({
      id: 'user-1',
      phoneNumber: '250788',
      fullName: 'Gas Co',
    });
    mockAccountCreate.mockResolvedValue({
      id: 'acc-m',
      userId: 'user-1',
      type: 'MERCHANT',
    });
    mockProfileCreate.mockResolvedValue({
      id: 'prof-1',
      accountId: 'acc-m',
      categoryId: 'cat-1',
      businessName: 'Gas Co',
    });

    const result = await onboardMerchant({
      phoneNumber: '250788',
      businessName: 'Gas Co',
      categoryCode: 'FUEL',
    });

    expect(result.accountId).toBe('acc-m');
    expect(result.categoryCode).toBe('FUEL');
  });
});
