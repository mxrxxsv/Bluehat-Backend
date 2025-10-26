const Joi = require("joi");
const xss = require("xss");
const mongoose = require("mongoose");
const { decryptAES128 } = require("../utils/encipher");
//models
const SkillCategory = require("../models/SkillCategory");
const Job = require("../models/Job");
const Client = require("../models/Client");
const Credential = require("../models/Credential");
const Admin = require("../models/Admin");

//utils
const logger = require("../utils/logger");

// ==================== JOI SCHEMAS ====================
const querySchema = Joi.object({
  page: Joi.number().integer().min(1).max(1000).default(1),
  limit: Joi.number().integer().min(1).max(50).default(10),
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
  clientId: Joi.string().hex().length(24).optional(),
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
    "tite",
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

  // Extract credentialId from populated clientId
  const credentialId = client?.credentialId;

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
      name: job.category?.categoryName || "Unknown Category",
    },
    client: {
      id: client._id,
      credentialId, // ✅ now returns the proper credentialId
      name: clientName,
      profilePicture:
        client?.profilePicture?.url || client?.profilePicture || null,
      isVerified: client?.isVerified || false,
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

// ✅ Get all jobs for general users (only open and non-deleted jobs)
const getAllJobs = async (req, res) => {
  const startTime = Date.now();

  try {
    // ✅ Validation with category and location support
    const pageSchema = Joi.object({
      page: Joi.number().integer().min(1).default(1),
      limit: Joi.number().integer().min(1).max(100).default(10),
      sortBy: Joi.string()
        .valid("createdAt", "price", "updatedAt")
        .default("createdAt"),
      order: Joi.string().valid("asc", "desc").default("desc"),
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
    });

    const { error, value } = pageSchema.validate(req.query, {
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

    const { page, limit, sortBy, order, category, location } =
      sanitizeInput(value);

    // ✅ Filter: only open and non-deleted jobs
    const filter = {
      isDeleted: false,
      status: "open",
    };

    // ✅ Add optional filters
    if (category) filter.category = category;
    if (location) filter.location = { $regex: location, $options: "i" };

    const sortOrder = order === "asc" ? 1 : -1;

    // ✅ Get jobs with verified, non-blocked clients only
    const jobs = await Job.find(filter)
      .populate({
        path: "clientId",
        match: { isVerified: true, blocked: { $ne: true } },
        select: "firstName lastName profilePicture isVerified blocked",
      })
      .populate("category", "categoryName")
      .sort({ [sortBy]: sortOrder })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    // ✅ Filter out jobs with unverified or blocked clients
    const verifiedJobs = jobs.filter(
      (job) => job.clientId && job.clientId.isVerified && !job.clientId.blocked
    );

    // ✅ Get total count of open jobs from verified clients
    const totalCount = await Job.countDocuments({
      ...filter,
      clientId: {
        $in: await Client.find({
          isVerified: true,
          blocked: { $ne: true },
        }).distinct("_id"),
      },
    });

    const processingTime = Date.now() - startTime;

    // ✅ Format response
    const optimizedJobs = verifiedJobs.map((job) => ({
      id: job._id,
      description: job.description,
      price: job.price,
      location: job.location,
      status: job.status,
      createdAt: job.createdAt,
      updatedAt: job.updatedAt,
      category: job.category
        ? { id: job.category._id, name: job.category.categoryName }
        : null,
      client: job.clientId
        ? {
            id: job.clientId._id,
            name: `${decryptAES128(job.clientId.firstName)} ${decryptAES128(
              job.clientId.lastName
            )}`,
            profilePicture: job.clientId.profilePicture,
          }
        : null,
    }));

    logger.info("Jobs retrieved successfully", {
      totalJobs: verifiedJobs.length,
      totalCount,
      page,
      limit,
      filters: { category, location },
      ip: req.ip,
      userAgent: req.get("User-Agent"),
      processingTime: `${processingTime}ms`,
      timestamp: new Date().toISOString(),
    });

    res.set({
      "Cache-Control": "public, max-age=300",
      ETag: `"jobs-${Date.now()}"`,
      "X-Total-Count": totalCount.toString(),
    });

    res.status(200).json({
      success: true,
      message: "Jobs retrieved successfully",
      code: "JOBS_RETRIEVED",
      data: {
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
          category: category || null,
          location: location || null,
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

// Get single job by ID
const getJobById = async (req, res) => {
  const startTime = Date.now();

  try {
    // Validate parameters
    const { error, value } = paramIdSchema.validate(req.params, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
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

    const job = await Job.findOne({ _id: id, isDeleted: false })
      .populate("category", "categoryName")
      .populate({
        path: "clientId",
        match: { isVerified: true, blocked: { $ne: true } },
        select:
          "_id firstName lastName profilePicture credentialId isVerified blocked",
        populate: {
          path: "credentialId",
          select: "_id email", // include _id to get the credentialId
        },
        options: { lean: true },
      })
      .populate("hiredWorker", "firstName lastName profilePicture")
      .lean();

    // ✅ Check if job exists and belongs to verified, non-blocked client
    if (
      !job ||
      !job.clientId ||
      !job.clientId.isVerified ||
      job.clientId.blocked
    ) {
      logger.warn("Job not found or client not verified/blocked", {
        jobId: id,
        jobExists: !!job,
        clientExists: !!job?.clientId,
        clientVerified: job?.clientId?.isVerified,
        clientBlocked: job?.clientId?.blocked,
        ip: req.ip,
        timestamp: new Date().toISOString(),
      });

      return res.status(404).json({
        success: false,
        message: "Job not found",
        code: "JOB_NOT_FOUND",
      });
    }

    // Map clientId to client for frontend
    if (job.clientId) job.client = job.clientId;

    const optimizedJob = optimizeJobForResponse(job);

    const processingTime = Date.now() - startTime;

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

    // ✅ Check if client is verified and not blocked
    const clientProfile = await Client.findOne({ credentialId: req.user.id });
    if (!clientProfile) {
      logger.error("Client profile not found for user", {
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

    if (!clientProfile.isVerified) {
      logger.warn("Unverified client attempted to post job", {
        userId: req.user.id,
        clientId: clientProfile._id,
        isVerified: clientProfile.isVerified,
        ip: req.ip,
        timestamp: new Date().toISOString(),
      });

      return res.status(403).json({
        success: false,
        message: "Only verified clients can post jobs",
        code: "CLIENT_NOT_VERIFIED",
      });
    }

    if (clientProfile.blocked) {
      logger.warn("Blocked client attempted to post job", {
        userId: req.user.id,
        clientId: clientProfile._id,
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

    // ✅ Create job
    const job = new Job({
      clientId: clientProfile._id,
      description: description.trim(),
      price: price,
      location: location.trim(),
      category,
      status: "open",
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

    // ✅ Verify user authentication and type (allow both clients and admins)
    if (!req.user && !req.admin) {
      logger.warn("Unauthenticated user attempted to delete job", {
        ip: req.ip,
        timestamp: new Date().toISOString(),
      });

      return res.status(401).json({
        success: false,
        message: "Authentication required",
        code: "AUTH_REQUIRED",
      });
    }

    // Check if user is either a client or admin
    const isClient = req.user && req.user.userType === "client";
    const isAdmin = req.admin && req.admin.role === "admin";

    if (!isClient && !isAdmin) {
      logger.warn("Unauthorized user attempted to delete job", {
        userId: req.user?.id,
        adminId: req.admin?.id,
        userType: req.user?.userType,
        role: req.admin?.role,
        ip: req.ip,
        timestamp: new Date().toISOString(),
      });

      return res.status(401).json({
        success: false,
        message: "Only clients and admins can delete jobs",
        code: "CLIENT_OR_ADMIN_AUTH_REQUIRED",
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

    // ✅ For clients, verify ownership. Admins can delete any job.
    let clientProfile = null;

    if (isClient) {
      // Find client profile to verify ownership
      clientProfile = await Client.findOne({ credentialId: req.user.id });
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

      // ✅ Verify ownership for clients
      if (job.clientId.toString() !== clientProfile._id.toString()) {
        logger.warn("Unauthorized job deletion attempt by client", {
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
    }

    // ✅ Admins can delete any job without ownership check
    if (isAdmin) {
      logger.info("Admin deleting job", {
        jobId: id,
        adminId: req.admin._id,
        jobOwnerId: job.clientId,
        ip: req.ip,
        timestamp: new Date().toISOString(),
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
    };

    // ✅ Soft delete
    job.isDeleted = true;
    job.deletedAt = new Date();
    await job.save();

    const processingTime = Date.now() - startTime;

    logger.info("Job deleted successfully", {
      jobId: id,
      jobDetails,
      deletedBy: isAdmin ? "admin" : "client",
      clientId: clientProfile?._id,
      userId: req.user?.id,
      adminId: req.admin?._id,
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
  getJobById,
  postJob,
  updateJob,
  deleteJob,
};
