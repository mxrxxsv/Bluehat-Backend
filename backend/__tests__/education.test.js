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
  initializeMockData,
} = require("./helpers/testData");
const { createTestUser } = require("./helpers/testHelpers");

describe("Education CRUD", () => {
  let workerAuthCookies;
  let clientAuthCookies;
  let workerId;
  let clientId;

  beforeAll(async () => {
    await initializeMockData();
  });

  beforeEach(async () => {
    // Create test worker and login
    const { credential: workerCred } = await createTestUser(
      Credential,
      Worker,
      mockWorkerData,
      "worker"
    );

    const workerLoginResponse = await request(app)
      .post("/ver/test-login")
      .send({
        email: mockCredentials.worker.email,
        password: mockCredentials.worker.password,
      });

    workerAuthCookies = workerLoginResponse.headers["set-cookie"];
    workerId = workerCred._id;

    // Create test client and login
    const { credential: clientCred } = await createTestUser(
      Credential,
      Client,
      mockClientData,
      "client"
    );

    const clientLoginResponse = await request(app)
      .post("/ver/test-login")
      .send({
        email: mockCredentials.client.email,
        password: mockCredentials.client.password,
      });

    clientAuthCookies = clientLoginResponse.headers["set-cookie"];
    clientId = clientCred._id;
  });

  describe("POST /profile/education", () => {
    it("should add education successfully for worker", async () => {
      const response = await request(app)
        .post("/profile/education")
        .set("Cookie", workerAuthCookies)
        .send(mockEducation);

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty("success", true);
      expect(response.body).toHaveProperty(
        "message",
        "Education added successfully"
      );
      expect(response.body.data).toHaveProperty(
        "schoolName",
        mockEducation.schoolName
      );
      expect(response.body.data).toHaveProperty(
        "educationLevel",
        mockEducation.educationLevel
      );
    });

    it("should add education successfully for client", async () => {
      const response = await request(app)
        .post("/profile/education")
        .set("Cookie", clientAuthCookies)
        .send(mockEducation);

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty("success", true);
      expect(response.body.data).toHaveProperty(
        "schoolName",
        mockEducation.schoolName
      );
    });

    it("should fail without authentication", async () => {
      const response = await request(app)
        .post("/profile/education")
        .send(mockEducation);

      expect(response.status).toBe(401);
    });

    it("should fail with invalid data - empty schoolName", async () => {
      const response = await request(app)
        .post("/profile/education")
        .set("Cookie", workerAuthCookies)
        .send({
          ...mockEducation,
          schoolName: "",
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty("success", false);
    });

    it("should fail with missing required fields", async () => {
      const response = await request(app)
        .post("/profile/education")
        .set("Cookie", workerAuthCookies)
        .send({
          schoolName: "Test University",
          // Missing educationLevel, startDate, endDate, etc.
        });

      expect(response.status).toBe(400);
    });

    it("should fail without endDate", async () => {
      const response = await request(app)
        .post("/profile/education")
        .set("Cookie", workerAuthCookies)
        .send({
          schoolName: "Test University",
          educationLevel: "College",
          startDate: "2020-08-01",
          educationStatus: "Currently Studying",
          // Missing endDate
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty("success", false);
      expect(response.body.code).toBe("VALIDATION_ERROR");
    });
  });

  describe("PUT /profile/education", () => {
    let educationId;

    beforeEach(async () => {
      // Add education first
      const addResponse = await request(app)
        .post("/profile/education")
        .set("Cookie", workerAuthCookies)
        .send(mockEducation);

      educationId = addResponse.body.data._id;
    });

    it("should update education successfully", async () => {
      const updatedData = {
        educationId,
        schoolName: "Updated University",
        educationLevel: "College",
        degree: "MS Computer Science",
        startDate: "2020-08-01",
        endDate: "2024-05-15",
        educationStatus: "Graduated",
      };

      const response = await request(app)
        .put("/profile/education")
        .set("Cookie", workerAuthCookies)
        .send(updatedData);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("success", true);
      expect(response.body.data).toHaveProperty(
        "schoolName",
        "Updated University"
      );
      expect(response.body.data).toHaveProperty(
        "degree",
        "MS Computer Science"
      );
    });

    it("should fail with invalid education ID", async () => {
      const response = await request(app)
        .put("/profile/education")
        .set("Cookie", workerAuthCookies)
        .send({
          educationId: "invalid-id",
          schoolName: "Test",
          educationLevel: "College",
          startDate: "2020-08-01",
          endDate: "2024-05-15",
          educationStatus: "Graduated",
        });

      expect(response.status).toBe(400);
    });

    it("should fail without authentication", async () => {
      const response = await request(app)
        .put("/profile/education")
        .send({
          educationId,
          schoolName: "Test",
          educationLevel: "College",
          startDate: new Date("2020-08-01"),
          educationStatus: "Graduated",
        });

      expect(response.status).toBe(401);
    });
  });

  describe("DELETE /profile/education/:id", () => {
    let educationId;

    beforeEach(async () => {
      // Add education first
      const addResponse = await request(app)
        .post("/profile/education")
        .set("Cookie", workerAuthCookies)
        .send(mockEducation);

      educationId = addResponse.body.data._id;
    });

    it("should delete education successfully", async () => {
      const response = await request(app)
        .delete(`/profile/education/${educationId}`)
        .set("Cookie", workerAuthCookies);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("success", true);
      expect(response.body).toHaveProperty(
        "message",
        "Education deleted successfully"
      );
    });

    it("should fail with invalid education ID", async () => {
      const response = await request(app)
        .delete("/profile/education/invalid-id")
        .set("Cookie", workerAuthCookies);

      expect(response.status).toBe(400);
    });

    it("should fail without authentication", async () => {
      const response = await request(app).delete(
        `/profile/education/${educationId}`
      );

      expect(response.status).toBe(401);
    });

    it("should return 404 for non-existent education", async () => {
      const fakeId = "507f1f77bcf86cd799439011";
      const response = await request(app)
        .delete(`/profile/education/${fakeId}`)
        .set("Cookie", workerAuthCookies);

      expect(response.status).toBe(404);
    });
  });

  describe("Multiple Education Entries", () => {
    it("should allow adding multiple education entries", async () => {
      // Add first education
      const response1 = await request(app)
        .post("/profile/education")
        .set("Cookie", workerAuthCookies)
        .send(mockEducation);

      expect(response1.status).toBe(201);

      // Add second education
      const secondEducation = {
        schoolName: "Another University",
        educationLevel: "Senior High",
        degree: "",
        startDate: "2015-08-01",
        endDate: "2019-05-15",
        educationStatus: "Graduated",
      };

      const response2 = await request(app)
        .post("/profile/education")
        .set("Cookie", workerAuthCookies)
        .send(secondEducation);

      expect(response2.status).toBe(201);

      // Verify both exist
      const worker = await Worker.findOne({ credentialId: workerId });
      expect(worker.education).toHaveLength(2);
    });
  });
});
