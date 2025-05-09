const bcrypt = require("bcryptjs");
const mongoose = require("mongoose");

const CredentialSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
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
    idPicture: {
      url: {
        type: String,
        required: true,
      },
      public_id: {
        type: String,
        required: true,
      },
    },
    selfiePicture: {
      url: {
        type: String,
        required: true,
      },
      public_id: {
        type: String,
        required: true,
      },
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
    resetPasswordToken: {
      type: String,
    },
    resetPasswordExpiresAt: Date,
    authenticationCode: {
      type: String,
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
