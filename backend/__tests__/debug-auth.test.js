const request = require("supertest");
const app = require("../index");
const Credential = require("../models/Credential");
const Worker = require("../models/Worker");
const {
  mockCredentials,
  mockWorkerData,
  initializeMockData,
} = require("./helpers/testData");
const { createTestUser } = require("./helpers/testHelpers");

describe("Debug Authentication", () => {
  beforeAll(async () => {
    await initializeMockData();
  });

  it("should create test user correctly", async () => {
    const { credential, profile } = await createTestUser(
      Credential,
      Worker,
      mockWorkerData,
      "worker"
    );

    console.log("Credential created:", {
      id: credential._id,
      email: credential.email,
      userType: credential.userType,
      hasPassword: !!credential.password,
      hasTotpSecret: !!credential.totpSecret,
    });

    console.log("Worker profile created:", {
      id: profile._id,
      firstName: profile.firstName,
      lastName: profile.lastName,
      credentialId: profile.credentialId,
    });

    expect(credential).toBeDefined();
    expect(profile).toBeDefined();
  });

  it("should attempt test-login and see response", async () => {
    await createTestUser(Credential, Worker, mockWorkerData, "worker");

    const loginData = {
      email: mockCredentials.worker.email,
      password: mockCredentials.worker.password,
    };

    console.log("Attempting test-login with:", loginData);

    const response = await request(app).post("/ver/test-login").send(loginData);

    console.log("Test-login response status:", response.status);
    console.log(
      "Test-login response body:",
      JSON.stringify(response.body, null, 2)
    );

    // Don't fail the test, just log
    expect(response.status).toBeDefined();
  });
});
