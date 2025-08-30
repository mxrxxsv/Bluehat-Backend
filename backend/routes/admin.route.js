const express = require("express");
const router = express.Router();
const helmet = require("helmet");

// Middleware imports
const verifyAdmin = require("../middleware/verifyAdmin");
const { authLimiter, adminLimiter } = require("../utils/rateLimit");
const logger = require("../utils/logger");

// Controller imports - MATCHING YOUR ACTUAL CONTROLLER
const {
  signup,
  login,
  getAdminProfile,
  logout,
  checkAuth,
  getAllAdmins,
} = require("../controllers/admin.controller");

// ✅ Security headers for admin routes
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

// ✅ Custom request logging for admin routes
const requestLogger = (req, res, next) => {
  const start = Date.now();

  // Log request
  logger.info("Admin request", {
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
    userAgent: req.get("User-Agent"),
    adminId: req.admin?._id,
    adminUserName: req.admin?.userName,
    hasAuth: !!req.admin,
    contentLength: req.get("Content-Length"),
    timestamp: new Date().toISOString(),
  });

  // Override res.send to log response
  const originalSend = res.send;
  res.send = function (data) {
    const duration = Date.now() - start;

    logger.info("Admin response", {
      method: req.method,
      url: req.originalUrl,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip,
      adminId: req.admin?._id,
      adminUserName: req.admin?.userName,
      hasAuth: !!req.admin,
      responseSize: Buffer.byteLength(data, "utf8"),
      timestamp: new Date().toISOString(),
    });

    originalSend.call(this, data);
  };

  next();
};

router.use(requestLogger);

// ==================== PUBLIC ADMIN ROUTES ====================

/**
 * @route   GET /admin/health
 * @desc    Admin service health check
 * @access  Public
 */
router.get("/health", (req, res) => {
  const uptime = process.uptime();
  const memoryUsage = process.memoryUsage();

  res.status(200).json({
    success: true,
    service: "admin",
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
      userManagement: true,
      contentModeration: true,
      systemMonitoring: true,
      advancedAnalytics: true,
    },
  });
});

/**
 * @route   POST /admin/signup
 * @desc    Create new admin account with validation
 * @access  Public (requires admin code)
 * @body    firstName, lastName, userName, password, code
 */
router.post("/signup", authLimiter, signup);

/**
 * @route   POST /admin/login
 * @desc    Admin login with credentials and code
 * @access  Public
 * @body    userName, password, code
 */
router.post("/login", authLimiter, login);

// ==================== AUTHENTICATED ADMIN ROUTES ====================

/**
 * @route   GET /admin/profile
 * @desc    Get admin profile information
 * @access  Private (Admin)
 */
router.get("/profile", verifyAdmin, getAdminProfile);

/**
 * @route   POST /admin/logout
 * @desc    Admin logout (clear admin token)
 * @access  Private (Admin)
 */
router.post("/logout", verifyAdmin, logout);

/**
 * @route   GET /admin/check-auth
 * @desc    Check admin authentication status
 * @access  Private (Admin)
 */
router.get("/check-auth", verifyAdmin, checkAuth);

/**
 * @route   GET /admin/all
 * @desc    Get all admins with pagination and search
 * @access  Private (Admin)
 * @query   page, limit, search, sortBy, order
 */
router.get("/all", adminLimiter, verifyAdmin, getAllAdmins);

// ==================== ERROR HANDLING ====================

// Handle 404 for undefined admin routes
router.use("*", (req, res) => {
  logger.warn("Admin endpoint not found", {
    path: req.originalUrl,
    method: req.method,
    ip: req.ip,
    userAgent: req.get("User-Agent"),
    timestamp: new Date().toISOString(),
  });

  res.status(404).json({
    success: false,
    message: "Admin endpoint not found",
    code: "ENDPOINT_NOT_FOUND",
    path: req.originalUrl,
    method: req.method,
    availableEndpoints: [
      "POST /admin/signup - Create admin account",
      "POST /admin/login - Admin login",
      "GET /admin/profile - Get admin profile (Auth required)",
      "POST /admin/logout - Admin logout (Auth required)",
      "GET /admin/check-auth - Check authentication (Auth required)",
      "GET /admin/all - Get all admins (Auth required)",
      "GET /admin/health - Health check",
    ],
    suggestion: "Check the endpoint URL and HTTP method",
  });
});

// Global error handler for admin routes
router.use((error, req, res, next) => {
  logger.error("Admin route error", {
    error: error.message,
    stack: error.stack,
    path: req.originalUrl,
    method: req.method,
    ip: req.ip,
    userAgent: req.get("User-Agent"),
    adminId: req.admin?._id,
    requestBody:
      req.method !== "GET"
        ? { ...req.body, password: "[REDACTED]", code: "[REDACTED]" }
        : undefined,
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
      message: `Admin ${field} already exists`,
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
