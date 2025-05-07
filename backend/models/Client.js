const mongoose = require("mongoose");

const ClientSchema = new mongoose.Schema(
  {
    credentialId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Credential",
      unique: true,
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
      default: null,
      validate: {
        validator: function (v) {
          return !v || /^https?:\/\/.+\..+/.test(v);
        },
        message: "Invalid profile picture URL",
      },
    },
  },
  { timestamps: true }
);

ClientSchema.index({ credentialId: 1, lastName: 1, firstName: 1 });
module.exports = mongoose.model("Client", ClientSchema);
