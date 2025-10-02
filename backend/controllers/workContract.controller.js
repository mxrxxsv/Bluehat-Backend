const Joi = require("joi");
const xss = require("xss");
const mongoose = require("mongoose");

// Models
const WorkContract = require("../models/WorkContract");
const Job = require("../models/Job");
const Worker = require("../models/Worker");
const Client = require("../models/Client");

// Utils
const logger = require("../utils/logger");

// ==================== JOI SCHEMAS ====================
const contractUpdateSchema = Joi.object({
  status: Joi.string()
    .valid("active", "in_progress", "completed", "cancelled", "disputed")
    .optional()
    .messages({
      "any.only":
        "Status must be one of: active, in_progress, completed, cancelled, disputed",
    }),
  expectedEndDate: Joi.date().optional(),
});

const feedbackSchema = Joi.object({
  rating: Joi.number().integer().min(1).max(5).required().messages({
    "number.min": "Rating must be between 1 and 5",
    "number.max": "Rating must be between 1 and 5",
    "any.required": "Rating is required",
  }),
  feedback: Joi.string().trim().min(5).max(1000).required().messages({
    "string.min": "Feedback must be at least 5 characters",
    "string.max": "Feedback cannot exceed 1000 characters",
    "any.required": "Feedback is required",
  }),
});

const querySchema = Joi.object({
  page: Joi.number().integer().min(1).max(1000).default(1),
  limit: Joi.number().integer().min(1).max(50).default(10),
  status: Joi.string()
    .valid("active", "in_progress", "completed", "cancelled", "disputed")
    .optional(),
  contractType: Joi.string()
    .valid("job_application", "direct_invitation")
    .optional(),
  sortBy: Joi.string()
    .valid("createdAt", "agreedRate", "contractStatus", "completedAt")
    .default("createdAt"),
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

const handleContractError = (
  error,
  res,
  operation = "Contract operation",
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

  if (process.env.NODE_ENV === "production") {
    return res.status(500).json({
      success: false,
      message: `${operation} failed. Please try again.`,
      code: "CONTRACT_ERROR",
    });
  }

  return res.status(500).json({
    success: false,
    message: error.message,
    code: "CONTRACT_ERROR",
  });
};

// ==================== CONTROLLERS ====================

// Get contracts for client
const getClientContracts = async (req, res) => {
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

    const { page, limit, status, contractType, sortBy, order } =
      sanitizeInput(value);

    // Build filter
    const filter = {
      clientId: req.clientProfile._id,
      isDeleted: false,
    };

    if (status) filter.contractStatus = status;
    if (contractType) filter.contractType = contractType;

    const sortOrder = order === "asc" ? 1 : -1;

    // Get contracts with pagination
    const contracts = await WorkContract.find(filter)
      .populate({
        path: "workerId",
        select:
          "firstName lastName profilePicture skills averageRating totalJobsCompleted",
      })
      .populate({
        path: "jobId",
        select: "description price location category",
        populate: {
          path: "category",
          select: "categoryName",
        },
      })
      .sort({ [sortBy]: sortOrder })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    const totalCount = await WorkContract.countDocuments(filter);

    // Get contract statistics
    const stats = await WorkContract.aggregate([
      {
        $match: {
          clientId: new mongoose.Types.ObjectId(req.clientProfile._id),
        },
      },
      {
        $group: {
          _id: null,
          totalContracts: { $sum: 1 },
          activeContracts: {
            $sum: {
              $cond: [
                { $in: ["$contractStatus", ["active", "in_progress"]] },
                1,
                0,
              ],
            },
          },
          completedContracts: {
            $sum: { $cond: [{ $eq: ["$contractStatus", "completed"] }, 1, 0] },
          },
          averageRating: { $avg: "$clientRating" },
        },
      },
    ]);

    const processingTime = Date.now() - startTime;

    res.status(200).json({
      success: true,
      message: "Client contracts retrieved successfully",
      code: "CLIENT_CONTRACTS_RETRIEVED",
      data: {
        contracts: contracts.map((contract) => {
          const { createdIP, ...safeContract } = contract;
          return safeContract;
        }),
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(totalCount / limit),
          totalItems: totalCount,
          itemsPerPage: limit,
          hasNextPage: page < Math.ceil(totalCount / limit),
          hasPrevPage: page > 1,
        },
        statistics: stats[0] || {
          totalContracts: 0,
          activeContracts: 0,
          completedContracts: 0,
          averageRating: 0,
        },
      },
      meta: {
        processingTime: `${processingTime}ms`,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    return handleContractError(error, res, "Get client contracts", req);
  }
};

// Get contracts for worker
const getWorkerContracts = async (req, res) => {
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

    const { page, limit, status, contractType, sortBy, order } =
      sanitizeInput(value);

    // Build filter
    const filter = {
      workerId: req.workerProfile._id,
      isDeleted: false,
    };

    if (status) filter.contractStatus = status;
    if (contractType) filter.contractType = contractType;

    const sortOrder = order === "asc" ? 1 : -1;

    // Get contracts with pagination
    const contracts = await WorkContract.find(filter)
      .populate({
        path: "clientId",
        select: "firstName lastName profilePicture",
      })
      .populate({
        path: "jobId",
        select: "description price location category",
        populate: {
          path: "category",
          select: "categoryName",
        },
      })
      .sort({ [sortBy]: sortOrder })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    const totalCount = await WorkContract.countDocuments(filter);

    // Get contract statistics
    const stats = await WorkContract.aggregate([
      {
        $match: {
          workerId: new mongoose.Types.ObjectId(req.workerProfile._id),
        },
      },
      {
        $group: {
          _id: null,
          totalContracts: { $sum: 1 },
          activeContracts: {
            $sum: {
              $cond: [
                { $in: ["$contractStatus", ["active", "in_progress"]] },
                1,
                0,
              ],
            },
          },
          completedContracts: {
            $sum: { $cond: [{ $eq: ["$contractStatus", "completed"] }, 1, 0] },
          },
          averageRating: { $avg: "$workerRating" },
        },
      },
    ]);

    const processingTime = Date.now() - startTime;

    res.status(200).json({
      success: true,
      message: "Worker contracts retrieved successfully",
      code: "WORKER_CONTRACTS_RETRIEVED",
      data: {
        contracts: contracts.map((contract) => {
          const { createdIP, ...safeContract } = contract;
          return safeContract;
        }),
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(totalCount / limit),
          totalItems: totalCount,
          itemsPerPage: limit,
          hasNextPage: page < Math.ceil(totalCount / limit),
          hasPrevPage: page > 1,
        },
        statistics: stats[0] || {
          totalContracts: 0,
          activeContracts: 0,
          completedContracts: 0,
          averageRating: 0,
        },
      },
      meta: {
        processingTime: `${processingTime}ms`,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    return handleContractError(error, res, "Get worker contracts", req);
  }
};

// Get single contract details
const getContractDetails = async (req, res) => {
  const startTime = Date.now();

  try {
    // Validate parameters
    const { error, value } = paramIdSchema.validate(req.params);
    if (error) {
      return res.status(400).json({
        success: false,
        message: "Invalid contract ID",
        code: "INVALID_PARAM",
      });
    }

    const { id: contractId } = sanitizeInput(value);

    // Build filter based on user type
    const filter = { _id: contractId, isDeleted: false };
    if (req.user.userType === "client") {
      filter.clientId = req.clientProfile._id;
    } else {
      filter.workerId = req.workerProfile._id;
    }

    const contract = await WorkContract.findOne(filter)
      .populate({
        path: "clientId",
        select: "firstName lastName profilePicture",
      })
      .populate({
        path: "workerId",
        select: "firstName lastName profilePicture skills",
      })
      .populate({
        path: "jobId",
        select: "description price location category",
        populate: {
          path: "category",
          select: "categoryName",
        },
      })
      .lean();

    if (!contract) {
      return res.status(404).json({
        success: false,
        message: "Contract not found",
        code: "CONTRACT_NOT_FOUND",
      });
    }

    const processingTime = Date.now() - startTime;

    res.status(200).json({
      success: true,
      message: "Contract details retrieved successfully",
      code: "CONTRACT_DETAILS_RETRIEVED",
      data: {
        ...contract,
        createdIP: undefined, // Remove sensitive data
      },
      meta: {
        processingTime: `${processingTime}ms`,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    return handleContractError(error, res, "Get contract details", req);
  }
};

// Worker starts work
const startWork = async (req, res) => {
  const startTime = Date.now();

  try {
    // Validate parameters
    const { error, value } = paramIdSchema.validate(req.params);
    if (error) {
      return res.status(400).json({
        success: false,
        message: "Invalid contract ID",
        code: "INVALID_PARAM",
      });
    }

    const { id: contractId } = sanitizeInput(value);

    // Find contract
    const contract = await WorkContract.findOne({
      _id: contractId,
      workerId: req.workerProfile._id,
      contractStatus: "active",
      isDeleted: false,
    });

    if (!contract) {
      return res.status(404).json({
        success: false,
        message: "Contract not found or cannot be started",
        code: "CONTRACT_NOT_FOUND",
      });
    }

    // Update contract
    contract.contractStatus = "in_progress";
    contract.startDate = new Date();
    await contract.save();

    const processingTime = Date.now() - startTime;

    logger.info("Work started successfully", {
      contractId,
      workerId: req.workerProfile._id,
      userId: req.user.id,
      ip: req.ip,
      processingTime: `${processingTime}ms`,
      timestamp: new Date().toISOString(),
    });

    res.status(200).json({
      success: true,
      message: "Work started successfully",
      code: "WORK_STARTED",
      data: contract.toSafeObject(),
      meta: {
        processingTime: `${processingTime}ms`,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    return handleContractError(error, res, "Start work", req);
  }
};

// Worker completes work
const completeWork = async (req, res) => {
  const startTime = Date.now();

  try {
    // Validate parameters
    const { error, value } = paramIdSchema.validate(req.params);
    if (error) {
      return res.status(400).json({
        success: false,
        message: "Invalid contract ID",
        code: "INVALID_PARAM",
      });
    }

    const { id: contractId } = sanitizeInput(value);

    // Find contract
    const contract = await WorkContract.findOne({
      _id: contractId,
      workerId: req.workerProfile._id,
      contractStatus: "in_progress",
      isDeleted: false,
    });

    if (!contract) {
      return res.status(404).json({
        success: false,
        message: "Contract not found or cannot be completed",
        code: "CONTRACT_NOT_FOUND",
      });
    }

    // Update contract
    contract.contractStatus = "completed";
    contract.completedAt = new Date();
    contract.actualEndDate = new Date();
    await contract.save();

    // Update job status if linked to a job
    if (contract.jobId) {
      await Job.findByIdAndUpdate(contract.jobId, {
        status: "completed",
      });
    }

    const processingTime = Date.now() - startTime;

    logger.info("Work completed successfully", {
      contractId,
      workerId: req.workerProfile._id,
      userId: req.user.id,
      ip: req.ip,
      processingTime: `${processingTime}ms`,
      timestamp: new Date().toISOString(),
    });

    res.status(200).json({
      success: true,
      message: "Work completed successfully",
      code: "WORK_COMPLETED",
      data: contract.toSafeObject(),
      meta: {
        processingTime: `${processingTime}ms`,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    return handleContractError(error, res, "Complete work", req);
  }
};

// Submit feedback and rating
const submitFeedback = async (req, res) => {
  const startTime = Date.now();

  try {
    // Validate parameters
    const { error: paramError, value: paramValue } = paramIdSchema.validate(
      req.params
    );
    if (paramError) {
      return res.status(400).json({
        success: false,
        message: "Invalid contract ID",
        code: "INVALID_PARAM",
      });
    }

    // Validate body
    const { error: bodyError, value: bodyValue } = feedbackSchema.validate(
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

    const { id: contractId } = sanitizeInput(paramValue);
    const { rating, feedback } = sanitizeInput(bodyValue);

    // Build filter based on user type
    const filter = {
      _id: contractId,
      contractStatus: "completed",
      isDeleted: false,
    };

    if (req.user.userType === "client") {
      filter.clientId = req.clientProfile._id;
    } else {
      filter.workerId = req.workerProfile._id;
    }

    const contract = await WorkContract.findOne(filter);

    if (!contract) {
      return res.status(404).json({
        success: false,
        message: "Contract not found or not completed",
        code: "CONTRACT_NOT_FOUND",
      });
    }

    // Check if feedback already submitted
    if (req.user.userType === "client" && contract.clientRating !== null) {
      return res.status(400).json({
        success: false,
        message: "You have already submitted feedback for this contract",
        code: "FEEDBACK_ALREADY_SUBMITTED",
      });
    }

    if (req.user.userType === "worker" && contract.workerRating !== null) {
      return res.status(400).json({
        success: false,
        message: "You have already submitted feedback for this contract",
        code: "FEEDBACK_ALREADY_SUBMITTED",
      });
    }

    // Update contract with feedback
    if (req.user.userType === "client") {
      contract.clientRating = rating;
      contract.clientFeedback = feedback;
    } else {
      contract.workerRating = rating;
      contract.workerFeedback = feedback;
    }

    await contract.save();

    // Update user average ratings
    if (req.user.userType === "client") {
      // Update worker's average rating
      const workerStats = await WorkContract.getWorkerStats(contract.workerId);
      if (workerStats.length > 0) {
        await Worker.findByIdAndUpdate(contract.workerId, {
          averageRating: workerStats[0].averageRating || 0,
          totalJobsCompleted: workerStats[0].completedContracts || 0,
        });
      }
    } else {
      // Update client's average rating
      const clientStats = await WorkContract.getClientStats(contract.clientId);
      if (clientStats.length > 0) {
        await Client.findByIdAndUpdate(contract.clientId, {
          averageRating: clientStats[0].averageRating || 0,
          totalJobsPosted: clientStats[0].completedContracts || 0,
        });
      }
    }

    const processingTime = Date.now() - startTime;

    logger.info("Feedback submitted successfully", {
      contractId,
      userType: req.user.userType,
      rating,
      userId: req.user.id,
      ip: req.ip,
      processingTime: `${processingTime}ms`,
      timestamp: new Date().toISOString(),
    });

    res.status(200).json({
      success: true,
      message: "Feedback submitted successfully",
      code: "FEEDBACK_SUBMITTED",
      data: contract.toSafeObject(),
      meta: {
        processingTime: `${processingTime}ms`,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    return handleContractError(error, res, "Submit feedback", req);
  }
};

// Cancel contract (by either party)
const cancelContract = async (req, res) => {
  const startTime = Date.now();

  try {
    // Validate parameters
    const { error, value } = paramIdSchema.validate(req.params);
    if (error) {
      return res.status(400).json({
        success: false,
        message: "Invalid contract ID",
        code: "INVALID_PARAM",
      });
    }

    const { id: contractId } = sanitizeInput(value);

    // Build filter based on user type
    const filter = {
      _id: contractId,
      contractStatus: { $in: ["active", "in_progress"] },
      isDeleted: false,
    };

    if (req.user.userType === "client") {
      filter.clientId = req.clientProfile._id;
    } else {
      filter.workerId = req.workerProfile._id;
    }

    const contract = await WorkContract.findOne(filter);

    if (!contract) {
      return res.status(404).json({
        success: false,
        message: "Contract not found or cannot be cancelled",
        code: "CONTRACT_NOT_FOUND",
      });
    }

    // Update contract
    contract.contractStatus = "cancelled";
    await contract.save();

    // Update job status if linked to a job
    if (contract.jobId) {
      await Job.findByIdAndUpdate(contract.jobId, {
        status: "open",
        hiredWorker: null,
      });
    }

    const processingTime = Date.now() - startTime;

    logger.info("Contract cancelled successfully", {
      contractId,
      cancelledBy: req.user.userType,
      userId: req.user.id,
      ip: req.ip,
      processingTime: `${processingTime}ms`,
      timestamp: new Date().toISOString(),
    });

    res.status(200).json({
      success: true,
      message: "Contract cancelled successfully",
      code: "CONTRACT_CANCELLED",
      meta: {
        processingTime: `${processingTime}ms`,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    return handleContractError(error, res, "Cancel contract", req);
  }
};

module.exports = {
  getClientContracts,
  getWorkerContracts,
  getContractDetails,
  startWork,
  completeWork,
  submitFeedback,
  cancelContract,
};
