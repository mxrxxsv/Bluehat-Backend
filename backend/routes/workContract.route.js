const express = require("express");
const router = express.Router();

// Middleware
const verifyToken = require("../middleware/verifyToken");
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
  confirmWorkCompletion,
  submitFeedback,
  cancelContract,
} = require("../controllers/workContract.controller");

// Debug route to check contracts
router.get("/debug/all", async (req, res) => {
  try {
    const WorkContract = require("../models/WorkContract");
    const contracts = await WorkContract.find({}).populate([
      { path: "clientId", select: "firstName lastName" },
      { path: "workerId", select: "firstName lastName" },
      { path: "jobId", select: "title description" },
    ]);

    res.json({
      success: true,
      count: contracts.length,
      contracts: contracts.map((c) => ({
        id: c._id,
        status: c.contractStatus,
        clientName: `${c.clientId.firstName} ${c.clientId.lastName}`,
        workerName: `${c.workerId.firstName} ${c.workerId.lastName}`,
        jobTitle: c.jobId?.title || "No job title",
        agreedRate: c.agreedRate,
        createdAt: c.createdAt,
      })),
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Test contract retrieval with auth
router.get("/debug/my", verifyToken, async (req, res) => {
  try {
    const WorkContract = require("../models/WorkContract");
    const Client = require("../models/Client");
    const Worker = require("../models/Worker");

    let profile = null;
    if (req.user.userType === "client") {
      profile = await Client.findOne({ credentialId: req.user.id });
    } else {
      profile = await Worker.findOne({ credentialId: req.user.id });
    }

    const filter =
      req.user.userType === "client"
        ? { clientId: profile._id }
        : { workerId: profile._id };

    const contracts = await WorkContract.find(filter);

    res.json({
      success: true,
      userType: req.user.userType,
      profileId: profile?._id,
      filter,
      count: contracts.length,
      contracts,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

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

// Client confirms work completion
router.patch(
  "/:id/confirm-completion",
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
    return confirmWorkCompletion(req, res);
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
