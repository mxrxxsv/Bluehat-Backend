const rateLimit = require("express-rate-limit");
const logger = require("./logger");

// ==================== ADVANCED RATE LIMITER CONFIGURATIONS ====================

// ✅ General purpose auth limiter (login/signup/profile updates)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window
  keyGenerator: (req) => {
    const email = req.body?.email?.toLowerCase()?.trim();
    return email || req.ip;
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    const email = req.body?.email?.toLowerCase()?.trim();
    const identifier = email || req.ip;

    logger.warn("Auth rate limit exceeded", {
      identifier,
      ip: req.ip,
      userAgent: req.get("User-Agent"),
      endpoint: req.originalUrl,
      method: req.method,
      limit: 100,
      windowMs: 15 * 60 * 1000,
      timestamp: new Date().toISOString(),
    });

    return res.status(429).json({
      success: false,
      message:
        "Too many authentication requests. Please try again in 15 minutes.",
      code: "AUTH_RATE_LIMIT_EXCEEDED",
      retryAfter: "15 minutes",
      limit: 100,
      windowMs: 15 * 60 * 1000,
      timestamp: new Date().toISOString(),
    });
  },
  // Skip rate limiting for certain conditions
  skip: (req) => {
    // Skip for health checks
    if (req.path === "/health") return true;
    // Skip for certain admin operations in production
    if (
      process.env.NODE_ENV === "production" &&
      req.admin?.role === "super-admin"
    )
      return true;
    return false;
  },
});

// ✅ Stricter limiter for verification endpoints (verify/resend-code)
const verifyLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 verification attempts per window
  keyGenerator: (req) => {
    const email = req.body?.email?.toLowerCase()?.trim();
    const token = req.query?.token; // For verify-email endpoint
    return email || token || req.ip;
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    const email = req.body?.email?.toLowerCase()?.trim();
    const token = req.query?.token;
    const identifier = email || token || req.ip;

    logger.warn("Verification rate limit exceeded", {
      identifier,
      ip: req.ip,
      userAgent: req.get("User-Agent"),
      endpoint: req.originalUrl,
      method: req.method,
      limit: 10,
      windowMs: 15 * 60 * 1000,
      timestamp: new Date().toISOString(),
    });

    return res.status(429).json({
      success: false,
      message:
        "Too many verification attempts. Please wait 15 minutes before trying again.",
      code: "VERIFY_RATE_LIMIT_EXCEEDED",
      retryAfter: "15 minutes",
      limit: 10,
      windowMs: 15 * 60 * 1000,
      suggestion:
        "Check your email for the verification link or contact support if you continue having issues.",
      timestamp: new Date().toISOString(),
    });
  },
  // Enhanced skip logic for verification
  skip: (req) => {
    // Skip for health checks
    if (req.path === "/health") return true;
    return false;
  },
});

// ✅ NEW: Password reset limiter (forgot-password/reset-password)
const resetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour window
  max: 5, // 5 password reset attempts per hour
  keyGenerator: (req) => {
    const email = req.body?.email?.toLowerCase()?.trim();
    const token = req.body?.token; // For reset-password endpoint
    return email || token || req.ip;
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    const email = req.body?.email?.toLowerCase()?.trim();
    const token = req.body?.token;
    const identifier = email || token || req.ip;

    logger.warn("Password reset rate limit exceeded", {
      identifier,
      ip: req.ip,
      userAgent: req.get("User-Agent"),
      endpoint: req.originalUrl,
      method: req.method,
      limit: 5,
      windowMs: 60 * 60 * 1000,
      timestamp: new Date().toISOString(),
    });

    return res.status(429).json({
      success: false,
      message:
        "Too many password reset attempts. Please wait 1 hour before trying again.",
      code: "RESET_RATE_LIMIT_EXCEEDED",
      retryAfter: "1 hour",
      limit: 5,
      windowMs: 60 * 60 * 1000,
      suggestion:
        "For security reasons, password reset requests are limited. Please contact support if you need immediate assistance.",
      timestamp: new Date().toISOString(),
    });
  },
  // Security-focused skip logic
  skip: (req) => {
    // Skip for health checks only
    if (req.path === "/health") return true;
    // Never skip for security-sensitive password reset operations
    return false;
  },
});

// ✅ NEW: Admin operations limiter (higher limits for admin actions)
const adminLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 200, // 200 admin requests per window
  keyGenerator: (req) => {
    const adminId = req.admin?._id?.toString();
    return adminId || req.ip;
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    const adminId = req.admin?._id?.toString();
    const identifier = adminId || req.ip;

    logger.warn("Admin rate limit exceeded", {
      adminId,
      identifier,
      ip: req.ip,
      userAgent: req.get("User-Agent"),
      endpoint: req.originalUrl,
      method: req.method,
      limit: 200,
      windowMs: 10 * 60 * 1000,
      timestamp: new Date().toISOString(),
    });

    return res.status(429).json({
      success: false,
      message:
        "Too many admin requests. Please wait 10 minutes before continuing.",
      code: "ADMIN_RATE_LIMIT_EXCEEDED",
      retryAfter: "10 minutes",
      limit: 200,
      windowMs: 10 * 60 * 1000,
      timestamp: new Date().toISOString(),
    });
  },
  skip: (req) => {
    // Skip for health checks
    if (req.path === "/health") return true;
    // Skip for super-admin in development
    if (
      process.env.NODE_ENV === "development" &&
      req.admin?.role === "super-admin"
    )
      return true;
    return false;
  },
});

// ✅ NEW: File upload limiter (for advertisement images)
const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // 20 file uploads per window
  keyGenerator: (req) => {
    const userId = req.user?.id?.toString();
    return userId || req.ip;
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    const userId = req.user?.id?.toString();
    const identifier = userId || req.ip;

    logger.warn("Upload rate limit exceeded", {
      userId,
      identifier,
      ip: req.ip,
      userAgent: req.get("User-Agent"),
      endpoint: req.originalUrl,
      method: req.method,
      limit: 20,
      windowMs: 15 * 60 * 1000,
      timestamp: new Date().toISOString(),
    });

    return res.status(429).json({
      success: false,
      message:
        "Too many file uploads. Please wait 15 minutes before uploading more files.",
      code: "UPLOAD_RATE_LIMIT_EXCEEDED",
      retryAfter: "15 minutes",
      limit: 20,
      windowMs: 15 * 60 * 1000,
      suggestion:
        "Consider reducing the number of files or wait before uploading additional content.",
      timestamp: new Date().toISOString(),
    });
  },
  skip: (req) => {
    // Skip for health checks
    if (req.path === "/health") return true;
    return false;
  },
});

// ✅ NEW: Global API limiter (fallback protection)
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // 1000 requests per window per IP
  keyGenerator: (req) => req.ip,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.error("Global rate limit exceeded - potential abuse", {
      ip: req.ip,
      userAgent: req.get("User-Agent"),
      endpoint: req.originalUrl,
      method: req.method,
      limit: 1000,
      windowMs: 15 * 60 * 1000,
      timestamp: new Date().toISOString(),
    });

    return res.status(429).json({
      success: false,
      message: "Rate limit exceeded. Please slow down your requests.",
      code: "GLOBAL_RATE_LIMIT_EXCEEDED",
      retryAfter: "15 minutes",
      limit: 1000,
      windowMs: 15 * 60 * 1000,
      timestamp: new Date().toISOString(),
    });
  },
  skip: (req) => {
    // Skip for health checks
    if (req.path === "/health") return true;
    return false;
  },
});

module.exports = {
  authLimiter,
  verifyLimiter,
  resetLimiter, // ✅ NEW: For password reset operations
  adminLimiter, // ✅ NEW: For admin operations
  uploadLimiter, // ✅ NEW: For file uploads
  globalLimiter, // ✅ NEW: Global fallback protection
};
