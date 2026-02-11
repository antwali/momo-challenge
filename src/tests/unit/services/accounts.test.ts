import { getOrCreateMainAccount, createPocket } from "../../../services/accounts";

const mockFindFirst = jest.fn();
const mockCreate = jest.fn();
const mockFindMany = jest.fn();

jest.mock("../../../db", () => ({
  prisma: {
    account: {
      findFirst: (...args: unknown[]) => mockFindFirst(...args),
      findMany: (...args: unknown[]) => mockFindMany(...args),
      create: (...args: unknown[]) => mockCreate(...args),
    },
  },
}));

jest.mock("../../../services/ledger", () => ({
  getBalance: jest.fn().mockResolvedValue({ toNumber: () => 0 }),
}));

describe("accounts getOrCreateMainAccount", () => {
  beforeEach(() => {
    mockFindFirst.mockReset();
    mockCreate.mockReset();
  });

  it("returns existing account when found", async () => {
    const existing = { id: "acc-1", userId: "user-1", type: "MAIN", currency: "RWF" };
    mockFindFirst.mockResolvedValue(existing);
    const result = await getOrCreateMainAccount("user-1");
    expect(result).toEqual(existing);
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it("creates and returns account when not found", async () => {
    mockFindFirst.mockResolvedValue(null);
    const created = { id: "acc-new", userId: "user-1", type: "MAIN", currency: "RWF" };
    mockCreate.mockResolvedValue(created);
    const result = await getOrCreateMainAccount("user-1");
    expect(result).toEqual(created);
    expect(mockCreate).toHaveBeenCalledWith({
      data: { userId: "user-1", type: "MAIN", currency: "RWF" },
    });
  });
});

describe("accounts createPocket", () => {
  beforeEach(() => {
    mockFindFirst.mockReset();
    mockCreate.mockReset();
  });

  it("throws when pocket type already exists", async () => {
    mockFindFirst.mockResolvedValue({ id: "pocket-1", type: "SAVINGS" });
    await expect(createPocket("user-1", "SAVINGS")).rejects.toThrow(
      "Pocket type SAVINGS already exists for this user."
    );
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it("creates pocket when type does not exist", async () => {
    mockFindFirst.mockResolvedValue(null);
    const created = { id: "pocket-new", userId: "user-1", type: "SAVINGS", currency: "RWF" };
    mockCreate.mockResolvedValue(created);
    const result = await createPocket("user-1", "SCHOOL_FEES");
    expect(result).toEqual(created);
    expect(mockCreate).toHaveBeenCalledWith({
      data: { userId: "user-1", type: "SCHOOL_FEES", currency: "RWF" },
    });
  });
});
