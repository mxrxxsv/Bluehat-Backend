const Joi = require("joi");
const xss = require("xss");
const mongoose = require("mongoose");

// Models
const JobApplication = require("../models/JobApplication");
const WorkContract = require("../models/WorkContract");
const Job = require("../models/Job");
const Worker = require("../models/Worker");
const Client = require("../models/Client");

// Utils
const logger = require("../utils/logger");

// ==================== JOI SCHEMAS ====================
const applicationSchema = Joi.object({
  proposedRate: Joi.number().min(0).max(1000000).required().messages({
    "number.min": "Proposed rate cannot be negative",
    "number.max": "Proposed rate cannot exceed 1,000,000",
    "any.required": "Proposed rate is required",
  }),
  message: Joi.string().trim().min(10).max(1000).required().messages({
    "string.min": "Message must be at least 10 characters",
    "string.max": "Message cannot exceed 1000 characters",
    "any.required": "Message is required",
  }),
});

const applicationResponseSchema = Joi.object({
  action: Joi.string().valid("accept", "reject").required().messages({
    "any.only": "Action must be either 'accept' or 'reject'",
    "any.required": "Action is required",
  }),
});

const querySchema = Joi.object({
  page: Joi.number().integer().min(1).max(1000).default(1),
  limit: Joi.number().integer().min(1).max(50).default(10),
  status: Joi.string()
    .valid("pending", "accepted", "rejected", "withdrawn")
    .optional(),
  sortBy: Joi.string()
    .valid("appliedAt", "proposedRate", "applicationStatus")
    .default("appliedAt"),
  order: Joi.string().valid("asc", "desc").default("desc"),
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

const handleApplicationError = (
  error,
  res,
  operation = "Application operation",
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
      message: "You have already applied to this job",
      code: "DUPLICATE_APPLICATION",
    });
  }

  if (process.env.NODE_ENV === "production") {
    return res.status(500).json({
      success: false,
      message: `${operation} failed. Please try again.`,
      code: "APPLICATION_ERROR",
    });
  }

  return res.status(500).json({
    success: false,
    message: error.message,
    code: "APPLICATION_ERROR",
  });
};

// ==================== CONTROLLERS ====================

// Worker applies to a job
const applyToJob = async (req, res) => {
  const startTime = Date.now();

  try {
    // Validate job ID parameter
    const { error: paramError, value: paramValue } = paramIdSchema.validate(
      req.params
    );
    if (paramError) {
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

    // Validate request body
    const { error: bodyError, value: bodyValue } = applicationSchema.validate(
      req.body
    );
    if (bodyError) {
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

    const { id: jobId } = sanitizeInput(paramValue);
    const { proposedRate, message } = sanitizeInput(bodyValue);

    // Check if job exists and is open
    const job = await Job.findOne({
      _id: jobId,
      isDeleted: false,
      status: "open",
    }).populate("clientId", "isVerified blocked");

    if (!job) {
      return res.status(404).json({
        success: false,
        message: "Job not found or not available for applications",
        code: "JOB_NOT_FOUND",
      });
    }

    // Verify job owner is verified and not blocked
    if (!job.clientId || !job.clientId.isVerified || job.clientId.blocked) {
      return res.status(403).json({
        success: false,
        message: "This job is not available for applications",
        code: "JOB_NOT_AVAILABLE",
      });
    }

    // Check if worker already applied
    const existingApplication = await JobApplication.findOne({
      jobId,
      workerId: req.workerProfile.id,
      isDeleted: false,
    });

    if (existingApplication) {
      return res.status(409).json({
        success: false,
        message: "You have already applied to this job",
        code: "DUPLICATE_APPLICATION",
      });
    }

    // Check if worker is trying to apply to their own job (edge case)
    if (job.clientId.id.toString() === req.workerProfile.id.toString()) {
      return res.status(403).json({
        success: false,
        message: "You cannot apply to your own job posting",
        code: "SELF_APPLICATION_NOT_ALLOWED",
      });
    }

    // Create application
    const application = new JobApplication({
      jobId,
      workerId: req.workerProfile.id,
      clientId: job.clientId.id,
      proposedRate,
      message,
      applicantIP: req.ip,
    });

    await application.save();

    // Populate for response
    await application.populate([
      {
        path: "workerId",
        select:
          "firstName lastName profilePicture skills averageRating totalJobsCompleted",
      },
      {
        path: "jobId",
        select: "description price location category",
        populate: {
          path: "category",
          select: "categoryName",
        },
      },
    ]);

    const processingTime = Date.now() - startTime;

    logger.info("Job application submitted successfully", {
      applicationId: application.id,
      jobId,
      workerId: req.workerProfile.id,
      clientId: job.clientId.id,
      proposedRate,
      userId: req.user.id,
      ip: req.ip,
      processingTime: `${processingTime}ms`,
      timestamp: new Date().toISOString(),
    });

    res.status(201).json({
      success: true,
      message: "Application submitted successfully",
      code: "APPLICATION_SUBMITTED",
      data: application.toSafeObject(),
      meta: {
        processingTime: `${processingTime}ms`,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    return handleApplicationError(error, res, "Job application", req);
  }
};

// Client responds to application (accept/reject)
const respondToApplication = async (req, res) => {
  const startTime = Date.now();

  try {
    // Validate parameters
    const { error: paramError, value: paramValue } = paramIdSchema.validate(
      req.params
    );
    if (paramError) {
      return res.status(400).json({
        success: false,
        message: "Invalid application ID",
        code: "INVALID_PARAM",
      });
    }

    // Validate body
    const { error: bodyError, value: bodyValue } =
      applicationResponseSchema.validate(req.body);
    if (bodyError) {
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

    const { id: applicationId } = sanitizeInput(paramValue);
    const { action } = sanitizeInput(bodyValue);

    // Find application
    const application = await JobApplication.findOne({
      _id: applicationId,
      clientId: req.clientProfile._id,
      applicationStatus: "pending",
      isDeleted: false,
    }).populate([
      {
        path: "jobId",
        select: "description price location category status",
      },
      {
        path: "workerId",
        select: "firstName lastName profilePicture",
      },
    ]);

    if (!application) {
      return res.status(404).json({
        success: false,
        message: "Application not found or already processed",
        code: "APPLICATION_NOT_FOUND",
      });
    }

    // Check if job is still open
    if (application.jobId.status !== "open") {
      return res.status(400).json({
        success: false,
        message: "This job is no longer open for applications",
        code: "JOB_NOT_OPEN",
      });
    }

    // Update application status
    application.applicationStatus =
      action === "accept" ? "accepted" : "rejected";
    application.respondedAt = new Date();
    await application.save();

    let contract = null;

    // If accepted, create work contract
    if (action === "accept") {
      contract = new WorkContract({
        clientId: req.clientProfile._id,
        workerId: application.workerId._id,
        jobId: application.jobId._id,
        contractType: "job_application",
        agreedRate: application.proposedRate,
        description: application.jobId.description,
        applicationId: application._id,
        createdIP: req.ip,
      });

      await contract.save();

      // Update job status to in_progress
      await Job.findByIdAndUpdate(application.jobId._id, {
        status: "in_progress",
        hiredWorker: application.workerId._id,
      });

      // Reject all other pending applications for this job
      await JobApplication.updateMany(
        {
          jobId: application.jobId._id,
          applicationStatus: "pending",
          _id: { $ne: application._id },
        },
        {
          applicationStatus: "rejected",
          respondedAt: new Date(),
        }
      );
    }

    const processingTime = Date.now() - startTime;

    logger.info("Application response processed successfully", {
      applicationId,
      action,
      contractId: contract?._id,
      jobId: application.jobId._id,
      workerId: application.workerId._id,
      clientId: req.clientProfile._id,
      userId: req.user.id,
      ip: req.ip,
      processingTime: `${processingTime}ms`,
      timestamp: new Date().toISOString(),
    });

    res.status(200).json({
      success: true,
      message: `Application ${action}ed successfully`,
      code: `APPLICATION_${action.toUpperCase()}ED`,
      data: {
        application: application.toSafeObject(),
        contract: contract?.toSafeObject() || null,
      },
      meta: {
        processingTime: `${processingTime}ms`,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    return handleApplicationError(error, res, "Application response", req);
  }
};

// Get applications sent by worker
const getWorkerApplications = async (req, res) => {
  const startTime = Date.now();

  try {
    // Validate query
    const { error, value } = querySchema.validate(req.query);
    if (error) {
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

    const { page, limit, status, sortBy, order } = sanitizeInput(value);

    // Build filter
    const filter = {
      workerId: req.workerProfile._id,
      isDeleted: false,
    };

    if (status) filter.applicationStatus = status;

    const sortOrder = order === "asc" ? 1 : -1;

    // Get applications with pagination
    const applications = await JobApplication.find(filter)
      .populate({
        path: "jobId",
        select: "description price location category status",
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
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    const totalCount = await JobApplication.countDocuments(filter);

    const processingTime = Date.now() - startTime;

    res.status(200).json({
      success: true,
      message: "Worker applications retrieved successfully",
      code: "WORKER_APPLICATIONS_RETRIEVED",
      data: {
        applications: applications.map((app) => {
          const { applicantIP, ...safeApp } = app;
          return safeApp;
        }),
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(totalCount / limit),
          totalItems: totalCount,
          itemsPerPage: limit,
          hasNextPage: page < Math.ceil(totalCount / limit),
          hasPrevPage: page > 1,
        },
      },
      meta: {
        processingTime: `${processingTime}ms`,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    return handleApplicationError(error, res, "Get worker applications", req);
  }
};

// Get applications received by client for their jobs
const getClientApplications = async (req, res) => {
  const startTime = Date.now();

  try {
    // Validate query
    const { error, value } = querySchema.validate(req.query);
    if (error) {
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

    const { page, limit, status, sortBy, order } = sanitizeInput(value);

    // Build filter
    const filter = {
      clientId: req.clientProfile._id,
      isDeleted: false,
    };

    if (status) filter.applicationStatus = status;

    const sortOrder = order === "asc" ? 1 : -1;

    // Get applications with pagination
    const applications = await JobApplication.find(filter)
      .populate({
        path: "jobId",
        select: "description price location category status",
        populate: {
          path: "category",
          select: "categoryName",
        },
      })
      .populate({
        path: "workerId",
        select:
          "firstName lastName profilePicture skills averageRating totalJobsCompleted",
      })
      .sort({ [sortBy]: sortOrder })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    const totalCount = await JobApplication.countDocuments(filter);

    const processingTime = Date.now() - startTime;

    res.status(200).json({
      success: true,
      message: "Client applications retrieved successfully",
      code: "CLIENT_APPLICATIONS_RETRIEVED",
      data: {
        applications: applications.map((app) => {
          const { applicantIP, ...safeApp } = app;
          return safeApp;
        }),
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(totalCount / limit),
          totalItems: totalCount,
          itemsPerPage: limit,
          hasNextPage: page < Math.ceil(totalCount / limit),
          hasPrevPage: page > 1,
        },
      },
      meta: {
        processingTime: `${processingTime}ms`,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    return handleApplicationError(error, res, "Get client applications", req);
  }
};

// Worker withdraws application
const withdrawApplication = async (req, res) => {
  const startTime = Date.now();

  try {
    // Validate parameters
    const { error, value } = paramIdSchema.validate(req.params);
    if (error) {
      return res.status(400).json({
        success: false,
        message: "Invalid application ID",
        code: "INVALID_PARAM",
      });
    }

    const { id: applicationId } = sanitizeInput(value);

    // Find application
    const application = await JobApplication.findOne({
      _id: applicationId,
      workerId: req.workerProfile._id,
      applicationStatus: "pending",
      isDeleted: false,
    });

    if (!application) {
      return res.status(404).json({
        success: false,
        message: "Application not found or cannot be withdrawn",
        code: "APPLICATION_NOT_FOUND",
      });
    }

    // Update status
    application.applicationStatus = "withdrawn";
    application.respondedAt = new Date();
    await application.save();

    const processingTime = Date.now() - startTime;

    logger.info("Application withdrawn successfully", {
      applicationId,
      workerId: req.workerProfile._id,
      userId: req.user.id,
      ip: req.ip,
      processingTime: `${processingTime}ms`,
      timestamp: new Date().toISOString(),
    });

    res.status(200).json({
      success: true,
      message: "Application withdrawn successfully",
      code: "APPLICATION_WITHDRAWN",
      meta: {
        processingTime: `${processingTime}ms`,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    return handleApplicationError(error, res, "Withdraw application", req);
  }
};

module.exports = {
  applyToJob,
  respondToApplication,
  getWorkerApplications,
  getClientApplications,
  withdrawApplication,
};
