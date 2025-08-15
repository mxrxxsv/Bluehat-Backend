const mongoose = require("mongoose");

const advertisementSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Title is required"],
      trim: true,
      maxlength: [100, "Title cannot exceed 100 characters"],
    },
    companyName: {
      type: String,
      required: [true, "Company name is required"],
      trim: true,
      maxlength: [100, "Company name cannot exceed 100 characters"],
      index: true, // For search optimization
    },
    description: {
      type: String,
      required: [true, "Description is required"],
      trim: true,
      maxlength: [1000, "Description cannot exceed 1000 characters"],
    },
    imageUrl: {
      type: String,
      required: [true, "Image URL is required"],
      trim: true,
    },
    imagePublicId: {
      type: String,
      required: [true, "Image public ID is required"], // For Cloudinary deletion
    },
    link: {
      type: String,
      required: [true, "Link is required"],
      trim: true,
      validate: {
        validator: (v) => /^https?:\/\/.+/i.test(v),
        message: "Must be a valid URL starting with http:// or https://",
      },
    },
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
      required: true,
      index: true,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    isDeleted: {
      type: Boolean,
      default: false,
      index: true,
    },
    deletedAt: {
      type: Date,
    },
    deletedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
    },
    // Analytics fields (optional)
    clickCount: {
      type: Number,
      default: 0,
    },
    lastClicked: {
      type: Date,
    },
  },
  {
    timestamps: true,
    // Add indexes for better query performance
    indexes: [
      { isActive: 1, isDeleted: 1 },
      { companyName: 1, isActive: 1 },
      { createdAt: -1 },
    ],
  }
);

// Virtual for full advertisement URL (if needed)
advertisementSchema.virtual("fullImageUrl").get(function () {
  return this.imageUrl;
});

// Method to increment click count
advertisementSchema.methods.incrementClick = function () {
  this.clickCount += 1;
  this.lastClicked = new Date();
  return this.save();
};

module.exports = mongoose.model("Advertisement", advertisementSchema);
