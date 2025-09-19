const express = require("express");
const rateLimit = require("express-rate-limit");
const {
  getAllWorkers,
  getWorkerById,
} = require("../controllers/worker.controller");

const router = express.Router();

// ==================== RATE LIMITING ====================

const workerListLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 30, // Max 30 requests per minute
  message: {
    success: false,
    message: "Too many requests. Please try again later.",
    code: "WORKER_LIST_RATE_LIMIT_EXCEEDED",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

const workerDetailsLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 60, // Max 60 requests per minute for details
  message: {
    success: false,
    message: "Too many requests. Please try again later.",
    code: "WORKER_DETAILS_RATE_LIMIT_EXCEEDED",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// ==================== WORKER ROUTES ====================

/**
 * @route   GET /workers
 * @desc    Get all ID-verified workers with pagination and filtering
 * @access  Public
 * @query   page, limit, skills, status, city, province, sortBy, order, search, includeUnverified
 */
router.get("/", workerListLimiter, getAllWorkers);

/**
 * @route   GET /workers/:id
 * @desc    Get single ID-verified worker details by ID
 * @access  Public
 * @query   includeUnverified (boolean) - Admin override to see unverified workers
 */
router.get("/:id", workerDetailsLimiter, getWorkerById);

// ==================== HEALTH CHECK ====================

/**
 * @route   GET /workers/health
 * @desc    Worker service health check
 * @access  Public
 */
router.get("/health", (req, res) => {
  const healthCheck = {
    service: "ID-Verified Worker API",
    status: "Healthy",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || "development",
    version: process.env.npm_package_version || "2.0.0",
    endpoints: [
      "GET / - Get all ID-verified workers with pagination and filtering",
      "GET /:id - Get ID-verified worker details by ID",
      "GET /health - Health check",
    ],
    features: {
      idVerificationRequired:
        "Only workers with approved ID verification are shown",
      pagination: "12 workers per page (configurable)",
      filtering: "Filter by skills, status, city, province",
      search: "Search by email (limited due to encryption)",
      sorting: "Sort by createdAt, rating, firstName, lastName, verifiedAt",
      encryption: "Sensitive data decryption supported",
      verification: "Dual verification (Account + ID documents)",
      adminOverride: "includeUnverified query param for admin use",
    },
    verificationLevels: {
      accountVerification: "Credential.isVerified = true",
      idVerification: "Worker.verificationStatus = 'approved'",
      bothRequired: "Both must be true to appear in public listing",
    },
    rateLimits: {
      workerList: "30 per minute",
      workerDetails: "60 per minute",
    },
    statistics: {
      verificationTracking: "Tracks both account and ID verification rates",
      workStatusFiltering: "Only counts verified workers in availability stats",
      ratingCalculation: "Only includes ratings from verified workers",
    },
  };

  res.status(200).json({
    success: true,
    data: healthCheck,
    meta: {
      timestamp: new Date().toISOString(),
      note: "This API now requires ID verification for worker visibility",
    },
  });
});

module.exports = router;
