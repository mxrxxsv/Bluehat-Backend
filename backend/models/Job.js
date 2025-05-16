const mongoose = require("mongoose");

const jobSchema = new mongoose.Schema(
  {
    clientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Client",
      required: true,
    },
    jobTitle: {
      type: String,
      required: true,
      trim: true,
      minlength: [5, "Job title too short"],
      maxlength: [100, "Job title too long"],
    },
    description: {
      type: String,
      required: true,
      trim: true,
      minlength: [20, "Description too short"],
      maxlength: [2000, "Description too long"],
    },
    price: {
      type: Number,
      required: true,
      min: [0, "Price must be positive"],
      max: [1000000, "Price is too high"],
    },
    location: {
      type: String,
      required: true,
      maxlength: 200,
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SkillCategory",
      required: true,
    },
    tags: {
      type: [String],
      validate: [
        {
          validator: function (arr) {
            return arr.length <= 10;
          },
          message: "No more than 10 tags allowed.",
        },
        {
          validator: function (arr) {
            return arr.every((tag) => tag.length <= 30);
          },
          message: "Each tag must be 30 characters or less.",
        },
      ],
    },
    status: {
      type: String,
      enum: ["open", "in_progress", "hired", "completed", "cancelled"],
      default: "open",
      required: true,
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
    views: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  { timestamps: true }
);

// Indexes for performance
jobSchema.index({ tags: 1 });
jobSchema.index({ location: "text", description: "text" });
jobSchema.index({ category: 1 });

module.exports = mongoose.model("Job", jobSchema);
