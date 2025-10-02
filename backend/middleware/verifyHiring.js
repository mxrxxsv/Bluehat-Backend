const Client = require("../models/Client");
const Worker = require("../models/Worker");
const logger = require("../utils/logger");

// Verify client is verified and not blocked
const verifyClient = async (req, res, next) => {
  try {
    if (!req.user || req.user.userType !== "client") {
      logger.warn("Non-client attempted to access client-only endpoint", {
        userId: req.user?.id,
        userType: req.user?.userType,
        endpoint: req.originalUrl,
        ip: req.ip,
        timestamp: new Date().toISOString(),
      });

      return res.status(401).json({
        success: false,
        message: "Client authentication required",
        code: "CLIENT_AUTH_REQUIRED",
      });
    }

    const client = await Client.findOne({ credentialId: req.user.id }).select(
      "isVerified blocked _id"
    );

    if (!client) {
      logger.error("Client profile not found", {
        userId: req.user.id,
        endpoint: req.originalUrl,
        ip: req.ip,
        timestamp: new Date().toISOString(),
      });

      return res.status(404).json({
        success: false,
        message: "Client profile not found",
        code: "CLIENT_PROFILE_NOT_FOUND",
      });
    }

    if (!client.isVerified) {
      logger.warn("Unverified client attempted protected action", {
        clientId: client._id,
        userId: req.user.id,
        endpoint: req.originalUrl,
        ip: req.ip,
        timestamp: new Date().toISOString(),
      });

      return res.status(403).json({
        success: false,
        message: "Only verified clients can perform this action",
        code: "CLIENT_NOT_VERIFIED",
      });
    }

    if (client.blocked) {
      logger.warn("Blocked client attempted protected action", {
        clientId: client._id,
        userId: req.user.id,
        endpoint: req.originalUrl,
        ip: req.ip,
        timestamp: new Date().toISOString(),
      });

      return res.status(403).json({
        success: false,
        message: "Your client account is blocked",
        code: "CLIENT_BLOCKED",
      });
    }

    req.clientProfile = client;
    next();
  } catch (error) {
    logger.error("Client verification failed", {
      error: error.message,
      stack: error.stack,
      userId: req.user?.id,
      endpoint: req.originalUrl,
      ip: req.ip,
      timestamp: new Date().toISOString(),
    });

    return res.status(500).json({
      success: false,
      message: "Client verification failed",
      code: "CLIENT_VERIFICATION_ERROR",
    });
  }
};

// Verify worker is verified and not blocked
const verifyWorker = async (req, res, next) => {
  try {
    if (!req.user || req.user.userType !== "worker") {
      logger.warn("Non-worker attempted to access worker-only endpoint", {
        userId: req.user?.id,
        userType: req.user?.userType,
        endpoint: req.originalUrl,
        ip: req.ip,
        timestamp: new Date().toISOString(),
      });

      return res.status(401).json({
        success: false,
        message: "Worker authentication required",
        code: "WORKER_AUTH_REQUIRED",
      });
    }

    const worker = await Worker.findOne({ credentialId: req.user.id }).select(
      "isVerified blocked _id"
    );

    if (!worker) {
      logger.error("Worker profile not found", {
        userId: req.user.id,
        endpoint: req.originalUrl,
        ip: req.ip,
        timestamp: new Date().toISOString(),
      });

      return res.status(404).json({
        success: false,
        message: "Worker profile not found",
        code: "WORKER_PROFILE_NOT_FOUND",
      });
    }

    if (!worker.isVerified) {
      logger.warn("Unverified worker attempted protected action", {
        workerId: worker._id,
        userId: req.user.id,
        endpoint: req.originalUrl,
        ip: req.ip,
        timestamp: new Date().toISOString(),
      });

      return res.status(403).json({
        success: false,
        message: "Only verified workers can perform this action",
        code: "WORKER_NOT_VERIFIED",
      });
    }

    if (worker.blocked) {
      logger.warn("Blocked worker attempted protected action", {
        workerId: worker._id,
        userId: req.user.id,
        endpoint: req.originalUrl,
        ip: req.ip,
        timestamp: new Date().toISOString(),
      });

      return res.status(403).json({
        success: false,
        message: "Your worker account is blocked",
        code: "WORKER_BLOCKED",
      });
    }

    req.workerProfile = worker;
    next();
  } catch (error) {
    logger.error("Worker verification failed", {
      error: error.message,
      stack: error.stack,
      userId: req.user?.id,
      endpoint: req.originalUrl,
      ip: req.ip,
      timestamp: new Date().toISOString(),
    });

    return res.status(500).json({
      success: false,
      message: "Worker verification failed",
      code: "WORKER_VERIFICATION_ERROR",
    });
  }
};

// Verify either client or worker (for contract operations)
const verifyClientOrWorker = async (req, res, next) => {
  try {
    if (!req.user || !["client", "worker"].includes(req.user.userType)) {
      logger.warn("Invalid user type attempted contract operation", {
        userId: req.user?.id,
        userType: req.user?.userType,
        endpoint: req.originalUrl,
        ip: req.ip,
        timestamp: new Date().toISOString(),
      });

      return res.status(401).json({
        success: false,
        message: "Client or worker authentication required",
        code: "CLIENT_OR_WORKER_AUTH_REQUIRED",
      });
    }

    if (req.user.userType === "client") {
      return verifyClient(req, res, next);
    } else {
      return verifyWorker(req, res, next);
    }
  } catch (error) {
    logger.error("Client or worker verification failed", {
      error: error.message,
      stack: error.stack,
      userId: req.user?.id,
      endpoint: req.originalUrl,
      ip: req.ip,
      timestamp: new Date().toISOString(),
    });

    return res.status(500).json({
      success: false,
      message: "User verification failed",
      code: "USER_VERIFICATION_ERROR",
    });
  }
};

module.exports = {
  verifyClient,
  verifyWorker,
  verifyClientOrWorker,
};
