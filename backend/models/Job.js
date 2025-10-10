const mongoose = require("mongoose");

const jobSchema = new mongoose.Schema(
  {
    clientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Client",
      required: true,
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
    status: {
      type: String,
      enum: ["open", "hired", "in_progress", "completed", "cancelled"],
      default: "open",
      required: true,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
    hiredWorker: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Worker",
      default: null,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

// Indexes for performance
jobSchema.index({ location: "text", description: "text" });
jobSchema.index({ category: 1 });

module.exports = mongoose.model("Job", jobSchema);
