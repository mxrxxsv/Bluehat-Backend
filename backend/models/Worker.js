const mongoose = require("mongoose");

const WorkerSchema = new mongoose.Schema(
  {
    credentialId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Credential",
      unique: true,
      index: true,
    },
    lastName: {
      type: String,
      required: true,
      trim: true,
      index: true,
      validate: {
        validator: function (v) {
          return v.length > 0;
        },
        message: "Last name cannot be empty",
      },
    },
    firstName: {
      type: String,
      required: true,
      trim: true,
      index: true,
      validate: {
        validator: function (v) {
          return v.length > 0;
        },
        message: "First name cannot be empty",
      },
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
          return v <= new Date();
        },
        message: "Date of birth cannot be in the future",
      },
    },
    maritalStatus: {
      type: String,
      enum: ["Single", "Married", "Separated", "Divorced", "Widowed"],
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
        index: true,
      },
      district: {
        type: String,
        required: true,
        trim: true,
        index: true,
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
      default: null,
      validate: {
        validator: function (v) {
          return !v || /^https?:\/\/.+\..+/.test(v);
        },
        message: "Invalid profile picture URL",
      },
    },
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
    reviews: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Review",
      },
    ],
    status: {
      type: String,
      enum: ["Available", "Working", "Not Available"],
      default: "Available",
      index: true,
    },
    currentJob: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Job",
      default: null,
    },
    blocked: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  { timestamps: true }
);

WorkerSchema.pre("validate", function (next) {
  for (const exp of this.experience) {
    if (exp.endYear !== null && exp.endYear < exp.startYear) {
      return next(
        new Error(
          `In experience at "${exp.companyName}", end year (${exp.endYear}) must be >= start year (${exp.startYear})`
        )
      );
    }
  }
  next();
});

module.exports = mongoose.model("Worker", WorkerSchema);
