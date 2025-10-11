const mongoose = require("mongoose");

const jobApplicationSchema = new mongoose.Schema(
  {
    jobId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Job",
      required: true,
      index: true,
    },
    workerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Worker",
      required: true,
      index: true,
    },
    clientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Client",
      required: true,
      index: true,
    },
    applicationStatus: {
      type: String,
      enum: [
        "pending",
        "in_discussion",
        "client_agreed",
        "worker_agreed",
        "both_agreed",
        "accepted",
        "rejected",
        "withdrawn",
      ],
      default: "pending",
      index: true,
    },
    // New fields for messaging agreement flow
    clientAgreed: {
      type: Boolean,
      default: false,
    },
    workerAgreed: {
      type: Boolean,
      default: false,
    },
    discussionStartedAt: {
      type: Date,
      default: null,
    },
    agreementCompletedAt: {
      type: Date,
      default: null,
    },
    proposedRate: {
      type: Number,
      required: true,
      min: [0, "Proposed rate cannot be negative"],
      max: [1000000, "Proposed rate cannot exceed 1,000,000"],
    },
    message: {
      type: String,
      required: true,
      trim: true,
      minlength: [10, "Message must be at least 10 characters"],
      maxlength: [1000, "Message cannot exceed 1000 characters"],
    },
    appliedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    respondedAt: {
      type: Date,
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
jobApplicationSchema.index({ jobId: 1, workerId: 1 }, { unique: true }); // Prevent duplicate applications
jobApplicationSchema.index({ clientId: 1, applicationStatus: 1 });
jobApplicationSchema.index({ workerId: 1, applicationStatus: 1 });
jobApplicationSchema.index({ appliedAt: -1 });

// Pre-save middleware for validation
jobApplicationSchema.pre("save", function (next) {
  if (this.applicationStatus !== "pending" && !this.respondedAt) {
    this.respondedAt = new Date();
  }
  next();
});

// Instance methods
jobApplicationSchema.methods.toSafeObject = function () {
  const obj = this.toObject();
  delete obj.applicantIP;
  delete obj.__v;
  return obj;
};

module.exports = mongoose.model("JobApplication", jobApplicationSchema);
