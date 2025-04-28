const mongoose = require("mongoose");

const CredentialModel = new mongoose.Schema({
  email: {
    type: String,
    required: true,
  },
  password: {
    type: String,
    required: true,
  },
  userType: {
    type: String,
    enum: ["client", "worker", "none"],
    default: "none",
    required: true,
  },
  lastLogin: {
    type: Date,
    default: Date.now,
  },
  isAuthenticated: {
    type: Boolean,
    default: false,
  },
  isVerified: {
    type: Boolean,
    default: false,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: Date,
  resetPasswordToken: String,
  resetPasswordExpiresAt: Date,
  authenticationToken: String,
  authenticationTokenExpiresAt: Date,
});

module.exports = mongoose.model("Credential", CredentialModel);
