const mongoose = require("mongoose");

const advertisementSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Title is required"],
      trim: true,
      // ✅ Updated for encrypted data - much larger limit
      minlength: [3, "Title must be at least 3 characters"],
      maxlength: [500, "Encrypted title cannot exceed 500 characters"], // Increased for encrypted data
      // ✅ Remove character validation since encrypted data won't match patterns
      // validate: {
      //   validator: function (v) {
      //     return /^[a-zA-Z0-9\s\-\.\,\!\?\(\)\'\"]+$/.test(v);
      //   },
      //   message: "Title contains invalid characters",
      // },
    },
    companyName: {
      type: String,
      required: [true, "Company name is required"],
      trim: true,
      // ✅ Updated for encrypted data
      minlength: [2, "Company name must be at least 2 characters"],
      maxlength: [500, "Encrypted company name cannot exceed 500 characters"], // Increased for encrypted data
      // ✅ Remove character validation since encrypted data won't match patterns
      // validate: {
      //   validator: function (v) {
      //     return /^[a-zA-Z0-9\s\-\.\&\,]+$/.test(v);
      //   },
      //   message: "Company name contains invalid characters",
      // },
    },
    description: {
      type: String,
      required: [true, "Description is required"],
      trim: true,
      // ✅ Updated for encrypted data
      minlength: [10, "Description must be at least 10 characters"],
      maxlength: [2000, "Encrypted description cannot exceed 2000 characters"], // Increased for encrypted data
    },
    image: {
      url: {
        type: String,
        required: [true, "Image URL is required"],
        // ✅ Add URL validation
        validate: {
          validator: function (v) {
            return /^https?:\/\/.+/.test(v);
          },
          message: "Image URL must be a valid HTTP/HTTPS URL",
        },
      },
      public_id: {
        type: String,
        required: [true, "Image public ID is required"],
      },
    },
    link: {
      type: String,
      required: [true, "Link is required"],
      trim: true,
      // ✅ Updated for encrypted data - remove URL validation since encrypted data won't be valid URLs
      maxlength: [1000, "Encrypted link cannot exceed 1000 characters"], // Increased for encrypted data
      // ✅ Remove URL validation since encrypted data won't match URL patterns
      // validate: {
      //   validator: (v) => {
      //     try {
      //       // ✅ More robust URL validation
      //       new URL(v);
      //       return /^https?:\/\/.+/i.test(v);
      //     } catch {
      //       return false;
      //     }
      //   },
      //   message: "Must be a valid HTTP/HTTPS URL",
      // },
    },
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
      required: [true, "Uploader is required"],
      // ✅ Add index for better query performance
      index: true,
    },
    isActive: {
      type: Boolean,
      default: true,
      // ✅ Add index for filtering
      index: true,
    },
    isDeleted: {
      type: Boolean,
      default: false,
      // ✅ Add index for soft delete queries
      index: true,
    },
    // ✅ Add deletion tracking
    deletedAt: {
      type: Date,
      default: null,
    },
    deletedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
    },
  },
  {
    timestamps: true,
    // ✅ Add optimistic concurrency control
    optimisticConcurrency: true,
  }
);

// ✅ Add compound indexes for better query performance
advertisementSchema.index({ isDeleted: 1, createdAt: -1 });
advertisementSchema.index({ companyName: 1, isDeleted: 1 });
advertisementSchema.index({ title: 1, companyName: 1, isDeleted: 1 });
advertisementSchema.index({ uploadedBy: 1, isDeleted: 1 });
advertisementSchema.index({ isActive: 1, isDeleted: 1 });

// ✅ Add pre-save middleware for data cleaning
advertisementSchema.pre("save", function (next) {
  // Clean up text fields
  if (this.isModified("title")) {
    this.title = this.title.trim();
  }
  if (this.isModified("companyName")) {
    this.companyName = this.companyName.trim();
  }
  if (this.isModified("description")) {
    this.description = this.description.trim();
  }

  // Set deletion timestamp
  if (this.isModified("isDeleted") && this.isDeleted && !this.deletedAt) {
    this.deletedAt = new Date();
  }

  next();
});

// ✅ Add static method for safe queries
advertisementSchema.statics.findActive = function (filter = {}) {
  return this.find({ ...filter, isDeleted: false, isActive: true });
};

// ✅ Add static method for admin queries (including deleted)
advertisementSchema.statics.findAllForAdmin = function (filter = {}) {
  return this.find(filter);
};

// ✅ Add virtual for frontend URL-safe title
advertisementSchema.virtual("slug").get(function () {
  return this.title
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .trim();
});

// ✅ Add virtual to check if image exists
advertisementSchema.virtual("hasImage").get(function () {
  return !!(this.image && this.image.url && this.image.public_id);
});

// ✅ Transform output to remove sensitive data
advertisementSchema.methods.toJSON = function () {
  const obj = this.toObject();

  // Don't expose deleted items to non-admin users
  if (obj.isDeleted && !this.isAdminView) {
    return null;
  }

  // Add computed fields
  obj.slug = this.slug;
  obj.hasImage = this.hasImage;

  return obj;
};

module.exports = mongoose.model("Advertisement", advertisementSchema);
