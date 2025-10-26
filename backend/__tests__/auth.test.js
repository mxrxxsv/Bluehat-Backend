const request = require("supertest");
const app = require("../index");
const Credential = require("../models/Credential");
const Worker = require("../models/Worker");
const Client = require("../models/Client");
const {
  mockCredentials,
  mockWorkerData,
  mockClientData,
  initializeMockData,
} = require("./helpers/testData");
const { createTestUser } = require("./helpers/testHelpers");

describe("Authentication", () => {
  beforeAll(async () => {
    await initializeMockData();
  });

  describe("POST /ver/test-login", () => {
    beforeEach(async () => {
      // Create test worker
      await createTestUser(Credential, Worker, mockWorkerData, "worker");
    });

    it("should login successfully with valid worker credentials", async () => {
      const response = await request(app).post("/ver/test-login").send({
        email: mockCredentials.worker.email,
        password: mockCredentials.worker.password,
      });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("success", true);
      expect(response.body).toHaveProperty("user");
      expect(response.body.user).toHaveProperty(
        "email",
        mockCredentials.worker.email
      );
      expect(response.headers["set-cookie"]).toBeDefined();
    });

    it("should fail with invalid email", async () => {
      const response = await request(app).post("/ver/test-login").send({
        email: "wrong@test.com",
        password: mockCredentials.worker.password,
      });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty("success", false);
    });

    it("should fail with invalid password", async () => {
      const response = await request(app).post("/ver/test-login").send({
        email: mockCredentials.worker.email,
        password: "wrongpassword",
      });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty("success", false);
    });

    it("should fail with missing fields", async () => {
      const response = await request(app).post("/ver/test-login").send({
        email: mockCredentials.worker.email,
      });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty("success", false);
    });
  });

  describe("POST /ver/logout", () => {
    it("should logout successfully", async () => {
      // Create test user and login first
      await createTestUser(Credential, Worker, mockWorkerData, "worker");

      const loginResponse = await request(app).post("/ver/test-login").send({
        email: mockCredentials.worker.email,
        password: mockCredentials.worker.password,
      });

      const cookies = loginResponse.headers["set-cookie"];

      // Now logout with the cookies
      const response = await request(app)
        .post("/ver/logout")
        .set("Cookie", cookies);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("success", true);
      expect(response.body).toHaveProperty(
        "message",
        "Logged out successfully"
      );
    });
  });

  describe("GET /ver/check-auth", () => {
    it("should return authenticated user data for worker", async () => {
      // Create test user and login
      await createTestUser(Credential, Worker, mockWorkerData, "worker");

      const loginResponse = await request(app).post("/ver/test-login").send({
        email: mockCredentials.worker.email,
        password: mockCredentials.worker.password,
      });

      const cookies = loginResponse.headers["set-cookie"];

      const response = await request(app)
        .get("/ver/check-auth")
        .set("Cookie", cookies);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("success", true);
      expect(response.body).toHaveProperty("data");
      expect(response.body.data).toHaveProperty("userType", "worker");
      expect(response.body.data).toHaveProperty("isAuthenticated", true);
    });

    it("should fail without authentication", async () => {
      const response = await request(app).get("/ver/check-auth");

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty("success", false);
    });
  });

  describe("Client Authentication", () => {
    beforeEach(async () => {
      // Create test client
      await createTestUser(Credential, Client, mockClientData, "client");
    });

    it("should login successfully with valid client credentials", async () => {
      const response = await request(app).post("/ver/test-login").send({
        email: mockCredentials.client.email,
        password: mockCredentials.client.password,
      });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("success", true);
      expect(response.body).toHaveProperty("user");
      expect(response.body.user).toHaveProperty(
        "email",
        mockCredentials.client.email
      );
      expect(response.body.user).toHaveProperty("userType", "client");
    });
  });
});
