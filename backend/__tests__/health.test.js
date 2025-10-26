const request = require("supertest");
const app = require("../index");

describe("Health & Basic Endpoints", () => {
  describe("GET /healthz", () => {
    it("should return 200 status for health check", async () => {
      const response = await request(app).get("/healthz");

      expect(response.status).toBe(200);
    });
  });

  describe("404 - Not Found", () => {
    it("should return 404 for non-existent routes", async () => {
      const response = await request(app).get("/non-existent-route-123456");

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty("success", false);
      expect(response.body).toHaveProperty("message", "Not Found");
    });
  });

  describe("GET /skills", () => {
    it("should be accessible without authentication", async () => {
      const response = await request(app).get("/skills");

      // Should not return 401 (unauthorized)
      expect(response.status).not.toBe(401);
    });
  });
});
