const express = require("express");
const router = express.Router();

const {
  applyToJob,
  getWorkerApplications,
  updateJobApplication,
  withdrawJobApplication,
  getApplicationById,
} = require("../controllers/jobApplication.controller");

const verifyToken = require("../middleware/verifyToken");
const { authLimiter } = require("../utils/rateLimit");

// ==================== WORKER APPLICATION ROUTES ====================

// Apply to a job (Verified workers only)
router.post("/:jobId/apply", authLimiter, verifyToken, applyToJob);

// Get worker's applications
router.get("/my-applications", verifyToken, getWorkerApplications);

// Get application details by ID
router.get("/:applicationId", verifyToken, getApplicationById);

// Update job application (only pending applications)
router.put("/:applicationId", authLimiter, verifyToken, updateJobApplication);

// Withdraw job application
router.patch(
  "/:applicationId/withdraw",
  authLimiter,
  verifyToken,
  withdrawJobApplication
);

module.exports = router;
