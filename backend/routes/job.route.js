const express = require("express");
const router = express.Router();
const helmet = require("helmet");

// Middleware imports
const verifyToken = require("../middleware/verifyToken");
const verifyAdmin = require("../middleware/verifyAdmin");
const { authLimiter, adminLimiter } = require("../utils/rateLimit");
const logger = require("../utils/logger");

// Controller imports - MATCHING YOUR ACTUAL CONTROLLER
const {
  getAllJobs,
  getJobsByCategory,
  getJobsByLocation,
  getJobById,
  postJob,
  updateJob,
  deleteJob,
} = require("../controllers/job.controller");

// ✅ Security headers for job routes
router.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        connectSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:", "https:"],
      },
    },
  })
);

// ✅ Custom request logging for job routes
const requestLogger = (req, res, next) => {
  const start = Date.now();

  // Log request
  logger.info("Job request", {
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
    userAgent: req.get("User-Agent"),
    userId: req.user?.id,
    userType: req.user?.userType,
    adminId: req.admin?._id,
    hasAuth: !!(req.user || req.admin),
    contentLength: req.get("Content-Length"),
    timestamp: new Date().toISOString(),
  });

  // Override res.send to log response
  const originalSend = res.send;
  res.send = function (data) {
    const duration = Date.now() - start;

    logger.info("Job response", {
      method: req.method,
      url: req.originalUrl,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip,
      userId: req.user?.id,
      userType: req.user?.userType,
      adminId: req.admin?._id,
      hasAuth: !!(req.user || req.admin),
      responseSize: Buffer.byteLength(data, "utf8"),
      timestamp: new Date().toISOString(),
    });

    originalSend.call(this, data);
  };

  next();
};

router.use(requestLogger);

// ==================== PUBLIC ROUTES ====================

/**
 * @route   GET /jobs/health
 * @desc    Job service health check
 * @access  Public
 */
router.get("/health", (req, res) => {
  const uptime = process.uptime();
  const memoryUsage = process.memoryUsage();

  res.status(200).json({
    success: true,
    service: "jobs",
    status: "healthy",
    timestamp: new Date().toISOString(),
    uptime: `${Math.floor(uptime / 60)}m ${Math.floor(uptime % 60)}s`,
    version: "1.0.0",
    environment: process.env.NODE_ENV || "development",
    memory: {
      used: `${Math.round(memoryUsage.heapUsed / 1024 / 1024)}MB`,
      total: `${Math.round(memoryUsage.heapTotal / 1024 / 1024)}MB`,
    },
    features: {
      contentModeration: true,
      realTimeUpdates: true,
      advancedFiltering: true,
      geoLocation: true,
    },
  });
});

/**
 * @route   GET /jobs
 * @desc    Get all verified jobs with pagination and filtering
 * @access  Public
 * @query   page, limit, category, location, search, status, sortBy, order
 */
router.get("/", getAllJobs);

/**
 * @route   GET /jobs/category/:categoryId
 * @desc    Get jobs by specific category with pagination
 * @access  Public
 * @params  categoryId - ObjectId of the skill category
 * @query   page, limit, location, status, sortBy, order
 */
router.get("/category/:categoryId", getJobsByCategory);

/**
 * @route   GET /jobs/location/:location
 * @desc    Get jobs by location with pagination and statistics
 * @access  Public
 * @params  location - Location string (case-insensitive)
 * @query   page, limit, category, status, sortBy, order
 */
router.get("/location/:location", getJobsByLocation);

/**
 * @route   GET /jobs/:id
 * @desc    Get single job by ID with full details
 * @access  Public
 * @params  id - ObjectId of the job
 */
router.get("/:id", getJobById);

// ==================== AUTHENTICATED CLIENT ROUTES ====================

/**
 * @route   POST /jobs
 * @desc    Create a new job posting (verified clients only)
 * @access  Private (Client)
 * @body    description, price, location, category
 */
router.post("/", authLimiter, verifyToken, postJob);

/**
 * @route   PUT /jobs/:id
 * @desc    Update job posting (owner only, before verification)
 * @access  Private (Client - Owner)
 * @params  id - ObjectId of the job
 * @body    description, price, location, category, status
 */
router.put("/:id", authLimiter, verifyToken, updateJob);

/**
 * @route   DELETE /jobs/:id
 * @desc    Soft delete job posting (owner only)
 * @access  Private (Client - Owner)
 * @params  id - ObjectId of the job
 */
router.delete("/:id", authLimiter, verifyToken, deleteJob);

// ==================== ADMIN ROUTES ====================

/**
 * @route   PATCH /jobs/:id/verify
 * @desc    Verify/approve a job posting
 * @access  Admin only
 * @params  id - ObjectId of the job
 */
router.patch("/:id/verify", adminLimiter, verifyAdmin, async (req, res) => {
  const startTime = Date.now();

  try {
    const { id } = req.params;

    // ✅ Verify admin authentication
    if (!req.admin || !req.admin._id) {
      logger.warn("Unauthorized job verification attempt", {
        jobId: id,
        ip: req.ip,
        timestamp: new Date().toISOString(),
      });

      return res.status(401).json({
        success: false,
        message: "Admin authentication required",
        code: "ADMIN_AUTH_REQUIRED",
      });
    }

    const Job = require("../models/Job");
    const job = await Job.findById(id)
      .populate("category", "categoryName")
      .populate({
        path: "clientId",
        select: "firstName lastName",
        populate: {
          path: "credentialId",
          select: "email",
        },
      });

    if (!job || job.isDeleted) {
      logger.warn("Admin attempted to verify non-existent or deleted job", {
        jobId: id,
        adminId: req.admin._id,
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

    if (job.isVerified) {
      logger.info("Job already verified", {
        jobId: id,
        adminId: req.admin._id,
        verifiedAt: job.verifiedAt,
        ip: req.ip,
        timestamp: new Date().toISOString(),
      });

      return res.status(200).json({
        success: true,
        message: "Job already verified",
        code: "JOB_ALREADY_VERIFIED",
        data: job,
        meta: {
          processingTime: `${Date.now() - startTime}ms`,
          timestamp: new Date().toISOString(),
        },
      });
    }

    // ✅ Update job verification
    job.isVerified = true;
    job.verifiedAt = new Date();
    job.verifiedBy = req.admin._id;

    await job.save();

    const processingTime = Date.now() - startTime;

    logger.info("Job verified successfully by admin", {
      jobId: id,
      jobTitle: job.description.substring(0, 50) + "...",
      adminId: req.admin._id,
      adminName: req.admin.userName || req.admin.firstName,
      clientId: job.clientId?._id,
      category: job.category?.categoryName,
      verifiedAt: job.verifiedAt,
      ip: req.ip,
      userAgent: req.get("User-Agent"),
      processingTime: `${processingTime}ms`,
      timestamp: new Date().toISOString(),
    });

    res.status(200).json({
      success: true,
      message: "Job verified successfully",
      code: "JOB_VERIFIED",
      data: {
        jobId: job._id,
        description: job.description.substring(0, 100) + "...",
        price: job.price,
        location: job.location,
        category: job.category?.categoryName || "Unknown",
        client: job.clientId
          ? `${job.clientId.firstName} ${job.clientId.lastName}`
          : "Unknown",
        verifiedAt: job.verifiedAt,
        verifiedBy: req.admin.userName || req.admin.firstName,
      },
      meta: {
        processingTime: `${processingTime}ms`,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (err) {
    const processingTime = Date.now() - startTime;

    logger.error("Admin job verification failed", {
      error: err.message,
      stack: err.stack,
      jobId: req.params?.id,
      adminId: req.admin?._id,
      ip: req.ip,
      userAgent: req.get("User-Agent"),
      processingTime: `${processingTime}ms`,
      timestamp: new Date().toISOString(),
    });

    return res.status(500).json({
      success: false,
      message:
        process.env.NODE_ENV === "production"
          ? "Job verification failed. Please try again."
          : err.message,
      code: "VERIFICATION_ERROR",
      meta: {
        processingTime: `${processingTime}ms`,
        timestamp: new Date().toISOString(),
      },
    });
  }
});

/**
 * @route   PATCH /jobs/:id/reject
 * @desc    Reject/delete a job posting with reason
 * @access  Admin only
 * @params  id - ObjectId of the job
 * @body    reason - Rejection reason (required)
 */
router.patch("/:id/reject", adminLimiter, verifyAdmin, async (req, res) => {
  const startTime = Date.now();

  try {
    const { id } = req.params;
    const { reason } = req.body;

    // ✅ Verify admin authentication
    if (!req.admin || !req.admin._id) {
      logger.warn("Unauthorized job rejection attempt", {
        jobId: id,
        ip: req.ip,
        timestamp: new Date().toISOString(),
      });

      return res.status(401).json({
        success: false,
        message: "Admin authentication required",
        code: "ADMIN_AUTH_REQUIRED",
      });
    }

    // ✅ Validate rejection reason
    if (!reason || reason.trim().length < 10) {
      return res.status(400).json({
        success: false,
        message: "Rejection reason is required (minimum 10 characters)",
        code: "VALIDATION_ERROR",
      });
    }

    const Job = require("../models/Job");
    const job = await Job.findById(id)
      .populate("category", "categoryName")
      .populate({
        path: "clientId",
        select: "firstName lastName",
        populate: {
          path: "credentialId",
          select: "email",
        },
      });

    if (!job || job.isDeleted) {
      logger.warn("Admin attempted to reject non-existent or deleted job", {
        jobId: id,
        adminId: req.admin._id,
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

    if (job.isVerified) {
      logger.warn("Admin attempted to reject verified job", {
        jobId: id,
        adminId: req.admin._id,
        verifiedAt: job.verifiedAt,
        verifiedBy: job.verifiedBy,
        ip: req.ip,
        timestamp: new Date().toISOString(),
      });

      return res.status(400).json({
        success: false,
        message: "Cannot reject an already verified job",
        code: "JOB_ALREADY_VERIFIED",
      });
    }

    // ✅ Store job details for audit log before rejection
    const jobDetails = {
      id: job._id,
      description: job.description.substring(0, 100) + "...",
      price: job.price,
      location: job.location,
      category: job.category?.categoryName,
      clientId: job.clientId?._id,
      clientName: job.clientId
        ? `${job.clientId.firstName} ${job.clientId.lastName}`
        : "Unknown",
    };

    // ✅ Soft delete the job and add rejection info
    job.isDeleted = true;
    job.deletedAt = new Date();
    job.rejectedBy = req.admin._id;
    job.rejectionReason = reason.trim();

    await job.save();

    const processingTime = Date.now() - startTime;

    logger.info("Job rejected successfully by admin", {
      jobId: id,
      jobDetails,
      rejectionReason: reason,
      adminId: req.admin._id,
      adminName: req.admin.userName || req.admin.firstName,
      rejectedAt: job.deletedAt,
      ip: req.ip,
      userAgent: req.get("User-Agent"),
      processingTime: `${processingTime}ms`,
      timestamp: new Date().toISOString(),
    });

    res.status(200).json({
      success: true,
      message: "Job rejected successfully",
      code: "JOB_REJECTED",
      data: {
        jobId: job._id,
        description: job.description.substring(0, 100) + "...",
        client: job.clientId
          ? `${job.clientId.firstName} ${job.clientId.lastName}`
          : "Unknown",
        rejectionReason: reason,
        rejectedAt: job.deletedAt,
        rejectedBy: req.admin.userName || req.admin.firstName,
      },
      meta: {
        processingTime: `${processingTime}ms`,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (err) {
    const processingTime = Date.now() - startTime;

    logger.error("Admin job rejection failed", {
      error: err.message,
      stack: err.stack,
      jobId: req.params?.id,
      adminId: req.admin?._id,
      requestBody: req.body,
      ip: req.ip,
      userAgent: req.get("User-Agent"),
      processingTime: `${processingTime}ms`,
      timestamp: new Date().toISOString(),
    });

    return res.status(500).json({
      success: false,
      message:
        process.env.NODE_ENV === "production"
          ? "Job rejection failed. Please try again."
          : err.message,
      code: "REJECTION_ERROR",
      meta: {
        processingTime: `${processingTime}ms`,
        timestamp: new Date().toISOString(),
      },
    });
  }
});

/**
 * @route   GET /jobs/admin/pending
 * @desc    Get all pending jobs for admin verification
 * @access  Admin only
 * @query   page, limit
 */
router.get("/admin/pending", adminLimiter, verifyAdmin, async (req, res) => {
  const startTime = Date.now();

  try {
    // ✅ Verify admin authentication
    if (!req.admin || !req.admin._id) {
      logger.warn("Unauthorized pending jobs access attempt", {
        ip: req.ip,
        timestamp: new Date().toISOString(),
      });

      return res.status(401).json({
        success: false,
        message: "Admin authentication required",
        code: "ADMIN_AUTH_REQUIRED",
      });
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const Job = require("../models/Job");
    const [pendingJobs, totalCount] = await Promise.all([
      Job.find({
        isVerified: false,
        isDeleted: false,
      })
        .populate("category", "categoryName")
        .populate({
          path: "clientId",
          select: "firstName lastName profilePicture",
          populate: {
            path: "credentialId",
            select: "email",
          },
        })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(), // ✅ Performance optimization

      Job.countDocuments({
        isVerified: false,
        isDeleted: false,
      }),
    ]);

    const processingTime = Date.now() - startTime;

    logger.info("Pending jobs retrieved by admin", {
      totalPendingJobs: pendingJobs.length,
      totalCount,
      page,
      limit,
      adminId: req.admin._id,
      ip: req.ip,
      userAgent: req.get("User-Agent"),
      processingTime: `${processingTime}ms`,
      timestamp: new Date().toISOString(),
    });

    // ✅ Set cache headers
    res.set({
      "Cache-Control": "private, max-age=60", // 1 minute for admin data
      "X-Total-Count": totalCount.toString(),
    });

    res.status(200).json({
      success: true,
      message: "Pending jobs retrieved successfully",
      code: "PENDING_JOBS_RETRIEVED",
      data: {
        jobs: pendingJobs,
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
  } catch (err) {
    const processingTime = Date.now() - startTime;

    logger.error("Admin get pending jobs failed", {
      error: err.message,
      stack: err.stack,
      adminId: req.admin?._id,
      query: req.query,
      ip: req.ip,
      userAgent: req.get("User-Agent"),
      processingTime: `${processingTime}ms`,
      timestamp: new Date().toISOString(),
    });

    return res.status(500).json({
      success: false,
      message:
        process.env.NODE_ENV === "production"
          ? "Failed to retrieve pending jobs. Please try again."
          : err.message,
      code: "ADMIN_ERROR",
      meta: {
        processingTime: `${processingTime}ms`,
        timestamp: new Date().toISOString(),
      },
    });
  }
});

// ==================== ERROR HANDLING ====================

// Handle 404 for undefined job routes
router.use("*", (req, res) => {
  logger.warn("Job endpoint not found", {
    path: req.originalUrl,
    method: req.method,
    ip: req.ip,
    userAgent: req.get("User-Agent"),
    timestamp: new Date().toISOString(),
  });

  res.status(404).json({
    success: false,
    message: "Job endpoint not found",
    code: "ENDPOINT_NOT_FOUND",
    path: req.originalUrl,
    method: req.method,
    availableEndpoints: [
      "GET /jobs - Get all jobs with filtering",
      "GET /jobs/category/:categoryId - Get jobs by category",
      "GET /jobs/location/:location - Get jobs by location",
      "GET /jobs/:id - Get specific job details",
      "POST /jobs - Create new job (Auth required)",
      "PUT /jobs/:id - Update job (Auth required)",
      "DELETE /jobs/:id - Delete job (Auth required)",
      "PATCH /jobs/:id/verify - Verify job (Admin)",
      "PATCH /jobs/:id/reject - Reject job (Admin)",
      "GET /jobs/admin/pending - Get pending jobs (Admin)",
      "GET /jobs/health - Health check",
    ],
    suggestion: "Check the endpoint URL and HTTP method",
  });
});

// Global error handler for job routes
router.use((error, req, res, next) => {
  logger.error("Job route error", {
    error: error.message,
    stack: error.stack,
    path: req.originalUrl,
    method: req.method,
    ip: req.ip,
    userAgent: req.get("User-Agent"),
    userId: req.user?.id,
    adminId: req.admin?._id,
    requestBody: req.method !== "GET" ? req.body : undefined,
    timestamp: new Date().toISOString(),
  });

  // Rate limiting errors
  if (error.status === 429) {
    return res.status(429).json({
      success: false,
      message: "Too many requests. Please try again later.",
      code: "RATE_LIMIT_EXCEEDED",
      retryAfter: error.retryAfter || "15 minutes",
      endpoint: req.originalUrl,
    });
  }

  // JWT token errors
  if (error.name === "JsonWebTokenError") {
    return res.status(401).json({
      success: false,
      message: "Invalid authentication token",
      code: "INVALID_TOKEN",
    });
  }

  if (error.name === "TokenExpiredError") {
    return res.status(401).json({
      success: false,
      message: "Authentication token expired",
      code: "TOKEN_EXPIRED",
    });
  }

  // MongoDB errors
  if (error.name === "CastError") {
    return res.status(400).json({
      success: false,
      message: "Invalid ID format",
      code: "INVALID_ID",
      field: error.path,
    });
  }

  if (error.name === "ValidationError") {
    return res.status(400).json({
      success: false,
      message: "Validation failed",
      code: "VALIDATION_ERROR",
      errors: Object.values(error.errors).map((e) => ({
        field: e.path,
        message: e.message,
        value: e.value,
      })),
    });
  }

  // Duplicate key errors
  if (error.code === 11000) {
    const field = Object.keys(error.keyPattern)[0];
    return res.status(409).json({
      success: false,
      message: `Duplicate ${field} detected`,
      code: "DUPLICATE_KEY_ERROR",
      field: field,
    });
  }

  // Default error response
  res.status(error.status || 500).json({
    success: false,
    message: error.message || "Internal server error",
    code: "INTERNAL_ERROR",
    error: process.env.NODE_ENV === "production" ? undefined : error.stack,
    timestamp: new Date().toISOString(),
  });
});

module.exports = router;
