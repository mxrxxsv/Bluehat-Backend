const express = require("express");
const rateLimit = require("express-rate-limit");

const {
  applyToJob,
  getWorkerApplications,
  getClientApplications,
  respondToApplication,
  sendDirectHiringRequest,
  getWorkerDirectRequests,
  respondToDirectRequest,
  getClientDirectRequests,
} = require("../controllers/jobApplication.controller");

const verifyToken = require("../middleware/verifyToken");

const router = express.Router();

// ==================== RATE LIMITING ====================

const applicationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Max 10 applications per 15 minutes
  message: {
    success: false,
    message: "Too many applications submitted. Please try again later.",
    code: "APPLICATION_RATE_LIMIT_EXCEEDED",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

const directHiringLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Max 5 direct hiring requests per 15 minutes
  message: {
    success: false,
    message: "Too many direct hiring requests. Please try again later.",
    code: "DIRECT_HIRING_RATE_LIMIT_EXCEEDED",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

const generalLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 30, // Max 30 requests per minute
  message: {
    success: false,
    message: "Too many requests. Please try again later.",
    code: "GENERAL_RATE_LIMIT_EXCEEDED",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// ==================== JOB APPLICATION ROUTES ====================

/**
 * @route   POST /api/job-applications/apply/:jobId
 * @desc    Apply to a job (Verified workers only)
 * @access  Private (Worker)
 */
router.post("/apply/:jobId", applicationLimiter, verifyToken, applyToJob);

/**
 * @route   GET /api/job-applications/worker/my-applications
 * @desc    Get worker's job applications
 * @access  Private (Worker)
 */
router.get(
  "/worker/my-applications",
  generalLimiter,
  verifyToken,
  getWorkerApplications
);

/**
 * @route   GET /api/job-applications/client/received-applications
 * @desc    Get applications for client's jobs
 * @access  Private (Client)
 */
router.get(
  "/client/received-applications",
  generalLimiter,
  verifyToken,
  getClientApplications
);

/**
 * @route   PATCH /api/job-applications/respond/:applicationId
 * @desc    Accept or reject job application
 * @access  Private (Client)
 */
router.patch(
  "/respond/:applicationId",
  generalLimiter,
  verifyToken,
  respondToApplication
);

// ==================== DIRECT HIRING ROUTES ====================

/**
 * @route   POST /api/job-applications/direct-hire/:workerId
 * @desc    Send direct hiring request to worker
 * @access  Private (Client)
 */
router.post(
  "/direct-hire/:workerId",
  directHiringLimiter,
  verifyToken,
  sendDirectHiringRequest
);

/**
 * @route   GET /api/job-applications/worker/direct-requests
 * @desc    Get direct hiring requests for worker
 * @access  Private (Worker)
 */
router.get(
  "/worker/direct-requests",
  generalLimiter,
  verifyToken,
  getWorkerDirectRequests
);

/**
 * @route   PATCH /api/job-applications/direct-respond/:directRequestId
 * @desc    Accept or reject direct hiring request
 * @access  Private (Worker)
 */
router.patch(
  "/direct-respond/:directRequestId",
  generalLimiter,
  verifyToken,
  respondToDirectRequest
);

/**
 * @route   GET /api/job-applications/client/sent-direct-requests
 * @desc    Get client's sent direct hiring requests
 * @access  Private (Client)
 */
router.get(
  "/client/sent-direct-requests",
  generalLimiter,
  verifyToken,
  getClientDirectRequests
);

// ==================== HEALTH CHECK ====================

/**
 * @route   GET /api/job-applications/health
 * @desc    Job applications service health check
 * @access  Public
 */
router.get("/health", (req, res) => {
  const healthCheck = {
    service: "Job Applications API",
    status: "Healthy",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || "development",
    version: process.env.npm_package_version || "1.0.0",
    endpoints: {
      applications: [
        "POST /apply/:jobId - Apply to job",
        "GET /worker/my-applications - Get worker applications",
        "GET /client/received-applications - Get client applications",
        "PATCH /respond/:applicationId - Respond to application",
      ],
      directHiring: [
        "POST /direct-hire/:workerId - Send direct hiring request",
        "GET /worker/direct-requests - Get worker direct requests",
        "PATCH /direct-respond/:directRequestId - Respond to direct request",
        "GET /client/sent-direct-requests - Get client direct requests",
      ],
    },
    rateLimits: {
      applications: "10 per 15 minutes",
      directHiring: "5 per 15 minutes",
      general: "30 per minute",
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

// ==================== 404 HANDLER ====================

/**
 * @desc    Handle undefined routes
 */
router.use("*", (req, res) => {
  const method = req.method;
  const url = req.originalUrl;

  res.status(404).json({
    success: false,
    message: `Route ${method} ${url} not found`,
    code: "ROUTE_NOT_FOUND",
    data: {
      availableEndpoints: [
        "POST /apply/:jobId - Apply to job (Worker)",
        "GET /worker/my-applications - Get worker applications (Worker)",
        "GET /client/received-applications - Get client applications (Client)",
        "PATCH /respond/:applicationId - Respond to application (Client)",
        "POST /direct-hire/:workerId - Send direct hiring request (Client)",
        "GET /worker/direct-requests - Get worker direct requests (Worker)",
        "PATCH /direct-respond/:directRequestId - Respond to direct request (Worker)",
        "GET /client/sent-direct-requests - Get client direct requests (Client)",
        "GET /health - Health check",
      ],
      documentation: "Please refer to API documentation for proper usage",
    },
    meta: {
      timestamp: new Date().toISOString(),
      ip: req.ip,
      userAgent: req.get("User-Agent"),
    },
  });
});

module.exports = router;
