import request from "supertest";
import { createApp } from "../../app";

const app = createApp();

describe("app", () => {
  it("GET /health returns 200 and ok", async () => {
    const res = await request(app).get("/health");
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("ok");
    expect(res.body.timestamp).toBeDefined();
  });

  it("GET /v1/accounts without X-User-Id returns 401", async () => {
    const res = await request(app).get("/v1/accounts");
    expect(res.status).toBe(401);
    expect(res.body.error).toBeDefined();
  });

  it("POST /v1/auth/register with invalid body returns 400", async () => {
    const res = await request(app)
      .post("/v1/auth/register")
      .send({ phoneNumber: "x", fullName: "" });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Validation failed");
  });

  it("unknown route returns 404", async () => {
    const res = await request(app).get("/nonexistent");
    expect(res.status).toBe(404);
  });

  it("POST /v1/transactions/p2p with invalid body returns 400", async () => {
    const res = await request(app)
      .post("/v1/transactions/p2p")
      .set("X-User-Id", "00000000-0000-0000-0000-000000000001")
      .send({ toPhoneNumber: "short", amount: -1 });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Validation failed");
  });

  it("GET /v1/transactions/history without accountId returns 400", async () => {
    const res = await request(app)
      .get("/v1/transactions/history")
      .set("X-User-Id", "00000000-0000-0000-0000-000000000001");
    expect(res.status).toBe(400);
  });

  it("POST /v1/merchants/onboard with invalid body returns 400", async () => {
    const res = await request(app).post("/v1/merchants/onboard").send({});
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Validation failed");
  });
});
