const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const verifyAdmin = require("../middleware/verifyAdmin");
const Credential = require("../models/Credential");
const Worker = require("../models/Worker");
const Client = require("../models/Client");

// ==================== PENDING VERIFICATIONS ====================

// Get All Pending Verifications (Workers & Clients)
router.get("/pending", verifyAdmin, async (req, res) => {
  try {
    const { type, page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;

    // Include users who were rejected but can reapply
    let matchFilter = {
      isVerified: false,
      isAuthenticated: true,
      // Don't show permanently blocked users
      isBlocked: { $ne: true },
    };

    if (type && ["client", "worker"].includes(type)) {
      matchFilter.userType = type;
    }

    // Get pending credentials with populated profile data
    const pendingUsers = await Credential.aggregate([
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
        $lookup: {
          from: "clients",
          localField: "_id",
          foreignField: "credentialId",
          as: "clientProfile",
        },
      },
      {
        $addFields: {
          profile: {
            $cond: {
              if: { $eq: ["$userType", "worker"] },
              then: { $arrayElemAt: ["$workerProfile", 0] },
              else: { $arrayElemAt: ["$clientProfile", 0] },
            },
          },
          // Add verification attempt history
          verificationAttempts: {
            $size: { $ifNull: ["$verificationHistory", []] },
          },
          lastRejectionReason: {
            $arrayElemAt: ["$verificationHistory.reason", -1],
          },
        },
      },
      {
        $project: {
          workerProfile: 0,
          clientProfile: 0,
          password: 0,
          totpSecret: 0,
        },
      },
      { $sort: { createdAt: -1 } },
      { $skip: skip },
      { $limit: parseInt(limit) },
    ]);

    // Get total count for pagination
    const totalCount = await Credential.countDocuments(matchFilter);

    res.status(200).json({
      success: true,
      message: "Pending verifications retrieved successfully",
      data: {
        users: pendingUsers,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(totalCount / limit),
          totalItems: totalCount,
          itemsPerPage: parseInt(limit),
        },
      },
    });
  } catch (error) {
    console.error("Get pending verifications error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
});

// Get Specific User Details for Verification
router.get("/user/:id", verifyAdmin, async (req, res) => {
  try {
    const { id } = req.params;

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

    let profileData;
    if (credential.userType === "worker") {
      profileData = await Worker.findOne({ credentialId: id });
    } else if (credential.userType === "client") {
      profileData = await Client.findOne({ credentialId: id });
    }

    res.status(200).json({
      success: true,
      message: "User details retrieved successfully",
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
        profile: profileData,
      },
    });
  } catch (error) {
    console.error("Get user details error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
});

// ==================== VERIFICATION ACTIONS ====================

// Approve User Verification
router.patch("/approve/:id", verifyAdmin, async (req, res) => {
  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    const { id } = req.params;
    const { notes } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid user ID",
      });
    }

    const credential = await Credential.findById(id).session(session);
    if (!credential) {
      await session.abortTransaction();
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    if (credential.isVerified) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: "User is already verified",
      });
    }

    if (credential.isBlocked) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: "Cannot verify a blocked user",
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
      message: `${
        credential.userType.charAt(0).toUpperCase() +
        credential.userType.slice(1)
      } verified successfully`,
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
    console.error("Approve verification error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  } finally {
    session.endSession();
  }
});

// Reject User Verification (with reapplication opportunity)
router.patch("/reject/:id", verifyAdmin, async (req, res) => {
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
        message: "Invalid user ID",
      });
    }

    const credential = await Credential.findById(id).session(session);
    if (!credential) {
      await session.abortTransaction();
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    if (credential.isVerified) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: "Cannot reject an already verified user",
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
      message: `${
        credential.userType.charAt(0).toUpperCase() +
        credential.userType.slice(1)
      } verification rejected${blockUser ? " and account blocked" : ""}`,
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
          ? "User can update their information and reapply for verification"
          : "User is blocked and cannot reapply",
      },
    });
  } catch (error) {
    await session.abortTransaction();
    console.error("Reject verification error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  } finally {
    session.endSession();
  }
});

// ==================== NEW: BLOCK/UNBLOCK USERS ====================

// Block User (prevents further verification attempts)
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

// Unblock User (allows verification attempts again)
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

// ==================== BULK OPERATIONS ====================

// Bulk Approve Multiple Users
router.patch("/bulk-approve", verifyAdmin, async (req, res) => {
  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    const { userIds, notes } = req.body;

    if (!Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: "User IDs array is required",
      });
    }

    if (userIds.length > 50) {
      return res.status(400).json({
        success: false,
        message: "Cannot approve more than 50 users at once",
      });
    }

    const validIds = userIds.filter((id) =>
      mongoose.Types.ObjectId.isValid(id)
    );
    if (validIds.length !== userIds.length) {
      return res.status(400).json({
        success: false,
        message: "Some user IDs are invalid",
      });
    }

    // Update credentials (only non-blocked, non-verified users)
    const credentialResult = await Credential.updateMany(
      {
        _id: { $in: validIds },
        isVerified: false,
        isAuthenticated: true,
        isBlocked: { $ne: true },
      },
      {
        $set: {
          isVerified: true,
          verifiedAt: new Date(),
          verifiedBy: req.admin._id,
          verificationNotes: notes,
          isRejected: false,
        },
        $push: {
          verificationHistory: {
            action: "approved",
            adminId: req.admin._id,
            adminName: req.admin.userName,
            notes: notes,
            timestamp: new Date(),
          },
        },
      },
      { session }
    );

    await session.commitTransaction();

    res.status(200).json({
      success: true,
      message: `Successfully verified ${credentialResult.modifiedCount} users`,
      data: {
        approvedCount: credentialResult.modifiedCount,
        requestedCount: userIds.length,
        approvedBy: req.admin.userName,
        approvedAt: new Date(),
      },
    });
  } catch (error) {
    await session.abortTransaction();
    console.error("Bulk approve error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  } finally {
    session.endSession();
  }
});

// ==================== VERIFICATION HISTORY ====================

// Get User Verification History
router.get("/history/:id", verifyAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid user ID",
      });
    }

    const credential = await Credential.findById(id)
      .select(
        "email userType verificationHistory isVerified isBlocked createdAt"
      )
      .populate("verificationHistory.adminId", "firstName lastName userName");

    if (!credential) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Verification history retrieved successfully",
      data: {
        userId: credential._id,
        email: credential.email,
        userType: credential.userType,
        currentStatus: {
          isVerified: credential.isVerified,
          isBlocked: credential.isBlocked,
        },
        history: credential.verificationHistory || [],
        totalAttempts: (credential.verificationHistory || []).length,
        accountCreated: credential.createdAt,
      },
    });
  } catch (error) {
    console.error("Get verification history error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
});

// ==================== STATISTICS ====================

// Get Verification Statistics (updated to include reapplication stats)
router.get("/stats", verifyAdmin, async (req, res) => {
  try {
    const { period = "30" } = req.query; // days
    const daysAgo = new Date();
    daysAgo.setDate(daysAgo.getDate() - parseInt(period));

    const [
      pendingStats,
      verifiedStats,
      rejectedStats,
      blockedStats,
      reapplicationStats,
      recentActivity,
    ] = await Promise.all([
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

      // Users with multiple verification attempts (reapplications)
      Credential.aggregate([
        {
          $match: {
            verificationHistory: { $exists: true },
            "verificationHistory.1": { $exists: true }, // At least 2 attempts
          },
        },
        { $group: { _id: "$userType", count: { $sum: 1 } } },
      ]),

      // Recent verification activity
      Credential.find({
        $or: [
          { verifiedAt: { $gte: daysAgo } },
          { rejectedAt: { $gte: daysAgo } },
          { blockedAt: { $gte: daysAgo } },
        ],
      })
        .select(
          "email userType isVerified isRejected isBlocked verifiedAt rejectedAt blockedAt verifiedBy rejectedBy blockedBy"
        )
        .populate(
          "verifiedBy rejectedBy blockedBy",
          "firstName lastName userName"
        )
        .sort({
          $or: [{ verifiedAt: -1 }, { rejectedAt: -1 }, { blockedAt: -1 }],
        })
        .limit(10),
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
        reapplications: formatStats(reapplicationStats),
        recentActivity: recentActivity,
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

// ==================== SEARCH & FILTER ====================

// Search Users (updated to include blocked users)
router.get("/search", verifyAdmin, async (req, res) => {
  try {
    const { query, userType, status, page = 1, limit = 10 } = req.query;

    if (!query || query.trim().length < 2) {
      return res.status(400).json({
        success: false,
        message: "Search query must be at least 2 characters long",
      });
    }

    const skip = (page - 1) * limit;
    const searchRegex = new RegExp(query.trim(), "i");

    // Build match filter
    let matchFilter = {
      $or: [{ email: searchRegex }],
    };

    if (userType && ["client", "worker"].includes(userType)) {
      matchFilter.userType = userType;
    }

    if (status) {
      switch (status) {
        case "pending":
          matchFilter.isVerified = false;
          matchFilter.isAuthenticated = true;
          matchFilter.isBlocked = { $ne: true };
          break;
        case "verified":
          matchFilter.isVerified = true;
          break;
        case "rejected":
          matchFilter.isRejected = true;
          matchFilter.isBlocked = { $ne: true };
          break;
        case "blocked":
          matchFilter.isBlocked = true;
          break;
      }
    }

    const users = await Credential.aggregate([
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
        $lookup: {
          from: "clients",
          localField: "_id",
          foreignField: "credentialId",
          as: "clientProfile",
        },
      },
      {
        $addFields: {
          profile: {
            $cond: {
              if: { $eq: ["$userType", "worker"] },
              then: { $arrayElemAt: ["$workerProfile", 0] },
              else: { $arrayElemAt: ["$clientProfile", 0] },
            },
          },
          verificationAttempts: {
            $size: { $ifNull: ["$verificationHistory", []] },
          },
        },
      },
      {
        $match: {
          $or: [
            { email: searchRegex },
            { "profile.firstName": searchRegex },
            { "profile.lastName": searchRegex },
            { "profile.contactNumber": searchRegex },
          ],
        },
      },
      {
        $project: {
          workerProfile: 0,
          clientProfile: 0,
          password: 0,
          totpSecret: 0,
        },
      },
      { $sort: { createdAt: -1 } },
      { $skip: skip },
      { $limit: parseInt(limit) },
    ]);

    res.status(200).json({
      success: true,
      message: "Search results retrieved successfully",
      data: {
        users: users,
        searchQuery: query,
        filters: { userType, status },
        pagination: {
          currentPage: parseInt(page),
          itemsPerPage: parseInt(limit),
          hasMore: users.length === parseInt(limit),
        },
      },
    });
  } catch (error) {
    console.error("Search users error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
});

module.exports = router;
