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
      default: null,
    },
    suffixName: {
      type: String,
      default: null,
    },
    contactNumber: {
      type: String,
      required: true,
    },
    sex: {
      type: String,
      enum: ["male", "female"],
      required: true,
    },
    dateOfBirth: {
      type: String,
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
      province: {
        type: String,
        required: true,
      },
      city: {
        type: String,
        required: true,
      },
      barangay: {
        type: String,
        required: true,
      },
      street: {
        type: String,
        required: true,
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
    blockReason: {
      type: String,
      default: null,
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    verifiedAt: {
      type: Date,
      default: null,
    },
    averageRating: {
      type: Number,
      default: 0,
      min: [0, "Average rating cannot be negative"],
      max: [5, "Average rating cannot exceed 5"],
    },
    totalJobsPosted: {
      type: Number,
      default: 0,
      min: [0, "Total jobs posted cannot be negative"],
    },
  },
  {
    timestamps: true,
    indexes: [
      { credentialId: 1 },
      { isVerified: 1 },
      { verifiedAt: 1 },
      { blocked: 1 },
      { "address.city": 1, "address.province": 1 },
    ],
  }
);

// ==================== INDEXES ====================
ClientSchema.index({ credentialId: 1 });
ClientSchema.index({ isVerified: 1 });
ClientSchema.index({ verifiedAt: 1 });
ClientSchema.index({ blocked: 1 });
ClientSchema.index({ "address.city": 1, "address.province": 1 });

module.exports = mongoose.model("Client", ClientSchema);
