const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");

const Job = require("../models/Job");
const verifyToken = require("../middleware/verifyToken");

//controller
const {
  getAllJobs,
  getJobById,
  postJob,
  updateJob,
  deleteJob,
  getJobApplications,
  respondToApplication,
} = require("../controllers/job.controller");

const { authLimiter } = require("../utils/rateLimit");

// Get all jobs (public, only verified/not deleted) with pagination & filtering
router.get("/", getAllJobs);

// Get single job by ID and increment views
router.get("/:id", getJobById);

// Create a job (only authenticated clients)
router.post("/", authLimiter, verifyToken, postJob);

// Update a job (only owner)
router.put("/:id", authLimiter, verifyToken, updateJob);

// Soft delete a job (only owner or admin)
router.delete("/:id", authLimiter, verifyToken, deleteJob);

// Get applications for a specific job (Client only)
router.get("/:jobId/applications", verifyToken, getJobApplications);

// Respond to job application (Accept/Reject)
router.patch(
  "/applications/:applicationId/respond",
  authLimiter,
  verifyToken,
  respondToApplication
);

// Admin: verify a job
router.patch("/:id/verify", authLimiter, verifyToken, async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ success: false, message: "Forbidden" });
    }

    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid job ID" });
    }

    const job = await Job.findById(req.params.id);
    if (!job || job.isDeleted) {
      return res.status(404).json({ success: false, message: "Job not found" });
    }

    if (job.isVerified) {
      return res
        .status(200)
        .json({ success: true, message: "Job already verified", data: job });
    }

    job.isVerified = true;
    await job.save();

    res
      .status(200)
      .json({ success: true, message: "Job verified successfully", data: job });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
