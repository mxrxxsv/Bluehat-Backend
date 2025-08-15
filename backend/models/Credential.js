// models/Credential.js - FIXED VERSION
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

    // TOTP fields
    totpSecret: { type: String, required: true, select: false },
    totpAttempts: { type: Number, default: 0, select: false },
    totpBlockedUntil: { type: Date, select: false },
    lastTotpAttempt: { type: Date, select: false },

    // Login attempt tracking
    loginAttempts: { type: Number, default: 0, select: false },
    lockUntil: { type: Date, select: false },

    // Profile pictures
    idPicture: {
      url: { type: String, required: false },
      public_id: { type: String, required: false },
    },
    selfiePicture: {
      url: { type: String, required: false },
      public_id: { type: String, required: false },
    },

    // Status fields
    lastLogin: { type: Date },
    isAuthenticated: { type: Boolean, default: false },
    isVerified: { type: Boolean, default: false },

    // Password reset
    resetPasswordToken: { type: String, select: false },
    resetPasswordExpiresAt: { type: Date, select: false },

    // Authentication code
    authenticationCode: { type: String, select: false },
    authenticationCodeExpiresAt: { type: Date, select: false },
  },
  { timestamps: true }
);

// Virtual field for checking if the account is locked
CredentialSchema.virtual("isLocked").get(function () {
  return !!(this.lockUntil && this.lockUntil > Date.now());
});

// Method to handle failed login attempt
CredentialSchema.methods.incLoginAttempts = function () {
  this.loginAttempts = (this.loginAttempts || 0) + 1;

  if (this.loginAttempts >= 5 && !this.isLocked) {
    this.lockUntil = Date.now() + 15 * 60 * 1000; // 15 minutes
  }

  return this.save();
};

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

CredentialSchema.set("toObject", { virtuals: true });
CredentialSchema.set("toJSON", { virtuals: true });

module.exports = mongoose.model("Credential", CredentialSchema);
