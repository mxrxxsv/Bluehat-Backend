const express = require("express");
const router = express.Router();
const mongoSanitize = require("mongo-sanitize");
const SkillCategory = require("../models/SkillCategory");
const Worker = require("../models/Worker");
const verifyAdmin = require("../middleware/verifyAdmin");

// CREATE
router.post("/", verifyAdmin, async (req, res) => {
  try {
    let { categoryName, skills } = req.body;
    categoryName = mongoSanitize(categoryName);

    // Sanitize and deduplicate skills
    const sanitizedSkills = Array.isArray(skills)
      ? Array.from(
          new Set(
            skills
              .map((s) => mongoSanitize(s.skillName).trim().toLowerCase())
              .filter((name) => name.length >= 2 && name.length <= 50)
          )
        ).map((skillName) => ({ skillName }))
      : [];

    if (!categoryName || sanitizedSkills.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Category name and at least one valid skill are required.",
      });
    }

    const newCategory = new SkillCategory({
      categoryName,
      skills: sanitizedSkills,
    });
    await newCategory.save();
    res.status(201).json({ success: true, data: newCategory });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// READ ALL
router.get("/", async (req, res) => {
  try {
    const categories = await SkillCategory.find();
    res.status(200).json({ success: true, data: categories });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// UPDATE
router.put("/:id", verifyAdmin, async (req, res) => {
  try {
    let { categoryName, skills } = req.body;
    categoryName = mongoSanitize(categoryName);

    // Sanitize and deduplicate skills
    const sanitizedSkills = Array.isArray(skills)
      ? Array.from(
          new Set(
            skills
              .map((s) => mongoSanitize(s.skillName).trim().toLowerCase())
              .filter((name) => name.length >= 2 && name.length <= 50)
          )
        ).map((skillName) => ({ skillName }))
      : [];

    if (!categoryName || sanitizedSkills.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Category name and at least one valid skill are required.",
      });
    }

    const category = await SkillCategory.findById(req.params.id);
    if (!category) {
      return res
        .status(404)
        .json({ success: false, message: "Category not found" });
    }

    const oldSkills = category.skills.map((s) => s.skillName);
    const newSkills = sanitizedSkills.map((s) => s.skillName);

    // Update the category
    category.categoryName = categoryName;
    category.skills = sanitizedSkills;
    await category.save();

    // Remove deleted skills from workers
    const deletedSkills = oldSkills.filter(
      (skill) => !newSkills.includes(skill)
    );

    if (deletedSkills.length > 0) {
      await Worker.updateMany(
        { "workerSkills.skillCategoryId": category._id },
        {
          $pull: {
            "workerSkills.$.selectedSkills": { $in: deletedSkills },
          },
        }
      );
    }

    res.status(200).json({ success: true, data: category });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// DELETE
router.delete("/:id", verifyAdmin, async (req, res) => {
  try {
    const category = await SkillCategory.findById(req.params.id);
    if (!category) {
      return res
        .status(404)
        .json({ success: false, message: "Category not found" });
    }

    const categoryId = category._id;

    // Remove from workers first
    await Worker.updateMany(
      { "workerSkills.skillCategoryId": categoryId },
      {
        $pull: {
          workerSkills: { skillCategoryId: categoryId },
        },
      }
    );

    // Then delete category
    await SkillCategory.deleteOne({ _id: categoryId });

    res.status(200).json({
      success: true,
      message: "Category deleted and skills removed from workers.",
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
