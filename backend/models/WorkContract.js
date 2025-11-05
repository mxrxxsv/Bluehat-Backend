const mongoose = require("mongoose");
const { sendJobProgressEmail } = require("../mailer/jobProgressNotifications");
const { decryptAES128 } = require("../utils/encipher");

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
    actualEndDate: {
      type: Date,
      default: null,
    },

    // Status tracking
    contractStatus: {
      type: String,
      enum: [
        "active",
        "in_progress",
        "awaiting_client_confirmation",
        "completed",
        "cancelled",
        "disputed",
      ],
      default: "active",
      index: true,
    },

    // Completion & feedback
    workerCompletedAt: {
      type: Date,
      default: null,
    },
    clientConfirmedAt: {
      type: Date,
      default: null,
    },
    completedAt: {
      type: Date,
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
workContractSchema.pre("save", async function (next) {
  // Auto-set completion date
  if (this.contractStatus === "completed" && !this.completedAt) {
    this.completedAt = new Date();
    this.actualEndDate = new Date();
  }

  // Update job status when contract status changes
  if (this.isModified("contractStatus") || this.isNew) {
    try {
      const Job = mongoose.model("Job");

      if (this.jobId) {
        if (
          this.contractStatus === "active" ||
          this.contractStatus === "in_progress"
        ) {
          // Update job to in_progress status with the worker
          await Job.findByIdAndUpdate(this.jobId, {
            status: "in_progress",
            hiredWorker: this.workerId,
          });
        } else if (this.contractStatus === "completed") {
          // Update job to completed status
          await Job.findByIdAndUpdate(this.jobId, {
            status: "completed",
          });
        } else if (this.contractStatus === "cancelled") {
          // Reset job to open status and remove hired worker
          await Job.findByIdAndUpdate(this.jobId, {
            status: "open",
            hiredWorker: null,
          });
        }
      }
    } catch (error) {
      console.error("Error updating job status:", error);
      // Don't fail the contract save if job update fails
    }

    // Send email notifications for contract status changes
    if (!this.isNew && this.isModified("contractStatus")) {
      try {
        // Get job, worker, and client details
        const Job = mongoose.model("Job");
        const Worker = mongoose.model("Worker");
        const Client = mongoose.model("Client");
        const Credential = mongoose.model("Credential");

        const job = await Job.findById(this.jobId);
        const worker = await Worker.findById(this.workerId);
        const client = await Client.findById(this.clientId);

        if (job && worker && client) {
          // Get credentials with email explicitly selected
          const workerCredential = await Credential.findById(
            worker.credentialId
          ).select("+email");
          const clientCredential = await Credential.findById(
            client.credentialId
          ).select("+email");

          // Determine email type based on contract status per recipient
          let workerEmailType = null;
          let clientEmailType = null;
          switch (this.contractStatus) {
            case "active":
            case "in_progress":
              workerEmailType = "work_started"; // notify worker they can start/are in progress
              break;
            case "awaiting_client_confirmation":
              // Worker just clicked "Work Done" – acknowledge to worker; notify client to review using existing template
              workerEmailType = "awaiting_client_confirmation";
              clientEmailType = "work_completed";
              break;
            case "completed":
              workerEmailType = "work_completed";
              clientEmailType = "work_completed";
              break;
            case "cancelled":
              workerEmailType = "contract_cancelled";
              clientEmailType = "contract_cancelled";
              break;
            default:
              break;
          }

          const jobTitle = job?.title || job?.description || "FixIt Job";
          const commonData = {
            agreedRate: this.agreedRate,
            contractStatus: this.contractStatus,
            contractId: this._id,
            jobId: job?._id,
          };

          // Send email to worker
          if (workerEmailType && workerCredential && workerCredential.email) {
            await sendJobProgressEmail(
              workerCredential.email,
              workerEmailType,
              jobTitle,
              commonData
            );
          }

          // Send email to client
          if (clientEmailType && clientCredential && clientCredential.email) {
            await sendJobProgressEmail(
              clientCredential.email,
              clientEmailType,
              jobTitle,
              commonData
            );
          }
        }
      } catch (emailError) {
        console.error("Error sending contract status email:", emailError);
        // Don't fail the contract save if email fails
      }
    }
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

module.exports = mongoose.model("WorkContract", workContractSchema);
