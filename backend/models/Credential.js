const mongoose = require("mongoose");

const CredentialSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      unique: true,
      validate: {
        validator: function (v) {
          return /^[a-zA-Z0-9._%+-]+@gmail\.com$/.test(v);
        },
        message: "Invalid email format",
      },
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
      index: true,
    },
    idPicture: {
      type: String,
      default: null,
      validate: {
        validator: function (v) {
          return !v || /^https?:\/\/.+\..+/.test(v);
        },
        message: "Invalid ID picture URL",
      },
    },
    selfiePicture: {
      type: String,
      default: null,
      validate: {
        validator: function (v) {
          return !v || /^https?:\/\/.+\..+/.test(v);
        },
        message: "Invalid selfie picture URL",
      },
    },
    lastLogin: {
      type: Date,
      default: Date.now,
    },
    isAuthenticated: {
      type: Boolean,
      default: false,
      index: true,
    },
    isVerified: {
      type: Boolean,
      default: false,
      index: true,
    },
    resetPasswordToken: {
      type: String,
      index: true,
    },
    resetPasswordExpiresAt: Date,
    authenticationCode: {
      type: String,
      index: true,
    },
    authenticationCodeExpiresAt: Date,
    loginAttempts: {
      type: Number,
      default: 0,
    },

    lockUntil: Date,
  },
  { timestamps: true }
);

// Virtual field for checking if the account is locked
CredentialSchema.virtual("isLocked").get(function () {
  return !!(this.lockUntil && this.lockUntil > Date.now());
});

// Method to handle failed login attempt
CredentialSchema.methods.incLoginAttempts = function () {
  // Increment the failed login attempts
  this.loginAttempts += 1;

  // If the account has exceeded the maximum login attempts (e.g., 5), lock it
  if (this.loginAttempts >= 5 && !this.isLocked) {
    // Lock the account for 15 minutes
    this.lockUntil = Date.now() + 15 * 60 * 1000; // 15 minutes from now
  }

  // Save the updates
  return this.save();
};

CredentialSchema.set("toObject", { virtuals: true });
CredentialSchema.set("toJSON", { virtuals: true });

module.exports = mongoose.model("Credential", CredentialSchema);
