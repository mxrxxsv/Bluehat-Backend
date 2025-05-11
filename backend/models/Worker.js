const mongoose = require("mongoose");

const WorkerSchema = new mongoose.Schema(
  {
    credentialId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Credential",
      unique: true,
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
      enum: ["male", "female", "other", "prefer not to say"],
      required: true,
    },
    dateOfBirth: {
      type: Date,
      required: true,
    },
    maritalStatus: {
      type: String,
      enum: [
        "single",
        "married",
        "separated",
        "divorced",
        "widowed",
        "prefer not to say",
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
    profilePicture: {
      url: {
        type: String,
        required: false,
      },
      public_id: {
        type: String,
        required: false,
      },
    },
    biography: {
      type: String,
      default: "",
    },
    skillsByCategory: [
      {
        skillCategoryId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "SkillCategory",
          required: true,
        },
        selectedSkills: [
          {
            type: String,
            required: true,
          },
        ],
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
        image: {
          url: {
            type: String,
            required: true,
          },
          public_id: {
            type: String,
            required: true,
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
        },
        endYear: {
          type: Number,
          default: null,
        },
        responsibilities: {
          type: String,
          default: "",
        },
      },
    ],
    certificates: [
      {
        url: {
          type: String,
          required: true,
        },
        public_id: {
          type: String,
          required: true,
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
      enum: ["available", "working", "not available"],
      default: "available",
    },
    currentJob: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Job",
      default: null,
    },
    blocked: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Worker", WorkerSchema);
