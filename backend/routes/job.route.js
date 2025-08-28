const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");

const Job = require("../models/Job");
const verifyToken = require("../middleware/verifyToken");
const verifyAdmin = require("../middleware/verifyAdmin");

//controller
const {
  getAllJobs,
  getJobsByCategory,
  getJobsByLocation,
  getJobById,
  postJob,
  updateJob,
  deleteJob,
} = require("../controllers/job.controller");

const { authLimiter } = require("../utils/rateLimit");

// ==================== PUBLIC ROUTES ====================

// Get all jobs (public, only verified/not deleted) with pagination & filtering
router.get("/", getAllJobs);

// Get jobs by category
router.get("/category/:categoryId", getJobsByCategory);

// Get jobs by location
router.get("/location/:location", getJobsByLocation);

// Get single job by ID
router.get("/:id", getJobById);

// ==================== AUTHENTICATED CLIENT ROUTES ====================

// Create a job (only authenticated clients)
router.post("/", authLimiter, verifyToken, postJob);

// Update a job (only owner)
router.put("/:id", authLimiter, verifyToken, updateJob);

// Soft delete a job (only owner)
router.delete("/:id", authLimiter, verifyToken, deleteJob);

// ==================== ADMIN ROUTES ====================

// Admin: verify a job
router.patch("/:id/verify", authLimiter, verifyAdmin, async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid job ID",
      });
    }

    const job = await Job.findById(req.params.id)
      .populate("category", "categoryName")
      .populate({
        path: "clientId",
        select: "firstName lastName",
        populate: {
          path: "credentialId",
          select: "email",
        },
      });

    if (!job || job.isDeleted) {
      return res.status(404).json({
        success: false,
        message: "Job not found",
      });
    }

    if (job.isVerified) {
      return res.status(200).json({
        success: true,
        message: "Job already verified",
        data: job,
      });
    }

    // Update job verification
    job.isVerified = true;
    job.verifiedAt = new Date();
    job.verifiedBy = req.admin._id;

    await job.save();

    res.status(200).json({
      success: true,
      message: "Job verified successfully",
      data: {
        jobId: job._id,
        description: job.description.substring(0, 100) + "...",
        price: job.price,
        location: job.location,
        category: job.category.categoryName,
        client: job.clientId
          ? `${job.clientId.firstName} ${job.clientId.lastName}`
          : "Unknown",
        verifiedAt: job.verifiedAt,
        verifiedBy: req.admin.userName || req.admin.firstName,
      },
    });
  } catch (err) {
    console.error("Verify job error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to verify job",
      error: process.env.NODE_ENV === "production" ? undefined : err.message,
    });
  }
});

// Admin: reject a job
router.patch("/:id/reject", authLimiter, verifyAdmin, async (req, res) => {
  try {
    const { reason } = req.body;

    if (!reason || reason.trim().length < 10) {
      return res.status(400).json({
        success: false,
        message: "Rejection reason must be at least 10 characters long",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid job ID",
      });
    }

    const job = await Job.findById(req.params.id)
      .populate("category", "categoryName")
      .populate({
        path: "clientId",
        select: "firstName lastName",
        populate: {
          path: "credentialId",
          select: "email",
        },
      });

    if (!job || job.isDeleted) {
      return res.status(404).json({
        success: false,
        message: "Job not found",
      });
    }

    if (job.isVerified) {
      return res.status(400).json({
        success: false,
        message: "Cannot reject an already verified job",
      });
    }

    // Soft delete the job and add rejection info
    job.isDeleted = true;
    job.deletedAt = new Date();
    job.rejectedBy = req.admin._id;
    job.rejectionReason = reason.trim();

    await job.save();

    res.status(200).json({
      success: true,
      message: "Job rejected successfully",
      data: {
        jobId: job._id,
        description: job.description.substring(0, 100) + "...",
        client: job.clientId
          ? `${job.clientId.firstName} ${job.clientId.lastName}`
          : "Unknown",
        rejectionReason: reason,
        rejectedAt: job.deletedAt,
        rejectedBy: req.admin.userName || req.admin.firstName,
      },
    });
  } catch (err) {
    console.error("Reject job error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to reject job",
      error: process.env.NODE_ENV === "production" ? undefined : err.message,
    });
  }
});

// Admin: get pending jobs for verification
router.get("/admin/pending", authLimiter, verifyAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;

    const pendingJobs = await Job.find({
      isVerified: false,
      isDeleted: false,
    })
      .populate("category", "categoryName")
      .populate({
        path: "clientId",
        select: "firstName lastName profilePicture",
        populate: {
          path: "credentialId",
          select: "email",
        },
      })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const totalCount = await Job.countDocuments({
      isVerified: false,
      isDeleted: false,
    });

    res.status(200).json({
      success: true,
      message: "Pending jobs retrieved successfully",
      data: {
        jobs: pendingJobs,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(totalCount / parseInt(limit)),
          totalItems: totalCount,
          itemsPerPage: parseInt(limit),
          hasNextPage: parseInt(page) < Math.ceil(totalCount / parseInt(limit)),
          hasPrevPage: parseInt(page) > 1,
        },
      },
    });
  } catch (err) {
    console.error("Get pending jobs error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve pending jobs",
      error: process.env.NODE_ENV === "production" ? undefined : err.message,
    });
  }
});

// Admin: get job statistics
router.get("/admin/stats", authLimiter, verifyAdmin, async (req, res) => {
  try {
    const { period = "30" } = req.query;
    const daysAgo = new Date();
    daysAgo.setDate(daysAgo.getDate() - parseInt(period));

    const [totalStats, recentStats, categoryStats] = await Promise.all([
      // Total job statistics
      Job.aggregate([
        {
          $group: {
            _id: null,
            totalJobs: { $sum: 1 },
            verifiedJobs: {
              $sum: { $cond: [{ $eq: ["$isVerified", true] }, 1, 0] },
            },
            pendingJobs: {
              $sum: {
                $cond: [
                  {
                    $and: [
                      { $eq: ["$isVerified", false] },
                      { $eq: ["$isDeleted", false] },
                    ],
                  },
                  1,
                  0,
                ],
              },
            },
            deletedJobs: {
              $sum: { $cond: [{ $eq: ["$isDeleted", true] }, 1, 0] },
            },
          },
        },
      ]),

      // Recent job statistics
      Job.aggregate([
        {
          $match: {
            createdAt: { $gte: daysAgo },
          },
        },
        {
          $group: {
            _id: null,
            recentJobs: { $sum: 1 },
            recentVerified: {
              $sum: { $cond: [{ $eq: ["$isVerified", true] }, 1, 0] },
            },
          },
        },
      ]),

      // Jobs by category
      Job.aggregate([
        {
          $match: {
            isDeleted: false,
          },
        },
        {
          $lookup: {
            from: "skillcategories",
            localField: "category",
            foreignField: "_id",
            as: "categoryInfo",
          },
        },
        {
          $group: {
            _id: "$category",
            categoryName: {
              $first: { $arrayElemAt: ["$categoryInfo.categoryName", 0] },
            },
            count: { $sum: 1 },
          },
        },
        { $sort: { count: -1 } },
        { $limit: 10 },
      ]),
    ]);

    res.status(200).json({
      success: true,
      message: "Job statistics retrieved successfully",
      data: {
        period: `${period} days`,
        total: totalStats[0] || {
          totalJobs: 0,
          verifiedJobs: 0,
          pendingJobs: 0,
          deletedJobs: 0,
        },
        recent: recentStats[0] || {
          recentJobs: 0,
          recentVerified: 0,
        },
        topCategories: categoryStats,
      },
    });
  } catch (err) {
    console.error("Get job stats error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve job statistics",
      error: process.env.NODE_ENV === "production" ? undefined : err.message,
    });
  }
});

module.exports = router;
