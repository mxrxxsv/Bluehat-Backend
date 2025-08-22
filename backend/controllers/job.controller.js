const mongoSanitize = require("mongo-sanitize");
const mongoose = require("mongoose");

const SkillCategory = require("../models/SkillCategory");
const Job = require("../models/Job");
const Client = require("../models/Client");
const JobApplication = require("../models/JobApplication");

// Get all jobs (public, only verified/not deleted) with pagination & filtering
const getAllJobs = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(mongoSanitize(req.query.page) || 1));
    const limit = Math.max(
      1,
      Math.min(100, parseInt(mongoSanitize(req.query.limit) || 10))
    );
    const category = mongoSanitize(req.query.category);
    const tag = mongoSanitize(req.query.tag);

    const filter = { isVerified: true, isDeleted: false };
    if (category && mongoose.Types.ObjectId.isValid(category))
      filter.category = category;
    if (tag) filter.tags = tag;

    const jobs = await Job.find(filter)
      .populate("category", "categoryName")
      .skip((page - 1) * limit)
      .limit(Number(limit));

    res.status(200).json({ success: true, data: jobs });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Get single job by ID and increment views
const getJobById = async (req, res) => {
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
    ).populate("category", "categoryName");

    if (!job) {
      return res.status(404).json({ success: false, message: "Job not found" });
    }

    res.status(200).json({ success: true, data: job });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Create a job (only authenticated clients)
const postJob = async (req, res) => {
  try {
    // Sanitize input
    const clientId = mongoSanitize(req.body.clientId);
    const jobTitle = mongoSanitize(req.body.jobTitle);
    const description = mongoSanitize(req.body.description);
    const price = Number(req.body.price);
    const location = mongoSanitize(req.body.location);
    const category = mongoSanitize(req.body.category);
    const tags = Array.isArray(req.body.tags)
      ? [...new Set(req.body.tags.map((tag) => mongoSanitize(tag).trim()))]
      : [];

    if (!req.user || !req.user.id) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }
    if (!clientId) {
      return res
        .status(400)
        .json({ success: false, message: "Client ID is required" });
    }

    if (req.user.id.toString() !== clientId.toString()) {
      return res.status(403).json({ success: false, message: "Forbidden" });
    }

    // Validate category as ObjectId and existence
    if (!mongoose.Types.ObjectId.isValid(category)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid category." });
    }
    const categoryExists = await SkillCategory.findById(category);
    if (!categoryExists) {
      return res
        .status(400)
        .json({ success: false, message: "Category does not exist." });
    }

    const clientExists = await Client.findOne({ credentialId: clientId });
    if (!clientExists) {
      return res
        .status(400)
        .json({ success: false, message: "Client does not exist." });
    }

    if (isNaN(price) || price < 0 || price > 1000000) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid price." });
    }
    if (tags.length > 10) {
      return res
        .status(400)
        .json({ success: false, message: "No more than 10 tags allowed." });
    }
    if (tags.some((tag) => tag.length > 30)) {
      return res.status(400).json({
        success: false,
        message: "Each tag must be 30 characters or less.",
      });
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
};

// Update a job (only owner or admin)
const updateJob = async (req, res) => {
  try {
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
      return res.status(403).json({
        success: false,
        message: "Cannot edit a job that has already been verified by admin.",
      });
    }

    if (req.user.id.toString() !== job.clientId.toString()) {
      return res.status(403).json({
        success: false,
        message: "Only the job owner can update this job.",
      });
    }

    const allowedFields = [
      "jobTitle",
      "description",
      "price",
      "location",
      "category",
      "tags",
    ];
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        if (field === "tags" && Array.isArray(req.body.tags)) {
          job.tags = [
            ...new Set(req.body.tags.map((tag) => mongoSanitize(tag).trim())),
          ];
        } else if (field === "price") {
          job.price = Number(req.body.price);
        } else if (field === "category") {
          const newCategory = mongoSanitize(req.body.category);
          if (!mongoose.Types.ObjectId.isValid(newCategory)) {
            return res
              .status(400)
              .json({ success: false, message: "Invalid category." });
          }
          const categoryExists = await SkillCategory.findById(newCategory);
          if (!categoryExists) {
            return res
              .status(400)
              .json({ success: false, message: "Category does not exist." });
          }
          job.category = newCategory;
        } else {
          job[field] = mongoSanitize(req.body[field]);
        }
      }
    }

    const updated = await job.save();
    res.status(200).json({ success: true, data: updated });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// Soft delete a job (only owner or admin)
const deleteJob = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid job ID" });
    }

    const job = await Job.findById(req.params.id);
    if (!job || job.isDeleted) {
      return res.status(404).json({ success: false, message: "Job not found" });
    }

    if (
      req.user.id.toString() !== job.clientId.toString() &&
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
};

// Get applications for a specific job (Client only)
const getJobApplications = async (req, res) => {
  try {
    const { jobId } = req.params;
    const {
      status,
      page = 1,
      limit = 10,
      sortBy = "appliedAt",
      order = "desc",
    } = req.query;

    if (!mongoose.Types.ObjectId.isValid(jobId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid job ID",
      });
    }

    if (!req.user || req.user.userType !== "client") {
      return res.status(401).json({
        success: false,
        message: "Only clients can view job applications",
      });
    }

    // Verify job ownership
    const job = await Job.findOne({
      _id: jobId,
      clientId: req.user.id,
      isDeleted: false,
    });

    if (!job) {
      return res.status(404).json({
        success: false,
        message: "Job not found or access denied",
      });
    }

    // Build filter
    const filter = {
      jobId,
      isDeleted: false,
    };

    if (status && ["pending", "accepted", "rejected"].includes(status)) {
      filter.status = status;
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const sortOrder = order === "asc" ? 1 : -1;

    const applications = await JobApplication.find(filter)
      .populate({
        path: "workerId",
        select:
          "firstName lastName profilePicture skills rating totalRatings portfolio",
      })
      .sort({ [mongoSanitize(sortBy)]: sortOrder })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await JobApplication.countDocuments(filter);
    const totalPages = Math.ceil(total / parseInt(limit));

    // Get application statistics for this job
    const jobStats = await JobApplication.getJobStats(jobId);

    res.status(200).json({
      success: true,
      message: "Job applications retrieved successfully",
      data: {
        job: {
          id: job._id,
          title: job.jobTitle,
          price: job.price,
        },
        applications,
        pagination: {
          currentPage: parseInt(page),
          totalPages,
          totalItems: total,
          itemsPerPage: parseInt(limit),
          hasNextPage: parseInt(page) < totalPages,
          hasPrevPage: parseInt(page) > 1,
        },
        statistics: jobStats[0] || {
          totalApplications: 0,
          pendingApplications: 0,
          acceptedApplications: 0,
          rejectedApplications: 0,
        },
      },
    });
  } catch (error) {
    console.error("Get job applications error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve job applications",
      error: process.env.NODE_ENV === "production" ? undefined : error.message,
    });
  }
};

// Respond to job application (Accept/Reject)
const respondToApplication = async (req, res) => {
  try {
    const { applicationId } = req.params;
    const { action, message = "" } = req.body;

    if (!mongoose.Types.ObjectId.isValid(applicationId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid application ID",
      });
    }

    if (!req.user || req.user.userType !== "client") {
      return res.status(401).json({
        success: false,
        message: "Only clients can respond to applications",
      });
    }

    if (!["accept", "reject"].includes(action)) {
      return res.status(400).json({
        success: false,
        message: "Action must be 'accept' or 'reject'",
      });
    }

    const application = await JobApplication.findById(applicationId)
      .populate("jobId")
      .populate("workerId");

    if (!application || application.isDeleted) {
      return res.status(404).json({
        success: false,
        message: "Application not found",
      });
    }

    // Verify job ownership
    if (application.jobId.clientId.toString() !== req.user.id.toString()) {
      return res.status(403).json({
        success: false,
        message: "Access denied",
      });
    }

    if (application.status !== "pending") {
      return res.status(400).json({
        success: false,
        message: "This application has already been responded to",
      });
    }

    // Update application status
    application.status = action === "accept" ? "accepted" : "rejected";
    application.clientResponse = {
      message: escape(message.trim()),
      respondedAt: new Date(),
      respondedBy: req.user.id,
    };

    await application.save();

    res.status(200).json({
      success: true,
      message: `Application ${
        action === "accept" ? "accepted" : "rejected"
      } successfully`,
      data: {
        applicationId: application._id,
        status: application.status,
        workerName: `${application.workerId.firstName} ${application.workerId.lastName}`,
        respondedAt: application.clientResponse.respondedAt,
      },
    });
  } catch (error) {
    console.error("Respond to application error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to respond to application",
      error: process.env.NODE_ENV === "production" ? undefined : error.message,
    });
  }
};

module.exports = {
  getAllJobs,
  getJobById,
  postJob,
  updateJob,
  deleteJob,
  getJobApplications,
  respondToApplication,
};
