import { config } from "../../config";

describe("config", () => {
  it("has port as number", () => {
    expect(config.port).toBeDefined();
    expect(typeof config.port).toBe("number");
    expect(config.port).toBeGreaterThan(0);
  });

  it("has nodeEnv", () => {
    expect(["development", "production", "test"]).toContain(config.nodeEnv);
  });

  it("has databaseUrl string", () => {
    expect(config.databaseUrl).toBeDefined();
    expect(typeof config.databaseUrl).toBe("string");
    expect(config.databaseUrl).toContain("postgresql");
  });

  it("has notificationChannel", () => {
    expect(config.notificationChannel).toBeDefined();
    expect(typeof config.notificationChannel).toBe("string");
  });
});
