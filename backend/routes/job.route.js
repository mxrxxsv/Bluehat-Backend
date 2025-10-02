const express = require("express");
const router = express.Router();
const helmet = require("helmet");

// Middleware imports
const verifyToken = require("../middleware/verifyToken");
const { authLimiter } = require("../utils/rateLimit");
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
    hasAuth: !!req.user,
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
      hasAuth: !!req.user,
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
 * @desc    Get all jobs with pagination and filtering
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
 * @desc    Update job posting (owner only)
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
    requestBody: req.method !== "GET" ? req.body : undefined,
    timestamp: new Date().toISOString(),
  });

  // Rate limiting errors
  if (error.status === 429) {
    return res.status(429).json({
      success: false,
      message: "Too many requests, please try again later",
      code: "RATE_LIMIT_EXCEEDED",
    });
  }

  // JWT token errors
  if (error.name === "JsonWebTokenError") {
    return res.status(401).json({
      success: false,
      message: "Invalid token",
      code: "INVALID_TOKEN",
    });
  }

  if (error.name === "TokenExpiredError") {
    return res.status(401).json({
      success: false,
      message: "Token expired",
      code: "TOKEN_EXPIRED",
    });
  }

  // MongoDB errors
  if (error.name === "CastError") {
    return res.status(400).json({
      success: false,
      message: "Invalid ID format",
      code: "INVALID_ID",
    });
  }

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

  // Duplicate key errors
  if (error.code === 11000) {
    return res.status(409).json({
      success: false,
      message: "Duplicate data detected",
      code: "DUPLICATE_ERROR",
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
