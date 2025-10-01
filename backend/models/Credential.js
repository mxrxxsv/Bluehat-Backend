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
    // ==================== TOTP FIELDS ====================
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
    indexes: [{ email: 1 }, { userType: 1 }, { createdAt: 1 }],
  }
);

// ==================== VIRTUAL FIELDS ====================
CredentialSchema.virtual("isLocked").get(function () {
  return !!(this.lockUntil && this.lockUntil > Date.now());
});

CredentialSchema.virtual("verificationAttempts").get(function () {
  return this.verificationHistory ? this.verificationHistory.length : 0;
});

// ==================== METHODS ====================
CredentialSchema.methods.incLoginAttempts = function () {
  this.loginAttempts = (this.loginAttempts || 0) + 1;
  if (this.loginAttempts >= 5 && !this.isLocked) {
    this.lockUntil = Date.now() + 15 * 60 * 1000; // 15 minutes
  }
  return this.save();
};

// ... other methods remain the same ...

module.exports = mongoose.model("Credential", CredentialSchema);
