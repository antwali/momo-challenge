import request from "supertest";
import { createApp } from "../../app";

const app = createApp();
const describeApi = process.env.DATABASE_URL ? describe : describe.skip;

describeApi("Auth", () => {
  const unique = `250788${Date.now().toString().slice(-6)}`;

  it("POST /v1/auth/register creates user and main account", async () => {
    const res = await request(app)
      .post("/v1/auth/register")
      .send({
        phoneNumber: unique,
        fullName: "Test User",
        gender: "M",
        dateOfBirth: "1990-01-15",
      });
    expect(res.status).toBe(201);
    expect(res.body.user).toMatchObject({
      phoneNumber: unique,
      fullName: "Test User",
      gender: "M",
      kycStatus: "PENDING",
    });
    expect(res.body.user.id).toBeDefined();
    expect(res.body.mainAccountId).toBeDefined();
  });

  it("POST /v1/auth/register rejects duplicate phone", async () => {
    const res = await request(app)
      .post("/v1/auth/register")
      .send({ phoneNumber: unique, fullName: "Other" });
    expect(res.status).toBe(500);
    expect(res.body.error).toContain("already exists");
  });

  it("POST /v1/auth/register validates body", async () => {
    const res = await request(app)
      .post("/v1/auth/register")
      .send({ phoneNumber: "short", fullName: "" });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Validation failed");
  });
});
