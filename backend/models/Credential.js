const bcrypt = require("bcryptjs");
const mongoose = require("mongoose");

const CredentialSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      select: false,
      index: true,
      unique: true,
    },
    password: {
      type: String,
      required: true,
      minLength: 8,
      select: false,
    },
    userType: {
      type: String,
      enum: ["client", "worker"],
      required: true,
    },

    // ==================== VERIFICATION FIELDS ====================
    isVerified: {
      type: Boolean,
      default: false,
    },
    verifiedAt: {
      type: Date,
      default: null,
    },
    verifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
      default: null,
    },
    verificationNotes: {
      type: String,
      default: "",
    },

    // ==================== REJECTION FIELDS ====================
    isRejected: {
      type: Boolean,
      default: false,
    },
    rejectedAt: {
      type: Date,
      default: null,
    },
    rejectedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
      default: null,
    },
    rejectionReason: {
      type: String,
      default: "",
    },

    // ==================== BLOCKING FIELDS ====================
    isBlocked: {
      type: Boolean,
      default: false,
    },
    blockedAt: {
      type: Date,
      default: null,
    },
    blockedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
      default: null,
    },
    blockReason: {
      type: String,
      default: "",
    },
    unblockedAt: {
      type: Date,
      default: null,
    },
    unblockedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
      default: null,
    },
    unblockNotes: {
      type: String,
      default: "",
    },

    // ==================== VERIFICATION HISTORY ====================
    verificationHistory: [
      {
        action: {
          type: String,
          enum: ["approved", "rejected", "blocked", "unblocked"],
          required: true,
        },
        adminId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Admin",
          required: true,
        },
        adminName: {
          type: String,
          required: true,
        },
        notes: {
          type: String,
          default: "",
        },
        reason: {
          type: String,
          default: "",
        },
        timestamp: {
          type: Date,
          default: Date.now,
        },
      },
    ],

    // ==================== EXISTING TOTP FIELDS ====================
    totpSecret: {
      type: String,
      required: true,
      select: false,
    },
    totpAttempts: {
      type: Number,
      default: 0,
      select: false,
    },
    totpBlockedUntil: {
      type: Date,
      select: false,
    },
    lastTotpAttempt: {
      type: Date,
      select: false,
    },

    // ==================== LOGIN ATTEMPT TRACKING ====================
    loginAttempts: {
      type: Number,
      default: 0,
      select: false,
    },
    lockUntil: {
      type: Date,
      select: false,
    },

    // ==================== ID VERIFICATION REFERENCES ====================
    idPictureId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "IDPicture",
      required: false,
    },
    selfiePictureId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Selfie",
      required: false,
    },

    // ==================== STATUS FIELDS ====================
    lastLogin: {
      type: Date,
    },
    isAuthenticated: {
      type: Boolean,
      default: false,
    },

    // ==================== PASSWORD RESET ====================
    resetPasswordToken: {
      type: String,
      select: false,
    },
    resetPasswordExpiresAt: {
      type: Date,
      select: false,
    },

    // ==================== AUTHENTICATION CODE ====================
    authenticationCode: {
      type: String,
      select: false,
    },
    authenticationCodeExpiresAt: {
      type: Date,
      select: false,
    },
  },
  {
    timestamps: true,
    // Add indexes for better performance
    indexes: [
      { email: 1 },
      { userType: 1 },
      { isVerified: 1 },
      { isBlocked: 1 },
      { verifiedAt: 1 },
      { createdAt: 1 },
    ],
  }
);

// ==================== VIRTUAL FIELDS ====================

// Virtual field for checking if the account is locked
CredentialSchema.virtual("isLocked").get(function () {
  return !!(this.lockUntil && this.lockUntil > Date.now());
});

// Virtual field for verification attempts count
CredentialSchema.virtual("verificationAttempts").get(function () {
  return this.verificationHistory ? this.verificationHistory.length : 0;
});

// ==================== METHODS ====================

// Method to handle failed login attempt
CredentialSchema.methods.incLoginAttempts = function () {
  this.loginAttempts = (this.loginAttempts || 0) + 1;

  if (this.loginAttempts >= 5 && !this.isLocked) {
    this.lockUntil = Date.now() + 15 * 60 * 1000; // 15 minutes
  }

  return this.save();
};

// Method to add verification history entry
CredentialSchema.methods.addVerificationHistory = function (
  action,
  adminId,
  adminName,
  notes = "",
  reason = ""
) {
  if (!this.verificationHistory) {
    this.verificationHistory = [];
  }

  this.verificationHistory.push({
    action,
    adminId,
    adminName,
    notes,
    reason,
    timestamp: new Date(),
  });

  return this;
};

// Method to approve user
CredentialSchema.methods.approve = function (adminId, adminName, notes = "") {
  this.isVerified = true;
  this.verifiedAt = new Date();
  this.verifiedBy = adminId;
  this.verificationNotes = notes;

  // Clear rejection flags
  this.isRejected = false;
  this.rejectedAt = undefined;
  this.rejectionReason = undefined;

  this.addVerificationHistory("approved", adminId, adminName, notes);
  return this;
};

// Method to reject user
CredentialSchema.methods.reject = function (
  adminId,
  adminName,
  reason,
  blockUser = false
) {
  this.isRejected = true;
  this.rejectedAt = new Date();
  this.rejectedBy = adminId;
  this.rejectionReason = reason;

  if (blockUser) {
    this.isBlocked = true;
    this.blockedAt = new Date();
    this.blockedBy = adminId;
  }

  this.addVerificationHistory("rejected", adminId, adminName, "", reason);
  return this;
};

// Method to block user
CredentialSchema.methods.block = function (adminId, adminName, reason) {
  this.isBlocked = true;
  this.blockedAt = new Date();
  this.blockedBy = adminId;
  this.blockReason = reason;

  this.addVerificationHistory("blocked", adminId, adminName, "", reason);
  return this;
};

// Method to unblock user
CredentialSchema.methods.unblock = function (adminId, adminName, notes = "") {
  this.isBlocked = false;
  this.unblockedAt = new Date();
  this.unblockedBy = adminId;
  this.unblockNotes = notes;

  this.addVerificationHistory("unblocked", adminId, adminName, notes);
  return this;
};

// ==================== PRE-HOOKS ====================

// Pre-hook for cascade delete
CredentialSchema.pre("findOneAndDelete", async function (next) {
  const cred = await this.model.findOne(this.getFilter());
  if (!cred) return next();

  if (cred.userType === "worker") {
    const Worker = mongoose.model("Worker");
    await Worker.findOneAndDelete({ credentialId: cred._id });
  } else if (cred.userType === "client") {
    const Client = mongoose.model("Client");
    await Client.findOneAndDelete({ credentialId: cred._id });
  }

  next();
});

// ==================== SCHEMA SETTINGS ====================

CredentialSchema.set("toObject", { virtuals: true });
CredentialSchema.set("toJSON", { virtuals: true });

module.exports = mongoose.model("Credential", CredentialSchema);
