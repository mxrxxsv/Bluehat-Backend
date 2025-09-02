const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const verifyAdmin = require("../middleware/verifyAdmin");
const Credential = require("../models/Credential");
const Worker = require("../models/Worker");
const Client = require("../models/Client");
const {
  getPendingWorker,
  getPendingWorkerByID,
  approveWorker,
  rejectWorker,
  blockUser,
  unblockUser,
  getVerificationStats,
} = require("../controllers/adminTask.controller");
// ==================== WORKER VERIFICATION ====================

// Get All Pending Worker Verifications
router.get("/workers/pending", verifyAdmin, getPendingWorker);

// Get Specific Worker Details for Verification
router.get("/workers/:id", verifyAdmin, getPendingWorkerByID);

// Approve Worker Verification
router.patch("/workers/approve/:id", verifyAdmin, approveWorker);

// Reject Worker Verification
router.patch("/workers/reject/:id", verifyAdmin, rejectWorker);
// ==================== CLIENT VERIFICATION ====================

// Get All Pending Client Verifications
// router.get("/clients/pending", verifyAdmin, async (req, res) => {
//   try {
//     const { page = 1, limit = 10 } = req.query;
//     const skip = (page - 1) * limit;

//     const matchFilter = {
//       isVerified: false,
//       isAuthenticated: true,
//       userType: "client",
//       isBlocked: { $ne: true },
//     };

//     const pendingClients = await Credential.aggregate([
//       { $match: matchFilter },
//       {
//         $lookup: {
//           from: "clients",
//           localField: "_id",
//           foreignField: "credentialId",
//           as: "clientProfile",
//         },
//       },
//       {
//         $addFields: {
//           profile: { $arrayElemAt: ["$clientProfile", 0] },
//           verificationAttempts: {
//             $size: { $ifNull: ["$verificationHistory", []] },
//           },
//         },
//       },
//       {
//         $project: {
//           clientProfile: 0,
//           password: 0,
//           totpSecret: 0,
//         },
//       },
//       { $sort: { createdAt: -1 } },
//       { $skip: skip },
//       { $limit: parseInt(limit) },
//     ]);

//     const totalCount = await Credential.countDocuments(matchFilter);

//     res.status(200).json({
//       success: true,
//       message: "Pending client verifications retrieved successfully",
//       data: {
//         clients: pendingClients,
//         pagination: {
//           currentPage: parseInt(page),
//           totalPages: Math.ceil(totalCount / parseInt(limit)),
//           totalItems: totalCount,
//           itemsPerPage: parseInt(limit),
//         },
//       },
//     });
//   } catch (error) {
//     console.error("Get pending client verifications error:", error);
//     res.status(500).json({
//       success: false,
//       message: "Internal server error",
//     });
//   }
// });

// // Get Specific Client Details for Verification
// router.get("/clients/:id", verifyAdmin, async (req, res) => {
//   try {
//     const { id } = req.params;

//     if (!mongoose.Types.ObjectId.isValid(id)) {
//       return res.status(400).json({
//         success: false,
//         message: "Invalid client ID",
//       });
//     }

//     const credential = await Credential.findById(id);
//     if (!credential || credential.userType !== "client") {
//       return res.status(404).json({
//         success: false,
//         message: "Client not found",
//       });
//     }

//     const clientProfile = await Client.findOne({ credentialId: id });

//     res.status(200).json({
//       success: true,
//       message: "Client details retrieved successfully",
//       data: {
//         credential: {
//           id: credential._id,
//           email: credential.email,
//           userType: credential.userType,
//           isVerified: credential.isVerified,
//           isAuthenticated: credential.isAuthenticated,
//           isBlocked: credential.isBlocked,
//           lastLogin: credential.lastLogin,
//           createdAt: credential.createdAt,
//           verificationHistory: credential.verificationHistory || [],
//           verificationAttempts: (credential.verificationHistory || []).length,
//         },
//         profile: clientProfile,
//       },
//     });
//   } catch (error) {
//     console.error("Get client details error:", error);
//     res.status(500).json({
//       success: false,
//       message: "Internal server error",
//     });
//   }
// });

// // Approve Client Verification
// router.patch("/clients/approve/:id", verifyAdmin, async (req, res) => {
//   const session = await mongoose.startSession();

//   try {
//     session.startTransaction();

//     const { id } = req.params;
//     const { notes } = req.body;

//     if (!mongoose.Types.ObjectId.isValid(id)) {
//       return res.status(400).json({
//         success: false,
//         message: "Invalid client ID",
//       });
//     }

//     const credential = await Credential.findById(id).session(session);
//     if (!credential || credential.userType !== "client") {
//       await session.abortTransaction();
//       return res.status(404).json({
//         success: false,
//         message: "Client not found",
//       });
//     }

//     if (credential.isVerified) {
//       await session.abortTransaction();
//       return res.status(400).json({
//         success: false,
//         message: "Client is already verified",
//       });
//     }

//     if (credential.isBlocked) {
//       await session.abortTransaction();
//       return res.status(400).json({
//         success: false,
//         message: "Cannot verify a blocked client",
//       });
//     }

//     // Update credential with approval
//     credential.isVerified = true;
//     credential.verifiedAt = new Date();
//     credential.verifiedBy = req.admin._id;
//     credential.verificationNotes = notes;

//     // Add to verification history
//     if (!credential.verificationHistory) {
//       credential.verificationHistory = [];
//     }
//     credential.verificationHistory.push({
//       action: "approved",
//       adminId: req.admin._id,
//       adminName: req.admin.userName,
//       notes: notes,
//       timestamp: new Date(),
//     });

//     // Clear any previous rejection flags
//     credential.isRejected = false;
//     credential.rejectedAt = undefined;
//     credential.rejectionReason = undefined;

//     await credential.save({ session });

//     await session.commitTransaction();

//     res.status(200).json({
//       success: true,
//       message: "Client verified successfully",
//       data: {
//         userId: credential._id,
//         email: credential.email,
//         userType: credential.userType,
//         verifiedAt: credential.verifiedAt,
//         verifiedBy: req.admin.userName,
//         verificationAttempts: credential.verificationHistory.length,
//       },
//     });
//   } catch (error) {
//     await session.abortTransaction();
//     console.error("Approve client verification error:", error);
//     res.status(500).json({
//       success: false,
//       message: "Internal server error",
//     });
//   } finally {
//     session.endSession();
//   }
// });

// // Reject Client Verification
// router.patch("/clients/reject/:id", verifyAdmin, async (req, res) => {
//   const session = await mongoose.startSession();

//   try {
//     session.startTransaction();

//     const { id } = req.params;
//     const { reason, blockUser = false } = req.body;

//     if (!reason || reason.trim().length < 10) {
//       return res.status(400).json({
//         success: false,
//         message: "Rejection reason must be at least 10 characters long",
//       });
//     }

//     if (!mongoose.Types.ObjectId.isValid(id)) {
//       return res.status(400).json({
//         success: false,
//         message: "Invalid client ID",
//       });
//     }

//     const credential = await Credential.findById(id).session(session);
//     if (!credential || credential.userType !== "client") {
//       await session.abortTransaction();
//       return res.status(404).json({
//         success: false,
//         message: "Client not found",
//       });
//     }

//     if (credential.isVerified) {
//       await session.abortTransaction();
//       return res.status(400).json({
//         success: false,
//         message: "Cannot reject an already verified client",
//       });
//     }

//     // Initialize verification history if it doesn't exist
//     if (!credential.verificationHistory) {
//       credential.verificationHistory = [];
//     }

//     // Add rejection to history
//     credential.verificationHistory.push({
//       action: "rejected",
//       reason: reason.trim(),
//       adminId: req.admin._id,
//       adminName: req.admin.userName,
//       timestamp: new Date(),
//     });

//     // Update rejection status (but keep account active for reapplication)
//     credential.isRejected = true;
//     credential.rejectedAt = new Date();
//     credential.rejectedBy = req.admin._id;
//     credential.rejectionReason = reason.trim();

//     // Only block if explicitly requested (for severe violations)
//     if (blockUser) {
//       credential.isBlocked = true;
//       credential.blockedAt = new Date();
//       credential.blockedBy = req.admin._id;
//     }

//     await credential.save({ session });

//     await session.commitTransaction();

//     const verificationAttempts = credential.verificationHistory.length;
//     const canReapply = !credential.isBlocked;

//     res.status(200).json({
//       success: true,
//       message: `Client verification rejected${
//         blockUser ? " and account blocked" : ""
//       }`,
//       data: {
//         userId: credential._id,
//         email: credential.email,
//         userType: credential.userType,
//         rejectedAt: credential.rejectedAt,
//         rejectionReason: reason,
//         rejectedBy: req.admin.userName,
//         verificationAttempts: verificationAttempts,
//         canReapply: canReapply,
//         isBlocked: credential.isBlocked || false,
//         message: canReapply
//           ? "Client can update their information and reapply for verification"
//           : "Client is blocked and cannot reapply",
//       },
//     });
//   } catch (error) {
//     await session.abortTransaction();
//     console.error("Reject client verification error:", error);
//     res.status(500).json({
//       success: false,
//       message: "Internal server error",
//     });
//   } finally {
//     session.endSession();
//   }
// });

// ==================== GENERAL OPERATIONS ====================

// Block User (Works for both workers and clients)
router.patch("/block/:id", verifyAdmin, blockUser);

// Unblock User (Works for both workers and clients)
router.patch("/unblock/:id", verifyAdmin, unblockUser);

// Get Verification Statistics
router.get("/stats", verifyAdmin, getVerificationStats);

module.exports = router;
