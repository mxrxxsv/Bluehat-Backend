const mongoose = require("mongoose");

const jobApplicationSchema = new mongoose.Schema(
  {
    jobId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Job",
      required: [true, "Job ID is required"],
      index: true,
    },
    workerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Worker",
      required: [true, "Worker ID is required"],
      index: true,
    },
    credentialId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Credential",
      required: [true, "Credential ID is required"],
      index: true,
    },
    clientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Client",
      required: [true, "Client ID is required"],
      index: true,
    },
    coverLetter: {
      type: String,
      required: [true, "Cover letter is required"],
      trim: true,
      minLength: [50, "Cover letter must be at least 50 characters"],
      maxLength: [2000, "Cover letter cannot exceed 2000 characters"],
    },
    proposedPrice: {
      type: Number,
      required: [true, "Proposed price is required"],
      min: [0, "Price cannot be negative"],
      max: [1000000, "Price cannot exceed 1,000,000"],
    },
    estimatedDuration: {
      value: {
        type: Number,
        required: [true, "Duration value is required"],
        min: [1, "Duration must be at least 1"],
        max: [365, "Duration cannot exceed 365"],
      },
      unit: {
        type: String,
        required: [true, "Duration unit is required"],
        enum: {
          values: ["hours", "days", "weeks", "months"],
          message: "Duration unit must be hours, days, weeks, or months",
        },
      },
    },
    status: {
      type: String,
      enum: {
        values: ["pending", "accepted", "rejected", "withdrawn"],
        message: "Status must be pending, accepted, rejected, or withdrawn",
      },
      default: "pending",
      index: true,
    },
    attachments: [
      {
        filename: {
          type: String,
          required: true,
        },
        url: {
          type: String,
          required: true,
        },
        fileType: {
          type: String,
          required: true,
        },
        size: {
          type: Number,
          required: true,
        },
      },
    ],
    // Worker skills relevant to this job
    relevantSkills: [
      {
        type: String,
        trim: true,
        maxLength: [50, "Skill name cannot exceed 50 characters"],
      },
    ],
    // Previous work experience related to this job
    relevantExperience: {
      type: String,
      trim: true,
      maxLength: [1000, "Experience description cannot exceed 1000 characters"],
    },
    // Application metadata
    appliedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    viewedByClient: {
      type: Boolean,
      default: false,
    },
    viewedAt: {
      type: Date,
    },
    // Response from client
    clientResponse: {
      message: {
        type: String,
        trim: true,
        maxLength: [1000, "Response message cannot exceed 1000 characters"],
      },
      respondedAt: {
        type: Date,
      },
      respondedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Client",
      },
    },
    // Withdrawal information
    withdrawnAt: {
      type: Date,
    },
    withdrawalReason: {
      type: String,
      trim: true,
      maxLength: [500, "Withdrawal reason cannot exceed 500 characters"],
    },
    // Tracking and analytics
    isDeleted: {
      type: Boolean,
      default: false,
      index: true,
    },
    deletedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
    // Compound indexes for better query performance
    indexes: [
      { jobId: 1, workerId: 1 }, // Prevent duplicate applications
      { jobId: 1, status: 1 },
      { workerId: 1, status: 1 },
      { clientId: 1, status: 1 },
      { appliedAt: -1 },
    ],
  }
);

// Compound unique index to prevent duplicate applications
jobApplicationSchema.index(
  { jobId: 1, workerId: 1 },
  {
    unique: true,
    partialFilterExpression: {
      isDeleted: false,
      status: { $ne: "withdrawn" },
    },
  }
);

// Virtual for application age
jobApplicationSchema.virtual("applicationAge").get(function () {
  const now = new Date();
  const applied = this.appliedAt;
  const diffTime = Math.abs(now - applied);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
});

// Method to check if application can be withdrawn
jobApplicationSchema.methods.canWithdraw = function () {
  return this.status === "pending" && !this.isDeleted;
};

// Method to check if application can be updated
jobApplicationSchema.methods.canUpdate = function () {
  return this.status === "pending" && !this.isDeleted;
};

// Static method to get application stats for a worker
jobApplicationSchema.statics.getWorkerStats = function (workerId) {
  return this.aggregate([
    {
      $match: { workerId: mongoose.Types.ObjectId(workerId), isDeleted: false },
    },
    {
      $group: {
        _id: "$status",
        count: { $sum: 1 },
      },
    },
  ]);
};

// Static method to get application stats for a job
jobApplicationSchema.statics.getJobStats = function (jobId) {
  return this.aggregate([
    { $match: { jobId: mongoose.Types.ObjectId(jobId), isDeleted: false } },
    {
      $group: {
        _id: null,
        totalApplications: { $sum: 1 },
        pendingApplications: {
          $sum: { $cond: [{ $eq: ["$status", "pending"] }, 1, 0] },
        },
        acceptedApplications: {
          $sum: { $cond: [{ $eq: ["$status", "accepted"] }, 1, 0] },
        },
        rejectedApplications: {
          $sum: { $cond: [{ $eq: ["$status", "rejected"] }, 1, 0] },
        },
        avgProposedPrice: { $avg: "$proposedPrice" },
        minProposedPrice: { $min: "$proposedPrice" },
        maxProposedPrice: { $max: "$proposedPrice" },
      },
    },
  ]);
};

module.exports = mongoose.model("JobApplication", jobApplicationSchema);
