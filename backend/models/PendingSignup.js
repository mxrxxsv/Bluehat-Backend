const bcrypt = require("bcryptjs");
const mongoose = require("mongoose");

const pendingSignupSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
    validate: {
      validator: function (v) {
        return /^[a-zA-Z0-9._%+-]+@(gmail\.com|yahoo\.com|outlook\.com)$/.test(
          v
        );
      },
      message: "Only Gmail addresses are allowed.",
    },
  },
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

// Only hash if it’s been modified *and* isn’t already a bcrypt hash:
pendingSignupSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();

  // If it already looks like a $2a$ or $2b$... bcrypt hash, skip
  if (/^\$2[aby]\$/.test(this.password)) {
    return next();
  }

  this.password = await bcrypt.hash(this.password, 10);
  next();
});
module.exports = mongoose.model("PendingSignup", pendingSignupSchema);
