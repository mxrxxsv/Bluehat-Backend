const Joi = require("joi");
const xss = require("xss");
const mongoose = require("mongoose");

// Models
const WorkerInvitation = require("../models/WorkerInvitation");
const WorkContract = require("../models/WorkContract");
const Job = require("../models/Job");
const Worker = require("../models/Worker");
const Client = require("../models/Client");
const Conversation = require("../models/Conversation");

// Utils
const logger = require("../utils/logger");

// ==================== JOI SCHEMAS ====================
const invitationSchema = Joi.object({
  jobId: Joi.string()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .required() // Changed to required per your requirement
    .messages({
      "string.pattern.base": "Invalid job ID format",
      "any.required": "Job ID is required",
    }),
  proposedRate: Joi.number().min(0).max(1000000).required().messages({
    "number.min": "Proposed rate cannot be negative",
    "number.max": "Proposed rate cannot exceed 1,000,000",
    "any.required": "Proposed rate is required",
  }),
  description: Joi.string().trim().min(20).max(2000).required().messages({
    "string.min": "Description must be at least 20 characters",
    "string.max": "Description cannot exceed 2000 characters",
    "any.required": "Description is required",
  }),
});

const invitationResponseSchema = Joi.object({
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
    .valid("pending", "accepted", "rejected", "cancelled")
    .optional(),
  invitationType: Joi.string().valid("job_specific", "general_hire").optional(),
  sortBy: Joi.string()
    .valid("sentAt", "proposedRate", "invitationStatus")
    .default("sentAt"),
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

const handleInvitationError = (
  error,
  res,
  operation = "Invitation operation",
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
      message: "You have already invited this worker",
      code: "DUPLICATE_INVITATION",
    });
  }

  if (process.env.NODE_ENV === "production") {
    return res.status(500).json({
      success: false,
      message: `${operation} failed. Please try again.`,
      code: "INVITATION_ERROR",
    });
  }

  return res.status(500).json({
    success: false,
    message: error.message,
    code: "INVITATION_ERROR",
  });
};

// ==================== CONTROLLERS ====================

// Helper function to create conversation for contract
const createConversationForContract = async (
  clientId,
  workerId,
  contractId
) => {
  try {
    // Check if conversation already exists
    let conversation = await Conversation.findOne({
      participants: { $all: [clientId, workerId] },
      isDeleted: false,
    });

    if (!conversation) {
      conversation = new Conversation({
        participants: [clientId, workerId],
        conversationType: "contract",
        relatedContract: contractId,
      });
      await conversation.save();
    }

    return conversation;
  } catch (error) {
    logger.error("Failed to create conversation for contract", {
      error: error.message,
      clientId,
      workerId,
      contractId,
    });
    // Don't throw error - conversation creation shouldn't break contract creation
    return null;
  }
};

// Client invites worker
const inviteWorker = async (req, res) => {
  const startTime = Date.now();

  try {
    // Validate worker ID parameter
    const { error: paramError, value: paramValue } = paramIdSchema.validate({
      id: req.params.workerId,
    });
    if (paramError) {
      return res.status(400).json({
        success: false,
        message: "Invalid worker ID",
        code: "INVALID_PARAM",
        errors: paramError.details.map((detail) => ({
          field: detail.path.join("."),
          message: detail.message,
        })),
      });
    }

    // Validate request body
    const { error: bodyError, value: bodyValue } = invitationSchema.validate(
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

    const { id: workerId } = sanitizeInput(paramValue);
    const { jobId, proposedRate, description } = sanitizeInput(bodyValue);

    // Validate required job ID (since we only allow job_specific now)
    if (!jobId) {
      return res.status(400).json({
        success: false,
        message: "Job ID is required for invitations",
        code: "JOB_ID_REQUIRED",
      });
    }

    // Check if worker exists and is verified
    const worker = await Worker.findOne({
      _id: workerId,
      isVerified: true,
      blocked: { $ne: true },
    }).select("firstName lastName profilePicture skills");

    if (!worker) {
      return res.status(404).json({
        success: false,
        message: "Worker not found or not available for hire",
        code: "WORKER_NOT_FOUND",
      });
    }

    // Check if client is trying to invite themselves (edge case)
    if (workerId === req.clientProfile._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "You cannot invite yourself",
        code: "SELF_INVITATION_NOT_ALLOWED",
      });
    }

    let job = null;
    // Validate job if job-specific invitation
    if (jobId) {
      job = await Job.findOne({
        _id: jobId,
        clientId: req.clientProfile._id,
        isDeleted: false,
        status: "open",
      });

      if (!job) {
        return res.status(404).json({
          success: false,
          message: "Job not found or not available",
          code: "JOB_NOT_FOUND",
        });
      }
    }

    // Check for existing invitation
    const existingInvitation = await WorkerInvitation.findOne({
      clientId: req.clientProfile._id,
      workerId,
      jobId: jobId || null,
      invitationStatus: "pending",
      isDeleted: false,
      expiresAt: { $gt: new Date() },
    });

    if (existingInvitation) {
      return res.status(409).json({
        success: false,
        message: "You have already sent a pending invitation to this worker",
        code: "DUPLICATE_INVITATION",
      });
    }

    // Create invitation (only job_specific now)
    const invitation = new WorkerInvitation({
      clientId: req.clientProfile._id,
      workerId,
      jobId,
      invitationType: "job_specific", // Fixed to job_specific only
      proposedRate,
      description,
      senderIP: req.ip,
    });

    await invitation.save();

    // Populate for response
    await invitation.populate([
      {
        path: "workerId",
        select: "firstName lastName profilePicture skills",
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

    logger.info("Worker invitation sent successfully", {
      invitationId: invitation._id,
      workerId,
      clientId: req.clientProfile._id,
      jobId,
      invitationType,
      proposedRate,
      userId: req.user.id,
      ip: req.ip,
      processingTime: `${processingTime}ms`,
      timestamp: new Date().toISOString(),
    });

    res.status(201).json({
      success: true,
      message: "Invitation sent successfully",
      code: "INVITATION_SENT",
      data: invitation.toSafeObject(),
      meta: {
        processingTime: `${processingTime}ms`,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    return handleInvitationError(error, res, "Worker invitation", req);
  }
};

// Worker responds to invitation (accept/reject)
const respondToInvitation = async (req, res) => {
  const startTime = Date.now();

  try {
    // Validate parameters
    const { error: paramError, value: paramValue } = paramIdSchema.validate(
      req.params
    );
    if (paramError) {
      return res.status(400).json({
        success: false,
        message: "Invalid invitation ID",
        code: "INVALID_PARAM",
      });
    }

    // Validate body
    const { error: bodyError, value: bodyValue } =
      invitationResponseSchema.validate(req.body);
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

    const { id: invitationId } = sanitizeInput(paramValue);
    const { action } = sanitizeInput(bodyValue);

    // Find invitation
    const invitation = await WorkerInvitation.findOne({
      _id: invitationId,
      workerId: req.workerProfile._id,
      invitationStatus: "pending",
      isDeleted: false,
      expiresAt: { $gt: new Date() },
    }).populate([
      {
        path: "clientId",
        select: "firstName lastName profilePicture",
      },
      {
        path: "jobId",
        select: "description price location category status",
      },
    ]);

    if (!invitation) {
      return res.status(404).json({
        success: false,
        message: "Invitation not found, expired, or already processed",
        code: "INVITATION_NOT_FOUND",
      });
    }

    // Check if job is still open (for job-specific invitations)
    if (invitation.jobId && invitation.jobId.status !== "open") {
      return res.status(400).json({
        success: false,
        message: "This job is no longer open",
        code: "JOB_NOT_OPEN",
      });
    }

    // Update invitation status
    if (action === "start_discussion") {
      invitation.invitationStatus = "in_discussion";
      invitation.discussionStartedAt = new Date();
    } else {
      invitation.invitationStatus =
        action === "accept" ? "accepted" : "rejected";
    }
    invitation.respondedAt = new Date();
    await invitation.save();

    let contract = null;

    // If accepted directly (old flow), create contract only if direct accept
    if (action === "accept") {
      contract = new WorkContract({
        clientId: invitation.clientId._id,
        workerId: req.workerProfile._id,
        jobId: invitation.jobId?._id || null,
        contractType: "direct_invitation",
        agreedRate: invitation.proposedRate,
        description: invitation.description,
        invitationId: invitation._id,
        createdIP: req.ip,
      });

      await contract.save();

      // Create conversation for contract
      await createConversationForContract(
        invitation.clientId._id,
        req.workerProfile._id,
        contract._id
      );

      // If job-specific, update job status
      if (invitation.jobId) {
        await Job.findByIdAndUpdate(invitation.jobId._id, {
          status: "in_progress",
          hiredWorker: req.workerProfile._id,
        });

        // Cancel other pending invitations for this job
        await WorkerInvitation.updateMany(
          {
            jobId: invitation.jobId._id,
            invitationStatus: "pending",
            _id: { $ne: invitation._id },
          },
          {
            invitationStatus: "cancelled",
            respondedAt: new Date(),
          }
        );
      }
    }

    const processingTime = Date.now() - startTime;

    logger.info("Invitation response processed successfully", {
      invitationId,
      action,
      contractId: contract?._id,
      jobId: invitation.jobId?._id,
      workerId: req.workerProfile._id,
      clientId: invitation.clientId._id,
      userId: req.user.id,
      ip: req.ip,
      processingTime: `${processingTime}ms`,
      timestamp: new Date().toISOString(),
    });

    res.status(200).json({
      success: true,
      message: `Invitation ${action}ed successfully`,
      code: `INVITATION_${action.toUpperCase()}ED`,
      data: {
        invitation: invitation.toSafeObject(),
        contract: contract?.toSafeObject() || null,
      },
      meta: {
        processingTime: `${processingTime}ms`,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    return handleInvitationError(error, res, "Invitation response", req);
  }
};

// Get invitations sent by client
const getClientInvitations = async (req, res) => {
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

    const { page, limit, status, invitationType, sortBy, order } =
      sanitizeInput(value);

    // Build filter
    const filter = {
      clientId: req.clientProfile._id,
      isDeleted: false,
    };

    if (status) filter.invitationStatus = status;
    if (invitationType) filter.invitationType = invitationType;

    const sortOrder = order === "asc" ? 1 : -1;

    // Get invitations with pagination
    const invitations = await WorkerInvitation.find(filter)
      .populate({
        path: "workerId",
        select: "firstName lastName profilePicture skills averageRating",
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

    const totalCount = await WorkerInvitation.countDocuments(filter);

    const processingTime = Date.now() - startTime;

    res.status(200).json({
      success: true,
      message: "Client invitations retrieved successfully",
      code: "CLIENT_INVITATIONS_RETRIEVED",
      data: {
        invitations: invitations.map((inv) => {
          const { senderIP, ...safeInv } = inv;
          return safeInv;
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
    return handleInvitationError(error, res, "Get client invitations", req);
  }
};

// Get invitations received by worker
const getWorkerInvitations = async (req, res) => {
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

    const { page, limit, status, invitationType, sortBy, order } =
      sanitizeInput(value);

    // Build filter - only show non-expired invitations
    const filter = {
      workerId: req.workerProfile._id,
      isDeleted: false,
      expiresAt: { $gt: new Date() },
    };

    if (status) filter.invitationStatus = status;
    if (invitationType) filter.invitationType = invitationType;

    const sortOrder = order === "asc" ? 1 : -1;

    // Get invitations with pagination
    const invitations = await WorkerInvitation.find(filter)
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

    const totalCount = await WorkerInvitation.countDocuments(filter);

    const processingTime = Date.now() - startTime;

    res.status(200).json({
      success: true,
      message: "Worker invitations retrieved successfully",
      code: "WORKER_INVITATIONS_RETRIEVED",
      data: {
        invitations: invitations.map((inv) => {
          const { senderIP, ...safeInv } = inv;
          return safeInv;
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
    return handleInvitationError(error, res, "Get worker invitations", req);
  }
};

// Client cancels invitation
const cancelInvitation = async (req, res) => {
  const startTime = Date.now();

  try {
    // Validate parameters
    const { error, value } = paramIdSchema.validate(req.params);
    if (error) {
      return res.status(400).json({
        success: false,
        message: "Invalid invitation ID",
        code: "INVALID_PARAM",
      });
    }

    const { id: invitationId } = sanitizeInput(value);

    // Find invitation
    const invitation = await WorkerInvitation.findOne({
      _id: invitationId,
      clientId: req.clientProfile._id,
      invitationStatus: "pending",
      isDeleted: false,
    });

    if (!invitation) {
      return res.status(404).json({
        success: false,
        message: "Invitation not found or cannot be cancelled",
        code: "INVITATION_NOT_FOUND",
      });
    }

    // Update status
    invitation.invitationStatus = "cancelled";
    invitation.respondedAt = new Date();
    await invitation.save();

    const processingTime = Date.now() - startTime;

    logger.info("Invitation cancelled successfully", {
      invitationId,
      clientId: req.clientProfile._id,
      userId: req.user.id,
      ip: req.ip,
      processingTime: `${processingTime}ms`,
      timestamp: new Date().toISOString(),
    });

    res.status(200).json({
      success: true,
      message: "Invitation cancelled successfully",
      code: "INVITATION_CANCELLED",
      meta: {
        processingTime: `${processingTime}ms`,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    return handleInvitationError(error, res, "Cancel invitation", req);
  }
};

// ==================== NEW AGREEMENT FLOW FUNCTIONS ====================

// Start discussion phase for invitation
const startInvitationDiscussion = async (req, res) => {
  const startTime = Date.now();

  try {
    const { error: paramError, value: paramValue } = paramIdSchema.validate(
      req.params
    );
    if (paramError) {
      return res.status(400).json({
        success: false,
        message: "Invalid invitation ID",
        code: "INVALID_PARAM",
      });
    }

    const { id: invitationId } = sanitizeInput(paramValue);

    // Find invitation
    const invitation = await WorkerInvitation.findOne({
      _id: invitationId,
      workerId: req.workerProfile._id,
      invitationStatus: "pending",
      isDeleted: false,
      expiresAt: { $gt: new Date() },
    }).populate([
      {
        path: "jobId",
        select: "title description price location category status",
      },
      {
        path: "clientId",
        select: "firstName lastName profilePicture credentialId",
      },
    ]);

    if (!invitation) {
      return res.status(404).json({
        success: false,
        message: "Invitation not found or not accessible",
        code: "INVITATION_NOT_FOUND",
      });
    }

    // Update to discussion phase
    invitation.invitationStatus = "in_discussion";
    invitation.discussionStartedAt = new Date();
    await invitation.save();

    logger.info("Invitation discussion started", {
      invitationId,
      jobId: invitation.jobId._id,
      workerId: req.workerProfile._id,
      clientId: invitation.clientId._id,
      userId: req.user.id,
      ip: req.ip,
      timestamp: new Date().toISOString(),
    });

    res.status(200).json({
      success: true,
      message: "Discussion phase started. You can now message each other.",
      code: "DISCUSSION_STARTED",
      data: {
        invitation: invitation.toSafeObject(),
        conversationInfo: {
          participantCredentialId: invitation.clientId.credentialId,
          participantUserType: "client",
        },
      },
    });
  } catch (error) {
    return handleInvitationError(
      error,
      res,
      "Start invitation discussion",
      req
    );
  }
};

// Mark agreement for invitation (client or worker)
const markInvitationAgreement = async (req, res) => {
  const startTime = Date.now();

  try {
    const { error: paramError, value: paramValue } = paramIdSchema.validate(
      req.params
    );
    if (paramError) {
      return res.status(400).json({
        success: false,
        message: "Invalid invitation ID",
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

    const { id: invitationId } = sanitizeInput(paramValue);
    const { agreed } = sanitizeInput(bodyValue);

    // Find invitation - accessible by both client and worker
    const query = {
      _id: invitationId,
      invitationStatus: {
        $in: ["in_discussion", "client_agreed", "worker_agreed"],
      },
      isDeleted: false,
      expiresAt: { $gt: new Date() },
    };

    // Add user-specific filter
    if (req.user.userType === "client") {
      query.clientId = req.clientProfile._id;
    } else if (req.user.userType === "worker") {
      query.workerId = req.workerProfile._id;
    }

    const invitation = await WorkerInvitation.findOne(query).populate([
      {
        path: "jobId",
        select: "title description price location status",
      },
      {
        path: "workerId",
        select: "firstName lastName profilePicture",
      },
      {
        path: "clientId",
        select: "firstName lastName profilePicture",
      },
    ]);

    if (!invitation) {
      return res.status(404).json({
        success: false,
        message: "Invitation not found or not in agreement phase",
        code: "INVITATION_NOT_FOUND",
      });
    }

    // Update agreement status
    if (req.user.userType === "client") {
      invitation.clientAgreed = agreed;
    } else {
      invitation.workerAgreed = agreed;
    }

    // Determine new status
    let newStatus = "in_discussion";
    if (invitation.clientAgreed && invitation.workerAgreed) {
      newStatus = "both_agreed";
      invitation.agreementCompletedAt = new Date();
    } else if (invitation.clientAgreed) {
      newStatus = "client_agreed";
    } else if (invitation.workerAgreed) {
      newStatus = "worker_agreed";
    }

    invitation.invitationStatus = newStatus;
    await invitation.save();

    let contract = null;

    // If both agreed, create contract automatically
    if (newStatus === "both_agreed") {
      contract = new WorkContract({
        clientId: invitation.clientId._id,
        workerId: invitation.workerId._id,
        jobId: invitation.jobId._id,
        contractType: "direct_invitation",
        agreedRate: invitation.proposedRate,
        description: invitation.description,
        invitationId: invitation._id,
        createdIP: req.ip,
      });

      await contract.save();

      // Create conversation for contract
      await createConversationForContract(
        invitation.clientId._id,
        invitation.workerId._id,
        contract._id
      );

      // Update job status
      await Job.findByIdAndUpdate(invitation.jobId._id, {
        status: "in_progress",
        hiredWorker: invitation.workerId._id,
      });

      // Update invitation to accepted
      invitation.invitationStatus = "accepted";
      await invitation.save();

      // Cancel other pending invitations for this job
      await WorkerInvitation.updateMany(
        {
          jobId: invitation.jobId._id,
          invitationStatus: {
            $in: ["pending", "in_discussion", "client_agreed", "worker_agreed"],
          },
          _id: { $ne: invitation._id },
        },
        {
          invitationStatus: "cancelled",
          respondedAt: new Date(),
        }
      );
    }

    const processingTime = Date.now() - startTime;

    logger.info("Invitation agreement updated", {
      invitationId,
      userType: req.user.userType,
      agreed,
      newStatus,
      contractCreated: !!contract,
      userId: req.user.id,
      ip: req.ip,
      processingTime: `${processingTime}ms`,
      timestamp: new Date().toISOString(),
    });

    res.status(200).json({
      success: true,
      message: contract
        ? "Both parties agreed! Work contract created successfully."
        : `Agreement status updated. ${
            newStatus === "client_agreed" || newStatus === "worker_agreed"
              ? "Waiting for other party to agree."
              : ""
          }`,
      code: contract ? "CONTRACT_CREATED" : "AGREEMENT_UPDATED",
      data: {
        invitation: invitation.toSafeObject(),
        contract: contract?.toSafeObject() || null,
        agreementStatus: {
          clientAgreed: invitation.clientAgreed,
          workerAgreed: invitation.workerAgreed,
          status: newStatus,
        },
      },
      meta: {
        processingTime: `${processingTime}ms`,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    return handleInvitationError(error, res, "Mark invitation agreement", req);
  }
};

module.exports = {
  inviteWorker,
  respondToInvitation,
  getClientInvitations,
  getWorkerInvitations,
  cancelInvitation,
  startInvitationDiscussion, // New
  markInvitationAgreement, // New
};
