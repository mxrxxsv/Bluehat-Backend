const Joi = require("joi");
const xss = require("xss");
const mongoose = require("mongoose");

const SkillCategory = require("../models/SkillCategory");
const Worker = require("../models/Worker");
const logger = require("../utils/logger");

// ==================== JOI VALIDATION SCHEMAS (FIXED TO MATCH MODEL) ====================

const createSkillSchema = Joi.object({
  categoryName: Joi.string()
    .trim()
    .min(4) // ✅ FIXED: Changed from 2 to 4 to match model
    .max(50) // ✅ FIXED: Changed from 100 to 50 to match model
    .pattern(/^[a-zA-Z0-9\s\-\.\_]+$/)
    .required()
    .messages({
      "string.min": "Category name must be at least 4 characters", // ✅ FIXED: Updated message
      "string.max": "Category name cannot exceed 50 characters", // ✅ FIXED: Updated message
      "string.pattern.base":
        "Category name can only contain letters, numbers, spaces, hyphens, dots, and underscores",
      "any.required": "Category name is required",
    }),
});

const updateSkillSchema = Joi.object({
  categoryName: Joi.string()
    .trim()
    .min(4) // ✅ FIXED: Changed from 2 to 4 to match model
    .max(50) // ✅ FIXED: Changed from 100 to 50 to match model
    .pattern(/^[a-zA-Z0-9\s\-\.\_]+$/)
    .required()
    .messages({
      "string.min": "Category name must be at least 4 characters", // ✅ FIXED: Updated message
      "string.max": "Category name cannot exceed 50 characters", // ✅ FIXED: Updated message
      "string.pattern.base":
        "Category name can only contain letters, numbers, spaces, hyphens, dots, and underscores",
      "any.required": "Category name is required",
    }),
});

const getSkillsSchema = Joi.object({
  page: Joi.number().integer().min(1).max(1000).default(1),
  limit: Joi.number().integer().min(1).max(100).default(50),
  search: Joi.string().trim().max(50).optional(), // ✅ FIXED: Reduced max to match model
  sortBy: Joi.string()
    .valid("categoryName", "createdAt", "updatedAt")
    .default("categoryName"),
  order: Joi.string().valid("asc", "desc").default("asc"),
  includeDeleted: Joi.boolean().default(false), // ✅ NEW: Support for soft delete
});

const skillIdSchema = Joi.object({
  id: Joi.string()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .required()
    .messages({
      "string.pattern.base": "Invalid skill category ID format",
      "any.required": "Skill category ID is required",
    }),
});

// ==================== HELPER FUNCTIONS ====================

const sanitizeInput = (input) => {
  if (typeof input === "string") {
    return xss(input.trim(), {
      whiteList: {},
      stripIgnoreTag: true,
      stripIgnoreTagBody: ["script"],
    });
  }
  if (typeof input === "object" && input !== null && !Array.isArray(input)) {
    const sanitized = {};
    for (const [key, value] of Object.entries(input)) {
      sanitized[key] = sanitizeInput(value);
    }
    return sanitized;
  }
  return input;
};

const handleSkillError = (
  error,
  res,
  operation = "Skill operation",
  req = null
) => {
  logger.error(`${operation} error`, {
    error: error.message,
    stack: error.stack,
    ip: req?.ip,
    userAgent: req?.get("User-Agent"),
    adminId: req?.admin?._id,
    requestBody: req?.body,
    params: req?.params,
    timestamp: new Date().toISOString(),
  });

  // Handle specific error types
  if (error.name === "ValidationError") {
    const mongooseErrors = Object.values(error.errors).map((e) => ({
      field: e.path,
      message: e.message,
      value: e.value,
    }));

    return res.status(400).json({
      success: false,
      message: "Validation error",
      code: "VALIDATION_ERROR",
      errors: mongooseErrors,
    });
  }

  if (error.code === 11000) {
    const field = Object.keys(error.keyPattern)[0];
    return res.status(409).json({
      success: false,
      message: `Skill category ${field} already exists`,
      code: "DUPLICATE_KEY_ERROR",
      field: field,
    });
  }

  if (error.name === "CastError") {
    return res.status(400).json({
      success: false,
      message: "Invalid skill category ID format",
      code: "INVALID_ID",
    });
  }

  // Don't expose internal errors in production
  if (process.env.NODE_ENV === "production") {
    return res.status(500).json({
      success: false,
      message: `${operation} failed. Please try again.`,
      code: "SKILL_ERROR",
    });
  }

  return res.status(500).json({
    success: false,
    message: error.message,
    code: "SKILL_ERROR",
  });
};

// ==================== CONTROLLER FUNCTIONS ====================

// CREATE SKILL CATEGORY
const addSkill = async (req, res) => {
  const startTime = Date.now();

  try {
    // ✅ Validate input data
    const { error, value } = createSkillSchema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      logger.warn("Create skill category validation failed", {
        errors: error.details,
        adminId: req.admin?._id,
        ip: req.ip,
        userAgent: req.get("User-Agent"),
        timestamp: new Date().toISOString(),
      });

      return res.status(400).json({
        success: false,
        message: "Validation failed",
        code: "VALIDATION_ERROR",
        errors: error.details.map((detail) => ({
          field: detail.path.join("."),
          message: detail.message,
        })),
      });
    }

    // ✅ Sanitize input to prevent XSS
    const sanitizedData = sanitizeInput(value);
    const { categoryName } = sanitizedData;

    // ✅ Check for duplicate category names (case-insensitive, excluding soft deleted)
    const existingCategory = await SkillCategory.findOne({
      categoryName: { $regex: new RegExp(`^${categoryName}$`, "i") },
      isDeleted: false, // ✅ FIXED: Respect soft delete
    });

    if (existingCategory) {
      logger.warn("Duplicate skill category creation attempt", {
        categoryName,
        existingCategoryId: existingCategory._id,
        adminId: req.admin?._id,
        ip: req.ip,
        userAgent: req.get("User-Agent"),
        timestamp: new Date().toISOString(),
      });

      return res.status(409).json({
        success: false,
        message:
          "Category name already exists. Please choose a different name.",
        code: "CATEGORY_EXISTS",
        existingCategory: {
          id: existingCategory._id,
          name: existingCategory.categoryName,
        },
      });
    }

    // ✅ Create new skill category
    const newCategory = new SkillCategory({
      categoryName: categoryName,
      // ✅ FIXED: Removed manual createdAt/updatedAt - handled by timestamps: true
    });

    await newCategory.save();

    const processingTime = Date.now() - startTime;

    logger.info("Skill category created successfully", {
      categoryId: newCategory._id,
      categoryName: newCategory.categoryName,
      adminId: req.admin?._id,
      ip: req.ip,
      userAgent: req.get("User-Agent"),
      processingTime: `${processingTime}ms`,
      timestamp: new Date().toISOString(),
    });

    res.status(201).json({
      success: true,
      message: "Skill category created successfully",
      code: "CATEGORY_CREATED",
      data: {
        category: {
          id: newCategory._id,
          categoryName: newCategory.categoryName,
          createdAt: newCategory.createdAt,
          updatedAt: newCategory.updatedAt,
          isDeleted: newCategory.isDeleted,
        },
      },
      meta: {
        processingTime: `${processingTime}ms`,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (err) {
    const processingTime = Date.now() - startTime;

    logger.error("Create skill category failed", {
      error: err.message,
      stack: err.stack,
      adminId: req.admin?._id,
      ip: req.ip,
      userAgent: req.get("User-Agent"),
      requestBody: req.body,
      processingTime: `${processingTime}ms`,
      timestamp: new Date().toISOString(),
    });

    return handleSkillError(err, res, "Create skill category", req);
  }
};

// GET ALL SKILL CATEGORIES
const getAllSkills = async (req, res) => {
  const startTime = Date.now();

  try {
    // ✅ Validate query parameters
    const { error, value } = getSkillsSchema.validate(req.query, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      logger.warn("Get skill categories validation failed", {
        errors: error.details,
        ip: req.ip,
        userAgent: req.get("User-Agent"),
        timestamp: new Date().toISOString(),
      });

      return res.status(400).json({
        success: false,
        message: "Validation failed",
        code: "VALIDATION_ERROR",
        errors: error.details.map((detail) => ({
          field: detail.path.join("."),
          message: detail.message,
        })),
      });
    }

    const sanitizedQuery = sanitizeInput(value);
    const { page, limit, search, sortBy, order, includeDeleted } =
      sanitizedQuery;
    const skip = (page - 1) * limit;

    // ✅ Build search filter with soft delete support
    let filter = {};

    // ✅ FIXED: Handle soft delete properly
    if (!includeDeleted) {
      filter.isDeleted = false;
    }

    if (search) {
      filter.categoryName = {
        $regex: search,
        $options: "i",
      };
    }

    // ✅ Build sort object
    const sortObject = {};
    sortObject[sortBy] = order === "asc" ? 1 : -1;

    const [categories, totalCount] = await Promise.all([
      SkillCategory.find(filter)
        .sort(sortObject)
        .skip(skip)
        .limit(limit)
        .lean(), // ✅ Performance optimization

      SkillCategory.countDocuments(filter),
    ]);

    const processingTime = Date.now() - startTime;

    logger.info("Skill categories retrieved successfully", {
      totalCategories: categories.length,
      totalCount,
      page,
      limit,
      search: search || "none",
      sortBy,
      order,
      includeDeleted,
      ip: req.ip,
      userAgent: req.get("User-Agent"),
      processingTime: `${processingTime}ms`,
      timestamp: new Date().toISOString(),
    });

    // ✅ Set cache headers
    res.set({
      "Cache-Control": "public, max-age=300", // 5 minutes for public data
      "X-Total-Count": totalCount.toString(),
    });

    res.status(200).json({
      success: true,
      message: "Skill categories retrieved successfully",
      code: "CATEGORIES_RETRIEVED",
      data: {
        categories,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(totalCount / limit),
          totalItems: totalCount,
          itemsPerPage: limit,
          hasNextPage: page < Math.ceil(totalCount / limit),
          hasPrevPage: page > 1,
        },
        filters: {
          search: search || null,
          sortBy,
          order,
          includeDeleted,
        },
      },
      meta: {
        processingTime: `${processingTime}ms`,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (err) {
    const processingTime = Date.now() - startTime;

    logger.error("Get skill categories failed", {
      error: err.message,
      stack: err.stack,
      query: req.query,
      ip: req.ip,
      userAgent: req.get("User-Agent"),
      processingTime: `${processingTime}ms`,
      timestamp: new Date().toISOString(),
    });

    return handleSkillError(err, res, "Get skill categories", req);
  }
};

// GET SKILL CATEGORY BY ID
const getSkillByID = async (req, res) => {
  const startTime = Date.now();

  try {
    // ✅ Validate skill category ID
    const { error, value } = skillIdSchema.validate(req.params, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      logger.warn("Get skill category by ID validation failed", {
        errors: error.details,
        params: req.params,
        ip: req.ip,
        userAgent: req.get("User-Agent"),
        timestamp: new Date().toISOString(),
      });

      return res.status(400).json({
        success: false,
        message: "Validation failed",
        code: "VALIDATION_ERROR",
        errors: error.details.map((detail) => ({
          field: detail.path.join("."),
          message: detail.message,
        })),
      });
    }

    const { id } = value;

    // ✅ Find skill category (excluding soft deleted by default)
    const category = await SkillCategory.findOne({
      _id: id,
      isDeleted: false, // ✅ FIXED: Respect soft delete
    });

    if (!category) {
      logger.warn("Skill category not found", {
        categoryId: id,
        ip: req.ip,
        userAgent: req.get("User-Agent"),
        timestamp: new Date().toISOString(),
      });

      return res.status(404).json({
        success: false,
        message: "Skill category not found",
        code: "CATEGORY_NOT_FOUND",
      });
    }

    // ✅ Count workers using this category with performance optimization
    const workerCount = await Worker.countDocuments({
      "skillsByCategory.skillCategoryId": category._id,
    });

    const processingTime = Date.now() - startTime;

    logger.info("Skill category retrieved by ID", {
      categoryId: category._id,
      categoryName: category.categoryName,
      workerCount,
      ip: req.ip,
      userAgent: req.get("User-Agent"),
      processingTime: `${processingTime}ms`,
      timestamp: new Date().toISOString(),
    });

    // ✅ Set cache headers
    res.set({
      "Cache-Control": "public, max-age=600", // 10 minutes for single category
      ETag: `"${category._id}-${category.updatedAt.getTime()}"`,
    });

    res.status(200).json({
      success: true,
      message: "Skill category retrieved successfully",
      code: "CATEGORY_RETRIEVED",
      data: {
        category: {
          id: category._id,
          categoryName: category.categoryName,
          createdAt: category.createdAt,
          updatedAt: category.updatedAt,
          isDeleted: category.isDeleted,
          workerCount,
        },
      },
      meta: {
        processingTime: `${processingTime}ms`,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (err) {
    const processingTime = Date.now() - startTime;

    logger.error("Get skill category by ID failed", {
      error: err.message,
      stack: err.stack,
      categoryId: req.params?.id,
      ip: req.ip,
      userAgent: req.get("User-Agent"),
      processingTime: `${processingTime}ms`,
      timestamp: new Date().toISOString(),
    });

    return handleSkillError(err, res, "Get skill category by ID", req);
  }
};

// UPDATE SKILL CATEGORY
const updateSkill = async (req, res) => {
  const startTime = Date.now();

  try {
    // ✅ Validate skill category ID
    const { error: idError, value: idValue } = skillIdSchema.validate(
      req.params,
      {
        abortEarly: false,
        stripUnknown: true,
      }
    );

    if (idError) {
      logger.warn("Update skill category ID validation failed", {
        errors: idError.details,
        params: req.params,
        adminId: req.admin?._id,
        ip: req.ip,
        userAgent: req.get("User-Agent"),
        timestamp: new Date().toISOString(),
      });

      return res.status(400).json({
        success: false,
        message: "Invalid skill category ID",
        code: "VALIDATION_ERROR",
        errors: idError.details.map((detail) => ({
          field: detail.path.join("."),
          message: detail.message,
        })),
      });
    }

    // ✅ Validate request body
    const { error: bodyError, value: bodyValue } = updateSkillSchema.validate(
      req.body,
      {
        abortEarly: false,
        stripUnknown: true,
      }
    );

    if (bodyError) {
      logger.warn("Update skill category body validation failed", {
        errors: bodyError.details,
        adminId: req.admin?._id,
        ip: req.ip,
        userAgent: req.get("User-Agent"),
        timestamp: new Date().toISOString(),
      });

      return res.status(400).json({
        success: false,
        message: "Validation failed",
        code: "VALIDATION_ERROR",
        errors: bodyError.details.map((detail) => ({
          field: detail.path.join("."),
          message: detail.message,
        })),
      });
    }

    // ✅ Sanitize input to prevent XSS
    const sanitizedData = sanitizeInput(bodyValue);
    const { categoryName } = sanitizedData;
    const { id } = idValue;

    // ✅ Find existing category (excluding soft deleted)
    const category = await SkillCategory.findOne({
      _id: id,
      isDeleted: false, // ✅ FIXED: Respect soft delete
    });

    if (!category) {
      logger.warn("Update attempt on non-existent skill category", {
        categoryId: id,
        adminId: req.admin?._id,
        ip: req.ip,
        userAgent: req.get("User-Agent"),
        timestamp: new Date().toISOString(),
      });

      return res.status(404).json({
        success: false,
        message: "Skill category not found",
        code: "CATEGORY_NOT_FOUND",
      });
    }

    // ✅ Check for duplicate category names (excluding current and soft deleted)
    const existingCategory = await SkillCategory.findOne({
      categoryName: { $regex: new RegExp(`^${categoryName}$`, "i") },
      _id: { $ne: id },
      isDeleted: false, // ✅ FIXED: Respect soft delete
    });

    if (existingCategory) {
      logger.warn("Duplicate skill category update attempt", {
        categoryName,
        existingCategoryId: existingCategory._id,
        attemptedUpdateId: id,
        adminId: req.admin?._id,
        ip: req.ip,
        userAgent: req.get("User-Agent"),
        timestamp: new Date().toISOString(),
      });

      return res.status(409).json({
        success: false,
        message:
          "Category name already exists. Please choose a different name.",
        code: "CATEGORY_EXISTS",
        existingCategory: {
          id: existingCategory._id,
          name: existingCategory.categoryName,
        },
      });
    }

    // ✅ Store old category name for audit
    const oldCategoryName = category.categoryName;

    // ✅ Update the category
    category.categoryName = categoryName;
    // ✅ FIXED: Remove manual updatedAt - handled by timestamps: true
    await category.save();

    const processingTime = Date.now() - startTime;

    logger.info("Skill category updated successfully", {
      categoryId: category._id,
      oldCategoryName,
      newCategoryName: category.categoryName,
      adminId: req.admin?._id,
      ip: req.ip,
      userAgent: req.get("User-Agent"),
      processingTime: `${processingTime}ms`,
      timestamp: new Date().toISOString(),
    });

    res.status(200).json({
      success: true,
      message: "Skill category updated successfully",
      code: "CATEGORY_UPDATED",
      data: {
        category: {
          id: category._id,
          categoryName: category.categoryName,
          createdAt: category.createdAt,
          updatedAt: category.updatedAt,
          isDeleted: category.isDeleted,
        },
        changes: {
          oldName: oldCategoryName,
          newName: category.categoryName,
        },
      },
      meta: {
        processingTime: `${processingTime}ms`,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (err) {
    const processingTime = Date.now() - startTime;

    logger.error("Update skill category failed", {
      error: err.message,
      stack: err.stack,
      categoryId: req.params?.id,
      adminId: req.admin?._id,
      ip: req.ip,
      userAgent: req.get("User-Agent"),
      requestBody: req.body,
      processingTime: `${processingTime}ms`,
      timestamp: new Date().toISOString(),
    });

    return handleSkillError(err, res, "Update skill category", req);
  }
};

// DELETE SKILL CATEGORY (SOFT DELETE)
const deleteSkill = async (req, res) => {
  const startTime = Date.now();

  try {
    // ✅ Validate skill category ID
    const { error, value } = skillIdSchema.validate(req.params, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      logger.warn("Delete skill category ID validation failed", {
        errors: error.details,
        params: req.params,
        adminId: req.admin?._id,
        ip: req.ip,
        userAgent: req.get("User-Agent"),
        timestamp: new Date().toISOString(),
      });

      return res.status(400).json({
        success: false,
        message: "Invalid skill category ID",
        code: "VALIDATION_ERROR",
        errors: error.details.map((detail) => ({
          field: detail.path.join("."),
          message: detail.message,
        })),
      });
    }

    const { id } = value;

    // ✅ Find category to delete (excluding already soft deleted)
    const category = await SkillCategory.findOne({
      _id: id,
      isDeleted: false, // ✅ FIXED: Respect soft delete
    });

    if (!category) {
      logger.warn("Delete attempt on non-existent skill category", {
        categoryId: id,
        adminId: req.admin?._id,
        ip: req.ip,
        userAgent: req.get("User-Agent"),
        timestamp: new Date().toISOString(),
      });

      return res.status(404).json({
        success: false,
        message: "Skill category not found",
        code: "CATEGORY_NOT_FOUND",
      });
    }

    // ✅ Count workers with this category
    const workersWithCategory = await Worker.countDocuments({
      "skillsByCategory.skillCategoryId": id,
    });

    // ✅ Store category details for audit log
    const deletedCategoryDetails = {
      id: category._id,
      name: category.categoryName,
      createdAt: category.createdAt,
      affectedWorkers: workersWithCategory,
    };

    // ✅ Remove category from workers if any exist
    if (workersWithCategory > 0) {
      await Worker.updateMany(
        { "skillsByCategory.skillCategoryId": id },
        {
          $pull: {
            skillsByCategory: { skillCategoryId: id },
          },
        }
      );
    }

    // ✅ FIXED: Soft delete instead of hard delete
    category.isDeleted = true;
    await category.save();

    const processingTime = Date.now() - startTime;

    logger.info("Skill category soft deleted successfully", {
      deletedCategory: deletedCategoryDetails,
      adminId: req.admin?._id,
      ip: req.ip,
      userAgent: req.get("User-Agent"),
      processingTime: `${processingTime}ms`,
      timestamp: new Date().toISOString(),
    });

    res.status(200).json({
      success: true,
      message: `Skill category deleted successfully. ${
        workersWithCategory > 0
          ? `Removed from ${workersWithCategory} workers.`
          : "No workers were affected."
      }`,
      code: "CATEGORY_DELETED",
      data: {
        deletedCategory: {
          id: deletedCategoryDetails.id,
          name: deletedCategoryDetails.name,
          createdAt: deletedCategoryDetails.createdAt,
          deletedAt: category.updatedAt, // ✅ Use updatedAt as deletion timestamp
        },
        impact: {
          affectedWorkers: workersWithCategory,
          workersUpdated: workersWithCategory > 0,
        },
      },
      meta: {
        processingTime: `${processingTime}ms`,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (err) {
    const processingTime = Date.now() - startTime;

    logger.error("Delete skill category failed", {
      error: err.message,
      stack: err.stack,
      categoryId: req.params?.id,
      adminId: req.admin?._id,
      ip: req.ip,
      userAgent: req.get("User-Agent"),
      processingTime: `${processingTime}ms`,
      timestamp: new Date().toISOString(),
    });

    return handleSkillError(err, res, "Delete skill category", req);
  }
};

module.exports = {
  addSkill,
  getAllSkills,
  getSkillByID,
  updateSkill,
  deleteSkill,
};
