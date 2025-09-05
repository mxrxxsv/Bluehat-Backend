const Joi = require("joi");
const xss = require("xss");
const mongoose = require("mongoose");

// Models
const Credential = require("../models/Credential");
const JobApplication = require("../models/JobApplication");
const DirectHiring = require("../models/DirectHiring");
const Job = require("../models/Job");
const Worker = require("../models/Worker");
const Client = require("../models/Client");
const SkillCategory = require("../models/SkillCategory");

// Utils
const logger = require("../utils/logger");

// Constants
const VALID_DURATION_UNITS = ["hours", "days", "weeks", "months"];
const VALID_APPLICATION_STATUS = ["pending", "accepted", "rejected"];
const VALID_DIRECT_STATUS = ["pending", "accepted", "rejected", "cancelled"];
const VALID_URGENCY_LEVELS = ["low", "medium", "high", "urgent"];

// ==================== HELPER FUNCTIONS ====================

const sanitizeInput = (obj) => {
  if (typeof obj === "string") {
    return xss(obj.trim());
  }
  if (Array.isArray(obj)) {
    return obj.map(sanitizeInput);
  }
  if (typeof obj === "object" && obj !== null) {
    const sanitized = {};
    for (const [key, value] of Object.entries(obj)) {
      sanitized[key] = sanitizeInput(value);
    }
    return sanitized;
  }
  return obj;
};

const validateObjectId = (id, fieldName = "ID") => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return {
      isValid: false,
      error: `Invalid ${fieldName}`,
      code: "INVALID_OBJECT_ID",
    };
  }
  return { isValid: true };
};

// ==================== JOI SCHEMAS ====================

const jobApplicationSchema = Joi.object({
  coverLetter: Joi.string().trim().min(20).max(2000).required().messages({
    "string.min": "Cover letter must be at least 20 characters",
    "string.max": "Cover letter cannot exceed 2000 characters",
    "any.required": "Cover letter is required",
  }),

  proposedPrice: Joi.number().min(0).max(1000000).required().messages({
    "number.min": "Price cannot be negative",
    "number.max": "Price cannot exceed 1,000,000",
    "any.required": "Proposed price is required",
  }),

  estimatedDuration: Joi.object({
    value: Joi.number().min(1).max(365).required().messages({
      "number.min": "Duration must be at least 1",
      "number.max": "Duration cannot exceed 365",
      "any.required": "Duration value is required",
    }),
    unit: Joi.string()
      .valid(...VALID_DURATION_UNITS)
      .required()
      .messages({
        "any.only": "Duration unit must be hours, days, weeks, or months",
        "any.required": "Duration unit is required",
      }),
  })
    .required()
    .messages({
      "any.required": "Estimated duration is required",
    }),
});

const applicationResponseSchema = Joi.object({
  status: Joi.string().valid("accepted", "rejected").required().messages({
    "any.only": "Status must be 'accepted' or 'rejected'",
    "any.required": "Status is required",
  }),

  message: Joi.string().trim().max(1000).optional().messages({
    "string.max": "Message cannot exceed 1000 characters",
  }),
});

const directHiringSchema = Joi.object({
  workerId: Joi.string()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .required()
    .messages({
      "string.pattern.base": "Invalid worker ID format",
      "any.required": "Worker ID is required",
    }),

  projectTitle: Joi.string().trim().min(5).max(100).required().messages({
    "string.min": "Project title must be at least 5 characters",
    "string.max": "Project title cannot exceed 100 characters",
    "any.required": "Project title is required",
  }),

  projectDescription: Joi.string()
    .trim()
    .min(20)
    .max(2000)
    .required()
    .messages({
      "string.min": "Project description must be at least 20 characters",
      "string.max": "Project description cannot exceed 2000 characters",
      "any.required": "Project description is required",
    }),

  proposedPrice: Joi.number().min(0).max(1000000).required().messages({
    "number.min": "Price cannot be negative",
    "number.max": "Price cannot exceed 1,000,000",
    "any.required": "Proposed price is required",
  }),

  estimatedDuration: Joi.object({
    value: Joi.number().min(1).max(365).required().messages({
      "number.min": "Duration must be at least 1",
      "number.max": "Duration cannot exceed 365",
      "any.required": "Duration value is required",
    }),
    unit: Joi.string()
      .valid(...VALID_DURATION_UNITS)
      .required()
      .messages({
        "any.only": "Duration unit must be hours, days, weeks, or months",
        "any.required": "Duration unit is required",
      }),
  })
    .required()
    .messages({
      "any.required": "Estimated duration is required",
    }),

  category: Joi.string()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .required()
    .messages({
      "string.pattern.base": "Invalid category ID format",
      "any.required": "Category is required",
    }),

  location: Joi.string().trim().min(1).max(200).required().messages({
    "string.min": "Location is required",
    "string.max": "Location cannot exceed 200 characters",
    "any.required": "Location is required",
  }),

  urgency: Joi.string()
    .valid(...VALID_URGENCY_LEVELS)
    .optional()
    .default("medium")
    .messages({
      "any.only": "Urgency must be low, medium, high, or urgent",
    }),

  clientMessage: Joi.string().trim().max(1000).optional().messages({
    "string.max": "Client message cannot exceed 1000 characters",
  }),
});

const directResponseSchema = Joi.object({
  status: Joi.string().valid("accepted", "rejected").required().messages({
    "any.only": "Status must be 'accepted' or 'rejected'",
    "any.required": "Status is required",
  }),

  workerResponse: Joi.string().trim().max(1000).optional().messages({
    "string.max": "Worker response cannot exceed 1000 characters",
  }),
});

// ==================== JOB APPLICATION CONTROLLERS ====================

// ✅ Apply to a job (Verified workers only)
const applyToJob = async (req, res) => {
  const startTime = Date.now();

  try {
    const { jobId } = req.params;

    // Validate job ID
    const jobIdValidation = validateObjectId(jobId, "job ID");
    if (!jobIdValidation.isValid) {
      return res.status(400).json({
        success: false,
        message: jobIdValidation.error,
        code: jobIdValidation.code,
        meta: {
          processingTime: `${Date.now() - startTime}ms`,
          timestamp: new Date().toISOString(),
        },
      });
    }

    // Verify user is authenticated and is a worker
    if (!req.user || req.user.userType !== "worker") {
      return res.status(403).json({
        success: false,
        message: "Only workers can apply to jobs",
        code: "INVALID_USER_TYPE",
        meta: {
          processingTime: `${Date.now() - startTime}ms`,
          timestamp: new Date().toISOString(),
        },
      });
    }

    // Validate request body
    const { error, value } = jobApplicationSchema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      logger.warn("Job application validation failed", {
        errors: error.details,
        workerId: req.user.id,
        jobId: jobId,
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
          value: detail.context?.value,
        })),
        meta: {
          processingTime: `${Date.now() - startTime}ms`,
          timestamp: new Date().toISOString(),
        },
      });
    }

    const sanitizedData = sanitizeInput(value);
    const { coverLetter, proposedPrice, estimatedDuration } = sanitizedData;

    // Find worker profile
    const worker = await Worker.findOne({
      credentialId: req.user.id,
    }).select("+credentialId");

    if (!worker) {
      return res.status(404).json({
        success: false,
        message: "Worker profile not found",
        code: "WORKER_NOT_FOUND",
        meta: {
          processingTime: `${Date.now() - startTime}ms`,
          timestamp: new Date().toISOString(),
        },
      });
    }

    // Check if worker is verified
    const credential = await Credential.findById(req.user.id).select(
      "+isVerified +isBlocked"
    );
    if (!credential || !credential.isVerified) {
      return res.status(403).json({
        success: false,
        message:
          "Only verified workers can apply to jobs. Please complete your verification process.",
        code: "WORKER_NOT_VERIFIED",
        data: {
          isVerified: credential?.isVerified || false,
          nextStep: "Complete account verification to apply for jobs",
        },
        meta: {
          processingTime: `${Date.now() - startTime}ms`,
          timestamp: new Date().toISOString(),
        },
      });
    }

    // Check if worker is blocked
    if (credential.isBlocked) {
      return res.status(403).json({
        success: false,
        message: "Your account is currently blocked. Please contact support.",
        code: "WORKER_BLOCKED",
        meta: {
          processingTime: `${Date.now() - startTime}ms`,
          timestamp: new Date().toISOString(),
        },
      });
    }

    // Find and validate job
    const job = await Job.findOne({
      _id: jobId,
      isDeleted: false,
      isVerified: true,
      status: "open",
    }).populate("clientId", "credentialId");

    if (!job) {
      return res.status(404).json({
        success: false,
        message: "Job not found or not available for applications",
        code: "JOB_NOT_AVAILABLE",
        data: {
          jobId: jobId,
          suggestion: "Job may be closed, unverified, or deleted",
        },
        meta: {
          processingTime: `${Date.now() - startTime}ms`,
          timestamp: new Date().toISOString(),
        },
      });
    }

    // Prevent self-application
    if (job.clientId.credentialId.toString() === req.user.id.toString()) {
      return res.status(403).json({
        success: false,
        message: "You cannot apply to your own job posting",
        code: "SELF_APPLICATION_DENIED",
        meta: {
          processingTime: `${Date.now() - startTime}ms`,
          timestamp: new Date().toISOString(),
        },
      });
    }

    // Check for existing application
    const existingApplication = await JobApplication.findOne({
      jobId: jobId,
      workerId: worker._id,
      isDeleted: false,
    });

    if (existingApplication) {
      return res.status(409).json({
        success: false,
        message: "You have already applied to this job",
        code: "DUPLICATE_APPLICATION",
        data: {
          existingApplicationId: existingApplication._id,
          status: existingApplication.status,
          appliedAt: existingApplication.appliedAt,
        },
        meta: {
          processingTime: `${Date.now() - startTime}ms`,
          timestamp: new Date().toISOString(),
        },
      });
    }

    // Create job application
    const jobApplication = await JobApplication.create({
      jobId: jobId,
      workerId: worker._id,
      credentialId: req.user.id,
      clientId: job.clientId._id,
      coverLetter: coverLetter,
      proposedPrice: proposedPrice,
      estimatedDuration: estimatedDuration,
    });

    // Populate response data
    await jobApplication.populate([
      {
        path: "jobId",
        select: "description price location category",
        populate: {
          path: "category",
          select: "categoryName",
        },
      },
      {
        path: "workerId",
        select: "firstName lastName profilePicture skills",
      },
    ]);

    const processingTime = Date.now() - startTime;

    logger.info("Job application submitted successfully", {
      applicationId: jobApplication._id,
      jobId: jobId,
      workerId: worker._id,
      clientId: job.clientId._id,
      proposedPrice: proposedPrice,
      ip: req.ip,
      userAgent: req.get("User-Agent"),
      processingTime: `${processingTime}ms`,
      timestamp: new Date().toISOString(),
    });

    res.status(201).json({
      success: true,
      message: "Job application submitted successfully",
      code: "APPLICATION_SUBMITTED",
      data: {
        applicationId: jobApplication._id,
        jobTitle: jobApplication.jobId.description.substring(0, 100) + "...",
        status: jobApplication.status,
        appliedAt: jobApplication.appliedAt,
        proposedPrice: jobApplication.proposedPrice,
        estimatedDuration: jobApplication.estimatedDuration,
        nextStep: "Wait for client response",
      },
      meta: {
        processingTime: `${processingTime}ms`,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (err) {
    const processingTime = Date.now() - startTime;

    logger.error("Job application submission failed", {
      error: err.message,
      stack: err.stack,
      jobId: req.params.jobId,
      workerId: req.user?.id,
      ip: req.ip,
      userAgent: req.get("User-Agent"),
      processingTime: `${processingTime}ms`,
      timestamp: new Date().toISOString(),
    });

    // Handle duplicate key error
    if (err.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "You have already applied to this job",
        code: "DUPLICATE_APPLICATION",
        meta: {
          processingTime: `${processingTime}ms`,
          timestamp: new Date().toISOString(),
        },
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to submit job application due to server error",
      code: "APPLICATION_SUBMISSION_ERROR",
      meta: {
        processingTime: `${processingTime}ms`,
        timestamp: new Date().toISOString(),
      },
    });
  }
};

// ✅ Get worker's job applications
const getWorkerApplications = async (req, res) => {
  const startTime = Date.now();

  try {
    const {
      status,
      page = 1,
      limit = 10,
      sortBy = "appliedAt",
      order = "desc",
    } = req.query;

    if (!req.user || req.user.userType !== "worker") {
      return res.status(403).json({
        success: false,
        message: "Access denied. Only workers can view applications.",
        code: "ACCESS_DENIED",
        meta: {
          processingTime: `${Date.now() - startTime}ms`,
          timestamp: new Date().toISOString(),
        },
      });
    }

    const worker = await Worker.findOne({ credentialId: req.user.id });
    if (!worker) {
      return res.status(404).json({
        success: false,
        message: "Worker profile not found",
        code: "WORKER_NOT_FOUND",
        meta: {
          processingTime: `${Date.now() - startTime}ms`,
          timestamp: new Date().toISOString(),
        },
      });
    }

    // Build filter
    const filter = {
      workerId: worker._id,
      isDeleted: false,
    };

    if (status && VALID_APPLICATION_STATUS.includes(status)) {
      filter.status = status;
    }

    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(50, Math.max(1, parseInt(limit)));
    const skip = (pageNum - 1) * limitNum;
    const sortOrder = order === "asc" ? 1 : -1;

    const applications = await JobApplication.find(filter)
      .populate({
        path: "jobId",
        select: "description price location category createdAt status",
        populate: {
          path: "category",
          select: "categoryName",
        },
      })
      .populate({
        path: "clientId",
        select: "firstName lastName profilePicture",
      })
      .sort({ [sortBy]: sortOrder })
      .skip(skip)
      .limit(limitNum);

    const total = await JobApplication.countDocuments(filter);
    const totalPages = Math.ceil(total / limitNum);

    // Get application statistics
    const statsAggregation = await JobApplication.aggregate([
      { $match: { workerId: worker._id, isDeleted: false } },
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]);

    const applicationStats = statsAggregation.reduce((acc, stat) => {
      acc[stat._id] = stat.count;
      return acc;
    }, {});

    const processingTime = Date.now() - startTime;

    res.status(200).json({
      success: true,
      message: "Worker applications retrieved successfully",
      code: "APPLICATIONS_RETRIEVED",
      data: {
        applications,
        pagination: {
          currentPage: pageNum,
          totalPages,
          totalItems: total,
          itemsPerPage: limitNum,
          hasNextPage: pageNum < totalPages,
          hasPrevPage: pageNum > 1,
        },
        statistics: {
          total: total,
          pending: applicationStats.pending || 0,
          accepted: applicationStats.accepted || 0,
          rejected: applicationStats.rejected || 0,
        },
        filters: {
          status: status || "all",
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

    logger.error("Failed to retrieve worker applications", {
      error: err.message,
      stack: err.stack,
      workerId: req.user?.id,
      ip: req.ip,
      userAgent: req.get("User-Agent"),
      processingTime: `${processingTime}ms`,
      timestamp: new Date().toISOString(),
    });

    return res.status(500).json({
      success: false,
      message: "Failed to retrieve applications due to server error",
      code: "APPLICATIONS_RETRIEVAL_ERROR",
      meta: {
        processingTime: `${processingTime}ms`,
        timestamp: new Date().toISOString(),
      },
    });
  }
};

// ✅ Get applications for client's jobs
const getClientApplications = async (req, res) => {
  const startTime = Date.now();

  try {
    const {
      jobId,
      status,
      page = 1,
      limit = 10,
      sortBy = "appliedAt",
      order = "desc",
    } = req.query;

    if (!req.user || req.user.userType !== "client") {
      return res.status(403).json({
        success: false,
        message: "Access denied. Only clients can view job applications.",
        code: "ACCESS_DENIED",
        meta: {
          processingTime: `${Date.now() - startTime}ms`,
          timestamp: new Date().toISOString(),
        },
      });
    }

    const client = await Client.findOne({ credentialId: req.user.id });
    if (!client) {
      return res.status(404).json({
        success: false,
        message: "Client profile not found",
        code: "CLIENT_NOT_FOUND",
        meta: {
          processingTime: `${Date.now() - startTime}ms`,
          timestamp: new Date().toISOString(),
        },
      });
    }

    // Build filter
    const filter = {
      clientId: client._id,
      isDeleted: false,
    };

    if (jobId && mongoose.Types.ObjectId.isValid(jobId)) {
      filter.jobId = jobId;
    }

    if (status && VALID_APPLICATION_STATUS.includes(status)) {
      filter.status = status;
    }

    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(50, Math.max(1, parseInt(limit)));
    const skip = (pageNum - 1) * limitNum;
    const sortOrder = order === "asc" ? 1 : -1;

    const applications = await JobApplication.find(filter)
      .populate({
        path: "jobId",
        select: "description price location category createdAt status",
        populate: {
          path: "category",
          select: "categoryName",
        },
      })
      .populate({
        path: "workerId",
        select: "firstName lastName profilePicture skills experience",
      })
      .sort({ [sortBy]: sortOrder })
      .skip(skip)
      .limit(limitNum);

    const total = await JobApplication.countDocuments(filter);
    const totalPages = Math.ceil(total / limitNum);

    // Get application statistics
    const statsAggregation = await JobApplication.aggregate([
      { $match: { clientId: client._id, isDeleted: false } },
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]);

    const applicationStats = statsAggregation.reduce((acc, stat) => {
      acc[stat._id] = stat.count;
      return acc;
    }, {});

    const processingTime = Date.now() - startTime;

    res.status(200).json({
      success: true,
      message: "Client applications retrieved successfully",
      code: "APPLICATIONS_RETRIEVED",
      data: {
        applications,
        pagination: {
          currentPage: pageNum,
          totalPages,
          totalItems: total,
          itemsPerPage: limitNum,
          hasNextPage: pageNum < totalPages,
          hasPrevPage: pageNum > 1,
        },
        statistics: {
          total: total,
          pending: applicationStats.pending || 0,
          accepted: applicationStats.accepted || 0,
          rejected: applicationStats.rejected || 0,
        },
        filters: {
          jobId: jobId || "all",
          status: status || "all",
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

    logger.error("Failed to retrieve client applications", {
      error: err.message,
      stack: err.stack,
      clientId: req.user?.id,
      ip: req.ip,
      userAgent: req.get("User-Agent"),
      processingTime: `${processingTime}ms`,
      timestamp: new Date().toISOString(),
    });

    return res.status(500).json({
      success: false,
      message: "Failed to retrieve applications due to server error",
      code: "APPLICATIONS_RETRIEVAL_ERROR",
      meta: {
        processingTime: `${processingTime}ms`,
        timestamp: new Date().toISOString(),
      },
    });
  }
};

// ✅ Respond to job application (Client accepts/rejects)
const respondToApplication = async (req, res) => {
  const startTime = Date.now();

  try {
    const { applicationId } = req.params;

    // Validate application ID
    const appIdValidation = validateObjectId(applicationId, "application ID");
    if (!appIdValidation.isValid) {
      return res.status(400).json({
        success: false,
        message: appIdValidation.error,
        code: appIdValidation.code,
        meta: {
          processingTime: `${Date.now() - startTime}ms`,
          timestamp: new Date().toISOString(),
        },
      });
    }

    if (!req.user || req.user.userType !== "client") {
      return res.status(403).json({
        success: false,
        message: "Only clients can respond to job applications",
        code: "ACCESS_DENIED",
        meta: {
          processingTime: `${Date.now() - startTime}ms`,
          timestamp: new Date().toISOString(),
        },
      });
    }

    // Validate request body
    const { error, value } = applicationResponseSchema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        code: "VALIDATION_ERROR",
        errors: error.details.map((detail) => ({
          field: detail.path.join("."),
          message: detail.message,
        })),
        meta: {
          processingTime: `${Date.now() - startTime}ms`,
          timestamp: new Date().toISOString(),
        },
      });
    }

    const sanitizedData = sanitizeInput(value);
    const { status, message } = sanitizedData;

    const client = await Client.findOne({ credentialId: req.user.id });
    if (!client) {
      return res.status(404).json({
        success: false,
        message: "Client profile not found",
        code: "CLIENT_NOT_FOUND",
        meta: {
          processingTime: `${Date.now() - startTime}ms`,
          timestamp: new Date().toISOString(),
        },
      });
    }

    const application = await JobApplication.findOne({
      _id: applicationId,
      clientId: client._id,
      isDeleted: false,
    }).populate([
      { path: "jobId", select: "description status" },
      { path: "workerId", select: "firstName lastName" },
    ]);

    if (!application) {
      return res.status(404).json({
        success: false,
        message: "Application not found or access denied",
        code: "APPLICATION_NOT_FOUND",
        meta: {
          processingTime: `${Date.now() - startTime}ms`,
          timestamp: new Date().toISOString(),
        },
      });
    }

    if (application.status !== "pending") {
      return res.status(400).json({
        success: false,
        message: `Application has already been ${application.status}`,
        code: "APPLICATION_ALREADY_PROCESSED",
        data: {
          currentStatus: application.status,
          suggestion: "Only pending applications can be processed",
        },
        meta: {
          processingTime: `${Date.now() - startTime}ms`,
          timestamp: new Date().toISOString(),
        },
      });
    }

    // Update application
    application.status = status;
    if (message) {
      application.clientMessage = message;
    }
    application.viewedByClient = true;
    application.viewedAt = new Date();

    await application.save();

    // If accepted, update job status
    if (status === "accepted") {
      await Job.findByIdAndUpdate(application.jobId._id, {
        status: "hired",
        hiredWorker: application.workerId._id,
      });
    }

    const processingTime = Date.now() - startTime;

    logger.info("Application response submitted", {
      applicationId: applicationId,
      clientId: client._id,
      workerId: application.workerId._id,
      status: status,
      ip: req.ip,
      userAgent: req.get("User-Agent"),
      processingTime: `${processingTime}ms`,
      timestamp: new Date().toISOString(),
    });

    res.status(200).json({
      success: true,
      message: `Application ${status} successfully`,
      code: `APPLICATION_${status.toUpperCase()}`,
      data: {
        applicationId: application._id,
        status: application.status,
        workerName: `${application.workerId.firstName} ${application.workerId.lastName}`,
        jobDescription: application.jobId.description.substring(0, 100) + "...",
        processedAt: new Date().toISOString(),
      },
      meta: {
        processingTime: `${processingTime}ms`,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (err) {
    const processingTime = Date.now() - startTime;

    logger.error("Failed to respond to application", {
      error: err.message,
      stack: err.stack,
      applicationId: req.params.applicationId,
      clientId: req.user?.id,
      ip: req.ip,
      userAgent: req.get("User-Agent"),
      processingTime: `${processingTime}ms`,
      timestamp: new Date().toISOString(),
    });

    return res.status(500).json({
      success: false,
      message: "Failed to respond to application due to server error",
      code: "APPLICATION_RESPONSE_ERROR",
      meta: {
        processingTime: `${processingTime}ms`,
        timestamp: new Date().toISOString(),
      },
    });
  }
};

// ==================== DIRECT HIRING CONTROLLERS ====================

// ✅ Send direct hiring request (Client to Worker)
const sendDirectHiringRequest = async (req, res) => {
  const startTime = Date.now();

  try {
    if (!req.user || req.user.userType !== "client") {
      return res.status(403).json({
        success: false,
        message: "Only clients can send direct hiring requests",
        code: "ACCESS_DENIED",
        meta: {
          processingTime: `${Date.now() - startTime}ms`,
          timestamp: new Date().toISOString(),
        },
      });
    }

    // Validate request body
    const { error, value } = directHiringSchema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        code: "VALIDATION_ERROR",
        errors: error.details.map((detail) => ({
          field: detail.path.join("."),
          message: detail.message,
        })),
        meta: {
          processingTime: `${Date.now() - startTime}ms`,
          timestamp: new Date().toISOString(),
        },
      });
    }

    const sanitizedData = sanitizeInput(value);
    const {
      workerId,
      projectTitle,
      projectDescription,
      proposedPrice,
      estimatedDuration,
      category,
      location,
      urgency,
      clientMessage,
    } = sanitizedData;

    const client = await Client.findOne({ credentialId: req.user.id });
    if (!client) {
      return res.status(404).json({
        success: false,
        message: "Client profile not found",
        code: "CLIENT_NOT_FOUND",
        meta: {
          processingTime: `${Date.now() - startTime}ms`,
          timestamp: new Date().toISOString(),
        },
      });
    }

    // Validate worker exists and is verified
    const worker = await Worker.findById(workerId).populate(
      "credentialId",
      "isVerified isBlocked"
    );
    if (!worker) {
      return res.status(404).json({
        success: false,
        message: "Worker not found",
        code: "WORKER_NOT_FOUND",
        meta: {
          processingTime: `${Date.now() - startTime}ms`,
          timestamp: new Date().toISOString(),
        },
      });
    }

    if (!worker.credentialId.isVerified) {
      return res.status(400).json({
        success: false,
        message: "Cannot send hiring request to unverified worker",
        code: "WORKER_NOT_VERIFIED",
        meta: {
          processingTime: `${Date.now() - startTime}ms`,
          timestamp: new Date().toISOString(),
        },
      });
    }

    if (worker.credentialId.isBlocked) {
      return res.status(400).json({
        success: false,
        message: "Cannot send hiring request to blocked worker",
        code: "WORKER_BLOCKED",
        meta: {
          processingTime: `${Date.now() - startTime}ms`,
          timestamp: new Date().toISOString(),
        },
      });
    }

    // Validate category exists
    const skillCategory = await SkillCategory.findById(category);
    if (!skillCategory) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
        code: "CATEGORY_NOT_FOUND",
        meta: {
          processingTime: `${Date.now() - startTime}ms`,
          timestamp: new Date().toISOString(),
        },
      });
    }

    // Check for existing pending request
    const existingRequest = await DirectHiring.findOne({
      clientId: client._id,
      workerId: workerId,
      status: "pending",
      isDeleted: false,
    });

    if (existingRequest) {
      return res.status(409).json({
        success: false,
        message: "You already have a pending hiring request for this worker",
        code: "DUPLICATE_REQUEST",
        data: {
          existingRequestId: existingRequest._id,
          sentAt: existingRequest.sentAt,
        },
        meta: {
          processingTime: `${Date.now() - startTime}ms`,
          timestamp: new Date().toISOString(),
        },
      });
    }

    // Create direct hiring request
    const directHiring = await DirectHiring.create({
      clientId: client._id,
      workerId: workerId,
      credentialId: worker.credentialId._id,
      clientCredentialId: req.user.id,
      projectTitle,
      projectDescription,
      proposedPrice,
      estimatedDuration,
      category,
      location,
      urgency: urgency || "medium",
      clientMessage: clientMessage || "",
    });

    // Populate response data
    await directHiring.populate([
      { path: "workerId", select: "firstName lastName profilePicture skills" },
      { path: "category", select: "categoryName" },
    ]);

    const processingTime = Date.now() - startTime;

    logger.info("Direct hiring request sent", {
      requestId: directHiring._id,
      clientId: client._id,
      workerId: workerId,
      projectTitle,
      proposedPrice,
      ip: req.ip,
      userAgent: req.get("User-Agent"),
      processingTime: `${processingTime}ms`,
      timestamp: new Date().toISOString(),
    });

    res.status(201).json({
      success: true,
      message: "Direct hiring request sent successfully",
      code: "DIRECT_REQUEST_SENT",
      data: {
        requestId: directHiring._id,
        projectTitle: directHiring.projectTitle,
        workerName: `${directHiring.workerId.firstName} ${directHiring.workerId.lastName}`,
        status: directHiring.status,
        proposedPrice: directHiring.proposedPrice,
        sentAt: directHiring.sentAt,
        expiresAt: directHiring.expiresAt,
        nextStep: "Wait for worker response",
      },
      meta: {
        processingTime: `${processingTime}ms`,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (err) {
    const processingTime = Date.now() - startTime;

    logger.error("Failed to send direct hiring request", {
      error: err.message,
      stack: err.stack,
      clientId: req.user?.id,
      ip: req.ip,
      userAgent: req.get("User-Agent"),
      processingTime: `${processingTime}ms`,
      timestamp: new Date().toISOString(),
    });

    return res.status(500).json({
      success: false,
      message: "Failed to send direct hiring request due to server error",
      code: "DIRECT_REQUEST_ERROR",
      meta: {
        processingTime: `${processingTime}ms`,
        timestamp: new Date().toISOString(),
      },
    });
  }
};

// ✅ Get direct hiring requests for worker
const getWorkerDirectRequests = async (req, res) => {
  const startTime = Date.now();

  try {
    const {
      status,
      page = 1,
      limit = 10,
      sortBy = "sentAt",
      order = "desc",
    } = req.query;

    if (!req.user || req.user.userType !== "worker") {
      return res.status(403).json({
        success: false,
        message: "Only workers can view direct hiring requests",
        code: "ACCESS_DENIED",
        meta: {
          processingTime: `${Date.now() - startTime}ms`,
          timestamp: new Date().toISOString(),
        },
      });
    }

    const worker = await Worker.findOne({ credentialId: req.user.id });
    if (!worker) {
      return res.status(404).json({
        success: false,
        message: "Worker profile not found",
        code: "WORKER_NOT_FOUND",
        meta: {
          processingTime: `${Date.now() - startTime}ms`,
          timestamp: new Date().toISOString(),
        },
      });
    }

    // Build filter
    const filter = {
      workerId: worker._id,
      isDeleted: false,
    };

    if (status && VALID_DIRECT_STATUS.includes(status)) {
      filter.status = status;
    }

    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(50, Math.max(1, parseInt(limit)));
    const skip = (pageNum - 1) * limitNum;
    const sortOrder = order === "asc" ? 1 : -1;

    const requests = await DirectHiring.find(filter)
      .populate({
        path: "clientId",
        select: "firstName lastName profilePicture",
      })
      .populate({
        path: "category",
        select: "categoryName",
      })
      .sort({ [sortBy]: sortOrder })
      .skip(skip)
      .limit(limitNum);

    const total = await DirectHiring.countDocuments(filter);
    const totalPages = Math.ceil(total / limitNum);

    // Get request statistics
    const statsAggregation = await DirectHiring.aggregate([
      { $match: { workerId: worker._id, isDeleted: false } },
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]);

    const requestStats = statsAggregation.reduce((acc, stat) => {
      acc[stat._id] = stat.count;
      return acc;
    }, {});

    const processingTime = Date.now() - startTime;

    res.status(200).json({
      success: true,
      message: "Direct hiring requests retrieved successfully",
      code: "DIRECT_REQUESTS_RETRIEVED",
      data: {
        requests,
        pagination: {
          currentPage: pageNum,
          totalPages,
          totalItems: total,
          itemsPerPage: limitNum,
          hasNextPage: pageNum < totalPages,
          hasPrevPage: pageNum > 1,
        },
        statistics: {
          total: total,
          pending: requestStats.pending || 0,
          accepted: requestStats.accepted || 0,
          rejected: requestStats.rejected || 0,
          cancelled: requestStats.cancelled || 0,
        },
        filters: {
          status: status || "all",
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

    logger.error("Failed to retrieve worker direct requests", {
      error: err.message,
      stack: err.stack,
      workerId: req.user?.id,
      ip: req.ip,
      userAgent: req.get("User-Agent"),
      processingTime: `${processingTime}ms`,
      timestamp: new Date().toISOString(),
    });

    return res.status(500).json({
      success: false,
      message: "Failed to retrieve direct requests due to server error",
      code: "DIRECT_REQUESTS_RETRIEVAL_ERROR",
      meta: {
        processingTime: `${processingTime}ms`,
        timestamp: new Date().toISOString(),
      },
    });
  }
};

// ✅ Respond to direct hiring request (Worker accepts/rejects)
const respondToDirectRequest = async (req, res) => {
  const startTime = Date.now();

  try {
    const { requestId } = req.params;

    // Validate request ID
    const requestIdValidation = validateObjectId(requestId, "request ID");
    if (!requestIdValidation.isValid) {
      return res.status(400).json({
        success: false,
        message: requestIdValidation.error,
        code: requestIdValidation.code,
        meta: {
          processingTime: `${Date.now() - startTime}ms`,
          timestamp: new Date().toISOString(),
        },
      });
    }

    if (!req.user || req.user.userType !== "worker") {
      return res.status(403).json({
        success: false,
        message: "Only workers can respond to direct hiring requests",
        code: "ACCESS_DENIED",
        meta: {
          processingTime: `${Date.now() - startTime}ms`,
          timestamp: new Date().toISOString(),
        },
      });
    }

    // Validate request body
    const { error, value } = directResponseSchema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        code: "VALIDATION_ERROR",
        errors: error.details.map((detail) => ({
          field: detail.path.join("."),
          message: detail.message,
        })),
        meta: {
          processingTime: `${Date.now() - startTime}ms`,
          timestamp: new Date().toISOString(),
        },
      });
    }

    const sanitizedData = sanitizeInput(value);
    const { status, workerResponse } = sanitizedData;

    const worker = await Worker.findOne({ credentialId: req.user.id });
    if (!worker) {
      return res.status(404).json({
        success: false,
        message: "Worker profile not found",
        code: "WORKER_NOT_FOUND",
        meta: {
          processingTime: `${Date.now() - startTime}ms`,
          timestamp: new Date().toISOString(),
        },
      });
    }

    const directRequest = await DirectHiring.findOne({
      _id: requestId,
      workerId: worker._id,
      isDeleted: false,
    }).populate([
      { path: "clientId", select: "firstName lastName" },
      { path: "category", select: "categoryName" },
    ]);

    if (!directRequest) {
      return res.status(404).json({
        success: false,
        message: "Direct hiring request not found or access denied",
        code: "REQUEST_NOT_FOUND",
        meta: {
          processingTime: `${Date.now() - startTime}ms`,
          timestamp: new Date().toISOString(),
        },
      });
    }

    if (directRequest.status !== "pending") {
      return res.status(400).json({
        success: false,
        message: `Request has already been ${directRequest.status}`,
        code: "REQUEST_ALREADY_PROCESSED",
        data: {
          currentStatus: directRequest.status,
          suggestion: "Only pending requests can be processed",
        },
        meta: {
          processingTime: `${Date.now() - startTime}ms`,
          timestamp: new Date().toISOString(),
        },
      });
    }

    // Check if request has expired
    if (directRequest.expiresAt < new Date()) {
      return res.status(400).json({
        success: false,
        message: "This direct hiring request has expired",
        code: "REQUEST_EXPIRED",
        data: {
          expiresAt: directRequest.expiresAt,
        },
        meta: {
          processingTime: `${Date.now() - startTime}ms`,
          timestamp: new Date().toISOString(),
        },
      });
    }

    // Update direct request
    directRequest.status = status;
    if (workerResponse) {
      directRequest.workerResponse = workerResponse;
    }
    directRequest.viewedByWorker = true;
    directRequest.viewedAt = new Date();
    directRequest.respondedAt = new Date();

    await directRequest.save();

    const processingTime = Date.now() - startTime;

    logger.info("Direct hiring request response submitted", {
      requestId: requestId,
      workerId: worker._id,
      clientId: directRequest.clientId._id,
      status: status,
      ip: req.ip,
      userAgent: req.get("User-Agent"),
      processingTime: `${processingTime}ms`,
      timestamp: new Date().toISOString(),
    });

    res.status(200).json({
      success: true,
      message: `Direct hiring request ${status} successfully`,
      code: `DIRECT_REQUEST_${status.toUpperCase()}`,
      data: {
        requestId: directRequest._id,
        status: directRequest.status,
        projectTitle: directRequest.projectTitle,
        clientName: `${directRequest.clientId.firstName} ${directRequest.clientId.lastName}`,
        processedAt: directRequest.respondedAt,
      },
      meta: {
        processingTime: `${processingTime}ms`,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (err) {
    const processingTime = Date.now() - startTime;

    logger.error("Failed to respond to direct hiring request", {
      error: err.message,
      stack: err.stack,
      requestId: req.params.requestId,
      workerId: req.user?.id,
      ip: req.ip,
      userAgent: req.get("User-Agent"),
      processingTime: `${processingTime}ms`,
      timestamp: new Date().toISOString(),
    });

    return res.status(500).json({
      success: false,
      message: "Failed to respond to direct hiring request due to server error",
      code: "DIRECT_RESPONSE_ERROR",
      meta: {
        processingTime: `${processingTime}ms`,
        timestamp: new Date().toISOString(),
      },
    });
  }
};

// ✅ Get client's sent direct hiring requests
const getClientDirectRequests = async (req, res) => {
  const startTime = Date.now();

  try {
    const {
      status,
      page = 1,
      limit = 10,
      sortBy = "sentAt",
      order = "desc",
    } = req.query;

    if (!req.user || req.user.userType !== "client") {
      return res.status(403).json({
        success: false,
        message: "Only clients can view sent direct hiring requests",
        code: "ACCESS_DENIED",
        meta: {
          processingTime: `${Date.now() - startTime}ms`,
          timestamp: new Date().toISOString(),
        },
      });
    }

    const client = await Client.findOne({ credentialId: req.user.id });
    if (!client) {
      return res.status(404).json({
        success: false,
        message: "Client profile not found",
        code: "CLIENT_NOT_FOUND",
        meta: {
          processingTime: `${Date.now() - startTime}ms`,
          timestamp: new Date().toISOString(),
        },
      });
    }

    // Build filter
    const filter = {
      clientId: client._id,
      isDeleted: false,
    };

    if (status && VALID_DIRECT_STATUS.includes(status)) {
      filter.status = status;
    }

    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(50, Math.max(1, parseInt(limit)));
    const skip = (pageNum - 1) * limitNum;
    const sortOrder = order === "asc" ? 1 : -1;

    const requests = await DirectHiring.find(filter)
      .populate({
        path: "workerId",
        select: "firstName lastName profilePicture skills",
      })
      .populate({
        path: "category",
        select: "categoryName",
      })
      .sort({ [sortBy]: sortOrder })
      .skip(skip)
      .limit(limitNum);

    const total = await DirectHiring.countDocuments(filter);
    const totalPages = Math.ceil(total / limitNum);

    // Get request statistics
    const statsAggregation = await DirectHiring.aggregate([
      { $match: { clientId: client._id, isDeleted: false } },
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]);

    const requestStats = statsAggregation.reduce((acc, stat) => {
      acc[stat._id] = stat.count;
      return acc;
    }, {});

    const processingTime = Date.now() - startTime;

    res.status(200).json({
      success: true,
      message: "Client direct hiring requests retrieved successfully",
      code: "DIRECT_REQUESTS_RETRIEVED",
      data: {
        requests,
        pagination: {
          currentPage: pageNum,
          totalPages,
          totalItems: total,
          itemsPerPage: limitNum,
          hasNextPage: pageNum < totalPages,
          hasPrevPage: pageNum > 1,
        },
        statistics: {
          total: total,
          pending: requestStats.pending || 0,
          accepted: requestStats.accepted || 0,
          rejected: requestStats.rejected || 0,
          cancelled: requestStats.cancelled || 0,
        },
        filters: {
          status: status || "all",
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

    logger.error("Failed to retrieve client direct requests", {
      error: err.message,
      stack: err.stack,
      clientId: req.user?.id,
      ip: req.ip,
      userAgent: req.get("User-Agent"),
      processingTime: `${processingTime}ms`,
      timestamp: new Date().toISOString(),
    });

    return res.status(500).json({
      success: false,
      message: "Failed to retrieve direct requests due to server error",
      code: "DIRECT_REQUESTS_RETRIEVAL_ERROR",
      meta: {
        processingTime: `${processingTime}ms`,
        timestamp: new Date().toISOString(),
      },
    });
  }
};

module.exports = {
  // Job Application functions
  applyToJob,
  getWorkerApplications,
  getClientApplications,
  respondToApplication,

  // Direct Hiring functions
  sendDirectHiringRequest,
  getWorkerDirectRequests,
  respondToDirectRequest,
  getClientDirectRequests,
};
