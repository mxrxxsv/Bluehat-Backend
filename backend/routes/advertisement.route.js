const express = require("express");
const router = express.Router();
const helmet = require("helmet");

// Use your existing middleware
const upload = require("../middleware/adminUpload");
const uploadAdvertisement = require("../middleware/advertisementUpload");
const verifyAdmin = require("../middleware/verifyAdmin");
const { authLimiter, verifyLimiter } = require("../utils/rateLimit");
const logger = require("../utils/logger");

// Controller imports
const {
  getAds,
  getAdsByID,
  addAds,
  updateAds,
  deleteAds,
} = require("../controllers/ads.controller");

// ✅ Security headers for advertisement routes
router.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        imgSrc: ["'self'", "https://res.cloudinary.com", "data:", "blob:"],
        connectSrc: ["'self'", "https://api.cloudinary.com"],
      },
    },
  })
);

// ✅ Custom request logging using your logger (FIXED to use adminId)
const requestLogger = (req, res, next) => {
  const start = Date.now();

  // Log request
  logger.info("Advertisement request", {
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
    userAgent: req.get("User-Agent"),
    adminId: req.admin?._id, // ✅ Fixed: Changed from userId to adminId
    hasAuth: !!req.admin, // ✅ Track if request has auth
    timestamp: new Date().toISOString(),
  });

  // Override res.send to log response
  const originalSend = res.send;
  res.send = function (data) {
    const duration = Date.now() - start;

    logger.info("Advertisement response", {
      method: req.method,
      url: req.originalUrl,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip,
      adminId: req.admin?._id, // ✅ Fixed: Changed from userId to adminId
      hasAuth: !!req.admin,
    });

    originalSend.call(this, data);
  };

  next();
};

router.use(requestLogger);

// ==================== PUBLIC ROUTES ====================

/**
 * @route   GET /advertisement/health
 * @desc    Advertisement service health check
 * @access  Public
 */
router.get("/health", (req, res) => {
  res.status(200).json({
    success: true,
    service: "advertisements",
    status: "healthy",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: "1.0.0",
  });
});

/**
 * @route   GET /advertisement
 * @desc    Get all active advertisements with filtering and pagination
 * @access  Public
 */
router.get("/", getAds);

/**
 * @route   GET /advertisement/:id
 * @desc    Get single advertisement by ID
 * @access  Public
 */
router.get("/:id", getAdsByID);

// ==================== ADMIN ROUTES (SECURITY FIXED) ====================

/**
 * @route   POST /advertisement
 * @desc    Create new advertisement with image upload
 * @access  Admin only
 */
router.post(
  "/",
  verifyLimiter, // ✅ 1. Rate limiting FIRST
  verifyAdmin, // ✅ 2. Admin auth SECOND
  uploadAdvertisement, // ✅ 3. Upload + Validation combined (secure!)
  addAds // ✅ 4. Controller LAST
);

/**
 * @route   PUT /advertisement/:id
 * @desc    Update existing advertisement (can include new image)
 * @access  Admin only
 */
router.put(
  "/:id",
  authLimiter, // ✅ 1. Rate limiting FIRST
  verifyAdmin, // ✅ 2. Admin auth SECOND (BEFORE file upload!)
  upload, // ✅ 3. Optional file upload THIRD
  updateAds // ✅ 4. Controller LAST
);

/**
 * @route   DELETE /advertisement/:id
 * @desc    Soft delete advertisement and remove image from Cloudinary
 * @access  Admin only
 */
router.delete(
  "/:id",
  authLimiter, // ✅ 1. Rate limiting FIRST
  verifyAdmin, // ✅ 2. Admin auth SECOND (no file upload needed)
  deleteAds // ✅ 3. Controller LAST
);

// ==================== ERROR HANDLING ====================

// Handle 404 for undefined advertisement routes
router.use("*", (req, res) => {
  logger.warn("Advertisement endpoint not found", {
    path: req.originalUrl,
    method: req.method,
    ip: req.ip,
  });

  res.status(404).json({
    success: false,
    message: "Advertisement endpoint not found",
    code: "ENDPOINT_NOT_FOUND",
    path: req.originalUrl,
    method: req.method,
    availableEndpoints: [
      "GET /advertisement - Get all advertisements",
      "GET /advertisement/:id - Get advertisement by ID",
      "POST /advertisement - Create advertisement (Admin)",
      "PUT /advertisement/:id - Update advertisement (Admin)",
      "DELETE /advertisement/:id - Delete advertisement (Admin)",
      "GET /advertisement/health - Health check",
    ],
  });
});

// Global error handler for advertisement routes
router.use((error, req, res, next) => {
  // ✅ Fixed: Use adminId instead of userId in error logging
  logger.error("Advertisement route error", {
    error: error.message,
    stack: error.stack,
    path: req.originalUrl,
    method: req.method,
    ip: req.ip,
    userAgent: req.get("User-Agent"),
    adminId: req.admin?._id, // ✅ Fixed: Changed from userId to adminId
    timestamp: new Date().toISOString(),
  });

  // Multer file upload errors
  if (error.code === "LIMIT_FILE_SIZE") {
    return res.status(400).json({
      success: false,
      message: "File too large. Maximum size is 5MB.",
      code: "FILE_TOO_LARGE",
      maxSize: "5MB",
    });
  }

  if (error.code === "LIMIT_UNEXPECTED_FILE") {
    return res.status(400).json({
      success: false,
      message: "Unexpected file field. Use 'image' field name.",
      code: "UNEXPECTED_FILE_FIELD",
      expectedField: "image",
    });
  }

  if (error.code === "LIMIT_FILE_COUNT") {
    return res.status(400).json({
      success: false,
      message: "Too many files. Only one image allowed.",
      code: "TOO_MANY_FILES",
      maxFiles: 1,
    });
  }

  // Rate limiting errors
  if (error.status === 429) {
    return res.status(429).json({
      success: false,
      message: "Too many requests. Please try again later.",
      code: "RATE_LIMIT_EXCEEDED",
      retryAfter: error.retryAfter,
    });
  }

  // Cloudinary errors
  if (error.message && error.message.includes("cloudinary")) {
    return res.status(500).json({
      success: false,
      message: "Image upload service temporarily unavailable",
      code: "UPLOAD_SERVICE_ERROR",
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
    return res.status(400).json({
      success: false,
      message: "Validation failed",
      code: "VALIDATION_ERROR",
      errors: Object.values(error.errors).map((e) => ({
        field: e.path,
        message: e.message,
      })),
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
