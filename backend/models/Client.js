const mongoose = require("mongoose");

const ClientSchema = new mongoose.Schema(
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
    middleName: {
      type: String,
      required: true,
    },
    suffixName: {
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
    blocked: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);
module.exports = mongoose.model("Client", ClientSchema);
