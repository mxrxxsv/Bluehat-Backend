const mongoose = require("mongoose");

const pendingSignupSchema = new mongoose.Schema({
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
  middleName: {
    type: String,
    default: null,
  },
  suffixName: {
    type: String,
    default: null,
  },
  contactNumber: {
    type: String,
    required: true,
  },
  sex: {
    type: String,
    enum: ["male", "female"],
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
    province: {
      type: String,
      required: true,
    },
    city: {
      type: String,
      required: true,
    },
    barangay: {
      type: String,
      required: true,
    },
    street: {
      type: String,
      required: true,
    },
  },
  emailVerificationToken: {
    type: String,
    select: false,
  },
  emailVerificationExpires: {
    type: Date,
  },
  emailVerified: {
    type: Boolean,
    default: false,
  },
  totpSecret: { type: String, select: false },
  totpCreatedAt: { type: Date },
  verifyAttempts: { type: Number, default: 0 },
  blockedUntil: { type: Date },
  lastResendAt: Date,
  createdAt: { type: Date, default: Date.now, expires: 86400 }, // 1 day TTL
});

module.exports = mongoose.model("PendingSignup", pendingSignupSchema);
