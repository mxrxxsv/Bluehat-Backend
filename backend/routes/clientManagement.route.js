const express = require("express");
const rateLimit = require("express-rate-limit");

const {
  getClients,
  blockClient,
  unblockClient,
} = require("../controllers/clientManagement.controller");

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

const clientListLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 30, // Max 30 requests per minute
  message: {
    success: false,
    message: "Too many requests. Please try again later.",
    code: "CLIENT_LIST_RATE_LIMIT_EXCEEDED",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// ==================== CLIENT MANAGEMENT ROUTES ====================

/**
 * @route   GET /api/client-management
 * @desc    Get all clients with pagination (30 per page)
 * @access  Private (Admin only)
 * @query   page, sortBy, order, search, status
 */
router.get("/", clientListLimiter, verifyAdmin, getClients);

/**
 * @route   POST /api/client-management/:id/block
 * @desc    Block a client account
 * @access  Private (Admin only)
 * @body    { "reason": "Block reason text" }
 */
router.post("/:id/block", adminActionLimiter, verifyAdmin, blockClient);

/**
 * @route   POST /api/client-management/:id/unblock
 * @desc    Unblock a client account
 * @access  Private (Admin only)
 */
router.post("/:id/unblock", adminActionLimiter, verifyAdmin, unblockClient);

// ==================== HEALTH CHECK ====================

/**
 * @route   GET /api/client-management/health
 * @desc    Client management service health check
 * @access  Public
 */
router.get("/health", (req, res) => {
  const healthCheck = {
    service: "Client Management API",
    status: "Healthy",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || "development",
    version: process.env.npm_package_version || "1.0.0",
    endpoints: [
      "GET / - Get all clients with pagination (Admin)",
      "POST /:id/block - Block client account (Admin)",
      "POST /:id/unblock - Unblock client account (Admin)",
      "GET /health - Health check",
    ],
    features: {
      pagination: "30 clients per page",
      search: "Search by email",
      filtering: "Filter by status (blocked/active/all)",
      sorting: "Sort by createdAt, firstName, lastName, email",
      encryption: "Sensitive data decryption supported",
    },
    rateLimits: {
      adminActions: "50 per 5 minutes",
      clientList: "30 per minute",
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
        "GET / - Get all clients with pagination (Admin only)",
        "POST /:id/block - Block client account (Admin only)",
        "POST /:id/unblock - Unblock client account (Admin only)",
        "GET /health - Health check",
      ],
      queryParameters: {
        "GET /": [
          "page - Page number (default: 1)",
          "sortBy - Sort field: createdAt, firstName, lastName, email (default: createdAt)",
          "order - Sort order: asc, desc (default: desc)",
          "search - Search by email",
          "status - Filter by status: blocked, active, all (default: all)",
        ],
      },
      bodyParameters: {
        "POST /:id/block": {
          reason: "Block reason (required, 5-200 characters)",
        },
      },
      examples: [
        "GET /?page=1&status=active&sortBy=firstName&order=asc",
        "GET /?search=john@gmail.com",
        "POST /507f1f77bcf86cd799439011/block",
        "POST /507f1f77bcf86cd799439011/unblock",
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
