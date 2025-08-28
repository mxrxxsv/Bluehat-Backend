const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const verifyAdmin = require("../middleware/verifyAdmin");
const Credential = require("../models/Credential");
const Worker = require("../models/Worker");
const Client = require("../models/Client");

// ==================== WORKER VERIFICATION ====================

// Get All Pending Worker Verifications
router.get("/workers/pending", verifyAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;

    const matchFilter = {
      isVerified: false,
      isAuthenticated: true,
      userType: "worker",
      isBlocked: { $ne: true },
    };

    const pendingWorkers = await Credential.aggregate([
      { $match: matchFilter },
      {
        $lookup: {
          from: "workers",
          localField: "_id",
          foreignField: "credentialId",
          as: "workerProfile",
        },
      },
      {
        $addFields: {
          profile: { $arrayElemAt: ["$workerProfile", 0] },
          verificationAttempts: {
            $size: { $ifNull: ["$verificationHistory", []] },
          },
        },
      },
      {
        $project: {
          workerProfile: 0,
          password: 0,
          totpSecret: 0,
        },
      },
      { $sort: { createdAt: -1 } },
      { $skip: skip },
      { $limit: parseInt(limit) },
    ]);

    const totalCount = await Credential.countDocuments(matchFilter);

    res.status(200).json({
      success: true,
      message: "Pending worker verifications retrieved successfully",
      data: {
        workers: pendingWorkers,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(totalCount / parseInt(limit)),
          totalItems: totalCount,
          itemsPerPage: parseInt(limit),
        },
      },
    });
  } catch (error) {
    console.error("Get pending worker verifications error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
});

// Get Specific Worker Details for Verification
router.get("/workers/:id", verifyAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid worker ID",
      });
    }

    const credential = await Credential.findById(id);
    if (!credential || credential.userType !== "worker") {
      return res.status(404).json({
        success: false,
        message: "Worker not found",
      });
    }

    const workerProfile = await Worker.findOne({ credentialId: id }).populate(
      "skillsByCategory.skillCategoryId",
      "categoryName"
    );

    res.status(200).json({
      success: true,
      message: "Worker details retrieved successfully",
      data: {
        credential: {
          id: credential._id,
          email: credential.email,
          userType: credential.userType,
          isVerified: credential.isVerified,
          isAuthenticated: credential.isAuthenticated,
          isBlocked: credential.isBlocked,
          lastLogin: credential.lastLogin,
          createdAt: credential.createdAt,
          verificationHistory: credential.verificationHistory || [],
          verificationAttempts: (credential.verificationHistory || []).length,
        },
        profile: workerProfile,
      },
    });
  } catch (error) {
    console.error("Get worker details error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
});

// Approve Worker Verification
router.patch("/workers/approve/:id", verifyAdmin, async (req, res) => {
  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    const { id } = req.params;
    const { notes } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid worker ID",
      });
    }

    const credential = await Credential.findById(id).session(session);
    if (!credential || credential.userType !== "worker") {
      await session.abortTransaction();
      return res.status(404).json({
        success: false,
        message: "Worker not found",
      });
    }

    if (credential.isVerified) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: "Worker is already verified",
      });
    }

    if (credential.isBlocked) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: "Cannot verify a blocked worker",
      });
    }

    // Update credential with approval
    credential.isVerified = true;
    credential.verifiedAt = new Date();
    credential.verifiedBy = req.admin._id;
    credential.verificationNotes = notes;

    // Add to verification history
    if (!credential.verificationHistory) {
      credential.verificationHistory = [];
    }
    credential.verificationHistory.push({
      action: "approved",
      adminId: req.admin._id,
      adminName: req.admin.userName,
      notes: notes,
      timestamp: new Date(),
    });

    // Clear any previous rejection flags
    credential.isRejected = false;
    credential.rejectedAt = undefined;
    credential.rejectionReason = undefined;

    await credential.save({ session });

    await session.commitTransaction();

    res.status(200).json({
      success: true,
      message: "Worker verified successfully",
      data: {
        userId: credential._id,
        email: credential.email,
        userType: credential.userType,
        verifiedAt: credential.verifiedAt,
        verifiedBy: req.admin.userName,
        verificationAttempts: credential.verificationHistory.length,
      },
    });
  } catch (error) {
    await session.abortTransaction();
    console.error("Approve worker verification error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  } finally {
    session.endSession();
  }
});

// Reject Worker Verification
router.patch("/workers/reject/:id", verifyAdmin, async (req, res) => {
  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    const { id } = req.params;
    const { reason, blockUser = false } = req.body;

    if (!reason || reason.trim().length < 10) {
      return res.status(400).json({
        success: false,
        message: "Rejection reason must be at least 10 characters long",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid worker ID",
      });
    }

    const credential = await Credential.findById(id).session(session);
    if (!credential || credential.userType !== "worker") {
      await session.abortTransaction();
      return res.status(404).json({
        success: false,
        message: "Worker not found",
      });
    }

    if (credential.isVerified) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: "Cannot reject an already verified worker",
      });
    }

    // Initialize verification history if it doesn't exist
    if (!credential.verificationHistory) {
      credential.verificationHistory = [];
    }

    // Add rejection to history
    credential.verificationHistory.push({
      action: "rejected",
      reason: reason.trim(),
      adminId: req.admin._id,
      adminName: req.admin.userName,
      timestamp: new Date(),
    });

    // Update rejection status (but keep account active for reapplication)
    credential.isRejected = true;
    credential.rejectedAt = new Date();
    credential.rejectedBy = req.admin._id;
    credential.rejectionReason = reason.trim();

    // Only block if explicitly requested (for severe violations)
    if (blockUser) {
      credential.isBlocked = true;
      credential.blockedAt = new Date();
      credential.blockedBy = req.admin._id;
    }

    await credential.save({ session });

    await session.commitTransaction();

    const verificationAttempts = credential.verificationHistory.length;
    const canReapply = !credential.isBlocked;

    res.status(200).json({
      success: true,
      message: `Worker verification rejected${
        blockUser ? " and account blocked" : ""
      }`,
      data: {
        userId: credential._id,
        email: credential.email,
        userType: credential.userType,
        rejectedAt: credential.rejectedAt,
        rejectionReason: reason,
        rejectedBy: req.admin.userName,
        verificationAttempts: verificationAttempts,
        canReapply: canReapply,
        isBlocked: credential.isBlocked || false,
        message: canReapply
          ? "Worker can update their information and reapply for verification"
          : "Worker is blocked and cannot reapply",
      },
    });
  } catch (error) {
    await session.abortTransaction();
    console.error("Reject worker verification error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  } finally {
    session.endSession();
  }
});

// ==================== CLIENT VERIFICATION ====================

// Get All Pending Client Verifications
router.get("/clients/pending", verifyAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;

    const matchFilter = {
      isVerified: false,
      isAuthenticated: true,
      userType: "client",
      isBlocked: { $ne: true },
    };

    const pendingClients = await Credential.aggregate([
      { $match: matchFilter },
      {
        $lookup: {
          from: "clients",
          localField: "_id",
          foreignField: "credentialId",
          as: "clientProfile",
        },
      },
      {
        $addFields: {
          profile: { $arrayElemAt: ["$clientProfile", 0] },
          verificationAttempts: {
            $size: { $ifNull: ["$verificationHistory", []] },
          },
        },
      },
      {
        $project: {
          clientProfile: 0,
          password: 0,
          totpSecret: 0,
        },
      },
      { $sort: { createdAt: -1 } },
      { $skip: skip },
      { $limit: parseInt(limit) },
    ]);

    const totalCount = await Credential.countDocuments(matchFilter);

    res.status(200).json({
      success: true,
      message: "Pending client verifications retrieved successfully",
      data: {
        clients: pendingClients,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(totalCount / parseInt(limit)),
          totalItems: totalCount,
          itemsPerPage: parseInt(limit),
        },
      },
    });
  } catch (error) {
    console.error("Get pending client verifications error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
});

// Get Specific Client Details for Verification
router.get("/clients/:id", verifyAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid client ID",
      });
    }

    const credential = await Credential.findById(id);
    if (!credential || credential.userType !== "client") {
      return res.status(404).json({
        success: false,
        message: "Client not found",
      });
    }

    const clientProfile = await Client.findOne({ credentialId: id });

    res.status(200).json({
      success: true,
      message: "Client details retrieved successfully",
      data: {
        credential: {
          id: credential._id,
          email: credential.email,
          userType: credential.userType,
          isVerified: credential.isVerified,
          isAuthenticated: credential.isAuthenticated,
          isBlocked: credential.isBlocked,
          lastLogin: credential.lastLogin,
          createdAt: credential.createdAt,
          verificationHistory: credential.verificationHistory || [],
          verificationAttempts: (credential.verificationHistory || []).length,
        },
        profile: clientProfile,
      },
    });
  } catch (error) {
    console.error("Get client details error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
});

// Approve Client Verification
router.patch("/clients/approve/:id", verifyAdmin, async (req, res) => {
  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    const { id } = req.params;
    const { notes } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid client ID",
      });
    }

    const credential = await Credential.findById(id).session(session);
    if (!credential || credential.userType !== "client") {
      await session.abortTransaction();
      return res.status(404).json({
        success: false,
        message: "Client not found",
      });
    }

    if (credential.isVerified) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: "Client is already verified",
      });
    }

    if (credential.isBlocked) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: "Cannot verify a blocked client",
      });
    }

    // Update credential with approval
    credential.isVerified = true;
    credential.verifiedAt = new Date();
    credential.verifiedBy = req.admin._id;
    credential.verificationNotes = notes;

    // Add to verification history
    if (!credential.verificationHistory) {
      credential.verificationHistory = [];
    }
    credential.verificationHistory.push({
      action: "approved",
      adminId: req.admin._id,
      adminName: req.admin.userName,
      notes: notes,
      timestamp: new Date(),
    });

    // Clear any previous rejection flags
    credential.isRejected = false;
    credential.rejectedAt = undefined;
    credential.rejectionReason = undefined;

    await credential.save({ session });

    await session.commitTransaction();

    res.status(200).json({
      success: true,
      message: "Client verified successfully",
      data: {
        userId: credential._id,
        email: credential.email,
        userType: credential.userType,
        verifiedAt: credential.verifiedAt,
        verifiedBy: req.admin.userName,
        verificationAttempts: credential.verificationHistory.length,
      },
    });
  } catch (error) {
    await session.abortTransaction();
    console.error("Approve client verification error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  } finally {
    session.endSession();
  }
});

// Reject Client Verification
router.patch("/clients/reject/:id", verifyAdmin, async (req, res) => {
  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    const { id } = req.params;
    const { reason, blockUser = false } = req.body;

    if (!reason || reason.trim().length < 10) {
      return res.status(400).json({
        success: false,
        message: "Rejection reason must be at least 10 characters long",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid client ID",
      });
    }

    const credential = await Credential.findById(id).session(session);
    if (!credential || credential.userType !== "client") {
      await session.abortTransaction();
      return res.status(404).json({
        success: false,
        message: "Client not found",
      });
    }

    if (credential.isVerified) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: "Cannot reject an already verified client",
      });
    }

    // Initialize verification history if it doesn't exist
    if (!credential.verificationHistory) {
      credential.verificationHistory = [];
    }

    // Add rejection to history
    credential.verificationHistory.push({
      action: "rejected",
      reason: reason.trim(),
      adminId: req.admin._id,
      adminName: req.admin.userName,
      timestamp: new Date(),
    });

    // Update rejection status (but keep account active for reapplication)
    credential.isRejected = true;
    credential.rejectedAt = new Date();
    credential.rejectedBy = req.admin._id;
    credential.rejectionReason = reason.trim();

    // Only block if explicitly requested (for severe violations)
    if (blockUser) {
      credential.isBlocked = true;
      credential.blockedAt = new Date();
      credential.blockedBy = req.admin._id;
    }

    await credential.save({ session });

    await session.commitTransaction();

    const verificationAttempts = credential.verificationHistory.length;
    const canReapply = !credential.isBlocked;

    res.status(200).json({
      success: true,
      message: `Client verification rejected${
        blockUser ? " and account blocked" : ""
      }`,
      data: {
        userId: credential._id,
        email: credential.email,
        userType: credential.userType,
        rejectedAt: credential.rejectedAt,
        rejectionReason: reason,
        rejectedBy: req.admin.userName,
        verificationAttempts: verificationAttempts,
        canReapply: canReapply,
        isBlocked: credential.isBlocked || false,
        message: canReapply
          ? "Client can update their information and reapply for verification"
          : "Client is blocked and cannot reapply",
      },
    });
  } catch (error) {
    await session.abortTransaction();
    console.error("Reject client verification error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  } finally {
    session.endSession();
  }
});

// ==================== GENERAL OPERATIONS ====================

// Block User (Works for both workers and clients)
router.patch("/block/:id", verifyAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    if (!reason || reason.trim().length < 10) {
      return res.status(400).json({
        success: false,
        message: "Block reason must be at least 10 characters long",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid user ID",
      });
    }

    const credential = await Credential.findById(id);
    if (!credential) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    if (credential.isBlocked) {
      return res.status(400).json({
        success: false,
        message: "User is already blocked",
      });
    }

    // Block the user
    credential.isBlocked = true;
    credential.blockedAt = new Date();
    credential.blockedBy = req.admin._id;
    credential.blockReason = reason.trim();

    // Add to verification history
    if (!credential.verificationHistory) {
      credential.verificationHistory = [];
    }
    credential.verificationHistory.push({
      action: "blocked",
      reason: reason.trim(),
      adminId: req.admin._id,
      adminName: req.admin.userName,
      timestamp: new Date(),
    });

    await credential.save();

    res.status(200).json({
      success: true,
      message: `${
        credential.userType.charAt(0).toUpperCase() +
        credential.userType.slice(1)
      } blocked successfully`,
      data: {
        userId: credential._id,
        email: credential.email,
        userType: credential.userType,
        blockedAt: credential.blockedAt,
        blockReason: reason,
        blockedBy: req.admin.userName,
      },
    });
  } catch (error) {
    console.error("Block user error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
});

// Unblock User (Works for both workers and clients)
router.patch("/unblock/:id", verifyAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { notes } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid user ID",
      });
    }

    const credential = await Credential.findById(id);
    if (!credential) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    if (!credential.isBlocked) {
      return res.status(400).json({
        success: false,
        message: "User is not blocked",
      });
    }

    // Unblock the user
    credential.isBlocked = false;
    credential.unblockedAt = new Date();
    credential.unblockedBy = req.admin._id;
    credential.unblockNotes = notes;

    // Add to verification history
    if (!credential.verificationHistory) {
      credential.verificationHistory = [];
    }
    credential.verificationHistory.push({
      action: "unblocked",
      notes: notes,
      adminId: req.admin._id,
      adminName: req.admin.userName,
      timestamp: new Date(),
    });

    await credential.save();

    res.status(200).json({
      success: true,
      message: `${
        credential.userType.charAt(0).toUpperCase() +
        credential.userType.slice(1)
      } unblocked successfully`,
      data: {
        userId: credential._id,
        email: credential.email,
        userType: credential.userType,
        unblockedAt: credential.unblockedAt,
        unblockedBy: req.admin.userName,
        canReapply: true,
      },
    });
  } catch (error) {
    console.error("Unblock user error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
});

// Get Verification Statistics
router.get("/stats", verifyAdmin, async (req, res) => {
  try {
    const { period = "30" } = req.query;
    const daysAgo = new Date();
    daysAgo.setDate(daysAgo.getDate() - parseInt(period));

    const [pendingStats, verifiedStats, rejectedStats, blockedStats] =
      await Promise.all([
        // Pending verifications count
        Credential.aggregate([
          {
            $match: {
              isVerified: false,
              isAuthenticated: true,
              isBlocked: { $ne: true },
            },
          },
          { $group: { _id: "$userType", count: { $sum: 1 } } },
        ]),

        // Verified users count (recent)
        Credential.aggregate([
          {
            $match: {
              isVerified: true,
              verifiedAt: { $gte: daysAgo },
            },
          },
          { $group: { _id: "$userType", count: { $sum: 1 } } },
        ]),

        // Rejected users count (recent)
        Credential.aggregate([
          {
            $match: {
              isRejected: true,
              rejectedAt: { $gte: daysAgo },
              isBlocked: { $ne: true },
            },
          },
          { $group: { _id: "$userType", count: { $sum: 1 } } },
        ]),

        // Blocked users count
        Credential.aggregate([
          {
            $match: {
              isBlocked: true,
              blockedAt: { $gte: daysAgo },
            },
          },
          { $group: { _id: "$userType", count: { $sum: 1 } } },
        ]),
      ]);

    const formatStats = (statsArray) => {
      const result = { worker: 0, client: 0, total: 0 };
      statsArray.forEach((stat) => {
        result[stat._id] = stat.count;
        result.total += stat.count;
      });
      return result;
    };

    res.status(200).json({
      success: true,
      message: "Verification statistics retrieved successfully",
      data: {
        period: `${period} days`,
        pending: formatStats(pendingStats),
        verified: formatStats(verifiedStats),
        rejected: formatStats(rejectedStats),
        blocked: formatStats(blockedStats),
      },
    });
  } catch (error) {
    console.error("Get verification stats error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
});

module.exports = router;
