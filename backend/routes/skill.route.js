const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const mongoSanitize = require("mongo-sanitize");
const verifyAdmin = require("../middleware/verifyAdmin");
const SkillCategory = require("../models/SkillCategory");
const Worker = require("../models/Worker");

// CREATE
router.post("/", verifyAdmin, async (req, res) => {
  try {
    let { categoryName } = req.body;
    categoryName = mongoSanitize(categoryName);

    if (!categoryName || categoryName.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: "Category name is required.",
      });
    }

    // Check for duplicate category names (case-insensitive)
    const existingCategory = await SkillCategory.findOne({
      categoryName: { $regex: new RegExp(`^${categoryName.trim()}$`, "i") },
    });

    if (existingCategory) {
      return res.status(409).json({
        success: false,
        message: "Category name already exists.",
      });
    }

    const newCategory = new SkillCategory({
      categoryName: categoryName.trim(),
    });

    await newCategory.save();

    res.status(201).json({
      success: true,
      message: "Skill category created successfully",
      data: newCategory,
    });
  } catch (err) {
    console.error("Create skill category error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to create skill category",
    });
  }
});

// READ ALL
router.get("/", async (req, res) => {
  try {
    const { page = 1, limit = 50, search } = req.query;

    // Build filter
    let filter = {};
    if (search) {
      filter.categoryName = {
        $regex: mongoSanitize(search),
        $options: "i",
      };
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const categories = await SkillCategory.find(filter)
      .sort({ categoryName: 1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await SkillCategory.countDocuments(filter);
    const totalPages = Math.ceil(total / parseInt(limit));

    res.status(200).json({
      success: true,
      message: "Skill categories retrieved successfully",
      data: {
        categories,
        pagination: {
          currentPage: parseInt(page),
          totalPages,
          totalItems: total,
          itemsPerPage: parseInt(limit),
          hasNextPage: parseInt(page) < totalPages,
          hasPrevPage: parseInt(page) > 1,
        },
      },
    });
  } catch (err) {
    console.error("Get skill categories error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve skill categories",
    });
  }
});

// READ BY ID
router.get("/:id", async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid category ID",
      });
    }

    const category = await SkillCategory.findById(req.params.id);

    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    // Count workers using this category (FIXED field name)
    const workerCount = await Worker.countDocuments({
      "skillsByCategory.skillCategoryId": category._id,
    });

    res.status(200).json({
      success: true,
      message: "Skill category retrieved successfully",
      data: {
        ...category.toObject(),
        workerCount,
      },
    });
  } catch (err) {
    console.error("Get skill category by ID error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve skill category",
    });
  }
});

// UPDATE
router.put("/:id", verifyAdmin, async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid category ID",
      });
    }

    let { categoryName } = req.body;
    categoryName = mongoSanitize(categoryName);

    if (!categoryName || categoryName.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: "Category name is required.",
      });
    }

    const category = await SkillCategory.findById(req.params.id);
    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    // Check for duplicate category names (excluding current)
    const existingCategory = await SkillCategory.findOne({
      categoryName: { $regex: new RegExp(`^${categoryName.trim()}$`, "i") },
      _id: { $ne: req.params.id },
    });

    if (existingCategory) {
      return res.status(409).json({
        success: false,
        message: "Category name already exists.",
      });
    }

    // Update the category
    category.categoryName = categoryName.trim();
    await category.save();

    res.status(200).json({
      success: true,
      message: "Skill category updated successfully",
      data: category,
    });
  } catch (err) {
    console.error("Update skill category error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to update skill category",
    });
  }
});

// DELETE
router.delete("/:id", verifyAdmin, async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid category ID",
      });
    }

    const category = await SkillCategory.findById(req.params.id);
    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    const categoryId = category._id;

    // FIXED: Use correct field name from Worker model
    const workersWithCategory = await Worker.countDocuments({
      "skillsByCategory.skillCategoryId": categoryId,
    });

    if (workersWithCategory > 0) {
      // Remove from workers first
      await Worker.updateMany(
        { "skillsByCategory.skillCategoryId": categoryId },
        {
          $pull: {
            skillsByCategory: { skillCategoryId: categoryId },
          },
        }
      );
    }

    // Then delete category
    await SkillCategory.deleteOne({ _id: categoryId });

    res.status(200).json({
      success: true,
      message: `Category deleted successfully. Removed from ${workersWithCategory} workers.`,
      data: {
        deletedCategory: category.categoryName,
        affectedWorkers: workersWithCategory,
      },
    });
  } catch (err) {
    console.error("Delete skill category error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to delete skill category",
    });
  }
});

module.exports = router;
