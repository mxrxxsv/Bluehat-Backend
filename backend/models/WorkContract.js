const mongoose = require("mongoose");

const workContractSchema = new mongoose.Schema(
  {
    clientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Client",
      required: true,
      index: true,
    },
    workerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Worker",
      required: true,
      index: true,
    },
    jobId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Job",
      default: null,
      index: true,
    },
    contractType: {
      type: String,
      enum: ["job_application", "direct_invitation"],
      required: true,
      index: true,
    },

    // Contract details
    agreedRate: {
      type: Number,
      required: true,
      min: [0, "Agreed rate cannot be negative"],
      max: [1000000, "Agreed rate cannot exceed 1,000,000"],
    },
    description: {
      type: String,
      required: true,
      trim: true,
      minlength: [20, "Description must be at least 20 characters"],
      maxlength: [2000, "Description cannot exceed 2000 characters"],
    },
    startDate: {
      type: Date,
      default: null,
    },
    expectedEndDate: {
      type: Date,
      default: null,
    },
    actualEndDate: {
      type: Date,
      default: null,
    },

    // Status tracking
    contractStatus: {
      type: String,
      enum: ["active", "in_progress", "completed", "cancelled", "disputed"],
      default: "active",
      index: true,
    },

    // Completion & feedback
    completedAt: {
      type: Date,
      default: null,
    },
    clientRating: {
      type: Number,
      min: [1, "Rating must be between 1 and 5"],
      max: [5, "Rating must be between 1 and 5"],
      default: null,
    },
    clientFeedback: {
      type: String,
      trim: true,
      maxlength: [1000, "Feedback cannot exceed 1000 characters"],
      default: null,
    },
    workerRating: {
      type: Number,
      min: [1, "Rating must be between 1 and 5"],
      max: [5, "Rating must be between 1 and 5"],
      default: null,
    },
    workerFeedback: {
      type: String,
      trim: true,
      maxlength: [1000, "Feedback cannot exceed 1000 characters"],
      default: null,
    },

    // References to source
    applicationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "JobApplication",
      default: null,
    },
    invitationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "WorkerInvitation",
      default: null,
    },
    isDeleted: {
      type: Boolean,
      default: false,
      index: true,
    },
    deletedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes for efficient queries
workContractSchema.index({ clientId: 1, contractStatus: 1 });
workContractSchema.index({ workerId: 1, contractStatus: 1 });
workContractSchema.index({ createdAt: -1 });
workContractSchema.index({ completedAt: -1 });

// Pre-save middleware
workContractSchema.pre("save", function (next) {
  // Auto-set completion date
  if (this.contractStatus === "completed" && !this.completedAt) {
    this.completedAt = new Date();
    this.actualEndDate = new Date();
  }

  // Calculate total amount if rate and completion
  if (this.contractStatus === "completed" && !this.totalAmount) {
    this.totalAmount = this.agreedRate;
  }

  next();
});

// Instance methods
workContractSchema.methods.canBeRated = function () {
  return this.contractStatus === "completed";
};

workContractSchema.methods.isActive = function () {
  return ["active", "in_progress"].includes(this.contractStatus);
};

workContractSchema.methods.toSafeObject = function () {
  const obj = this.toObject();
  delete obj.createdIP;
  delete obj.__v;
  return obj;
};

// Virtual for contract duration
workContractSchema.virtual("duration").get(function () {
  if (this.startDate && this.actualEndDate) {
    return Math.ceil(
      (this.actualEndDate - this.startDate) / (1000 * 60 * 60 * 24)
    );
  }
  return null;
});

// Static methods
workContractSchema.statics.getClientStats = async function (clientId) {
  return this.aggregate([
    { $match: { clientId: new mongoose.Types.ObjectId(clientId) } },
    {
      $group: {
        _id: null,
        totalContracts: { $sum: 1 },
        completedContracts: {
          $sum: { $cond: [{ $eq: ["$contractStatus", "completed"] }, 1, 0] },
        },
        averageRating: { $avg: "$clientRating" },
        totalSpent: { $sum: "$totalAmount" },
      },
    },
  ]);
};

workContractSchema.statics.getWorkerStats = async function (workerId) {
  return this.aggregate([
    { $match: { workerId: new mongoose.Types.ObjectId(workerId) } },
    {
      $group: {
        _id: null,
        totalContracts: { $sum: 1 },
        completedContracts: {
          $sum: { $cond: [{ $eq: ["$contractStatus", "completed"] }, 1, 0] },
        },
        averageRating: { $avg: "$workerRating" },
        totalEarned: { $sum: "$totalAmount" },
      },
    },
  ]);
};

module.exports = mongoose.model("WorkContract", workContractSchema);
