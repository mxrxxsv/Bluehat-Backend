const mongoose = require("mongoose");

const advertisementSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Title is required"],
      trim: true,
      maxlength: 100,
    },
    companyName: {
      type: String,
      required: [true, "Company name is required"],
      trim: true,
      maxlength: 100,
    },
    description: {
      type: String,
      required: [true, "Description is required"],
      trim: true,
      maxlength: 1000,
    },
    imageUrl: {
      type: String,
      required: [true, "Image URL is required"],
      trim: true,
      validate: {
        validator: (v) => /^https?:\/\/.+\.(jpg|jpeg|png|webp|gif)$/i.test(v),
        message: "Must be a valid image URL",
      },
    },
    link: {
      type: String,
      required: [true, "Link is required"],
      trim: true,
      validate: {
        validator: (v) => /^https?:\/\/.+/i.test(v),
        message: "Must be a valid URL",
      },
    },
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    isDeleted: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  { timestamps: true }
);

advertisementSchema.index({ isActive: 1, isDeleted: 1 });

module.exports = mongoose.model("Advertisement", advertisementSchema);
