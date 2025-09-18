const express = require("express");
const rateLimit = require("express-rate-limit");
const {
  upload,
  uploadIDPicture,
  uploadSelfie,
  getVerificationStatus,
  getPendingVerifications,
} = require("../controllers/userIDVerification.controller");
const verifyToken = require("../middleware/verifyToken");
const verifyAdmin = require("../middleware/verifyAdmin");

const router = express.Router();

// ==================== RATE LIMITING ====================

// Rate limiting for uploads
const uploadRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // Max 20 uploads per 15 minutes
  message: {
    success: false,
    message: "Too many upload attempts, please try again later",
    code: "UPLOAD_RATE_LIMIT_EXCEEDED",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limiting for status checks
const statusRateLimit = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 60, // Max 60 requests per minute
  message: {
    success: false,
    message: "Too many status check requests, please try again later",
    code: "STATUS_RATE_LIMIT_EXCEEDED",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limiting for admin endpoints
const adminRateLimit = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 100, // Max 100 requests per minute for admin
  message: {
    success: false,
    message: "Too many admin requests, please try again later",
    code: "ADMIN_RATE_LIMIT_EXCEEDED",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// ==================== ERROR HANDLING MIDDLEWARE ====================

// Enhanced multer error handling middleware
const handleMulterError = (err, req, res, next) => {
  console.error("🚫 Multer/Upload Error:", err);

  // Multer specific errors
  if (err.code === "LIMIT_FILE_SIZE") {
    return res.status(400).json({
      success: false,
      message: "File too large. Maximum size is 10MB",
      code: "FILE_TOO_LARGE",
      details: {
        maxSize: "10MB",
        receivedSize: req.file
          ? `${(req.file.size / 1024 / 1024).toFixed(2)}MB`
          : "Unknown",
      },
    });
  }

  if (err.code === "LIMIT_UNEXPECTED_FILE") {
    return res.status(400).json({
      success: false,
      message: "Unexpected file field. Use 'image' as the field name",
      code: "UNEXPECTED_FILE_FIELD",
      expectedField: "image",
    });
  }

  if (err.message && err.message.includes("Only image files")) {
    return res.status(400).json({
      success: false,
      message: "Invalid file type. Only image files are allowed",
      code: "INVALID_FILE_TYPE",
      allowedTypes: ["JPEG", "JPG", "PNG", "WebP", "GIF"],
    });
  }

  // Cloudinary or other upload errors
  if (err.message && err.message.includes("cloudinary")) {
    return res.status(500).json({
      success: false,
      message: "Cloud storage error. Please try again later",
      code: "CLOUD_STORAGE_ERROR",
    });
  }

  // Generic upload error
  if (err.message) {
    return res.status(400).json({
      success: false,
      message: "File upload error",
      code: "UPLOAD_ERROR",
      details: process.env.NODE_ENV === "development" ? err.message : undefined,
    });
  }

  next(err);
};

// ==================== VALIDATION MIDDLEWARE ====================

// Validate required fields in request body
const validateUploadRequest = (req, res, next) => {
  const { userId } = req.body;

  if (!userId) {
    return res.status(400).json({
      success: false,
      message: "User ID is required",
      code: "MISSING_USER_ID",
    });
  }

  // Validate ObjectId format
  const objectIdPattern = /^[0-9a-fA-F]{24}$/;
  if (!objectIdPattern.test(userId)) {
    return res.status(400).json({
      success: false,
      message: "Invalid user ID format",
      code: "INVALID_USER_ID_FORMAT",
    });
  }

  next();
};

// ==================== WORKER ROUTES ====================

/**
 * @route   POST /id-verification/upload-id-picture
 * @desc    Upload ID picture for verification (Workers only)
 * @access  Private (Authenticated workers)
 * @body    multipart/form-data: { image: File, userId: String }
 */
router.post(
  "/upload-id-picture",
  uploadRateLimit,
  verifyToken,
  upload, // This is the multer middleware from controller
  handleMulterError,
  validateUploadRequest,
  uploadIDPicture
);

/**
 * @route   POST /id-verification/upload-selfie
 * @desc    Upload selfie picture for verification (Workers only)
 * @access  Private (Authenticated workers)
 * @body    multipart/form-data: { image: File, userId: String }
 */
router.post(
  "/upload-selfie",
  uploadRateLimit,
  verifyToken,
  upload, // This is the multer middleware from controller
  handleMulterError,
  validateUploadRequest,
  uploadSelfie
);

/**
 * @route   GET /id-verification/status/:userId
 * @desc    Get worker's ID verification status and documents
 * @access  Private (Authenticated users)
 * @params  userId: String (MongoDB ObjectId)
 */
router.get(
  "/status/:userId",
  statusRateLimit,
  verifyToken,
  getVerificationStatus
);

// ==================== ADMIN ROUTES ====================

/**
 * @route   GET /id-verification/admin/pending
 * @desc    Get all workers with pending ID verifications (Admin only)
 * @access  Private (Admin only)
 * @query   page: number, limit: number, sortBy: string, order: string
 */
router.get(
  "/admin/pending",
  adminRateLimit,
  verifyAdmin,
  getPendingVerifications
);

/**
 * @route   POST /id-verification/admin/approve/:userId
 * @desc    Approve worker's ID verification (Admin only)
 * @access  Private (Admin only)
 * @params  userId: String (Worker's credential ID)
 * @body    { notes?: string }
 */
router.post(
  "/admin/approve/:userId",
  adminRateLimit,
  verifyAdmin,
  async (req, res) => {
    res.status(501).json({
      success: false,
      message: "Approve verification endpoint not implemented yet",
      code: "NOT_IMPLEMENTED",
      note: "This endpoint will be implemented when admin approval functionality is added to the controller",
    });
  }
);

/**
 * @route   POST /id-verification/admin/reject/:userId
 * @desc    Reject worker's ID verification (Admin only)
 * @access  Private (Admin only)
 * @params  userId: String (Worker's credential ID)
 * @body    { notes?: string, requireResubmission?: boolean }
 */
router.post(
  "/admin/reject/:userId",
  adminRateLimit,
  verifyAdmin,
  async (req, res) => {
    res.status(501).json({
      success: false,
      message: "Reject verification endpoint not implemented yet",
      code: "NOT_IMPLEMENTED",
      note: "This endpoint will be implemented when admin rejection functionality is added to the controller",
    });
  }
);

/**
 * @route   GET /id-verification/admin/statistics
 * @desc    Get ID verification statistics (Admin only)
 * @access  Private (Admin only)
 */
router.get(
  "/admin/statistics",
  adminRateLimit,
  verifyAdmin,
  async (req, res) => {
    try {
      const Worker = require("../models/Worker");

      // Get verification statistics
      const stats = await Worker.aggregate([
        {
          $group: {
            _id: "$verificationStatus",
            count: { $sum: 1 },
          },
        },
      ]);

      // Format statistics
      const formattedStats = {
        not_submitted: 0,
        pending: 0,
        approved: 0,
        rejected: 0,
        requires_resubmission: 0,
      };

      stats.forEach((stat) => {
        if (formattedStats.hasOwnProperty(stat._id)) {
          formattedStats[stat._id] = stat.count;
        }
      });

      // Calculate totals
      const total = Object.values(formattedStats).reduce(
        (sum, count) => sum + count,
        0
      );
      const submitted =
        formattedStats.pending +
        formattedStats.approved +
        formattedStats.rejected +
        formattedStats.requires_resubmission;

      res.status(200).json({
        success: true,
        message: "ID verification statistics retrieved successfully",
        data: {
          byStatus: formattedStats,
          summary: {
            totalWorkers: total,
            submitted: submitted,
            notSubmitted: formattedStats.not_submitted,
            pendingReview: formattedStats.pending,
            approved: formattedStats.approved,
            rejected:
              formattedStats.rejected + formattedStats.requires_resubmission,
            submissionRate:
              total > 0 ? ((submitted / total) * 100).toFixed(2) + "%" : "0%",
            approvalRate:
              submitted > 0
                ? ((formattedStats.approved / submitted) * 100).toFixed(2) + "%"
                : "0%",
          },
        },
      });
    } catch (error) {
      console.error("Error getting verification statistics:", error);
      res.status(500).json({
        success: false,
        message: "Failed to get verification statistics",
        error:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }
);

// ==================== HEALTH CHECK ====================

/**
 * @route   GET /id-verification/health
 * @desc    Health check for ID verification service
 * @access  Public
 */
router.get("/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "ID Verification service is healthy",
    service: "Worker ID Verification API",
    version: "1.0.0",
    timestamp: new Date().toISOString(),
    endpoints: {
      public: ["GET /health - Health check"],
      worker: [
        "POST /upload-id-picture - Upload ID picture",
        "POST /upload-selfie - Upload selfie picture",
        "GET /status/:userId - Get verification status",
      ],
      admin: [
        "GET /admin/pending - Get pending verifications",
        "GET /admin/statistics - Get verification statistics",
        "POST /admin/approve/:userId - Approve verification",
        "POST /admin/reject/:userId - Reject verification",
      ],
    },
    features: {
      userType: "Workers only",
      fileTypes: ["JPEG", "JPG", "PNG", "WebP", "GIF"],
      maxFileSize: "10MB",
      storage: "Cloudinary",
      verificationStates: [
        "not_submitted",
        "pending",
        "approved",
        "rejected",
        "requires_resubmission",
      ],
      rateLimiting: {
        uploads: "20 per 15 minutes",
        status: "60 per minute",
        admin: "100 per minute",
      },
    },
  });
});

// ==================== ERROR HANDLING ====================

// Global error handler for this router
router.use((err, req, res, next) => {
  console.error("🚫 ID Verification Route Error:", err);

  res.status(500).json({
    success: false,
    message: "Internal server error in ID verification service",
    code: "INTERNAL_SERVER_ERROR",
    timestamp: new Date().toISOString(),
    ...(process.env.NODE_ENV === "development" && {
      error: err.message,
      stack: err.stack,
    }),
  });
});

module.exports = router;
