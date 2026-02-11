import { getTransactionHistory } from "../../../services/history";

const mockAccountFindFirst = jest.fn();
const mockJournalEntryFindMany = jest.fn();

jest.mock("../../../db", () => ({
  prisma: {
    account: { findFirst: (...args: unknown[]) => mockAccountFindFirst(...args) },
    journalEntry: { findMany: (...args: unknown[]) => mockJournalEntryFindMany(...args) },
  },
}));

describe("history getTransactionHistory", () => {
  beforeEach(() => {
    mockAccountFindFirst.mockReset();
    mockJournalEntryFindMany.mockReset();
  });

  it("throws when account not found or not owned by user", async () => {
    mockAccountFindFirst.mockResolvedValue(null);
    await expect(
      getTransactionHistory({ accountId: "acc-1", userId: "user-1" })
    ).rejects.toThrow("Account not found.");
    expect(mockJournalEntryFindMany).not.toHaveBeenCalled();
  });

  it("returns transactions shape when account exists", async () => {
    mockAccountFindFirst.mockResolvedValue({ id: "acc-1", userId: "user-1" });
    mockJournalEntryFindMany.mockResolvedValue([
      {
        id: "e1",
        accountId: "acc-1",
        amount: { toNumber: () => -100 },
        currency: "RWF",
        transactionId: "tx-1",
        transaction: { id: "tx-1", type: "P2P", status: "COMPLETED" },
        account: {},
      },
    ]);
    const result = await getTransactionHistory({ accountId: "acc-1", userId: "user-1" });
    expect(result.accountId).toBe("acc-1");
    expect(result.transactions).toHaveLength(1);
    expect(result.transactions[0]).toMatchObject({
      transactionId: "tx-1",
      type: "P2P",
      status: "COMPLETED",
      amount: -100,
    });
  });
});
