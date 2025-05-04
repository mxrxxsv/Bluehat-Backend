const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");

const Job = require("../models/Job");
const verifyToken = require("../middleware/verifyToken");

// Create a job (only authenticated clients)
router.post("/", verifyToken, async (req, res) => {
  try {
    const { clientId, jobTitle, description, price, location, category, tags } =
      req.body;

    if (req.user.userId.toString() !== clientId.toString()) {
      return res.status(403).json({ success: false, message: "Forbidden" });
    }

    const job = new Job({
      clientId,
      jobTitle,
      description,
      price,
      location,
      category,
      tags,
    });

    const saved = await job.save();
    res.status(201).json({ success: true, data: saved });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// Get all jobs (public, only verified/not deleted) with pagination & filtering
router.get("/", async (req, res) => {
  try {
    const { page = 1, limit = 10, category, tag } = req.query;
    const filter = { isVerified: true, isDeleted: false };

    if (category) filter.category = category;
    if (tag) filter.tags = tag;

    const jobs = await Job.find(filter)
      .skip((page - 1) * limit)
      .limit(Number(limit));

    res.status(200).json({ success: true, data: jobs });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Get single job by ID and increment views
router.get("/:id", async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid job ID" });
    }

    const job = await Job.findOneAndUpdate(
      { _id: req.params.id, isDeleted: false },
      { $inc: { views: 1 } },
      { new: true }
    );

    if (!job) {
      return res.status(404).json({ success: false, message: "Job not found" });
    }

    res.status(200).json({ success: true, data: job });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Update a job (only owner or admin)
router.put("/:id", verifyToken, async (req, res) => {
  try {
    const job = await Job.findById(req.params.id);
    if (!job || job.isDeleted) {
      return res.status(404).json({ success: false, message: "Job not found" });
    }

    if (
      req.user.userId.toString() !== job.clientId.toString() &&
      req.user.role !== "admin"
    ) {
      return res.status(403).json({ success: false, message: "Forbidden" });
    }

    const allowedFields = [
      "jobTitle",
      "description",
      "price",
      "location",
      "category",
      "tags",
    ];
    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        job[field] = req.body[field];
      }
    });

    const updated = await job.save();
    res.status(200).json({ success: true, data: updated });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// Soft delete a job (only owner or admin)
router.delete("/:id", verifyToken, async (req, res) => {
  try {
    const job = await Job.findById(req.params.id);
    if (!job || job.isDeleted) {
      return res.status(404).json({ success: false, message: "Job not found" });
    }

    if (
      req.user.userId.toString() !== job.clientId.toString() &&
      req.user.role !== "admin"
    ) {
      return res.status(403).json({ success: false, message: "Forbidden" });
    }

    job.isDeleted = true;
    await job.save();

    res
      .status(200)
      .json({ success: true, message: "Job deleted successfully" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Admin: verify a job
router.patch("/:id/verify", verifyToken, async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ success: false, message: "Forbidden" });
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
