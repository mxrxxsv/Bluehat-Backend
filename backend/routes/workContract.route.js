const express = require("express");
const router = express.Router();

// Middleware
const { verifyToken } = require("../middleware/verifyToken");
const { verifyClientOrWorker } = require("../middleware/verifyHiring");
const {
  contractActionLimiter,
  feedbackLimiter,
} = require("../middleware/hiringRateLimit");

// Controllers
const {
  getClientContracts,
  getWorkerContracts,
  getContractDetails,
  startWork,
  completeWork,
  submitFeedback,
  cancelContract,
} = require("../controllers/workContract.controller");

// ==================== CONTRACT ROUTES ====================

// Get contracts for client
router.get(
  "/client",
  contractActionLimiter,
  verifyToken,
  verifyClientOrWorker,
  (req, res) => {
    if (req.user.userType !== "client") {
      return res.status(403).json({
        success: false,
        message: "Client access required",
        code: "CLIENT_ACCESS_REQUIRED",
      });
    }
    return getClientContracts(req, res);
  }
);

// Get contracts for worker
router.get(
  "/worker",
  contractActionLimiter,
  verifyToken,
  verifyClientOrWorker,
  (req, res) => {
    if (req.user.userType !== "worker") {
      return res.status(403).json({
        success: false,
        message: "Worker access required",
        code: "WORKER_ACCESS_REQUIRED",
      });
    }
    return getWorkerContracts(req, res);
  }
);

// Get single contract details
router.get(
  "/:id",
  contractActionLimiter,
  verifyToken,
  verifyClientOrWorker,
  getContractDetails
);

// Worker starts work
router.patch(
  "/:id/start",
  contractActionLimiter,
  verifyToken,
  verifyClientOrWorker,
  (req, res) => {
    if (req.user.userType !== "worker") {
      return res.status(403).json({
        success: false,
        message: "Worker access required",
        code: "WORKER_ACCESS_REQUIRED",
      });
    }
    return startWork(req, res);
  }
);

// Worker completes work
router.patch(
  "/:id/complete",
  contractActionLimiter,
  verifyToken,
  verifyClientOrWorker,
  (req, res) => {
    if (req.user.userType !== "worker") {
      return res.status(403).json({
        success: false,
        message: "Worker access required",
        code: "WORKER_ACCESS_REQUIRED",
      });
    }
    return completeWork(req, res);
  }
);

// Submit feedback and rating
router.post(
  "/:id/feedback",
  feedbackLimiter,
  verifyToken,
  verifyClientOrWorker,
  submitFeedback
);

// Cancel contract
router.patch(
  "/:id/cancel",
  contractActionLimiter,
  verifyToken,
  verifyClientOrWorker,
  cancelContract
);

module.exports = router;
