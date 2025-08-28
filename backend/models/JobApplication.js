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
      minLength: [20, "Cover letter must be at least 20 characters"],
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
        values: ["pending", "accepted", "rejected"],
        message: "Status must be pending, accepted, rejected",
      },
      default: "pending",
      index: true,
    },
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
  }
);

module.exports = mongoose.model("JobApplication", jobApplicationSchema);
