import { Decimal } from "decimal.js";
import { getBalance, applyEntries, type LedgerEntry } from "../../../services/ledger";

const mockAggregate = jest.fn();
jest.mock("../../../db", () => ({
  prisma: {
    journalEntry: { aggregate: (...args: unknown[]) => mockAggregate(...args) },
    $transaction: jest.fn(),
  },
}));

const mockTx = {
  transaction: {
    create: jest.fn().mockResolvedValue({ id: "tx-123" }),
  },
  journalEntry: {
    createMany: jest.fn().mockResolvedValue(undefined),
  },
};

describe("ledger getBalance", () => {
  it("returns sum of journal entries as Decimal", async () => {
    mockAggregate.mockResolvedValueOnce({ _sum: { amount: 1000.5 } });
    const balance = await getBalance("acc-1");
    expect(balance).toBeInstanceOf(Decimal);
    expect(balance.toNumber()).toBe(1000.5);
    expect(mockAggregate).toHaveBeenCalledWith({
      _sum: { amount: true },
      where: { accountId: "acc-1" },
    });
  });

  it("returns zero when _sum.amount is null", async () => {
    mockAggregate.mockResolvedValueOnce({ _sum: { amount: null } });
    const balance = await getBalance("acc-2");
    expect(balance.toNumber()).toBe(0);
  });
});

describe("ledger applyEntries", () => {
  it("throws when entries do not sum to zero", async () => {
    const entries: LedgerEntry[] = [
      { accountId: "a1", amount: 100 },
      { accountId: "a2", amount: 50 },
    ];
    await expect(
      applyEntries(mockTx as never, { type: "P2P", entries })
    ).rejects.toThrow("Ledger entries must sum to zero");
    expect(mockTx.transaction.create).not.toHaveBeenCalled();
  });

  it("creates transaction and journal entries when sum is zero", async () => {
    const entries: LedgerEntry[] = [
      { accountId: "a1", amount: -100 },
      { accountId: "a2", amount: 100 },
    ];
    const result = await applyEntries(mockTx as never, { type: "P2P", entries });
    expect(result).toEqual({ transactionId: "tx-123" });
    expect(mockTx.transaction.create).toHaveBeenCalled();
    expect(mockTx.journalEntry.createMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.arrayContaining([
          expect.objectContaining({ accountId: "a1", amount: expect.any(Decimal) }),
          expect.objectContaining({ accountId: "a2", amount: expect.any(Decimal) }),
        ]),
      })
    );
  });
});
