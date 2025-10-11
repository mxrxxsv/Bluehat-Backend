const express = require("express");
const router = express.Router();

// Middleware
const verifyToken = require("../middleware/verifyToken");
const {
  verifyWorker,
  verifyClient,
  verifyClientOrWorker,
} = require("../middleware/verifyHiring");
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
  startApplicationDiscussion,
  markApplicationAgreement,
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

// ==================== NEW AGREEMENT FLOW ROUTES ====================

// Start discussion phase for application (client only)
router.patch(
  "/:id/start-discussion",
  hiringLimiter,
  verifyToken,
  verifyClient,
  startApplicationDiscussion
);

// Mark agreement status (both client and worker)
router.patch(
  "/:id/agreement",
  hiringLimiter,
  verifyToken,
  verifyClientOrWorker,
  markApplicationAgreement
);

// Debug route to check application status
router.get("/debug/:id", verifyToken, async (req, res) => {
  try {
    const { checkApplicationStatus } = require("../utils/debugApplication");
    const application = await checkApplicationStatus(req.params.id);

    if (!application) {
      return res.status(404).json({
        success: false,
        message: "Application not found",
      });
    }

    res.json({
      success: true,
      data: {
        id: application._id,
        status: application.applicationStatus,
        clientId: application.clientId._id,
        workerId: application.workerId._id,
        clientAgreed: application.clientAgreed,
        workerAgreed: application.workerAgreed,
        discussionStartedAt: application.discussionStartedAt,
        isDeleted: application.isDeleted,
        jobTitle: application.jobId.title,
        clientName: `${application.clientId.firstName} ${application.clientId.lastName}`,
        workerName: `${application.workerId.firstName} ${application.workerId.lastName}`,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

module.exports = router;
