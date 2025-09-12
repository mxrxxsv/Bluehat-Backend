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
 * @desc    Get all verified workers with pagination and filtering
 * @access  Public
 * @query   page, limit, skills, status, city, province, sortBy, order, search
 */
router.get("/", workerListLimiter, getAllWorkers);

/**
 * @route   GET /workers/:id
 * @desc    Get single worker details by ID
 * @access  Public
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
    service: "Worker API",
    status: "Healthy",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || "development",
    version: process.env.npm_package_version || "1.0.0",
    endpoints: [
      "GET / - Get all verified workers with pagination and filtering",
      "GET /:id - Get worker details by ID",
      "GET /health - Health check",
    ],
    features: {
      pagination: "12 workers per page (configurable)",
      filtering: "Filter by skills, status, city, province",
      search: "Search by email",
      sorting: "Sort by createdAt, rating, firstName, lastName",
      encryption: "Sensitive data decryption supported",
      verification: "Only verified workers returned",
    },
    rateLimits: {
      workerList: "30 per minute",
      workerDetails: "60 per minute",
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
