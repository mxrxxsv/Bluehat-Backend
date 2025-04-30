const mongoose = require("mongoose");

const WorkerSchema = new mongoose.Schema(
  {
    credentialId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Credential",
    },
    lastName: {
      type: String,
      required: true,
      trim: true,
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
      validate: {
        validator: function (v) {
          return v.length > 0;
        },
        message: "First name cannot be empty",
      },
    },
    middleName: {
      type: String,
      required: true,
      trim: true,
      validate: {
        validator: function (v) {
          return v.length > 0;
        },
        message: "Middle name cannot be empty",
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
    address: {
      type: [
        {
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
      ],
      validate: {
        validator: function (v) {
          return Array.isArray(v) && v.length > 0;
        },
        message: "At least one address is required",
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
          default: [],
          validate: {
            validator: function (v) {
              return Array.isArray(v) && v.length > 0;
            },
            message: "At least one skill must be selected",
          },
        },
      },
    ],
    portfolio: [
      {
        projectTitle: {
          type: String,
          default: "",
        },
        description: {
          type: String,
          default: "",
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
        startDate: {
          type: Date,
          required: true,
        },
        endDate: {
          type: Date,
          required: false,
          default: null,
        },
        responsibilities: {
          type: String,
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
        reviewerId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Client",
        },
        jobId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Job",
        },
        comment: {
          type: String,
          required: true,
        },
        rating: {
          type: Number,
          required: true,
          min: 1,
          max: 5,
        },
        reviewDate: {
          type: Date,
          required: true,
        },
      },
    ],
    status: {
      type: String,
      enum: ["Available", "Working", "Not Available"],
      default: "Available",
    },
    currentJob: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Job",
      default: null,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Worker", WorkerSchema);
