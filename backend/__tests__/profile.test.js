const request = require("supertest");
const app = require("../index");
const Credential = require("../models/Credential");
const Worker = require("../models/Worker");
const Client = require("../models/Client");
const {
  mockCredentials,
  mockWorkerData,
  mockClientData,
  mockEducation,
  mockExperience,
  initializeMockData,
} = require("./helpers/testData");
const { createTestUser } = require("./helpers/testHelpers");

describe("Profile API", () => {
  let workerAuthCookies;
  let clientAuthCookies;
  let workerId;
  let clientId;

  beforeAll(async () => {
    await initializeMockData();
  });

  beforeEach(async () => {
    // Create test worker and login
    const { credential: workerCred, profile: workerProfile } =
      await createTestUser(Credential, Worker, mockWorkerData, "worker");

    const workerLoginResponse = await request(app)
      .post("/ver/test-login")
      .send({
        email: mockCredentials.worker.email,
        password: mockCredentials.worker.password,
      });

    workerAuthCookies = workerLoginResponse.headers["set-cookie"];
    workerId = workerCred._id;

    // Create test client and login
    const { credential: clientCred, profile: clientProfile } =
      await createTestUser(Credential, Client, mockClientData, "client");

    const clientLoginResponse = await request(app)
      .post("/ver/test-login")
      .send({
        email: mockCredentials.client.email,
        password: mockCredentials.client.password,
      });

    clientAuthCookies = clientLoginResponse.headers["set-cookie"];
    clientId = clientCred._id;
  });

  describe("GET /profile", () => {
    it("should get worker profile successfully", async () => {
      const response = await request(app)
        .get("/profile")
        .set("Cookie", workerAuthCookies);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("success", true);
      expect(response.body.data.profile).toHaveProperty("firstName", "John");
      expect(response.body.data.profile).toHaveProperty("lastName", "Doe");
      expect(response.body.data.profile).toHaveProperty("education");
      expect(Array.isArray(response.body.data.profile.education)).toBe(true);
    });

    it("should get client profile successfully", async () => {
      const response = await request(app)
        .get("/profile")
        .set("Cookie", clientAuthCookies);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("success", true);
      expect(response.body.data.profile).toHaveProperty("firstName", "Jane");
      expect(response.body.data.profile).toHaveProperty("lastName", "Smith");
      expect(response.body.data.profile).toHaveProperty("education");
      expect(Array.isArray(response.body.data.profile.education)).toBe(true);
    });

    it("should fail without authentication", async () => {
      const response = await request(app).get("/profile");

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty("success", false);
    });
  });

  describe("Profile with Education", () => {
    it("should include education in profile response after adding", async () => {
      // Add education
      await request(app)
        .post("/profile/education")
        .set("Cookie", workerAuthCookies)
        .send(mockEducation);

      // Get profile
      const response = await request(app)
        .get("/profile")
        .set("Cookie", workerAuthCookies);

      expect(response.status).toBe(200);
      expect(response.body.data.profile.education).toHaveLength(1);
      expect(response.body.data.profile.education[0]).toHaveProperty(
        "schoolName",
        mockEducation.schoolName
      );
    });
  });

  describe("Worker Profile Details", () => {
    it("should have worker-specific fields", async () => {
      const response = await request(app)
        .get("/profile")
        .set("Cookie", workerAuthCookies);

      expect(response.status).toBe(200);
      expect(response.body.data.profile).toHaveProperty("skillsByCategory");
      expect(response.body.data.profile).toHaveProperty("experience");
      expect(response.body.data.profile).toHaveProperty("portfolio");
      expect(response.body.data.profile).toHaveProperty("certificates");
    });
  });

  describe("Client Profile Details", () => {
    it("should have client-specific fields", async () => {
      const response = await request(app)
        .get("/profile")
        .set("Cookie", clientAuthCookies);

      expect(response.status).toBe(200);
      expect(response.body.data.profile).toHaveProperty("firstName");
      expect(response.body.data.profile).toHaveProperty("lastName");
      expect(response.body.data.profile).toHaveProperty("education");
    });
  });
});
