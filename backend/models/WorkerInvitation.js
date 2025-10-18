const mongoose = require("mongoose");

const workerInvitationSchema = new mongoose.Schema(
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
      required: true, // Changed to required as per your requirement
      index: true,
    },
    invitationType: {
      type: String,
      enum: ["job_specific"], // Removed general_hire as per your requirement
      required: true,
    },
    proposedRate: {
      type: Number,
      required: true,
      min: [0, "Proposed rate cannot be negative"],
      max: [1000000, "Proposed rate cannot exceed 1,000,000"],
    },
    description: {
      type: String,
      required: true,
      trim: true,
      minlength: [20, "Description must be at least 20 characters"],
      maxlength: [2000, "Description cannot exceed 2000 characters"],
    },
    invitationStatus: {
      type: String,
      enum: [
        "pending",
        "in_discussion",
        "client_agreed",
        "worker_agreed",
        "both_agreed",
        "accepted",
        "rejected",
        "cancelled",
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
    sentAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    respondedAt: {
      type: Date,
      default: null,
    },
    expiresAt: {
      type: Date,
      default: function () {
        // Invitations expire after 7 days
        return new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      },
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
workerInvitationSchema.index({ clientId: 1, workerId: 1, jobId: 1 }); // Prevent duplicate invitations
workerInvitationSchema.index({ workerId: 1, invitationStatus: 1 });
workerInvitationSchema.index({ clientId: 1, invitationStatus: 1 });
workerInvitationSchema.index({ sentAt: -1 });
workerInvitationSchema.index({ expiresAt: 1 }); // For cleanup expired invitations

// Pre-save middleware
workerInvitationSchema.pre("save", function (next) {
  if (this.invitationStatus !== "pending" && !this.respondedAt) {
    this.respondedAt = new Date();
  }
  next();
});

// Instance methods
workerInvitationSchema.methods.isExpired = function () {
  return new Date() > this.expiresAt;
};

workerInvitationSchema.methods.toSafeObject = function () {
  const obj = this.toObject();
  delete obj.senderIP;
  delete obj.__v;
  return obj;
};

// Static method to cleanup expired invitations
workerInvitationSchema.statics.cleanupExpired = async function () {
  return this.updateMany(
    {
      expiresAt: { $lt: new Date() },
      invitationStatus: "pending",
    },
    {
      invitationStatus: "cancelled",
    }
  );
};

module.exports = mongoose.model("WorkerInvitation", workerInvitationSchema);
