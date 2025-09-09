const Joi = require("joi");
const xss = require("xss");
const mongoose = require("mongoose");
const { decryptAES128 } = require("../utils/encipher");
//models
const SkillCategory = require("../models/SkillCategory");
const Job = require("../models/Job");
const Client = require("../models/Client");
const Credential = require("../models/Credential");

//utils
const logger = require("../utils/logger");

// ==================== JOI SCHEMAS ====================
const querySchema = Joi.object({
  page: Joi.number().integer().min(1).max(1000).default(1),
  limit: Joi.number().integer().min(1).max(100).default(10),
  category: Joi.string()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .optional()
    .messages({
      "string.pattern.base": "Invalid category ID format",
    }),
  location: Joi.string().trim().min(2).max(200).optional().messages({
    "string.min": "Location must be at least 2 characters",
    "string.max": "Location cannot exceed 200 characters",
  }),
  search: Joi.string().trim().min(2).max(100).optional().messages({
    "string.min": "Search term must be at least 2 characters",
    "string.max": "Search term cannot exceed 100 characters",
  }),
  status: Joi.string()
    .valid("open", "hired", "in_progress", "completed", "cancelled")
    .optional()
    .messages({
      "any.only":
        "Status must be one of: open, hired, in_progress, completed, cancelled",
    }),
  sortBy: Joi.string()
    .valid("createdAt", "price", "updatedAt")
    .default("createdAt"),
  order: Joi.string().valid("asc", "desc").default("desc"),
});

const jobSchema = Joi.object({
  description: Joi.string().trim().min(20).max(2000).required().messages({
    "string.min": "Description must be at least 20 characters",
    "string.max": "Description cannot exceed 2000 characters",
    "any.required": "Description is required",
  }),

  price: Joi.number().min(0).max(1000000).required().messages({
    "number.min": "Price cannot be negative",
    "number.max": "Price cannot exceed 1,000,000",
    "any.required": "Price is required",
  }),

  location: Joi.string().trim().min(2).max(200).required().messages({
    "string.min": "Location must be at least 2 characters",
    "string.max": "Location must be 200 characters or less",
    "any.required": "Location is required",
  }),

  category: Joi.string()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .required()
    .messages({
      "string.pattern.base": "Invalid category ID format",
      "any.required": "Category is required",
    }),
});

const updateJobSchema = Joi.object({
  description: Joi.string().trim().min(20).max(2000).optional().messages({
    "string.min": "Description must be at least 20 characters",
    "string.max": "Description cannot exceed 2000 characters",
  }),

  price: Joi.number().min(0).max(1000000).optional().messages({
    "number.min": "Price cannot be negative",
    "number.max": "Price cannot exceed 1,000,000",
  }),

  location: Joi.string().trim().min(2).max(200).optional().messages({
    "string.min": "Location must be at least 2 characters",
    "string.max": "Location must be 200 characters or less",
  }),

  category: Joi.string()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .optional()
    .messages({
      "string.pattern.base": "Invalid category ID format",
    }),

  status: Joi.string()
    .valid("open", "hired", "in_progress", "completed", "cancelled")
    .optional()
    .messages({
      "any.only":
        "Status must be one of: open, hired, in_progress, completed, cancelled",
    }),
});

const paramIdSchema = Joi.object({
  id: Joi.string()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .required()
    .messages({
      "string.pattern.base": "Invalid ID format",
      "any.required": "ID is required",
    }),
});

const categoryParamSchema = Joi.object({
  categoryId: Joi.string()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .required()
    .messages({
      "string.pattern.base": "Invalid category ID format",
      "any.required": "Category ID is required",
    }),
});

const locationParamSchema = Joi.object({
  location: Joi.string().trim().min(2).max(200).required().messages({
    "string.min": "Location must be at least 2 characters",
    "string.max": "Location cannot exceed 200 characters",
    "any.required": "Location is required",
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

const isContentAppropriate = (text) => {
  const cleanText = text.toLowerCase().trim();

  // Comprehensive bad words list
  const badWords = [
    // Profanity
    "fuck",
    "shit",
    "damn",
    "bitch",
    "asshole",
    "bastard",
    "crap",
    "piss",
    "hell",
    "bloody",
    "goddamn",
    "motherfucker",
    "cocksucker",
    "dickhead",

    // Sexual content
    "sex",
    "porn",
    "nude",
    "naked",
    "sexual",
    "erotic",
    "adult",
    "xxx",
    "escort",
    "massage",
    "intimate",
    "sensual",
    "fetish",
    "kinky",

    // Inappropriate services
    "prostitution",
    "drugs",
    "weed",
    "marijuana",
    "cocaine",
    "heroin",
    "gambling",
    "casino",
    "betting",
    "loan shark",
    "money laundering",

    // Violence/Illegal
    "kill",
    "murder",
    "weapon",
    "gun",
    "knife",
    "bomb",
    "explosive",
    "terrorist",
    "violence",
    "assault",
    "abuse",
    "threat",
    "blackmail",

    // Scam/Fraud
    "scam",
    "fraud",
    "fake",
    "counterfeit",
    "illegal",
    "stolen",
    "pirated",
    "cheat",
    "deceive",
    "ponzi",
    "pyramid scheme",
    "mlm scam",

    // Discriminatory
    "racist",
    "sexist",
    "homophobic",
    "discrimination",
    "hate",
    "nazi",

    // Filipino bad words
    "putang",
    "gago",
    "tanga",
    "bobo",
    "ulol",
    "kingina",
    "pakyu",
    "buwisit",
    "hayup",
    "puta",
    "tangina",
    "kupal",
    "peste",
    "titi",
  ];

  // Check for bad words
  const badWordPattern = new RegExp("\\b(" + badWords.join("|") + ")\\b", "gi");
  if (badWordPattern.test(cleanText)) {
    return { isAppropriate: false, reason: "Contains inappropriate language" };
  }

  // Suspicious patterns
  const suspiciousPatterns = [
    /\b(easy money|quick cash|work from home scam|get rich quick)\b/gi,
    /\b(no experience needed.{0,50}high pay)\b/gi,
    /\b(guaranteed.{0,20}(money|income|profit))\b/gi,
    /\b(adult entertainment|escort service|massage parlor)\b/gi,
    /\b(click here|visit my website|buy now)\b/gi,
    /\b(investment opportunity|cryptocurrency|bitcoin|forex)\b/gi,
  ];

  for (const pattern of suspiciousPatterns) {
    if (pattern.test(cleanText)) {
      return {
        isAppropriate: false,
        reason: "Contains suspicious content patterns",
      };
    }
  }

  return { isAppropriate: true };
};

// ✅ ENHANCED: Helper function to optimize job data for frontend
const optimizeJobForResponse = (job) => {
  let clientName = "Anonymous Client";

  // Handle different job structures (aggregation vs populate)
  const client = job.client || job.clientId;

  if (client && client.firstName) {
    try {
      const decryptedFirstName = decryptAES128(client.firstName);
      const decryptedLastName = client.lastName
        ? decryptAES128(client.lastName)
        : "";
      clientName = `${decryptedFirstName} ${decryptedLastName}`.trim();
    } catch (error) {
      logger.warn("Failed to decrypt client name", {
        jobId: job._id,
        clientId: client._id,
        error: error.message,
        timestamp: new Date().toISOString(),
      });
      clientName = "Anonymous Client";
    }
  }

  // ✅ OPTIMIZED: Return only what frontend needs
  return {
    id: job._id,
    description: job.description,
    price: job.price,
    location: job.location,
    status: job.status,
    createdAt: job.createdAt,
    updatedAt: job.updatedAt,
    category: {
      id: job.category?._id || job.category,
      name:
        job.categoryName || job.category?.categoryName || "Unknown Category",
    },
    client: {
      name: clientName, // ✅ Decrypted client name
      profilePicture: client?.profilePicture?.url || null,
      isVerified: true, // ✅ All clients are verified at this point
    },
    hiredWorker: job.hiredWorker
      ? {
          id: job.hiredWorker._id,
          name:
            `${job.hiredWorker.firstName || ""} ${
              job.hiredWorker.lastName || ""
            }`.trim() || "Unknown Worker",
          profilePicture: job.hiredWorker.profilePicture?.url || null,
        }
      : null,
  };
};

const handleJobError = (
  error,
  res,
  operation = "Job operation",
  req = null
) => {
  logger.error(`${operation} error`, {
    error: error.message,
    stack: error.stack,
    userId: req?.user?.id,
    ip: req?.ip,
    userAgent: req?.get("User-Agent"),
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
    return res.status(409).json({
      success: false,
      message: "Duplicate job detected",
      code: "DUPLICATE_ERROR",
    });
  }

  // Don't expose internal errors in production
  if (process.env.NODE_ENV === "production") {
    return res.status(500).json({
      success: false,
      message: `${operation} failed. Please try again.`,
      code: "JOB_ERROR",
    });
  }

  return res.status(500).json({
    success: false,
    message: error.message,
    code: "JOB_ERROR",
  });
};

// ==================== CONTROLLERS ====================

// ✅ FIXED: Get all jobs (public, only verified/not deleted) with pagination & filtering
const getAllJobs = async (req, res) => {
  const startTime = Date.now();

  try {
    // ✅ Validate query parameters
    const { error, value } = querySchema.validate(req.query, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      logger.warn("Get all jobs validation failed", {
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

    // ✅ Sanitize all inputs
    const sanitizedQuery = sanitizeInput(value);
    const { page, limit, category, location, search, status, sortBy, order } =
      sanitizedQuery;

    // Build filter - only show verified jobs from verified clients
    const filter = {
      isVerified: true,
      isDeleted: false,
    };

    // Category filter
    if (category) {
      filter.category = category;
    }

    // Location filter (case-insensitive partial match)
    if (location) {
      filter.location = { $regex: location, $options: "i" };
    }

    // Status filter
    if (status) {
      filter.status = status;
    }

    // Search filter (search in description)
    if (search) {
      filter.description = { $regex: search, $options: "i" };
    }

    const sortOrder = order === "asc" ? 1 : -1;

    // ✅ FIXED: Use same approach as other functions with client verification
    const jobs = await Job.find(filter)
      .populate({
        path: "clientId",
        select: "firstName lastName profilePicture",
        populate: {
          path: "credentialId",
          match: { isVerified: true, isBlocked: { $ne: true } },
          select: "email",
        },
      })
      .populate("category", "categoryName")
      .populate("hiredWorker", "firstName lastName profilePicture")
      .sort({ [sortBy]: sortOrder })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(); // ✅ Performance optimization

    // ✅ Filter out jobs from unverified clients (same as other functions)
    const verifiedJobs = jobs.filter((job) => job.clientId?.credentialId);

    // ✅ Handle no jobs found
    if (!verifiedJobs || verifiedJobs.length === 0) {
      return res.status(200).json({
        success: true,
        message: "No jobs found",
        code: "NO_JOBS_FOUND",
        data: {
          jobs: [],
          pagination: {
            currentPage: page,
            totalPages: 0,
            totalItems: 0,
            itemsPerPage: limit,
            hasNextPage: false,
            hasPrevPage: page > 1,
          },
          filters: {
            category,
            location,
            search,
            status,
            sortBy,
            order,
          },
        },
        meta: {
          processingTime: `${Date.now() - startTime}ms`,
          timestamp: new Date().toISOString(),
        },
      });
    }

    // ✅ Get total count for pagination (only verified jobs)
    const totalCount = await Job.countDocuments({
      ...filter,
      clientId: {
        $in: await Client.find({
          credentialId: {
            $in: await Credential.find({
              isVerified: true,
              isBlocked: { $ne: true },
              userType: "client",
            }).distinct("_id"),
          },
        }).distinct("_id"),
      },
    });

    const processingTime = Date.now() - startTime;

    // ✅ FIXED: Use verifiedJobs and apply optimization with name decryption
    const optimizedJobs = verifiedJobs.map(optimizeJobForResponse);

    logger.info("Jobs retrieved successfully", {
      totalJobs: verifiedJobs.length,
      totalCount,
      page,
      limit,
      filters: { category, location, search, status },
      ip: req.ip,
      userAgent: req.get("User-Agent"),
      processingTime: `${processingTime}ms`,
      timestamp: new Date().toISOString(),
    });

    // ✅ Set cache headers for public endpoint
    res.set({
      "Cache-Control": "public, max-age=300", // 5 minutes
      ETag: `"jobs-${Date.now()}"`,
      "X-Total-Count": totalCount.toString(),
    });

    res.status(200).json({
      success: true,
      message: "Jobs retrieved successfully",
      code: "JOBS_RETRIEVED",
      data: {
        jobs: optimizedJobs, // ✅ Now with decrypted client names
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(totalCount / limit),
          totalItems: totalCount,
          itemsPerPage: limit,
          hasNextPage: page < Math.ceil(totalCount / limit),
          hasPrevPage: page > 1,
        },
        filters: {
          category,
          location,
          search,
          status,
          sortBy,
          order,
        },
      },
      meta: {
        processingTime: `${processingTime}ms`,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (err) {
    const processingTime = Date.now() - startTime;

    logger.error("Get all jobs failed", {
      error: err.message,
      stack: err.stack,
      ip: req.ip,
      userAgent: req.get("User-Agent"),
      processingTime: `${processingTime}ms`,
      timestamp: new Date().toISOString(),
    });

    return handleJobError(err, res, "Get all jobs", req);
  }
};

// Get jobs by category
const getJobsByCategory = async (req, res) => {
  const startTime = Date.now();

  try {
    // ✅ Validate parameters
    const { error: paramError, value: paramValue } =
      categoryParamSchema.validate(req.params, {
        abortEarly: false,
        stripUnknown: true,
      });

    if (paramError) {
      logger.warn("Get jobs by category param validation failed", {
        errors: paramError.details,
        params: req.params,
        ip: req.ip,
        timestamp: new Date().toISOString(),
      });

      return res.status(400).json({
        success: false,
        message: "Invalid category ID",
        code: "INVALID_PARAM",
        errors: paramError.details.map((detail) => ({
          field: detail.path.join("."),
          message: detail.message,
        })),
      });
    }

    // ✅ Validate query parameters
    const { error: queryError, value: queryValue } = querySchema.validate(
      req.query,
      {
        abortEarly: false,
        stripUnknown: true,
      }
    );

    if (queryError) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        code: "VALIDATION_ERROR",
        errors: queryError.details.map((detail) => ({
          field: detail.path.join("."),
          message: detail.message,
        })),
      });
    }

    const { categoryId } = sanitizeInput(paramValue);
    const sanitizedQuery = sanitizeInput(queryValue);
    const { page, limit, location, status, sortBy, order } = sanitizedQuery;

    // ✅ Verify category exists
    const category = await SkillCategory.findById(categoryId);
    if (!category) {
      logger.warn("Jobs requested for non-existent category", {
        categoryId,
        ip: req.ip,
        timestamp: new Date().toISOString(),
      });

      return res.status(404).json({
        success: false,
        message: "Category not found",
        code: "CATEGORY_NOT_FOUND",
      });
    }

    // Build filter
    const filter = {
      category: categoryId,
      isVerified: true,
      isDeleted: false,
    };

    // Add location filter if provided
    if (location) {
      filter.location = { $regex: location, $options: "i" };
    }

    // Add status filter if provided
    if (status) {
      filter.status = status;
    }

    const sortOrder = order === "asc" ? 1 : -1;

    const jobs = await Job.find(filter)
      .populate({
        path: "clientId",
        select: "firstName lastName profilePicture",
        populate: {
          path: "credentialId",
          match: { isVerified: true, isBlocked: { $ne: true } },
          select: "email",
        },
      })
      .populate("category", "categoryName")
      .populate("hiredWorker", "firstName lastName")
      .sort({ [sortBy]: sortOrder })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(); // ✅ Performance optimization

    // Filter out jobs from unverified clients
    const verifiedJobs = jobs.filter((job) => job.clientId?.credentialId);

    const totalCount = await Job.countDocuments({
      ...filter,
      clientId: {
        $in: await Client.find({
          credentialId: {
            $in: await Credential.find({
              isVerified: true,
              isBlocked: { $ne: true },
              userType: "client",
            }).distinct("_id"),
          },
        }).distinct("_id"),
      },
    });

    const processingTime = Date.now() - startTime;

    // ✅ FIXED: Use verifiedJobs instead of jobs
    const optimizedJobs = verifiedJobs.map(optimizeJobForResponse);

    logger.info("Jobs by category retrieved successfully", {
      categoryId,
      categoryName: category.categoryName,
      totalJobs: verifiedJobs.length,
      totalCount,
      page,
      limit,
      ip: req.ip,
      userAgent: req.get("User-Agent"),
      processingTime: `${processingTime}ms`,
      timestamp: new Date().toISOString(),
    });

    res.status(200).json({
      success: true,
      message: `Jobs in ${category.categoryName} category retrieved successfully`,
      code: "JOBS_BY_CATEGORY_RETRIEVED",
      data: {
        category: {
          id: category._id,
          name: category.categoryName,
        },
        jobs: optimizedJobs,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(totalCount / limit),
          totalItems: totalCount,
          itemsPerPage: limit,
          hasNextPage: page < Math.ceil(totalCount / limit),
          hasPrevPage: page > 1,
        },
        filters: {
          location,
          status,
          sortBy,
          order,
        },
      },
      meta: {
        processingTime: `${processingTime}ms`,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (err) {
    const processingTime = Date.now() - startTime;

    logger.error("Get jobs by category failed", {
      error: err.message,
      stack: err.stack,
      categoryId: req.params?.categoryId,
      ip: req.ip,
      userAgent: req.get("User-Agent"),
      processingTime: `${processingTime}ms`,
      timestamp: new Date().toISOString(),
    });

    return handleJobError(err, res, "Get jobs by category", req);
  }
};

// Get jobs by location
const getJobsByLocation = async (req, res) => {
  const startTime = Date.now();

  try {
    // ✅ Validate parameters
    const { error: paramError, value: paramValue } =
      locationParamSchema.validate(req.params, {
        abortEarly: false,
        stripUnknown: true,
      });

    if (paramError) {
      logger.warn("Get jobs by location param validation failed", {
        errors: paramError.details,
        params: req.params,
        ip: req.ip,
        timestamp: new Date().toISOString(),
      });

      return res.status(400).json({
        success: false,
        message: "Invalid location parameter",
        code: "INVALID_PARAM",
        errors: paramError.details.map((detail) => ({
          field: detail.path.join("."),
          message: detail.message,
        })),
      });
    }

    // ✅ Validate query parameters
    const { error: queryError, value: queryValue } = querySchema.validate(
      req.query,
      {
        abortEarly: false,
        stripUnknown: true,
      }
    );

    if (queryError) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        code: "VALIDATION_ERROR",
        errors: queryError.details.map((detail) => ({
          field: detail.path.join("."),
          message: detail.message,
        })),
      });
    }

    const { location } = sanitizeInput(paramValue);
    const sanitizedQuery = sanitizeInput(queryValue);
    const { page, limit, category, status, sortBy, order } = sanitizedQuery;

    // Build filter
    const filter = {
      location: { $regex: location, $options: "i" },
      isVerified: true,
      isDeleted: false,
    };

    // Add category filter if provided
    if (category) {
      filter.category = category;
    }

    // Add status filter if provided
    if (status) {
      filter.status = status;
    }

    const sortOrder = order === "asc" ? 1 : -1;

    const jobs = await Job.find(filter)
      .populate({
        path: "clientId",
        select: "firstName lastName profilePicture",
        populate: {
          path: "credentialId",
          match: { isVerified: true, isBlocked: { $ne: true } },
          select: "email",
        },
      })
      .populate("category", "categoryName")
      .populate("hiredWorker", "firstName lastName")
      .sort({ [sortBy]: sortOrder })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(); // ✅ Performance optimization

    // Filter out jobs from unverified clients
    const verifiedJobs = jobs.filter((job) => job.clientId?.credentialId);

    const totalCount = await Job.countDocuments({
      ...filter,
      clientId: {
        $in: await Client.find({
          credentialId: {
            $in: await Credential.find({
              isVerified: true,
              isBlocked: { $ne: true },
              userType: "client",
            }).distinct("_id"),
          },
        }).distinct("_id"),
      },
    });

    // ✅ Get location statistics
    const locationStats = await Job.aggregate([
      {
        $match: {
          location: { $regex: location, $options: "i" },
          isVerified: true,
          isDeleted: false,
        },
      },
      {
        $group: {
          _id: "$location",
          count: { $sum: 1 },
          avgPrice: { $avg: "$price" },
          maxPrice: { $max: "$price" },
          minPrice: { $min: "$price" },
        },
      },
      { $sort: { count: -1 } },
      { $limit: 5 },
    ]);

    const processingTime = Date.now() - startTime;

    // ✅ FIXED: Use verifiedJobs instead of jobs
    const optimizedJobs = verifiedJobs.map(optimizeJobForResponse);

    logger.info("Jobs by location retrieved successfully", {
      location,
      totalJobs: verifiedJobs.length,
      totalCount,
      page,
      limit,
      ip: req.ip,
      userAgent: req.get("User-Agent"),
      processingTime: `${processingTime}ms`,
      timestamp: new Date().toISOString(),
    });

    res.status(200).json({
      success: true,
      message: `Jobs in ${location} retrieved successfully`,
      code: "JOBS_BY_LOCATION_RETRIEVED",
      data: {
        location: location,
        jobs: optimizedJobs,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(totalCount / limit),
          totalItems: totalCount,
          itemsPerPage: limit,
          hasNextPage: page < Math.ceil(totalCount / limit),
          hasPrevPage: page > 1,
        },
        filters: {
          category,
          status,
          sortBy,
          order,
        },
        locationStats,
      },
      meta: {
        processingTime: `${processingTime}ms`,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (err) {
    const processingTime = Date.now() - startTime;

    logger.error("Get jobs by location failed", {
      error: err.message,
      stack: err.stack,
      location: req.params?.location,
      ip: req.ip,
      userAgent: req.get("User-Agent"),
      processingTime: `${processingTime}ms`,
      timestamp: new Date().toISOString(),
    });

    return handleJobError(err, res, "Get jobs by location", req);
  }
};

// Get single job by ID
const getJobById = async (req, res) => {
  const startTime = Date.now();

  try {
    // ✅ Validate parameters
    const { error, value } = paramIdSchema.validate(req.params, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      logger.warn("Get job by ID param validation failed", {
        errors: error.details,
        params: req.params,
        ip: req.ip,
        timestamp: new Date().toISOString(),
      });

      return res.status(400).json({
        success: false,
        message: "Invalid job ID",
        code: "INVALID_PARAM",
        errors: error.details.map((detail) => ({
          field: detail.path.join("."),
          message: detail.message,
        })),
      });
    }

    const { id } = sanitizeInput(value);

    const job = await Job.findOne({
      _id: id,
      isDeleted: false,
    })
      .populate("category", "categoryName")
      .populate({
        path: "clientId",
        select: "firstName lastName profilePicture",
        populate: {
          path: "credentialId",
          match: { isVerified: true, isBlocked: { $ne: true } },
          select: "email",
        },
      })
      .populate("hiredWorker", "firstName lastName profilePicture")
      .lean(); // ✅ Performance optimization

    if (!job || !job.clientId?.credentialId) {
      logger.warn("Job not found or client not verified", {
        jobId: id,
        jobExists: !!job,
        clientVerified: !!job?.clientId?.credentialId,
        ip: req.ip,
        timestamp: new Date().toISOString(),
      });

      return res.status(404).json({
        success: false,
        message: "Job not found or client not verified",
        code: "JOB_NOT_FOUND",
      });
    }

    const processingTime = Date.now() - startTime;

    // ✅ Optimize single job for response
    const optimizedJob = optimizeJobForResponse(job);

    logger.info("Job retrieved successfully", {
      jobId: id,
      clientId: job.clientId._id,
      category: job.category?.categoryName,
      ip: req.ip,
      userAgent: req.get("User-Agent"),
      processingTime: `${processingTime}ms`,
      timestamp: new Date().toISOString(),
    });

    // ✅ Set cache headers for public endpoint
    res.set({
      "Cache-Control": "public, max-age=600", // 10 minutes cache for single job
      ETag: `"job-${job._id}-${job.updatedAt}"`,
    });

    res.status(200).json({
      success: true,
      message: "Job retrieved successfully",
      code: "JOB_RETRIEVED",
      data: optimizedJob,
      meta: {
        processingTime: `${processingTime}ms`,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (err) {
    const processingTime = Date.now() - startTime;

    logger.error("Get job by ID failed", {
      error: err.message,
      stack: err.stack,
      jobId: req.params?.id,
      ip: req.ip,
      userAgent: req.get("User-Agent"),
      processingTime: `${processingTime}ms`,
      timestamp: new Date().toISOString(),
    });

    return handleJobError(err, res, "Get job by ID", req);
  }
};

// Create a job (only verified clients) with content filtering
const postJob = async (req, res) => {
  const startTime = Date.now();

  try {
    // ✅ Verify user authentication and type
    if (!req.user || req.user.userType !== "client") {
      logger.warn("Non-client attempted to post job", {
        userId: req.user?.id,
        userType: req.user?.userType,
        ip: req.ip,
        timestamp: new Date().toISOString(),
      });

      return res.status(401).json({
        success: false,
        message: "Only clients can post jobs",
        code: "CLIENT_AUTH_REQUIRED",
      });
    }

    // ✅ Validate input data
    const { error, value } = jobSchema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      logger.warn("Job creation validation failed", {
        errors: error.details,
        userId: req.user.id,
        ip: req.ip,
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

    // ✅ Sanitize all inputs
    const sanitizedData = sanitizeInput(value);
    const { description, price, location, category } = sanitizedData;

    // ✅ Check if client is verified
    const clientCredential = await Credential.findById(req.user.id);
    if (!clientCredential || !clientCredential.isVerified) {
      logger.warn("Unverified client attempted to post job", {
        userId: req.user.id,
        isVerified: clientCredential?.isVerified,
        ip: req.ip,
        timestamp: new Date().toISOString(),
      });

      return res.status(403).json({
        success: false,
        message: "Only verified clients can post jobs",
        code: "CLIENT_NOT_VERIFIED",
      });
    }

    if (clientCredential.isBlocked) {
      logger.warn("Blocked client attempted to post job", {
        userId: req.user.id,
        ip: req.ip,
        timestamp: new Date().toISOString(),
      });

      return res.status(403).json({
        success: false,
        message: "Your account is blocked",
        code: "CLIENT_BLOCKED",
      });
    }

    // ✅ Content moderation check
    const contentCheck = isContentAppropriate(description);
    if (!contentCheck.isAppropriate) {
      logger.warn("Inappropriate content detected in job post", {
        userId: req.user.id,
        reason: contentCheck.reason,
        description: description.substring(0, 100) + "...",
        ip: req.ip,
        timestamp: new Date().toISOString(),
      });

      return res.status(400).json({
        success: false,
        message: "Content does not meet our community guidelines",
        code: "INAPPROPRIATE_CONTENT",
        reason: contentCheck.reason,
      });
    }

    // ✅ Validate category exists
    const categoryExists = await SkillCategory.findById(category);
    if (!categoryExists) {
      logger.warn("Job creation attempted with non-existent category", {
        categoryId: category,
        userId: req.user.id,
        ip: req.ip,
        timestamp: new Date().toISOString(),
      });

      return res.status(400).json({
        success: false,
        message: "Category does not exist",
        code: "CATEGORY_NOT_FOUND",
      });
    }

    // ✅ Find client profile
    const clientProfile = await Client.findOne({ credentialId: req.user.id });
    if (!clientProfile) {
      logger.error("Client profile not found for verified user", {
        userId: req.user.id,
        ip: req.ip,
        timestamp: new Date().toISOString(),
      });

      return res.status(400).json({
        success: false,
        message: "Client profile not found",
        code: "CLIENT_PROFILE_NOT_FOUND",
      });
    }

    // ✅ Create job
    const job = new Job({
      clientId: clientProfile._id,
      description: description.trim(),
      price: price,
      location: location.trim(),
      category,
      status: "open",
      isVerified: false,
      isDeleted: false,
      hiredWorker: null,
    });

    await job.save();

    // ✅ Populate job with category info for response
    await job.populate("category", "categoryName");

    const processingTime = Date.now() - startTime;

    logger.info("Job created successfully", {
      jobId: job._id,
      clientId: clientProfile._id,
      category: categoryExists.categoryName,
      price: job.price,
      location: job.location,
      userId: req.user.id,
      ip: req.ip,
      userAgent: req.get("User-Agent"),
      processingTime: `${processingTime}ms`,
      timestamp: new Date().toISOString(),
    });

    res.status(201).json({
      success: true,
      message: "Job created successfully",
      code: "JOB_CREATED",
      data: job,
      meta: {
        processingTime: `${processingTime}ms`,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (err) {
    const processingTime = Date.now() - startTime;

    logger.error("Job creation failed", {
      error: err.message,
      stack: err.stack,
      userId: req.user?.id,
      requestBody: req.body,
      ip: req.ip,
      userAgent: req.get("User-Agent"),
      processingTime: `${processingTime}ms`,
      timestamp: new Date().toISOString(),
    });

    return handleJobError(err, res, "Job creation", req);
  }
};

// Update a job (only owner)
const updateJob = async (req, res) => {
  const startTime = Date.now();

  try {
    // ✅ Validate parameters
    const { error: paramError, value: paramValue } = paramIdSchema.validate(
      req.params,
      {
        abortEarly: false,
        stripUnknown: true,
      }
    );

    if (paramError) {
      logger.warn("Update job param validation failed", {
        errors: paramError.details,
        params: req.params,
        userId: req.user?.id,
        ip: req.ip,
        timestamp: new Date().toISOString(),
      });

      return res.status(400).json({
        success: false,
        message: "Invalid job ID",
        code: "INVALID_PARAM",
        errors: paramError.details.map((detail) => ({
          field: detail.path.join("."),
          message: detail.message,
        })),
      });
    }

    // ✅ Verify user authentication and type
    if (!req.user || req.user.userType !== "client") {
      logger.warn("Non-client attempted to update job", {
        userId: req.user?.id,
        userType: req.user?.userType,
        ip: req.ip,
        timestamp: new Date().toISOString(),
      });

      return res.status(401).json({
        success: false,
        message: "Only clients can update jobs",
        code: "CLIENT_AUTH_REQUIRED",
      });
    }

    // ✅ Validate update data
    const { error: bodyError, value: bodyValue } = updateJobSchema.validate(
      req.body,
      {
        abortEarly: false,
        stripUnknown: true,
      }
    );

    if (bodyError) {
      logger.warn("Job update validation failed", {
        errors: bodyError.details,
        userId: req.user.id,
        ip: req.ip,
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

    const { id } = sanitizeInput(paramValue);
    const sanitizedUpdateData = sanitizeInput(bodyValue);

    // ✅ Find job
    const job = await Job.findById(id);
    if (!job || job.isDeleted) {
      logger.warn("Job update attempted on non-existent or deleted job", {
        jobId: id,
        userId: req.user.id,
        jobExists: !!job,
        isDeleted: job?.isDeleted,
        ip: req.ip,
        timestamp: new Date().toISOString(),
      });

      return res.status(404).json({
        success: false,
        message: "Job not found",
        code: "JOB_NOT_FOUND",
      });
    }

    // ✅ Find client profile to verify ownership
    const clientProfile = await Client.findOne({ credentialId: req.user.id });
    if (!clientProfile) {
      logger.error("Client profile not found during job update", {
        userId: req.user.id,
        jobId: id,
        ip: req.ip,
        timestamp: new Date().toISOString(),
      });

      return res.status(400).json({
        success: false,
        message: "Client profile not found",
        code: "CLIENT_PROFILE_NOT_FOUND",
      });
    }

    // ✅ Verify ownership
    if (job.clientId.toString() !== clientProfile._id.toString()) {
      logger.warn("Unauthorized job update attempt", {
        jobId: id,
        jobOwnerId: job.clientId,
        requesterId: clientProfile._id,
        userId: req.user.id,
        ip: req.ip,
        timestamp: new Date().toISOString(),
      });

      return res.status(403).json({
        success: false,
        message: "Only the job owner can update this job",
        code: "OWNERSHIP_REQUIRED",
      });
    }

    // ✅ Check if job is verified (admin-approved)
    if (job.isVerified) {
      logger.warn("Attempt to update verified job", {
        jobId: id,
        userId: req.user.id,
        ip: req.ip,
        timestamp: new Date().toISOString(),
      });

      return res.status(403).json({
        success: false,
        message: "Cannot edit a job that has already been verified by admin",
        code: "JOB_VERIFIED",
      });
    }

    // ✅ Content moderation for description updates
    if (sanitizedUpdateData.description) {
      const contentCheck = isContentAppropriate(
        sanitizedUpdateData.description
      );
      if (!contentCheck.isAppropriate) {
        logger.warn("Inappropriate content detected in job update", {
          jobId: id,
          userId: req.user.id,
          reason: contentCheck.reason,
          description:
            sanitizedUpdateData.description.substring(0, 100) + "...",
          ip: req.ip,
          timestamp: new Date().toISOString(),
        });

        return res.status(400).json({
          success: false,
          message: "Content does not meet our community guidelines",
          code: "INAPPROPRIATE_CONTENT",
          reason: contentCheck.reason,
        });
      }
    }

    // ✅ Validate category if being updated
    if (sanitizedUpdateData.category) {
      const categoryExists = await SkillCategory.findById(
        sanitizedUpdateData.category
      );
      if (!categoryExists) {
        logger.warn("Job update attempted with non-existent category", {
          categoryId: sanitizedUpdateData.category,
          jobId: id,
          userId: req.user.id,
          ip: req.ip,
          timestamp: new Date().toISOString(),
        });

        return res.status(400).json({
          success: false,
          message: "Category does not exist",
          code: "CATEGORY_NOT_FOUND",
        });
      }
    }

    // ✅ Update job fields
    const updateFields = {};
    const changedFields = [];

    for (const [field, value] of Object.entries(sanitizedUpdateData)) {
      if (value !== undefined && job[field] !== value) {
        updateFields[field] = value;
        changedFields.push(field);
      }
    }

    if (Object.keys(updateFields).length === 0) {
      return res.status(400).json({
        success: false,
        message: "No changes detected",
        code: "NO_CHANGES",
      });
    }

    // ✅ Apply updates
    Object.assign(job, updateFields);
    const updatedJob = await job.save();
    await updatedJob.populate("category", "categoryName");

    const processingTime = Date.now() - startTime;

    logger.info("Job updated successfully", {
      jobId: id,
      clientId: clientProfile._id,
      changedFields,
      userId: req.user.id,
      ip: req.ip,
      userAgent: req.get("User-Agent"),
      processingTime: `${processingTime}ms`,
      timestamp: new Date().toISOString(),
    });

    res.status(200).json({
      success: true,
      message: "Job updated successfully",
      code: "JOB_UPDATED",
      data: updatedJob,
      meta: {
        changedFields,
        processingTime: `${processingTime}ms`,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (err) {
    const processingTime = Date.now() - startTime;

    logger.error("Job update failed", {
      error: err.message,
      stack: err.stack,
      jobId: req.params?.id,
      userId: req.user?.id,
      requestBody: req.body,
      ip: req.ip,
      userAgent: req.get("User-Agent"),
      processingTime: `${processingTime}ms`,
      timestamp: new Date().toISOString(),
    });

    return handleJobError(err, res, "Job update", req);
  }
};

// Soft delete a job (only owner)
const deleteJob = async (req, res) => {
  const startTime = Date.now();

  try {
    // ✅ Validate parameters
    const { error, value } = paramIdSchema.validate(req.params, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      logger.warn("Delete job param validation failed", {
        errors: error.details,
        params: req.params,
        userId: req.user?.id,
        ip: req.ip,
        timestamp: new Date().toISOString(),
      });

      return res.status(400).json({
        success: false,
        message: "Invalid job ID",
        code: "INVALID_PARAM",
        errors: error.details.map((detail) => ({
          field: detail.path.join("."),
          message: detail.message,
        })),
      });
    }

    // ✅ Verify user authentication and type
    if (!req.user || req.user.userType !== "client") {
      logger.warn("Non-client attempted to delete job", {
        userId: req.user?.id,
        userType: req.user?.userType,
        ip: req.ip,
        timestamp: new Date().toISOString(),
      });

      return res.status(401).json({
        success: false,
        message: "Only clients can delete jobs",
        code: "CLIENT_AUTH_REQUIRED",
      });
    }

    const { id } = sanitizeInput(value);

    // ✅ Find job
    const job = await Job.findById(id);
    if (!job || job.isDeleted) {
      logger.warn(
        "Job deletion attempted on non-existent or already deleted job",
        {
          jobId: id,
          userId: req.user.id,
          jobExists: !!job,
          isDeleted: job?.isDeleted,
          ip: req.ip,
          timestamp: new Date().toISOString(),
        }
      );

      return res.status(404).json({
        success: false,
        message: "Job not found",
        code: "JOB_NOT_FOUND",
      });
    }

    // ✅ Find client profile to verify ownership
    const clientProfile = await Client.findOne({ credentialId: req.user.id });
    if (!clientProfile) {
      logger.error("Client profile not found during job deletion", {
        userId: req.user.id,
        jobId: id,
        ip: req.ip,
        timestamp: new Date().toISOString(),
      });

      return res.status(400).json({
        success: false,
        message: "Client profile not found",
        code: "CLIENT_PROFILE_NOT_FOUND",
      });
    }

    // ✅ Verify ownership
    if (job.clientId.toString() !== clientProfile._id.toString()) {
      logger.warn("Unauthorized job deletion attempt", {
        jobId: id,
        jobOwnerId: job.clientId,
        requesterId: clientProfile._id,
        userId: req.user.id,
        ip: req.ip,
        timestamp: new Date().toISOString(),
      });

      return res.status(403).json({
        success: false,
        message: "Only the job owner can delete this job",
        code: "OWNERSHIP_REQUIRED",
      });
    }

    // ✅ Store job details for audit log before deletion
    const jobDetails = {
      id: job._id,
      description: job.description.substring(0, 100) + "...",
      price: job.price,
      location: job.location,
      category: job.category,
      status: job.status,
      isVerified: job.isVerified,
    };

    // ✅ Soft delete
    job.isDeleted = true;
    job.deletedAt = new Date();
    await job.save();

    const processingTime = Date.now() - startTime;

    logger.info("Job deleted successfully", {
      jobId: id,
      jobDetails,
      clientId: clientProfile._id,
      userId: req.user.id,
      ip: req.ip,
      userAgent: req.get("User-Agent"),
      processingTime: `${processingTime}ms`,
      timestamp: new Date().toISOString(),
    });

    res.status(200).json({
      success: true,
      message: "Job deleted successfully",
      code: "JOB_DELETED",
      meta: {
        processingTime: `${processingTime}ms`,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (err) {
    const processingTime = Date.now() - startTime;

    logger.error("Job deletion failed", {
      error: err.message,
      stack: err.stack,
      jobId: req.params?.id,
      userId: req.user?.id,
      ip: req.ip,
      userAgent: req.get("User-Agent"),
      processingTime: `${processingTime}ms`,
      timestamp: new Date().toISOString(),
    });

    return handleJobError(err, res, "Job deletion", req);
  }
};

module.exports = {
  getAllJobs,
  getJobsByCategory,
  getJobsByLocation,
  getJobById,
  postJob,
  updateJob,
  deleteJob,
};
