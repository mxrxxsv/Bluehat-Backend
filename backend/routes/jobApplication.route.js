const express = require("express");
const router = express.Router();

// Middleware
const verifyToken = require("../middleware/verifyToken");
const { verifyWorker, verifyClient } = require("../middleware/verifyHiring");
const {
  applicationLimiter,
  hiringLimiter,
} = require("../middleware/hiringRateLimit");

// Controllers
const {
  applyToJob,
  respondToApplication,
  getWorkerApplications,
  getClientApplications,
  withdrawApplication,
} = require("../controllers/jobApplication.controller");

// ==================== APPLICATION ROUTES ====================

// Worker applies to a job
router.post(
  "/jobs/:id/apply",
  applicationLimiter,
  verifyToken,
  verifyWorker,
  applyToJob
);

// Client responds to application (accept/reject)
router.patch(
  "/:id/respond",
  hiringLimiter,
  verifyToken,
  verifyClient,
  respondToApplication
);

// Worker withdraws application
router.patch(
  "/:id/withdraw",
  hiringLimiter,
  verifyToken,
  verifyWorker,
  withdrawApplication
);

// Get applications sent by worker
router.get(
  "/worker/sent",
  hiringLimiter,
  verifyToken,
  verifyWorker,
  getWorkerApplications
);

// Get applications received by client
router.get(
  "/client/received",
  hiringLimiter,
  verifyToken,
  verifyClient,
  getClientApplications
);

module.exports = router;
