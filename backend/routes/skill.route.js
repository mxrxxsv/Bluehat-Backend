const express = require("express");
const router = express.Router();
const SkillCategory = require("../models/SkillCategory");
const Worker = require("../models/Worker");
const verifyToken = require("../middleware/verifyToken");
const verifyAdmin = require("../middleware/verifyAdmin");

// CREATE
router.post("/", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const { categoryName, skills } = req.body;
    const newCategory = new SkillCategory({ categoryName, skills });
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
router.put("/:id", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const { categoryName, skills } = req.body;
    const category = await SkillCategory.findById(req.params.id);
    if (!category) {
      return res
        .status(404)
        .json({ success: false, message: "Category not found" });
    }

    const oldSkills = category.skills.map((s) => s.skillName);
    const newSkills = skills.map((s) => s.skillName);

    // Update the category
    category.categoryName = categoryName;
    category.skills = skills;
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
router.delete("/:id", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const category = await SkillCategory.findById(req.params.id);
    if (!category) {
      return res
        .status(404)
        .json({ success: false, message: "Category not found" });
    }

    const categoryId = category._id;
    const skillsToRemove = category.skills.map((s) => s.skillName);

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
