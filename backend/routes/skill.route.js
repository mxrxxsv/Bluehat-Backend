const express = require("express");
const router = express.Router();
const helmet = require("helmet");

// Middleware imports
const verifyAdmin = require("../middleware/verifyAdmin");
const { adminLimiter } = require("../utils/rateLimit");
const logger = require("../utils/logger");

// Controller imports - MATCHING YOUR ACTUAL CONTROLLER
const {
  addSkill,
  getAllSkills,
  getSkillByID,
  updateSkill,
  deleteSkill,
} = require("../controllers/skill.controller");

// ✅ Security headers for skill routes
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

// ✅ Custom request logging for skill routes
const requestLogger = (req, res, next) => {
  const start = Date.now();

  // Log request
  logger.info("Skill request", {
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
    userAgent: req.get("User-Agent"),
    adminId: req.admin?._id,
    hasAuth: !!req.admin,
    contentLength: req.get("Content-Length"),
    timestamp: new Date().toISOString(),
  });

  // Override res.send to log response
  const originalSend = res.send;
  res.send = function (data) {
    const duration = Date.now() - start;

    logger.info("Skill response", {
      method: req.method,
      url: req.originalUrl,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip,
      adminId: req.admin?._id,
      hasAuth: !!req.admin,
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
 * @route   GET /skills/health
 * @desc    Skill service health check
 * @access  Public
 */
router.get("/health", (req, res) => {
  const uptime = process.uptime();
  const memoryUsage = process.memoryUsage();

  res.status(200).json({
    success: true,
    service: "skills",
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
      categoryManagement: true,
      searchAndFilter: true,
      workerIntegration: true,
      realTimeUpdates: true,
    },
  });
});

/**
 * @route   GET /skills
 * @desc    Get all skill categories with pagination and search
 * @access  Public
 * @query   page, limit, search, sortBy, order
 */
router.get("/", getAllSkills);

/**
 * @route   GET /skills/:id
 * @desc    Get skill category by ID with worker count
 * @access  Public
 * @params  id - ObjectId of the skill category
 */
router.get("/:id", getSkillByID);

// ==================== ADMIN ROUTES ====================

/**
 * @route   POST /skills
 * @desc    Create new skill category
 * @access  Admin only
 * @body    categoryName
 */
router.post("/", adminLimiter, verifyAdmin, addSkill);

/**
 * @route   PUT /skills/:id
 * @desc    Update skill category
 * @access  Admin only
 * @params  id - ObjectId of the skill category
 * @body    categoryName
 */
router.put("/:id", adminLimiter, verifyAdmin, updateSkill);

/**
 * @route   DELETE /skills/:id
 * @desc    Delete skill category and remove from workers
 * @access  Admin only
 * @params  id - ObjectId of the skill category
 */
router.delete("/:id", adminLimiter, verifyAdmin, deleteSkill);

// ==================== ERROR HANDLING ====================

// Handle 404 for undefined skill routes
router.use("*", (req, res) => {
  logger.warn("Skill endpoint not found", {
    path: req.originalUrl,
    method: req.method,
    ip: req.ip,
    userAgent: req.get("User-Agent"),
    timestamp: new Date().toISOString(),
  });

  res.status(404).json({
    success: false,
    message: "Skill endpoint not found",
    code: "ENDPOINT_NOT_FOUND",
    path: req.originalUrl,
    method: req.method,
    availableEndpoints: [
      "GET /skills - Get all skill categories with filtering",
      "GET /skills/:id - Get specific skill category with worker count",
      "POST /skills - Create new skill category (Admin)",
      "PUT /skills/:id - Update skill category (Admin)",
      "DELETE /skills/:id - Delete skill category (Admin)",
      "GET /skills/health - Health check",
    ],
    suggestion: "Check the endpoint URL and HTTP method",
  });
});

// Global error handler for skill routes
router.use((error, req, res, next) => {
  logger.error("Skill route error", {
    error: error.message,
    stack: error.stack,
    path: req.originalUrl,
    method: req.method,
    ip: req.ip,
    userAgent: req.get("User-Agent"),
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
      retryAfter: error.retryAfter || "10 minutes",
      endpoint: req.originalUrl,
    });
  }

  // JWT token errors
  if (error.name === "JsonWebTokenError") {
    return res.status(401).json({
      success: false,
      message: "Invalid admin token",
      code: "INVALID_TOKEN",
    });
  }

  if (error.name === "TokenExpiredError") {
    return res.status(401).json({
      success: false,
      message: "Admin token expired",
      code: "TOKEN_EXPIRED",
    });
  }

  // MongoDB errors
  if (error.name === "CastError") {
    return res.status(400).json({
      success: false,
      message: "Invalid skill category ID format",
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
      message: `Skill category ${field} already exists`,
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
