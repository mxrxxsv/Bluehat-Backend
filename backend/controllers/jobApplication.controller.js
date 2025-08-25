const mongoSanitize = require("mongo-sanitize");
const mongoose = require("mongoose");
const { escape } = require("validator");

const JobApplication = require("../models/JobApplication");
const Job = require("../models/Job");
const Worker = require("../models/Worker");
const Client = require("../models/Client");

// ==================== WORKER APPLICATIONS ====================

// Apply to a job (Verified workers only)
const applyToJob = async (req, res) => {
  try {
    const { jobId } = req.params;
    const {
      coverLetter,
      proposedPrice,
      estimatedDuration,
      relevantSkills = [],
      relevantExperience = "",
      attachments = [],
    } = req.body;

    // Validate job ID
    if (!mongoose.Types.ObjectId.isValid(jobId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid job ID",
      });
    }

    // Verify user is authenticated and is a worker
    if (!req.user || req.user.userType !== "worker") {
      return res.status(401).json({
        success: false,
        message: "Only workers can apply to jobs",
      });
    }

    // Find worker profile
    const worker = await Worker.findOne({ credentialId: req.user.id });
    if (!worker) {
      return res.status(404).json({
        success: false,
        message: "Worker profile not found",
      });
    }

    // Check if worker is verified
    if (!worker.isVerified) {
      return res.status(403).json({
        success: false,
        message: "Only verified workers can apply to jobs",
      });
    }

    // Find and validate job
    const job = await Job.findOne({
      _id: jobId,
      isDeleted: false,
      isVerified: true,
    }).populate("clientId");

    if (!job) {
      return res.status(404).json({
        success: false,
        message: "Job not found or not available for applications",
      });
    }

    // Prevent self-application (if worker is also the client)
    if (job.clientId.toString() === req.user.id.toString()) {
      return res.status(403).json({
        success: false,
        message: "You cannot apply to your own job posting",
      });
    }

    // Check for existing application
    const existingApplication = await JobApplication.findOne({
      jobId,
      workerId: worker._id,
      isDeleted: false,
      status: { $ne: "withdrawn" },
    });

    if (existingApplication) {
      return res.status(409).json({
        success: false,
        message: "You have already applied to this job",
      });
    }

    // Validate input data
    if (!coverLetter || coverLetter.trim().length < 50) {
      return res.status(400).json({
        success: false,
        message: "Cover letter must be at least 50 characters long",
      });
    }

    if (!proposedPrice || isNaN(proposedPrice) || proposedPrice < 0) {
      return res.status(400).json({
        success: false,
        message: "Valid proposed price is required",
      });
    }

    if (
      !estimatedDuration ||
      !estimatedDuration.value ||
      !estimatedDuration.unit
    ) {
      return res.status(400).json({
        success: false,
        message: "Estimated duration with value and unit is required",
      });
    }

    const validUnits = ["hours", "days", "weeks", "months"];
    if (!validUnits.includes(estimatedDuration.unit)) {
      return res.status(400).json({
        success: false,
        message: "Duration unit must be hours, days, weeks, or months",
      });
    }

    // Sanitize and validate skills
    const sanitizedSkills = Array.isArray(relevantSkills)
      ? relevantSkills
          .map((skill) => mongoSanitize(skill).trim())
          .filter((skill) => skill.length > 0)
      : [];

    if (sanitizedSkills.length > 10) {
      return res.status(400).json({
        success: false,
        message: "Maximum 10 relevant skills allowed",
      });
    }

    // Validate attachments
    const validAttachments = Array.isArray(attachments)
      ? attachments.filter((att) => att.url && att.filename && att.fileType)
      : [];

    if (validAttachments.length > 5) {
      return res.status(400).json({
        success: false,
        message: "Maximum 5 attachments allowed",
      });
    }

    // Create job application
    const jobApplication = new JobApplication({
      jobId,
      workerId: worker._id,
      credentialId: req.user.id,
      clientId: job.clientId,
      coverLetter: escape(coverLetter.trim()),
      proposedPrice: Number(proposedPrice),
      estimatedDuration: {
        value: Number(estimatedDuration.value),
        unit: estimatedDuration.unit,
      },
      relevantSkills: sanitizedSkills,
      relevantExperience: escape(relevantExperience.trim()),
      attachments: validAttachments,
    });

    await jobApplication.save();

    // Populate response data
    await jobApplication.populate([
      { path: "jobId", select: "jobTitle price location" },
      { path: "workerId", select: "firstName lastName profilePicture skills" },
    ]);

    res.status(201).json({
      success: true,
      message: "Job application submitted successfully",
      data: {
        applicationId: jobApplication._id,
        jobTitle: jobApplication.jobId.jobTitle,
        status: jobApplication.status,
        appliedAt: jobApplication.appliedAt,
        proposedPrice: jobApplication.proposedPrice,
        estimatedDuration: jobApplication.estimatedDuration,
      },
    });
  } catch (error) {
    console.error("Apply to job error:", error);

    // Handle duplicate key error
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "You have already applied to this job",
      });
    }

    res.status(500).json({
      success: false,
      message: "Failed to submit job application",
      error: process.env.NODE_ENV === "production" ? undefined : error.message,
    });
  }
};

// Get worker's job applications
const getWorkerApplications = async (req, res) => {
  try {
    const {
      status,
      page = 1,
      limit = 10,
      sortBy = "appliedAt",
      order = "desc",
    } = req.query;

    if (!req.user || req.user.userType !== "worker") {
      return res.status(401).json({
        success: false,
        message: "Access denied",
      });
    }

    const worker = await Worker.findOne({ credentialId: req.user.id });
    if (!worker) {
      return res.status(404).json({
        success: false,
        message: "Worker profile not found",
      });
    }

    // Build filter
    const filter = {
      workerId: worker._id,
      isDeleted: false,
    };

    if (
      status &&
      ["pending", "accepted", "rejected", "withdrawn"].includes(status)
    ) {
      filter.status = status;
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const sortOrder = order === "asc" ? 1 : -1;

    const applications = await JobApplication.find(filter)
      .populate({
        path: "jobId",
        select: "jobTitle description price location category tags createdAt",
        populate: {
          path: "category",
          select: "categoryName",
        },
      })
      .populate({
        path: "clientId",
        select: "firstName lastName profilePicture rating",
      })
      .sort({ [mongoSanitize(sortBy)]: sortOrder })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await JobApplication.countDocuments(filter);
    const totalPages = Math.ceil(total / parseInt(limit));

    // Get application statistics
    const stats = await JobApplication.getWorkerStats(worker._id);
    const applicationStats = stats.reduce((acc, stat) => {
      acc[stat._id] = stat.count;
      return acc;
    }, {});

    res.status(200).json({
      success: true,
      message: "Worker applications retrieved successfully",
      data: {
        applications,
        pagination: {
          currentPage: parseInt(page),
          totalPages,
          totalItems: total,
          itemsPerPage: parseInt(limit),
          hasNextPage: parseInt(page) < totalPages,
          hasPrevPage: parseInt(page) > 1,
        },
        statistics: {
          total: total,
          pending: applicationStats.pending || 0,
          accepted: applicationStats.accepted || 0,
          rejected: applicationStats.rejected || 0,
          withdrawn: applicationStats.withdrawn || 0,
        },
      },
    });
  } catch (error) {
    console.error("Get worker applications error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve applications",
      error: process.env.NODE_ENV === "production" ? undefined : error.message,
    });
  }
};

// Update job application (only pending applications)
const updateJobApplication = async (req, res) => {
  try {
    const { applicationId } = req.params;
    const {
      coverLetter,
      proposedPrice,
      estimatedDuration,
      relevantSkills,
      relevantExperience,
    } = req.body;

    if (!mongoose.Types.ObjectId.isValid(applicationId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid application ID",
      });
    }

    if (!req.user || req.user.userType !== "worker") {
      return res.status(401).json({
        success: false,
        message: "Access denied",
      });
    }

    const worker = await Worker.findOne({ credentialId: req.user.id });
    if (!worker) {
      return res.status(404).json({
        success: false,
        message: "Worker profile not found",
      });
    }

    const application = await JobApplication.findOne({
      _id: applicationId,
      workerId: worker._id,
      isDeleted: false,
    });

    if (!application) {
      return res.status(404).json({
        success: false,
        message: "Application not found",
      });
    }

    if (!application.canUpdate()) {
      return res.status(403).json({
        success: false,
        message: "This application cannot be updated",
      });
    }

    // Update fields if provided
    const updateData = {};

    if (coverLetter !== undefined) {
      if (coverLetter.trim().length < 50) {
        return res.status(400).json({
          success: false,
          message: "Cover letter must be at least 50 characters long",
        });
      }
      updateData.coverLetter = escape(coverLetter.trim());
    }

    if (proposedPrice !== undefined) {
      if (isNaN(proposedPrice) || proposedPrice < 0) {
        return res.status(400).json({
          success: false,
          message: "Valid proposed price is required",
        });
      }
      updateData.proposedPrice = Number(proposedPrice);
    }

    if (estimatedDuration !== undefined) {
      const validUnits = ["hours", "days", "weeks", "months"];
      if (
        !estimatedDuration.value ||
        !estimatedDuration.unit ||
        !validUnits.includes(estimatedDuration.unit)
      ) {
        return res.status(400).json({
          success: false,
          message: "Valid estimated duration with value and unit is required",
        });
      }
      updateData.estimatedDuration = {
        value: Number(estimatedDuration.value),
        unit: estimatedDuration.unit,
      };
    }

    if (relevantSkills !== undefined) {
      const sanitizedSkills = Array.isArray(relevantSkills)
        ? relevantSkills
            .map((skill) => mongoSanitize(skill).trim())
            .filter((skill) => skill.length > 0)
        : [];

      if (sanitizedSkills.length > 10) {
        return res.status(400).json({
          success: false,
          message: "Maximum 10 relevant skills allowed",
        });
      }
      updateData.relevantSkills = sanitizedSkills;
    }

    if (relevantExperience !== undefined) {
      updateData.relevantExperience = escape(relevantExperience.trim());
    }

    // Update the application
    const updatedApplication = await JobApplication.findByIdAndUpdate(
      applicationId,
      { $set: updateData },
      { new: true, runValidators: true }
    ).populate([
      { path: "jobId", select: "jobTitle price location" },
      { path: "workerId", select: "firstName lastName" },
    ]);

    res.status(200).json({
      success: true,
      message: "Application updated successfully",
      data: updatedApplication,
    });
  } catch (error) {
    console.error("Update job application error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update application",
      error: process.env.NODE_ENV === "production" ? undefined : error.message,
    });
  }
};

// Withdraw job application
const withdrawJobApplication = async (req, res) => {
  try {
    const { applicationId } = req.params;
    const { reason = "" } = req.body;

    if (!mongoose.Types.ObjectId.isValid(applicationId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid application ID",
      });
    }

    if (!req.user || req.user.userType !== "worker") {
      return res.status(401).json({
        success: false,
        message: "Access denied",
      });
    }

    const worker = await Worker.findOne({ credentialId: req.user.id });
    if (!worker) {
      return res.status(404).json({
        success: false,
        message: "Worker profile not found",
      });
    }

    const application = await JobApplication.findOne({
      _id: applicationId,
      workerId: worker._id,
      isDeleted: false,
    });

    if (!application) {
      return res.status(404).json({
        success: false,
        message: "Application not found",
      });
    }

    if (!application.canWithdraw()) {
      return res.status(403).json({
        success: false,
        message: "This application cannot be withdrawn",
      });
    }

    // Update application status
    application.status = "withdrawn";
    application.withdrawnAt = new Date();
    application.withdrawalReason = escape(reason.trim());

    await application.save();

    res.status(200).json({
      success: true,
      message: "Application withdrawn successfully",
      data: {
        applicationId: application._id,
        status: application.status,
        withdrawnAt: application.withdrawnAt,
      },
    });
  } catch (error) {
    console.error("Withdraw job application error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to withdraw application",
      error: process.env.NODE_ENV === "production" ? undefined : error.message,
    });
  }
};

// Get single application details
const getApplicationById = async (req, res) => {
  try {
    const { applicationId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(applicationId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid application ID",
      });
    }

    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    // Build filter based on user type
    let filter = { _id: applicationId, isDeleted: false };

    if (req.user.userType === "worker") {
      const worker = await Worker.findOne({ credentialId: req.user.id });
      if (!worker) {
        return res.status(404).json({
          success: false,
          message: "Worker profile not found",
        });
      }
      filter.workerId = worker._id;
    } else if (req.user.userType === "client") {
      const client = await Client.findOne({ credentialId: req.user.id });
      if (!client) {
        return res.status(404).json({
          success: false,
          message: "Client profile not found",
        });
      }
      filter.clientId = client._id;
    } else {
      return res.status(403).json({
        success: false,
        message: "Access denied",
      });
    }

    const application = await JobApplication.findOne(filter)
      .populate({
        path: "jobId",
        select: "jobTitle description price location category tags",
        populate: {
          path: "category",
          select: "categoryName",
        },
      })
      .populate({
        path: "workerId",
        select: "firstName lastName profilePicture skills rating totalRatings",
      })
      .populate({
        path: "clientId",
        select: "firstName lastName profilePicture rating totalRatings",
      });

    if (!application) {
      return res.status(404).json({
        success: false,
        message: "Application not found",
      });
    }

    // Mark as viewed by client if client is viewing
    if (req.user.userType === "client" && !application.viewedByClient) {
      application.viewedByClient = true;
      application.viewedAt = new Date();
      await application.save();
    }

    res.status(200).json({
      success: true,
      message: "Application details retrieved successfully",
      data: application,
    });
  } catch (error) {
    console.error("Get application by ID error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve application details",
      error: process.env.NODE_ENV === "production" ? undefined : error.message,
    });
  }
};

module.exports = {
  applyToJob,
  getWorkerApplications,
  updateJobApplication,
  withdrawJobApplication,
  getApplicationById,
};