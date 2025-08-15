const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const Advertisement = require("../models/Advertisement");
const verifyAdmin = require("../middleware/verifyAdmin");
const multer = require("multer");
const streamifier = require("streamifier");
const crypto = require("crypto");
const mongoSanitize = require("mongo-sanitize");
const { escape } = require("validator");
const { authLimiter } = require("../utils/rateLimit");

// Import cloudinary the same way as your upload route
const { cloudinary } = require("../db/cloudinary");

// ==================== MULTER CONFIGURATION ====================

// Use memory storage like your upload route
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    // Check file type
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are allowed!"), false);
    }
  },
});

// Allowed file types (same as your upload route)
const allowedMimeTypes = ["image/jpeg", "image/png", "image/webp"];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

// ==================== CLOUDINARY HELPERS ====================

// Upload to Cloudinary helper (same pattern as your upload route)
const uploadToCloudinary = (file, folder, options = {}) => {
  return new Promise((resolve, reject) => {
    const defaultOptions = {
      folder: folder,
      resource_type: "image",
      format: "webp", // Convert to webp for performance
      transformation: [
        { width: 800, height: 600, crop: "limit" },
        { quality: "auto" },
        { fetch_format: "auto" },
      ],
      ...options,
    };

    const uploadStream = cloudinary.uploader.upload_stream(
      defaultOptions,
      (error, result) => {
        if (error) {
          console.error("Cloudinary Upload Error:", error);
          reject(error);
        } else {
          resolve(result);
        }
      }
    );

    streamifier.createReadStream(file.buffer).pipe(uploadStream);
  });
};

// Delete from Cloudinary helper (same as your upload route)
const deleteFromCloudinary = async (public_id) => {
  try {
    const result = await cloudinary.uploader.destroy(public_id);
    console.log("🗑️ Image deleted from Cloudinary:", result);
    return result;
  } catch (err) {
    console.error("Cloudinary deletion error:", err.message);
    throw err;
  }
};

// ==================== ADVERTISEMENT ROUTES ====================

// CREATE Advertisement with Image Upload (Admin only)
router.post(
  "/",
  authLimiter,
  verifyAdmin,
  upload.single("image"),
  async (req, res) => {
    try {
      // Sanitize input (same pattern as your upload route)
      const { title, companyName, description, link } = mongoSanitize(req.body);

      // Validation
      if (!title || !companyName || !description || !link) {
        return res.status(400).json({
          success: false,
          message:
            "All fields are required (title, companyName, description, link)",
        });
      }

      // Validate link format
      const urlRegex = /^https?:\/\/.+/i;
      if (!urlRegex.test(link)) {
        return res.status(400).json({
          success: false,
          message: "Link must be a valid URL starting with http:// or https://",
        });
      }

      // Check if image was uploaded
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: "Advertisement image is required",
        });
      }

      // Validate file size and type (same as your upload route)
      if (req.file.size > MAX_FILE_SIZE) {
        return res.status(400).json({
          success: false,
          message: "File size exceeds 5MB limit.",
        });
      }

      if (!allowedMimeTypes.includes(req.file.mimetype)) {
        return res.status(400).json({
          success: false,
          message: "Invalid file type. Only JPG, PNG, and WEBP are allowed.",
        });
      }

      // Generate file hash (same as your upload route)
      const fileHash = crypto
        .createHash("sha256")
        .update(req.file.buffer)
        .digest("hex");

      try {
        // Upload to Cloudinary using your pattern
        const uploadResult = await uploadToCloudinary(
          req.file,
          "fixit/advertisements",
          {
            transformation: [
              { width: 800, height: 600, crop: "fill", gravity: "auto" },
              { quality: "auto" },
              { fetch_format: "auto" },
            ],
          }
        );

        // Create advertisement
        const newAd = new Advertisement({
          title: escape(title),
          companyName: escape(companyName),
          description: escape(description),
          imageUrl: uploadResult.secure_url,
          imagePublicId: uploadResult.public_id,
          link: link,
          uploadedBy: req.admin._id,
          imageHash: fileHash, // Store hash for duplicate detection
        });

        const savedAd = await newAd.save();

        // Populate admin info for response
        await savedAd.populate("uploadedBy", "firstName lastName userName");

        res.status(201).json({
          success: true,
          message: "Advertisement created successfully",
          data: {
            id: savedAd._id,
            title: savedAd.title,
            companyName: savedAd.companyName,
            description: savedAd.description,
            imageUrl: savedAd.imageUrl,
            link: savedAd.link,
            isActive: savedAd.isActive,
            uploadedBy: savedAd.uploadedBy,
            createdAt: savedAd.createdAt,
          },
        });
      } catch (uploadError) {
        console.error("Image upload failed:", uploadError);
        return res.status(500).json({
          success: false,
          message: "Failed to upload image to cloud storage",
        });
      }
    } catch (err) {
      console.error("Create advertisement error:", err);
      res.status(500).json({
        success: false,
        message: "Failed to create advertisement",
        error:
          process.env.NODE_ENV === "production"
            ? "Internal server error"
            : err.message,
      });
    }
  }
);

// UPDATE Advertisement (Admin only)
router.put(
  "/:id",
  authLimiter,
  verifyAdmin,
  upload.single("image"),
  async (req, res) => {
    try {
      if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        return res.status(400).json({
          success: false,
          message: "Invalid advertisement ID",
        });
      }

      // Find existing advertisement
      const existingAd = await Advertisement.findById(
        mongoSanitize(req.params.id)
      );
      if (!existingAd || existingAd.isDeleted) {
        return res.status(404).json({
          success: false,
          message: "Advertisement not found",
        });
      }

      // Sanitize input
      const updateData = {};
      const { title, companyName, description, link } = mongoSanitize(req.body);

      if (title) updateData.title = escape(title);
      if (companyName) updateData.companyName = escape(companyName);
      if (description) updateData.description = escape(description);
      if (link) {
        // Validate link format
        const urlRegex = /^https?:\/\/.+/i;
        if (!urlRegex.test(link)) {
          return res.status(400).json({
            success: false,
            message:
              "Link must be a valid URL starting with http:// or https://",
          });
        }
        updateData.link = link;
      }

      // Handle image update
      if (req.file) {
        // Validate new image
        if (req.file.size > MAX_FILE_SIZE) {
          return res.status(400).json({
            success: false,
            message: "File size exceeds 5MB limit.",
          });
        }

        if (!allowedMimeTypes.includes(req.file.mimetype)) {
          return res.status(400).json({
            success: false,
            message: "Invalid file type. Only JPG, PNG, and WEBP are allowed.",
          });
        }

        try {
          // Upload new image
          const uploadResult = await uploadToCloudinary(
            req.file,
            "fixit/advertisements",
            {
              transformation: [
                { width: 800, height: 600, crop: "fill", gravity: "auto" },
                { quality: "auto" },
                { fetch_format: "auto" },
              ],
            }
          );

          // Delete old image after successful upload
          if (existingAd.imagePublicId) {
            try {
              await deleteFromCloudinary(existingAd.imagePublicId);
            } catch (deleteError) {
              console.error("Error deleting old image:", deleteError);
              // Continue anyway, don't fail the update
            }
          }

          // Generate new file hash
          const fileHash = crypto
            .createHash("sha256")
            .update(req.file.buffer)
            .digest("hex");

          updateData.imageUrl = uploadResult.secure_url;
          updateData.imagePublicId = uploadResult.public_id;
          updateData.imageHash = fileHash;
        } catch (uploadError) {
          console.error("Image upload failed:", uploadError);
          return res.status(500).json({
            success: false,
            message: "Failed to upload new image",
          });
        }
      }

      const updatedAd = await Advertisement.findByIdAndUpdate(
        existingAd._id,
        { $set: updateData },
        { new: true, runValidators: true }
      ).populate("uploadedBy", "firstName lastName userName");

      res.status(200).json({
        success: true,
        message: "Advertisement updated successfully",
        data: updatedAd,
      });
    } catch (err) {
      console.error("Update advertisement error:", err);
      res.status(500).json({
        success: false,
        message: "Failed to update advertisement",
        error:
          process.env.NODE_ENV === "production"
            ? "Internal server error"
            : err.message,
      });
    }
  }
);

// GET All Advertisements (Admin Panel - includes deleted)
router.get("/admin", verifyAdmin, async (req, res) => {
  try {
    const {
      companyName,
      isActive,
      includeDeleted = "false",
      sortBy = "createdAt",
      order = "desc",
      page = 1,
      limit = 10,
    } = req.query;

    // Build filter
    const filter = {};

    if (includeDeleted !== "true") {
      filter.isDeleted = false;
    }

    if (companyName) {
      filter.companyName = new RegExp(mongoSanitize(companyName), "i");
    }

    if (isActive !== undefined) {
      filter.isActive = isActive === "true";
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const ads = await Advertisement.find(filter)
      .populate("uploadedBy", "firstName lastName userName")
      .sort({ [mongoSanitize(sortBy)]: order === "asc" ? 1 : -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Advertisement.countDocuments(filter);
    const totalPages = Math.ceil(total / parseInt(limit));

    res.status(200).json({
      success: true,
      message: "Advertisements retrieved successfully",
      data: {
        advertisements: ads,
        pagination: {
          currentPage: parseInt(page),
          totalPages,
          totalItems: total,
          itemsPerPage: parseInt(limit),
          hasNextPage: parseInt(page) < totalPages,
          hasPrevPage: parseInt(page) > 1,
        },
      },
    });
  } catch (err) {
    console.error("Get advertisements error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to fetch advertisements",
      error: err.message,
    });
  }
});

// GET All Active Advertisements (Public - for app users)
router.get("/", async (req, res) => {
  try {
    const {
      companyName,
      sortBy = "createdAt",
      order = "desc",
      page = 1,
      limit = 10,
    } = req.query;

    // Build filter (only active and non-deleted)
    const filter = {
      isDeleted: false,
      isActive: true,
    };

    if (companyName) {
      filter.companyName = new RegExp(mongoSanitize(companyName), "i");
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const ads = await Advertisement.find(filter)
      .select("title companyName description imageUrl link createdAt") // Don't expose admin info
      .sort({ [mongoSanitize(sortBy)]: order === "asc" ? 1 : -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Advertisement.countDocuments(filter);
    const totalPages = Math.ceil(total / parseInt(limit));

    res.status(200).json({
      success: true,
      message: "Active advertisements retrieved successfully",
      data: {
        advertisements: ads,
        pagination: {
          currentPage: parseInt(page),
          totalPages,
          totalItems: total,
          itemsPerPage: parseInt(limit),
          hasNextPage: parseInt(page) < totalPages,
          hasPrevPage: parseInt(page) > 1,
        },
      },
    });
  } catch (err) {
    console.error("Get public advertisements error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to fetch advertisements",
    });
  }
});

// GET Advertisement by ID
router.get("/:id", async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid advertisement ID",
      });
    }

    const ad = await Advertisement.findOne({
      _id: mongoSanitize(req.params.id),
      isDeleted: false,
      isActive: true,
    }).select("title companyName description imageUrl link createdAt");

    if (!ad) {
      return res.status(404).json({
        success: false,
        message: "Advertisement not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Advertisement retrieved successfully",
      data: ad,
    });
  } catch (err) {
    console.error("Get advertisement by ID error:", err);
    res.status(500).json({
      success: false,
      message: "Error retrieving advertisement",
    });
  }
});

// TOGGLE Advertisement Active Status (Admin only)
router.patch(
  "/:id/toggle-status",
  authLimiter,
  verifyAdmin,
  async (req, res) => {
    try {
      if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        return res.status(400).json({
          success: false,
          message: "Invalid advertisement ID",
        });
      }

      const ad = await Advertisement.findById(mongoSanitize(req.params.id));
      if (!ad || ad.isDeleted) {
        return res.status(404).json({
          success: false,
          message: "Advertisement not found",
        });
      }

      ad.isActive = !ad.isActive;
      await ad.save();

      res.status(200).json({
        success: true,
        message: `Advertisement ${
          ad.isActive ? "activated" : "deactivated"
        } successfully`,
        data: {
          id: ad._id,
          title: ad.title,
          isActive: ad.isActive,
        },
      });
    } catch (err) {
      console.error("Toggle advertisement status error:", err);
      res.status(500).json({
        success: false,
        message: "Failed to toggle advertisement status",
      });
    }
  }
);

// SOFT DELETE Advertisement (Admin only)
router.delete("/:id", authLimiter, verifyAdmin, async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid advertisement ID",
      });
    }

    const deletedAd = await Advertisement.findByIdAndUpdate(
      mongoSanitize(req.params.id),
      {
        isDeleted: true,
        isActive: false, // Also deactivate when deleting
        deletedAt: new Date(),
        deletedBy: req.admin._id,
      },
      { new: true }
    );

    if (!deletedAd) {
      return res.status(404).json({
        success: false,
        message: "Advertisement not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Advertisement deleted successfully",
      data: {
        id: deletedAd._id,
        title: deletedAd.title,
        deletedAt: deletedAd.deletedAt,
      },
    });
  } catch (err) {
    console.error("Delete advertisement error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to delete advertisement",
    });
  }
});

// PERMANENTLY DELETE Advertisement (Admin only - also deletes from Cloudinary)
router.delete("/:id/permanent", authLimiter, verifyAdmin, async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid advertisement ID",
      });
    }

    const ad = await Advertisement.findById(mongoSanitize(req.params.id));
    if (!ad) {
      return res.status(404).json({
        success: false,
        message: "Advertisement not found",
      });
    }

    // Delete image from Cloudinary
    if (ad.imagePublicId) {
      try {
        await deleteFromCloudinary(ad.imagePublicId);
      } catch (deleteError) {
        console.error("Error deleting image from Cloudinary:", deleteError);
      }
    }

    // Delete from database
    await Advertisement.findByIdAndDelete(ad._id);

    res.status(200).json({
      success: true,
      message: "Advertisement permanently deleted successfully",
      data: {
        id: ad._id,
        title: ad.title,
      },
    });
  } catch (err) {
    console.error("Permanent delete advertisement error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to permanently delete advertisement",
    });
  }
});

module.exports = router;
