const express = require("express");
const router = express.Router();
const helmet = require("helmet");

// Middleware imports
const verifyCaptcha = require("../middleware/verifyCaptcha");
const verifyToken = require("../middleware/verifyToken");
const verifyAdmin = require("../middleware/verifyAdmin");
const verifyCode = require("../middleware/verifyVerifyToken");
const {
  authLimiter,
  verifyLimiter,
  resetLimiter,
} = require("../utils/rateLimit");
const logger = require("../utils/logger");

// Controller imports - MATCHING YOUR ACTUAL CONTROLLER
const {
  signup,
  verifyEmail,
  verify,
  resendCode,
  login,
  checkAuth,
  logout,
  forgotPassword,
  resetPassword,
  resendEmailVerification,
  getQRCode,
  changePassword,
} = require("../controllers/ver.controller");

// ✅ Security headers for authentication routes
router.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        connectSrc: ["'self'", "https://api.emailjs.com"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
      },
    },
  })
);

// ✅ Custom request logging for authentication routes
const requestLogger = (req, res, next) => {
  const start = Date.now();

  // Log request
  logger.info("Authentication request", {
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
    userAgent: req.get("User-Agent"),
    userId: req.user?.id,
    hasAuth: !!req.user,
    contentLength: req.get("Content-Length"),
    timestamp: new Date().toISOString(),
  });

  // Override res.send to log response
  const originalSend = res.send;
  res.send = function (data) {
    const duration = Date.now() - start;

    logger.info("Authentication response", {
      method: req.method,
      url: req.originalUrl,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip,
      userId: req.user?.id,
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
 * @route   GET /auth/health
 * @desc    Authentication service health check
 * @access  Public
 */
router.get("/health", (req, res) => {
  const uptime = process.uptime();
  const memoryUsage = process.memoryUsage();

  res.status(200).json({
    success: true,
    service: "authentication",
    status: "healthy",
    timestamp: new Date().toISOString(),
    uptime: `${Math.floor(uptime / 60)}m ${Math.floor(uptime % 60)}s`,
    version: "1.0.0",
    environment: process.env.NODE_ENV || "development",
    memory: {
      used: `${Math.round(memoryUsage.heapUsed / 1024 / 1024)}MB`,
      total: `${Math.round(memoryUsage.heapTotal / 1024 / 1024)}MB`,
    },
  });
});

/**
 * @route   POST /auth/signup
 * @desc    Register new user with email verification
 * @access  Public
 */
router.post("/signup", authLimiter, /*verifyCaptcha,*/ signup);

/**
 * @route   GET /auth/verify-email
 * @desc    Verify email with token (from email link)
 * @access  Public
 */
router.get("/verify-email", verifyLimiter, verifyEmail);

/**
 * @route   POST /auth/verify
 * @desc    Verify TOTP code for account activation
 * @access  Public (requires verify token from verifyEmail)
 */
router.post("/verify", verifyLimiter, verifyCode, verify);

/**
 * @route   POST /auth/resend-code
 * @desc    Resend QR code for TOTP setup
 * @access  Public
 */
router.post("/resend-code", verifyLimiter, /*verifyCaptcha,*/ resendCode);

/**
 * @route   POST /auth/resend-email-verification
 * @desc    Resend email verification link
 * @access  Public
 */
router.post(
  "/resend-email-verification",
  verifyLimiter,
  /*verifyCaptcha,*/ resendEmailVerification
);

/**
 * @route   POST /auth/login
 * @desc    User login with credentials and TOTP
 * @access  Public
 */

router.post("/login", authLimiter, /*verifyCaptcha,*/ login);

/**
 * @route   POST /auth/forgot-password
 * @desc    Request password reset email
 * @access  Public
 */
router.post(
  "/forgot-password",
  resetLimiter,
  /*verifyCaptcha,*/ forgotPassword
);

/**
 * @route   POST /auth/reset-password
 * @desc    Reset password with token
 * @access  Public
 */
router.post("/reset-password", resetLimiter, resetPassword);

// ==================== AUTHENTICATED USER ROUTES ====================

/**
 * @route   GET /auth/check
 * @desc    Check authentication status and get user data
 * @access  Private
 */
router.get("/check-auth", verifyToken, checkAuth);

/**
 * @route   POST /auth/logout
 * @desc    User logout (clear cookies)
 * @access  Private
 */
router.post("/logout", verifyToken, logout);

/**
 * @route   POST /auth/change-password
 * @desc    Authenticated user changes password
 * @access  Private
 */
router.post("/change-password", verifyToken, authLimiter, changePassword);

router.post("/get-qr", verifyLimiter, getQRCode);
// ==================== ERROR HANDLING ====================

// Handle 404 for undefined authentication routes
router.use("*", (req, res) => {
  logger.warn("Authentication endpoint not found", {
    path: req.originalUrl,
    method: req.method,
    ip: req.ip,
    userAgent: req.get("User-Agent"),
    timestamp: new Date().toISOString(),
  });

  res.status(404).json({
    success: false,
    message: "Authentication endpoint not found",
    code: "ENDPOINT_NOT_FOUND",
    path: req.originalUrl,
    method: req.method,
    availableEndpoints: [
      "POST /auth/signup - Register new user",
      "GET /auth/verify-email?token=xxx - Verify email address",
      "POST /auth/verify - Complete account setup with TOTP",
      "POST /auth/resend-code - Resend QR code for TOTP",
      "POST /auth/resend-email-verification - Resend email verification link",
      "POST /auth/login - User login with credentials + TOTP",
      "POST /auth/forgot-password - Request password reset",
      "POST /auth/reset-password - Reset password with token",
      "GET /auth/check-auth - Check authentication status (Auth required)",
      "POST /auth/logout - User logout (Auth required)",
      "GET /auth/health - Health check",
    ],
    suggestion: "Check the endpoint URL and HTTP method",
  });
});

// Global error handler for authentication routes
router.use((error, req, res, next) => {
  logger.error("Authentication route error", {
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
      message: "Too many requests. Please try again later.",
      code: "RATE_LIMIT_EXCEEDED",
      retryAfter: error.retryAfter || "1 hour",
      endpoint: req.originalUrl,
    });
  }

  // CAPTCHA verification errors
  if (error.message && error.message.includes("CAPTCHA")) {
    return res.status(400).json({
      success: false,
      message: "CAPTCHA verification failed",
      code: "CAPTCHA_VERIFICATION_FAILED",
      details: error.message,
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
      message: `${field} already exists`,
      code: "DUPLICATE_KEY_ERROR",
      field: field,
    });
  }

  // Email service errors
  if (error.message && error.message.includes("email")) {
    return res.status(503).json({
      success: false,
      message: "Email service temporarily unavailable",
      code: "EMAIL_SERVICE_ERROR",
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