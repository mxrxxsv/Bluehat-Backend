const bcrypt = require("bcryptjs");
const mongoose = require("mongoose");

const pendingSignupSchema = new mongoose.Schema({
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
    enum: ["Male", "Female", "Other", "Prefer not to say"],
    required: true,
  },
  dateOfBirth: {
    type: Date,
    required: true,
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
  // biography: {
  //   type: String,
  //   default: "",
  //   trim: true,
  // },
  // workerSkills: [
  //   {
  //     skillCategory: {
  //       type: mongoose.Schema.Types.ObjectId,
  //       ref: "SkillCategory",
  //       required: true,
  //     },
  //     skills: {
  //       type: [String],
  //       required: true,
  //     },
  //   },
  // ],
  // portfolio: [
  //   {
  //     projectTitle: {
  //       type: String,
  //       default: "",
  //       trim: true,
  //     },
  //     description: {
  //       type: String,
  //       default: "",
  //       trim: true,
  //     },
  //     projectLink: {
  //       type: String,
  //       required: true,
  //       validate: {
  //         validator: function (v) {
  //           return /^https?:\/\/.+\..+/.test(v);
  //         },
  //         message: "Invalid URL format",
  //       },
  //     },
  //   },
  // ],
  // experience: [
  //   {
  //     companyName: {
  //       type: String,
  //       required: true,
  //     },
  //     position: {
  //       type: String,
  //       required: true,
  //     },
  //     startYear: {
  //       type: Number,
  //       required: true,
  //       validate: {
  //         validator: function (v) {
  //           return v >= 1900 && v <= new Date().getFullYear();
  //         },
  //         message: "Start year must be between 1900 and the current year",
  //       },
  //     },
  //     endYear: {
  //       type: Number,
  //       default: null,
  //       validate: [
  //         {
  //           validator: function (v) {
  //             return v === null || v <= new Date().getFullYear();
  //           },
  //           message: "End year must not be in the future",
  //         },
  //       ],
  //     },
  //     responsibilities: {
  //       type: String,
  //       default: "",
  //       trim: true,
  //     },
  //   },
  // ],
  // certificates: [
  //   {
  //     certificateLink: {
  //       type: String,
  //       required: true,
  //       validate: {
  //         validator: function (v) {
  //           return /^https?:\/\/.+\..+/.test(v);
  //         },
  //         message: "Invalid URL format",
  //       },
  //     },
  //   },
  // ],
  authenticationCode: { type: String, required: true },
  authenticationCodeExpiresAt: { type: Date, required: true },
  verifyAttempts: { type: Number, default: 0 },
  blockedUntil: { type: Date, default: null },,
  lastResendAt: Date,
  createdAt: { type: Date, default: Date.now, expires: 86400 }, // 1 day TTL
});

module.exports = mongoose.model("PendingSignup", pendingSignupSchema);
