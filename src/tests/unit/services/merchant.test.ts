import { merchantPay } from "../../../services/merchant";
import { Decimal } from "decimal.js";

const mockAccountFindFirst = jest.fn();
const mockTransaction = jest.fn();

jest.mock("../../../db", () => ({
  prisma: {
    account: { findFirst: (...args: unknown[]) => mockAccountFindFirst(...args) },
    $transaction: (cb: (tx: unknown) => Promise<unknown>) => mockTransaction(cb),
  },
}));

const mockGetOrCreateMainAccount = jest.fn();
const mockGetBalance = jest.fn();
const mockApplyEntries = jest.fn();

jest.mock("../../../services/accounts", () => ({
  getOrCreateMainAccount: (...args: unknown[]) => mockGetOrCreateMainAccount(...args),
}));

jest.mock("../../../services/ledger", () => ({
  getBalance: (...args: unknown[]) => mockGetBalance(...args),
  applyEntries: (...args: unknown[]) => mockApplyEntries(...args),
}));

jest.mock("../../../services/notification", () => ({
  sendNotification: jest.fn().mockResolvedValue(undefined),
}));

const mockTx = {};

describe("merchantPay", () => {
  beforeEach(() => {
    mockAccountFindFirst.mockReset();
    mockGetOrCreateMainAccount.mockReset();
    mockGetBalance.mockReset();
    mockApplyEntries.mockReset();
    mockTransaction.mockImplementation(async (cb: (tx: unknown) => Promise<unknown>) => cb(mockTx));
  });

  it("throws when amount <= 0", async () => {
    await expect(
      merchantPay({ fromUserId: "u1", merchantAccountId: "m-1", amount: 0 })
    ).rejects.toThrow("Amount must be positive");
  });

  it("throws when merchant account not found", async () => {
    mockAccountFindFirst.mockResolvedValue(null);
    await expect(
      merchantPay({ fromUserId: "u1", merchantAccountId: "bad-id", amount: 100 })
    ).rejects.toThrow("Merchant account not found");
  });

  it("throws when account has no merchant profile", async () => {
    mockAccountFindFirst.mockResolvedValue({ id: "m-1", type: "MERCHANT", merchantProfile: null });
    await expect(
      merchantPay({ fromUserId: "u1", merchantAccountId: "m-1", amount: 100 })
    ).rejects.toThrow("Merchant account not found");
  });

  it("throws when insufficient balance", async () => {
    mockAccountFindFirst.mockResolvedValue({
      id: "m-1",
      type: "MERCHANT",
      merchantProfile: { category: { code: "GROCERIES", name: "Groceries" } },
      user: { phoneNumber: "250788" },
    });
    mockGetOrCreateMainAccount.mockResolvedValue({ id: "acc-sender" });
    mockGetBalance.mockResolvedValue(new Decimal(50));
    await expect(
      merchantPay({ fromUserId: "u1", merchantAccountId: "m-1", amount: 100 })
    ).rejects.toThrow("Insufficient balance");
  });

  it("pays merchant and returns result", async () => {
    mockAccountFindFirst.mockResolvedValue({
      id: "m-1",
      type: "MERCHANT",
      merchantProfile: { category: { code: "GROCERIES", name: "Groceries" } },
      user: { phoneNumber: "250788111111" },
    });
    mockGetOrCreateMainAccount.mockResolvedValue({ id: "acc-sender" });
    mockGetBalance.mockResolvedValue(new Decimal(500));
    mockApplyEntries.mockResolvedValue({ transactionId: "tx-1" });

    const result = await merchantPay({
      fromUserId: "u1",
      merchantAccountId: "m-1",
      amount: 200,
    });

    expect(mockApplyEntries).toHaveBeenCalledWith(
      mockTx,
      expect.objectContaining({
        type: "MERCHANT_PAY",
        metadata: expect.objectContaining({ categoryCode: "GROCERIES", categoryName: "Groceries" }),
        entries: [
          { accountId: "acc-sender", amount: -200 },
          { accountId: "m-1", amount: 200 },
        ],
      })
    );
    expect(result).toEqual({
      transactionId: "tx-1",
      fromAccountId: "acc-sender",
      merchantAccountId: "m-1",
      amount: 200,
      category: "GROCERIES",
    });
  });
});
