const mongoose = require("mongoose");

const pendingSignupSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    select: false, // Don't return the encrypted email by default
    index: true,
    unique: true,
  },
  password: {
    type: String,
    required: true,
    minLength: 12,
    select: false,
  },
  userType: {
    type: String,
    enum: ["client", "worker"],
    required: true,
  },
  firstName: {
    type: String,
    required: true,
  },
  lastName: {
    type: String,
    required: true,
  },
  contactNumber: {
    type: String,
    required: true,
  },
  sex: {
    type: String,
    enum: ["male", "female", "other", "prefer not to say"],
    required: true,
  },
  dateOfBirth: {
    type: Date,
    required: true,
  },
  maritalStatus: {
    type: String,
    enum: [
      "single",
      "married",
      "separated",
      "divorced",
      "widowed",
      "prefer not to say",
    ],
    required: true,
  },
  address: {
    region: {
      type: String,
      required: true,
    },
    city: {
      type: String,
      required: true,
    },
    district: {
      type: String,
      required: true,
    },
    street: {
      type: String,
      required: true,
    },
    unit: {
      type: String,
    },
  },
  authenticationCode: { type: String, required: true },
  authenticationCodeExpiresAt: { type: Date, required: true },
  verifyAttempts: { type: Number, default: 0 },
  blockedUntil: { type: Date, default: null },
  lastResendAt: Date,
  createdAt: { type: Date, default: Date.now, expires: 86400 }, // 1 day TTL
});

module.exports = mongoose.model("PendingSignup", pendingSignupSchema);
