const mongoose = require("mongoose");

const directHiringSchema = new mongoose.Schema(
  {
    clientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Client",
      required: [true, "Client ID is required"],
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
      required: [true, "Worker credential ID is required"],
      index: true,
    },
    clientCredentialId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Credential",
      required: [true, "Client credential ID is required"],
      index: true,
    },
    projectTitle: {
      type: String,
      required: [true, "Project title is required"],
      trim: true,
      minLength: [5, "Project title must be at least 5 characters"],
      maxLength: [100, "Project title cannot exceed 100 characters"],
    },
    projectDescription: {
      type: String,
      required: [true, "Project description is required"],
      trim: true,
      minLength: [20, "Project description must be at least 20 characters"],
      maxLength: [2000, "Project description cannot exceed 2000 characters"],
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
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SkillCategory",
      required: [true, "Category is required"],
    },
    location: {
      type: String,
      required: [true, "Location is required"],
      trim: true,
      maxLength: [200, "Location cannot exceed 200 characters"],
    },
    urgency: {
      type: String,
      enum: {
        values: ["low", "medium", "high", "urgent"],
        message: "Urgency must be low, medium, high, or urgent",
      },
      default: "medium",
    },
    status: {
      type: String,
      enum: {
        values: ["pending", "accepted", "rejected", "cancelled", "completed"],
        message:
          "Status must be pending, accepted, rejected, cancelled, or completed",
      },
      default: "pending",
      index: true,
    },
    clientMessage: {
      type: String,
      trim: true,
      maxLength: [1000, "Client message cannot exceed 1000 characters"],
    },
    workerResponse: {
      type: String,
      trim: true,
      maxLength: [1000, "Worker response cannot exceed 1000 characters"],
    },
    sentAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    viewedByWorker: {
      type: Boolean,
      default: false,
    },
    viewedAt: {
      type: Date,
    },
    respondedAt: {
      type: Date,
    },
    expiresAt: {
      type: Date,
      default: function () {
        return new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days from now
      },
      index: true,
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

// Compound index to prevent duplicate requests
directHiringSchema.index({ clientId: 1, workerId: 1, status: 1 });

// Index for expiration cleanup
directHiringSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model("DirectHiring", directHiringSchema);
