const bcrypt = require("bcryptjs");
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

// Only hash if it’s been modified *and* isn’t already a bcrypt hash:
CredentialSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();

  // If it already looks like a $2a$ or $2b$... bcrypt hash, skip
  if (/^\$2[aby]\$/.test(this.password)) {
    return next();
  }

  this.password = await bcrypt.hash(this.password, 10);
  next();
});

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
