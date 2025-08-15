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

    let matchFilter = { isVerified: false, isAuthenticated: true };

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
          lastLogin: credential.lastLogin,
          createdAt: credential.createdAt,
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

    // Update credential
    credential.isVerified = true;
    credential.verifiedAt = new Date();
    credential.verifiedBy = req.admin._id;
    if (notes) credential.verificationNotes = notes;
    await credential.save({ session });

    // Update profile based on user type
    if (credential.userType === "worker") {
      await Worker.findOneAndUpdate(
        { credentialId: id },
        {
          isVerified: true,
          verifiedAt: new Date(),
          verifiedBy: req.admin._id,
          verificationNotes: notes,
        },
        { session }
      );
    } else if (credential.userType === "client") {
      await Client.findOneAndUpdate(
        { credentialId: id },
        {
          isVerified: true,
          verifiedAt: new Date(),
          verifiedBy: req.admin._id,
          verificationNotes: notes,
        },
        { session }
      );
    }

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

// Reject User Verification
router.patch("/reject/:id", verifyAdmin, async (req, res) => {
  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    const { id } = req.params;
    const { reason, deleteAccount = false } = req.body;

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

    if (deleteAccount) {
      // Delete user account and profile
      if (credential.userType === "worker") {
        await Worker.findOneAndDelete({ credentialId: id }, { session });
      } else if (credential.userType === "client") {
        await Client.findOneAndDelete({ credentialId: id }, { session });
      }
      await Credential.findByIdAndDelete(id, { session });

      await session.commitTransaction();

      res.status(200).json({
        success: true,
        message: `${
          credential.userType.charAt(0).toUpperCase() +
          credential.userType.slice(1)
        } account deleted due to rejection`,
        data: {
          userId: id,
          email: credential.email,
          userType: credential.userType,
          rejectionReason: reason,
          deletedAt: new Date(),
        },
      });
    } else {
      // Mark as rejected but keep account
      credential.isRejected = true;
      credential.rejectedAt = new Date();
      credential.rejectedBy = req.admin._id;
      credential.rejectionReason = reason;
      await credential.save({ session });

      // Update profile
      if (credential.userType === "worker") {
        await Worker.findOneAndUpdate(
          { credentialId: id },
          {
            isRejected: true,
            rejectedAt: new Date(),
            rejectedBy: req.admin._id,
            rejectionReason: reason,
          },
          { session }
        );
      } else if (credential.userType === "client") {
        await Client.findOneAndUpdate(
          { credentialId: id },
          {
            isRejected: true,
            rejectedAt: new Date(),
            rejectedBy: req.admin._id,
            rejectionReason: reason,
          },
          { session }
        );
      }

      await session.commitTransaction();

      res.status(200).json({
        success: true,
        message: `${
          credential.userType.charAt(0).toUpperCase() +
          credential.userType.slice(1)
        } verification rejected`,
        data: {
          userId: credential._id,
          email: credential.email,
          userType: credential.userType,
          rejectedAt: credential.rejectedAt,
          rejectionReason: reason,
          rejectedBy: req.admin.userName,
        },
      });
    }
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

    // Update credentials
    const credentialResult = await Credential.updateMany(
      {
        _id: { $in: validIds },
        isVerified: false,
        isAuthenticated: true,
      },
      {
        isVerified: true,
        verifiedAt: new Date(),
        verifiedBy: req.admin._id,
        verificationNotes: notes,
      },
      { session }
    );

    // Update worker profiles
    await Worker.updateMany(
      { credentialId: { $in: validIds } },
      {
        isVerified: true,
        verifiedAt: new Date(),
        verifiedBy: req.admin._id,
        verificationNotes: notes,
      },
      { session }
    );

    // Update client profiles
    await Client.updateMany(
      { credentialId: { $in: validIds } },
      {
        isVerified: true,
        verifiedAt: new Date(),
        verifiedBy: req.admin._id,
        verificationNotes: notes,
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

// ==================== STATISTICS ====================

// Get Verification Statistics
router.get("/stats", verifyAdmin, async (req, res) => {
  try {
    const { period = "30" } = req.query; // days
    const daysAgo = new Date();
    daysAgo.setDate(daysAgo.getDate() - parseInt(period));

    const [pendingStats, verifiedStats, rejectedStats, recentActivity] =
      await Promise.all([
        // Pending verifications count
        Credential.aggregate([
          { $match: { isVerified: false, isAuthenticated: true } },
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
            },
          },
          { $group: { _id: "$userType", count: { $sum: 1 } } },
        ]),

        // Recent verification activity
        Credential.find({
          $or: [
            { verifiedAt: { $gte: daysAgo } },
            { rejectedAt: { $gte: daysAgo } },
          ],
        })
          .select(
            "email userType isVerified isRejected verifiedAt rejectedAt verifiedBy rejectedBy"
          )
          .populate("verifiedBy rejectedBy", "firstName lastName userName")
          .sort({ $or: [{ verifiedAt: -1 }, { rejectedAt: -1 }] })
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

// Search Users
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
          break;
        case "verified":
          matchFilter.isVerified = true;
          break;
        case "rejected":
          matchFilter.isRejected = true;
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
