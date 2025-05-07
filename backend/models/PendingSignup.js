const bcrypt = require("bcryptjs");
const mongoose = require("mongoose");

const pendingSignupSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    index: true,
    lowercase: true,
    validate: {
      validator: function (v) {
        return /^[a-zA-Z0-9._%+-]+@(gmail\.com|yahoo\.com|outlook\.com)$/.test(
          v
        );
      },
      message: "Only Gmail, Yahoo, and Outlook addresses are allowed.",
    },
  },
  password: {
    type: String,
    required: true,
  },
  userType: {
    type: String,
    enum: ["client", "worker"],
    required: true,
  },
  lastName: {
    type: String,
    required: true,
    trim: true,
  },
  firstName: {
    type: String,
    required: true,
    trim: true,
  },
  contactNumber: {
    type: String,
    required: true,
    trim: true,
    validate: {
      validator: function (v) {
        return /^(09\d{9}|\+639\d{9})$/.test(v);
      },
      message:
        "Contact number must be a valid Philippine mobile number starting with 09 or +639",
    },
  },
  sex: {
    type: String,
    enum: ["Male", "Female", "Other", "Prefer not to say"],
    required: true,
  },
  dateOfBirth: {
    type: Date,
    required: true,
    validate: {
      validator: function (v) {
        const age = new Date().getFullYear() - v.getFullYear();
        const month = new Date().getMonth();
        const birthdayMonth = v.getMonth();
        const day = new Date().getDate();
        const birthdayDay = v.getDate();
        return (
          age > 18 ||
          (age === 18 &&
            (birthdayMonth < month ||
              (birthdayMonth === month && birthdayDay <= day)))
        );
      },
      message: "User must be at least 18 years old",
    },
  },
  maritalStatus: {
    type: String,
    enum: [
      "Single",
      "Married",
      "Separated",
      "Divorced",
      "Widowed",
      "Prefer not to say",
    ],
    required: true,
  },
  address: {
    region: {
      type: String,
      required: true,
      trim: true,
    },
    city: {
      type: String,
      required: true,
      trim: true,
    },
    district: {
      type: String,
      required: true,
      trim: true,
    },
    street: {
      type: String,
      required: true,
      trim: true,
    },
    unit: {
      type: String,
      trim: true,
    },
  },
  profilePicture: {
    type: String,
    default: "https://example.com/default-profile.jpg", // Placeholder image URL
    validate: {
      validator: function (v) {
        return !v || /^https?:\/\/.+\..+/.test(v);
      },
      message: "Invalid profile picture URL",
    },
  },
  // Fields for Worker (specific to worker sign-ups)
  biography: {
    type: String,
    default: "",
    trim: true,
  },
  workerSkills: [
    {
      skillCategory: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "SkillCategory",
        required: true,
      },
      skills: {
        type: [String],
        required: true,
      },
    },
  ],
  portfolio: [
    {
      projectTitle: {
        type: String,
        default: "",
        trim: true,
      },
      description: {
        type: String,
        default: "",
        trim: true,
      },
      projectLink: {
        type: String,
        required: true,
        validate: {
          validator: function (v) {
            return /^https?:\/\/.+\..+/.test(v);
          },
          message: "Invalid URL format",
        },
      },
    },
  ],
  experience: [
    {
      companyName: {
        type: String,
        required: true,
      },
      position: {
        type: String,
        required: true,
      },
      startYear: {
        type: Number,
        required: true,
        validate: {
          validator: function (v) {
            return v >= 1900 && v <= new Date().getFullYear();
          },
          message: "Start year must be between 1900 and the current year",
        },
      },
      endYear: {
        type: Number,
        default: null,
        validate: [
          {
            validator: function (v) {
              return v === null || v <= new Date().getFullYear();
            },
            message: "End year must not be in the future",
          },
        ],
      },
      responsibilities: {
        type: String,
        default: "",
        trim: true,
      },
    },
  ],
  certificates: [
    {
      certificateLink: {
        type: String,
        required: true,
        validate: {
          validator: function (v) {
            return /^https?:\/\/.+\..+/.test(v);
          },
          message: "Invalid URL format",
        },
      },
    },
  ],
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
