const Joi = require("joi");
const xss = require("xss");
const mongoose = require("mongoose");

// Models
const JobApplication = require("../models/JobApplication");
const WorkContract = require("../models/WorkContract");
const Job = require("../models/Job");
const Worker = require("../models/Worker");
const Client = require("../models/Client");
const Conversation = require("../models/Conversation");

// Utils
const logger = require("../utils/logger");
const { emitToUser, emitToUsers } = require("../socket");
const { encryptAES128, decryptAES128 } = require("../utils/encipher");
const { sendJobProgressEmail } = require("../mailer/jobProgressNotifications");

// Helper function for safe decryption
const safeDecrypt = (encryptedData, fieldName = "field") => {
  if (!encryptedData || typeof encryptedData !== "string") {
    return "";
  }

  try {
    return decryptAES128(encryptedData);
  } catch (error) {
    logger.warn(`Decryption failed for ${fieldName}`, {
      error: error.message,
      fieldName,
      dataType: typeof encryptedData,
      dataLength: encryptedData.length,
    });
    return encryptedData; // Return original if decryption fails
  }
};

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
  action: Joi.string()
    .valid("accept", "reject", "start_discussion")
    .required()
    .messages({
      "any.only":
        "Action must be either 'accept', 'reject', or 'start_discussion'",
      "any.required": "Action is required",
    }),
});

const agreementSchema = Joi.object({
  agreed: Joi.boolean().required().messages({
    "any.required": "Agreement status is required",
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
const createConversationForContract = async (
  clientCredentialId,
  workerCredentialId,
  contractId
) => {
  try {
    // Check if conversation already exists (by credential ids)
    let conversation = await Conversation.findOne({
      $and: [
        { participants: { $elemMatch: { credentialId: clientCredentialId } } },
        { participants: { $elemMatch: { credentialId: workerCredentialId } } },
      ],
    });

    if (!conversation) {
      conversation = new Conversation({
        participants: [
          { credentialId: clientCredentialId, userType: "client" },
          { credentialId: workerCredentialId, userType: "worker" },
        ],
        lastMessage: "",
        lastSender: null,
      });
      await conversation.save();
    }

    return conversation;
  } catch (error) {
    logger.error("Failed to create conversation for contract", {
      error: error.message,
      clientCredentialId,
      workerCredentialId,
      contractId,
    });
    // Don't throw error - conversation creation shouldn't break contract creation
    return null;
  }
};

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
    }).populate("clientId", "credentialId isVerified blocked");

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

    // Check if worker is available for new work
    const worker = await Worker.findById(req.workerProfile.id);
    if (!worker || !worker.canAcceptNewContract()) {
      return res.status(409).json({
        success: false,
        message:
          "You are currently working on another job. Please complete your current work before applying to new jobs.",
        code: "WORKER_NOT_AVAILABLE",
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

    // Realtime: notify client about new application
    try {
      const clientCred = job.clientId?.credentialId;
      if (clientCred) {
        emitToUser(clientCred, "application:created", {
          applicationId: application.id,
          jobId,
          status: application.applicationStatus,
        });
      }
    } catch (e) {
      logger.warn("Socket emit failed for applyToJob", { error: e.message });
    }

    // Email: notify client about new application (non-blocking)
    try {
      const clientCredential = await mongoose
        .model("Credential")
        .findById(job.clientId.credentialId)
        .select("+email");

      if (clientCredential && clientCredential.email) {
        await sendJobProgressEmail(
          clientCredential.email,
          "application_submitted",
          application.jobId?.description || "FixIt Job",
          {
            proposedRate: application.proposedRate,
            message: application.message,
            applicationId: application._id,
            jobId: application.jobId?._id || jobId,
          }
        );

        logger.info("Client application email sent successfully", {
          applicationId: application.id,
          clientEmail: clientCredential.email,
        });
      } else {
        logger.warn("Client email not available; skipping application email", {
          clientCredentialFound: !!clientCredential,
          credentialId: job.clientId?.credentialId,
        });
      }
    } catch (emailErr) {
      logger.warn("Failed to send application email to client", {
        error: emailErr.message,
        applicationId: application.id,
        clientId: job.clientId?.id,
      });
    }

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
        select: "firstName lastName profilePicture credentialId",
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
    if (action === "start_discussion") {
      application.applicationStatus = "in_discussion";
      application.discussionStartedAt = new Date();
    } else {
      application.applicationStatus =
        action === "accept" ? "accepted" : "rejected";
    }
    application.respondedAt = new Date();
    await application.save();

    let contract = null;

    // If accepted directly (old flow) or start_discussion, create contract only if direct accept
    if (action === "accept") {
      // Check if worker is available before creating contract
      const worker = await Worker.findById(application.workerId._id);
      if (!worker || !worker.canAcceptNewContract()) {
        return res.status(409).json({
          success: false,
          message:
            "The worker is already working on another job. Please wait until they complete their current work.",
          code: "WORKER_NOT_AVAILABLE",
        });
      }

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

      // Create conversation for contract
      await createConversationForContract(
        req.user.id,
        application.workerId.credentialId,
        contract._id
      );

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

    // Send email notification to worker about client's response
    try {
      // Get worker's email from credential - explicitly select email field
      const workerCredential = await mongoose
        .model("Credential")
        .findById(application.workerId.credentialId)
        .select("+email");

      if (workerCredential && workerCredential.email) {
        let emailType;
        if (action === "accept") {
          emailType = "application_accepted";
        } else if (action === "reject") {
          emailType = "application_rejected";
        } else if (action === "start_discussion") {
          emailType = "discussion_started";
        }

        await sendJobProgressEmail(
          workerCredential.email,
          emailType,
          application.jobId.description,
          {
            proposedRate: application.proposedRate,
            applicationId: application._id,
            jobId: application.jobId._id,
          }
        );

        logger.info("Worker notification email sent successfully", {
          applicationId,
          action,
          emailType,
          workerEmail: workerCredential.email,
        });
      }
    } catch (emailError) {
      logger.warn("Failed to send email notification to worker", {
        error: emailError.message,
        applicationId,
        action,
        workerId: application.workerId._id,
      });
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
    try {
      // Notify worker of application response
      emitToUser(application.workerId.credentialId, "application:updated", {
        applicationId,
        status: application.applicationStatus,
      });
      // Notify client (actor) as well
      emitToUser(req.user.id, "application:updated", {
        applicationId,
        status: application.applicationStatus,
      });
      // If contract created, notify both
      if (contract) {
        emitToUsers(
          [application.workerId.credentialId, req.user.id],
          "contract:created",
          { contractId: contract._id, applicationId }
        );
      }
    } catch (e) {
      logger.warn("Socket emit failed for respondToApplication", {
        error: e.message,
      });
    }
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
          const { applicantIP, clientId, workerId, message, ...safeApp } = app;

          // Decrypt client name if it exists
          const decryptedClient = clientId
            ? {
                ...clientId,
                firstName: safeDecrypt(clientId.firstName, "client firstName"),
                lastName: safeDecrypt(clientId.lastName, "client lastName"),
              }
            : null;

          // Decrypt worker name if needed
          const decryptedWorker = workerId
            ? {
                ...workerId,
                firstName: safeDecrypt(workerId.firstName, "worker firstName"),
                lastName: safeDecrypt(workerId.lastName, "worker lastName"),
              }
            : null;

          return {
            ...safeApp,
            clientId: decryptedClient,
            workerId: decryptedWorker,
            message,
          };
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
    // Note: no socket emits from this listing endpoint
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
          const { applicantIP, clientId, workerId, message, ...safeApp } = app;

          // Decrypt client name if it exists
          const decryptedClient = clientId
            ? {
                ...clientId,
                firstName: safeDecrypt(clientId.firstName, "client firstName"),
                lastName: safeDecrypt(clientId.lastName, "client lastName"),
              }
            : null;

          // Decrypt worker name if needed
          const decryptedWorker = workerId
            ? {
                ...workerId,
                firstName: safeDecrypt(workerId.firstName, "worker firstName"),
                lastName: safeDecrypt(workerId.lastName, "worker lastName"),
              }
            : null;

          return {
            ...safeApp,
            clientId: decryptedClient,
            workerId: decryptedWorker,
            message,
          };
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
    // Note: no socket emits from this listing endpoint
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

// ==================== NEW AGREEMENT FLOW FUNCTIONS ====================

// Start discussion phase for application
const startApplicationDiscussion = async (req, res) => {
  const startTime = Date.now();

  try {
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

    const { id: applicationId } = sanitizeInput(paramValue);

    // Find application
    const application = await JobApplication.findOne({
      _id: applicationId,
      clientId: req.clientProfile._id,
      applicationStatus: "pending",
      isDeleted: false,
    }).populate([
      {
        path: "jobId",
        select: "title description price location category status",
      },
      {
        path: "workerId",
        select: "firstName lastName profilePicture credentialId",
      },
      {
        path: "clientId",
        select: "credentialId",
      },
    ]);

    if (!application) {
      return res.status(404).json({
        success: false,
        message: "Application not found or not accessible",
        code: "APPLICATION_NOT_FOUND",
      });
    }

    // Update to discussion phase
    application.applicationStatus = "in_discussion";
    application.discussionStartedAt = new Date();
    await application.save();

    logger.info("Application discussion started", {
      applicationId,
      jobId: application.jobId._id,
      workerId: application.workerId._id,
      clientId: req.clientProfile._id,
      userId: req.user.id,
      ip: req.ip,
      timestamp: new Date().toISOString(),
    });

    res.status(200).json({
      success: true,
      message: "Discussion phase started. You can now message each other.",
      code: "DISCUSSION_STARTED",
      data: {
        application: application.toSafeObject(),
        conversationInfo: {
          participantCredentialId: application.workerId.credentialId,
          participantUserType: "worker",
        },
      },
    });
    try {
      emitToUsers(
        [application.workerId.credentialId, application.clientId.credentialId],
        "application:discussion_started",
        { applicationId }
      );
    } catch (e) {
      logger.warn("Socket emit failed for startApplicationDiscussion", {
        error: e.message,
      });
    }
  } catch (error) {
    return handleApplicationError(
      error,
      res,
      "Start application discussion",
      req
    );
  }
};

// Mark agreement for application (client or worker)
const markApplicationAgreement = async (req, res) => {
  const startTime = Date.now();

  try {
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

    const { error: bodyError, value: bodyValue } = agreementSchema.validate(
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

    const { id: applicationId } = sanitizeInput(paramValue);
    const { agreed } = sanitizeInput(bodyValue);

    // Debug: Log the incoming request
    logger.info("Agreement request received", {
      applicationId,
      agreed,
      userType: req.user.userType,
      userId: req.user.id,
      clientId: req.clientProfile?._id,
      workerId: req.workerProfile?._id,
    });

    // Find application - accessible by both client and worker
    const query = {
      _id: applicationId,
      applicationStatus: {
        $in: ["in_discussion", "client_agreed", "worker_agreed"],
      },
      isDeleted: false,
    };

    // Add user-specific filter
    if (req.user.userType === "client") {
      query.clientId = req.clientProfile._id;
    } else if (req.user.userType === "worker") {
      query.workerId = req.workerProfile._id;
    }

    // Debug: Log the query being used
    logger.info("Agreement query", {
      query,
      userType: req.user.userType,
    });

    const application = await JobApplication.findOne(query).populate([
      {
        path: "jobId",
        select: "title description price location status",
      },
      {
        path: "workerId",
        select: "firstName lastName profilePicture credentialId",
      },
      {
        path: "clientId",
        select: "firstName lastName profilePicture credentialId",
      },
    ]);

    if (!application) {
      // Add debug information
      logger.warn("Application not found for agreement", {
        applicationId,
        userType: req.user.userType,
        userId: req.user.id,
        clientId: req.clientProfile?._id,
        workerId: req.workerProfile?._id,
        query,
        timestamp: new Date().toISOString(),
      });

      return res.status(404).json({
        success: false,
        message:
          "Application not found, not in agreement phase, or access denied",
        code: "APPLICATION_NOT_FOUND",
        debug: {
          applicationId,
          userType: req.user.userType,
          statusRequired: "in_discussion, client_agreed, or worker_agreed",
        },
      });
    }

    // Update agreement status
    if (req.user.userType === "client") {
      application.clientAgreed = agreed;
    } else {
      application.workerAgreed = agreed;
    }

    // Determine new status
    let newStatus = "in_discussion";
    if (application.clientAgreed && application.workerAgreed) {
      newStatus = "both_agreed";
      application.agreementCompletedAt = new Date();
    } else if (application.clientAgreed) {
      newStatus = "client_agreed";
    } else if (application.workerAgreed) {
      newStatus = "worker_agreed";
    }

    application.applicationStatus = newStatus;
    await application.save();

    let contract = null;

    // If both agreed, create contract automatically
    if (newStatus === "both_agreed") {
      // Check if worker is available before creating contract
      const worker = await Worker.findById(application.workerId._id);
      if (!worker || !worker.canAcceptNewContract()) {
        return res.status(409).json({
          success: false,
          message:
            "The worker is already working on another job. Contract creation failed.",
          code: "WORKER_NOT_AVAILABLE",
        });
      }

      contract = new WorkContract({
        clientId: application.clientId._id,
        workerId: application.workerId._id,
        jobId: application.jobId._id,
        contractType: "job_application",
        agreedRate: application.proposedRate,
        description: application.jobId.description,
        applicationId: application._id,
        createdIP: req.ip,
      });

      await contract.save();

      // Create conversation for contract
      await createConversationForContract(
        application.clientId.credentialId,
        application.workerId.credentialId,
        contract._id
      );

      // Update job status to in_progress
      await Job.findByIdAndUpdate(application.jobId._id, {
        status: "in_progress",
        hiredWorker: application.workerId._id,
      });

      // Reject all other pending applications for this job
      await JobApplication.updateMany(
        {
          jobId: application.jobId._id,
          applicationStatus: {
            $in: ["pending", "in_discussion", "client_agreed", "worker_agreed"],
          },
          _id: { $ne: application._id },
        },
        {
          applicationStatus: "rejected",
          respondedAt: new Date(),
        }
      );
    }

    const processingTime = Date.now() - startTime;

    logger.info("Application agreement marked successfully", {
      applicationId,
      agreed,
      newStatus,
      contractId: contract?._id,
      jobId: application.jobId._id,
      userId: req.user.id,
      userType: req.user.userType,
      ip: req.ip,
      processingTime: `${processingTime}ms`,
      timestamp: new Date().toISOString(),
    });

    res.status(200).json({
      success: true,
      message: `Agreement ${agreed ? "confirmed" : "updated"} successfully`,
      code: "AGREEMENT_UPDATED",
      data: {
        application: {
          id: application._id,
          clientAgreed: application.clientAgreed,
          workerAgreed: application.workerAgreed,
          status: newStatus,
        },
        contract: contract?.toSafeObject() || null,
      },
      meta: {
        processingTime: `${processingTime}ms`,
        timestamp: new Date().toISOString(),
      },
    });

    // Realtime: agreement updates and contract creation
    try {
      const clientCred = application.clientId?.credentialId;
      const workerCred = application.workerId?.credentialId;
      emitToUsers([clientCred, workerCred].filter(Boolean), "application:agreement", {
        applicationId,
        status: newStatus,
        clientAgreed: application.clientAgreed,
        workerAgreed: application.workerAgreed,
      });
      if (contract) {
        emitToUsers([clientCred, workerCred].filter(Boolean), "contract:created", {
          contractId: contract._id,
          applicationId,
        });
      }
    } catch (e) {
      logger.warn("Socket emit failed for markApplicationAgreement", { error: e.message });
    }
  } catch (error) {
    return handleApplicationError(
      error,
      res,
      "Mark application agreement",
      req
    );
  }
};

module.exports = {
  applyToJob,
  respondToApplication,
  getWorkerApplications,
  getClientApplications,
  withdrawApplication,
  startApplicationDiscussion, // New
  markApplicationAgreement, // New
};
