const mongoose = require("mongoose");

const pendingSignupSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: String,
  userType: { type: String, enum: ["client", "worker"], required: true },
  lastName: String,
  firstName: String,
  middleName: String,
  contactNumber: String,
  profilePicture: String,
  address: Array,
  workerSkills: Array,
  portfolio: Array,
  authenticationCode: String,
  authenticationCodeExpiresAt: Date,
  verifyAttempts: { type: Number, default: 0 },
  blockedUntil: Date,
  lastResendAt: Date,
  createdAt: { type: Date, default: Date.now, expires: 86400 }, // 1 day TTL
});

module.exports = mongoose.model("PendingSignup", pendingSignupSchema);
