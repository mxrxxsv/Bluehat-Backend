const express = require("express");
const rateLimit = require("express-rate-limit");

const {
  getWorkers,
  getWorkerDetails,
  blockWorker,
  unblockWorker,
} = require("../controllers/workerManagement.controller");

const verifyAdmin = require("../middleware/verifyAdmin");

const router = express.Router();

// ==================== RATE LIMITING ====================

const adminActionLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 50, // Max 50 admin actions per 5 minutes
  message: {
    success: false,
    message: "Too many admin actions. Please try again later.",
    code: "ADMIN_ACTION_RATE_LIMIT_EXCEEDED",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

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

// ==================== WORKER MANAGEMENT ROUTES ====================

/**
 * @route   GET /api/worker-management
 * @desc    Get all workers with pagination (30 per page)
 * @access  Private (Admin only)
 * @query   page, sortBy, order, search, verificationStatus, workStatus, minRating, maxRating
 */
router.get("/", workerListLimiter, verifyAdmin, getWorkers);

/**
 * @route   GET /api/worker-management/:id
 * @desc    Get single worker details by ID
 * @access  Private (Admin only)
 */
router.get("/:id", workerListLimiter, verifyAdmin, getWorkerDetails);

/**
 * @route   POST /api/worker-management/:id/block
 * @desc    Block a worker account
 * @access  Private (Admin only)
 * @body    { "reason": "Block reason text" }
 */
router.post("/:id/block", adminActionLimiter, verifyAdmin, blockWorker);

/**
 * @route   POST /api/worker-management/:id/unblock
 * @desc    Unblock a worker account
 * @access  Private (Admin only)
 */
router.post("/:id/unblock", adminActionLimiter, verifyAdmin, unblockWorker);

// ==================== HEALTH CHECK ====================

/**
 * @route   GET /api/worker-management/health
 * @desc    Worker management service health check
 * @access  Public
 */
router.get("/health", (req, res) => {
  const healthCheck = {
    service: "Worker Management API",
    status: "Healthy",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || "development",
    version: process.env.npm_package_version || "1.0.0",
    endpoints: [
      "GET / - Get all workers with pagination (Admin)",
      "GET /:id - Get worker details (Admin)",
      "POST /:id/block - Block worker account (Admin)",
      "POST /:id/unblock - Unblock worker account (Admin)",
      "GET /health - Health check",
    ],
    features: {
      pagination: "30 workers per page",
      search: "Search by names and biography",
      filtering:
        "Filter by verificationStatus (verified/unverified/pending/rejected/not_submitted), workStatus (available/working/not available), rating range",
      sorting:
        "Sort by createdAt, firstName, lastName, email, rating, verifiedAt",
      encryption: "Sensitive data decryption supported",
    },
    rateLimits: {
      adminActions: "50 per 5 minutes",
      workerList: "30 per minute",
    },
  };

  res.status(200).json({
    success: true,
    data: healthCheck,
    meta: {
      timestamp: new Date().toISOString(),
    },
  });
});

module.exports = router;
