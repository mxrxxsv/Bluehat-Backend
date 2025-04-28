const mongoose = require("mongoose");

const workerSchema = new mongoose.Schema({
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
});

module.exports = mongoose.model("Worker", workerSchema);
