const request = require("supertest");
const app = require("../index");
const SkillCategory = require("../models/SkillCategory");
const { mockSkillCategory } = require("./helpers/testData");

describe("Skills API", () => {
  describe("GET /skills", () => {
    beforeEach(async () => {
      // Create test skill categories
      await SkillCategory.create(mockSkillCategory);
      await SkillCategory.create({
        categoryName: "Design",
      });
    });

    it("should get all skill categories", async () => {
      const response = await request(app).get("/skills");

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("success", true);
      expect(response.body.data).toHaveProperty("categories");
      expect(Array.isArray(response.body.data.categories)).toBe(true);
      expect(response.body.data.categories.length).toBeGreaterThanOrEqual(2);
    });

    it("should return skill categories with correct structure", async () => {
      const response = await request(app).get("/skills");

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveProperty("categories");
      const firstSkill = response.body.data.categories[0];
      expect(firstSkill).toHaveProperty("categoryName");
      expect(firstSkill).toHaveProperty("_id");
      expect(firstSkill).toHaveProperty("isDeleted");
    });

    it("should return empty array when no skills exist", async () => {
      await SkillCategory.deleteMany({});

      const response = await request(app).get("/skills");

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveProperty("categories");
      expect(Array.isArray(response.body.data.categories)).toBe(true);
      expect(response.body.data.categories.length).toBe(0);
    });

    it("should not require authentication", async () => {
      const response = await request(app).get("/skills");

      expect(response.status).not.toBe(401);
      expect(response.status).toBe(200);
    });
  });
});
