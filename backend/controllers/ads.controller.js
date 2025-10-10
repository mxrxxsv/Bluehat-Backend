const Joi = require("joi");
const xss = require("xss");
const mongoose = require("mongoose");
const cloudinary = require("cloudinary").v2;
const crypto = require("crypto");
const logger = require("../utils/logger");
const { encryptAES128, decryptAES128 } = require("../utils/encipher");

const Advertisement = require("../models/Advertisement");

// ==================== JOI SCHEMAS ====================
const advertisementSchema = Joi.object({
  title: Joi.string().trim().min(3).max(100).required().messages({
    "string.min": "Title must be at least 3 characters long",
    "string.max": "Title must not exceed 100 characters",
    "any.required": "Title is required",
  }),
  companyName: Joi.string().trim().min(2).max(100).required().messages({
    "string.min": "Company name must be at least 2 characters long",
    "string.max": "Company name must not exceed 100 characters",
    "any.required": "Company name is required",
  }),
  description: Joi.string().trim().min(10).max(1000).required().messages({
    "string.min": "Description must be at least 10 characters long",
    "string.max": "Description must not exceed 1000 characters",
    "any.required": "Description is required",
  }),
  link: Joi.string()
    .uri({ scheme: ["http", "https"] })
    .required()
    .messages({
      "string.uri": "Link must be a valid HTTP/HTTPS URL",
      "any.required": "Link is required",
    }),
});

const updateAdvertisementSchema = Joi.object({
  title: Joi.string().trim().min(3).max(100).optional(),
  companyName: Joi.string().trim().min(2).max(100).optional(),
  description: Joi.string().trim().min(10).max(1000).optional(),
  link: Joi.string()
    .uri({ scheme: ["http", "https"] })
    .optional(),
}).min(1);

const querySchema = Joi.object({
  companyName: Joi.string().trim().max(100).optional(),
  title: Joi.string().trim().max(100).optional(),
  sortBy: Joi.string()
    .valid("createdAt", "title", "companyName", "updatedAt")
    .default("createdAt"),
  order: Joi.string().valid("asc", "desc").default("desc"),
  page: Joi.number().integer().min(1).max(1000).default(1),
  limit: Joi.number().integer().min(1).max(100).default(10),
});

// ==================== HELPER FUNCTIONS ====================
const sanitizeInput = (input) => {
  if (typeof input === "string") {
    return xss(input.trim(), {
      whiteList: {},
      stripIgnoreTag: true,
      stripIgnoreTagBody: ["script"],
    });
  }
  if (typeof input === "object" && input !== null && !Array.isArray(input)) {
    const sanitized = {};
    for (const [key, value] of Object.entries(input)) {
      sanitized[key] = sanitizeInput(value);
    }
    return sanitized;
  }
  return input;
};

const escapeRegex = (str) => {
  return str ? str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") : "";
};

// ✅ Enhanced Cloudinary upload with retry logic
const uploadImageToCloudinary = async (file, adminId, retries = 3) => {
  const uploadId = `upload_${Date.now()}_${Math.random()
    .toString(36)
    .substr(2, 9)}`;

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      logger.info("Image upload initiated", {
        uploadId,
        adminId,
        attempt,
        filename: file.originalname,
        size: file.size,
        mimetype: file.mimetype,
      });

      const options = {
        folder: "advertisements",
        public_id: `ad_${Date.now()}_${adminId}`,
        transformation: [
          { width: 1200, height: 800, crop: "limit" },
          { quality: "auto:good" },
          { format: "auto" },
          { fetch_format: "auto" },
          { flags: "progressive" },
          { dpr: "auto" },
        ],
        allowed_formats: ["jpg", "jpeg", "png", "webp"],
        resource_type: "image",
        timeout: 60000,
      };

      const result = await cloudinary.uploader.upload(
        file.buffer
          ? `data:${file.mimetype};base64,${file.buffer.toString("base64")}`
          : file.path,
        options
      );

      logger.info("Image upload successful", {
        uploadId,
        publicId: result.public_id,
        url: result.secure_url,
        size: result.bytes,
        format: result.format,
      });

      return {
        url: result.secure_url,
        public_id: result.public_id,
        width: result.width,
        height: result.height,
        format: result.format,
        bytes: result.bytes,
        uploadId,
      };
    } catch (error) {
      logger.error(`Image upload attempt ${attempt} failed`, {
        uploadId,
        error: error.message,
        attempt,
        retriesLeft: retries - attempt,
      });

      if (attempt === retries) {
        throw new Error(
          `Image upload failed after ${retries} attempts: ${error.message}`
        );
      }

      await new Promise((resolve) =>
        setTimeout(resolve, Math.pow(2, attempt) * 1000)
      );
    }
  }
};

// ✅ Enhanced Cloudinary delete
const deleteImageFromCloudinary = async (public_id) => {
  try {
    if (!public_id) {
      logger.warn("No public_id provided for image deletion");
      return;
    }

    logger.info("Deleting image from Cloudinary", { public_id });

    const result = await cloudinary.uploader.destroy(public_id);

    if (result.result === "ok") {
      logger.info("Image successfully deleted from Cloudinary", {
        public_id,
        result: result.result,
      });
    } else {
      logger.warn("Image deletion returned unexpected result", {
        public_id,
        result,
      });
    }

    return result;
  } catch (error) {
    logger.error("Cloudinary delete error", {
      public_id,
      error: error.message,
      stack: error.stack,
    });
  }
};

// ==================== ENCRYPTION HELPERS ====================

// Encrypt sensitive advertisement data
const encryptAdData = (adData) => {
  try {
    const sensitiveFields = ["title", "companyName", "description", "link"];
    const encryptedData = { ...adData };

    sensitiveFields.forEach((field) => {
      if (encryptedData[field] && typeof encryptedData[field] === "string") {
        encryptedData[field] = encryptAES128(encryptedData[field]);
        logger.debug(`Encrypted field: ${field}`, {
          originalLength: adData[field].length,
          encryptedLength: encryptedData[field].length,
        });
      }
    });

    return encryptedData;
  } catch (error) {
    logger.error("Advertisement data encryption failed", {
      error: error.message,
      stack: error.stack,
    });
    throw new Error("Failed to encrypt advertisement data");
  }
};

// Decrypt sensitive advertisement data
const decryptAdData = (encryptedAdData) => {
  try {
    const sensitiveFields = ["title", "companyName", "description", "link"];
    const decryptedData = { ...encryptedAdData };

    sensitiveFields.forEach((field) => {
      if (decryptedData[field] && typeof decryptedData[field] === "string") {
        try {
          decryptedData[field] = decryptAES128(decryptedData[field]);
        } catch (decryptError) {
          logger.warn(`Failed to decrypt field: ${field}`, {
            error: decryptError.message,
            field: field,
          });
          // Keep original value if decryption fails (backward compatibility)
        }
      }
    });

    return decryptedData;
  } catch (error) {
    logger.error("Advertisement data decryption failed", {
      error: error.message,
      stack: error.stack,
    });
    // Return original data if decryption fails completely
    return encryptedAdData;
  }
};

// Decrypt array of advertisements
const decryptAdArray = (encryptedAds) => {
  return encryptedAds.map((ad) => {
    if (ad.toObject) {
      // Handle Mongoose documents
      return decryptAdData(ad.toObject());
    } else {
      // Handle plain objects
      return decryptAdData(ad);
    }
  });
};

// ==================== CONTROLLERS ====================

const addAds = async (req, res) => {
  const startTime = Date.now();

  try {
    // ✅ CRITICAL: Check admin authentication FIRST (double-check after middleware)
    if (!req.admin || !req.admin._id) {
      // If file was uploaded but auth failed, clean it up
      if (req.file && req.file.public_id) {
        setImmediate(async () => {
          await deleteImageFromCloudinary(req.file.public_id);
        });
      }

      logger.warn("Unauthorized advertisement creation attempt", {
        ip: req.ip,
        userAgent: req.get("User-Agent"),
        hasFile: !!req.file,
        timestamp: new Date().toISOString(),
      });

      return res.status(401).json({
        success: false,
        message: "Admin authentication required",
        code: "ADMIN_AUTH_REQUIRED",
      });
    }

    // ✅ Verify admin role (additional security)
    if (req.admin.role !== "admin") {
      logger.warn("Non-admin user attempted advertisement creation", {
        adminId: req.admin._id,
        role: req.admin.role,
        ip: req.ip,
      });

      return res.status(403).json({
        success: false,
        message: "Admin privileges required",
        code: "INSUFFICIENT_PRIVILEGES",
      });
    }

    // ✅ Use pre-validated data from middleware (no need to re-validate)
    const { title, companyName, description, link } = req.validatedData;

    logger.info("Using pre-validated advertisement data", {
      adminId: req.admin._id,
      title: title.substring(0, 20) + "...",
      companyName: companyName.substring(0, 20) + "...",
    });

    // ✅ Check for duplicates BEFORE file upload
    const duplicateCheckHash = crypto
      .createHash("sha256")
      .update(`${title.toLowerCase()}|${companyName.toLowerCase()}`)
      .digest("hex");

    const existingAds = await Advertisement.find({
      isDeleted: false,
    }).lean();

    let isDuplicate = false;
    for (const existingAd of existingAds) {
      try {
        const decryptedExisting = decryptAdData(existingAd);
        if (
          decryptedExisting.title?.toLowerCase() === title.toLowerCase() &&
          decryptedExisting.companyName?.toLowerCase() ===
            companyName.toLowerCase()
        ) {
          isDuplicate = true;
          break;
        }
      } catch (decryptError) {
        logger.warn("Could not decrypt ad for duplicate check", {
          adId: existingAd._id,
          error: decryptError.message,
        });
      }
    }

    if (isDuplicate) {
      return res.status(409).json({
        success: false,
        message: "Advertisement with similar title and company already exists",
        code: "DUPLICATE_ADVERTISEMENT",
      });
    }

    // ✅ File validation
    if (!req.file) {
      logger.warn("Advertisement creation attempted without image", {
        adminId: req.admin._id,
        ip: req.ip,
      });

      return res.status(400).json({
        success: false,
        message: "Advertisement image is required",
        code: "MISSING_IMAGE",
      });
    }

    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    const maxSize = 5 * 1024 * 1024; // 5MB

    if (!allowedTypes.includes(req.file.mimetype)) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid file type. Only JPEG, PNG, and WebP images are allowed.",
        code: "INVALID_FILE_TYPE",
      });
    }

    if (req.file.size > maxSize) {
      return res.status(400).json({
        success: false,
        message: `File size too large. Maximum size is ${Math.round(
          maxSize / 1024 / 1024
        )}MB.`,
        code: "FILE_TOO_LARGE",
      });
    }

    // ✅ Now upload image AFTER all validations pass
    logger.info("Starting image upload after validation", {
      filename: req.file.originalname,
      size: req.file.size,
      adminId: req.admin._id,
    });

    const uploadResult = await uploadImageToCloudinary(req.file, req.admin._id);

    // ✅ Encrypt sensitive data before saving
    const encryptedAdData = encryptAdData({
      title,
      companyName,
      description,
      link,
    });

    logger.info("Advertisement data encrypted successfully", {
      adminId: req.admin._id,
      originalTitle: title.substring(0, 10) + "...",
      encryptedTitle: encryptedAdData.title.substring(0, 20) + "...",
    });

    // ✅ Create advertisement with encrypted data
    const newAd = new Advertisement({
      title: encryptedAdData.title,
      companyName: encryptedAdData.companyName,
      description: encryptedAdData.description,
      image: {
        url: uploadResult.url,
        public_id: uploadResult.public_id,
      },
      link: encryptedAdData.link,
      uploadedBy: req.admin._id,
    });

    const savedAd = await newAd.save();
    await savedAd.populate("uploadedBy", "firstName lastName userName");

    const processingTime = Date.now() - startTime;

    logger.info("Advertisement created successfully", {
      adId: savedAd._id,
      title,
      companyName,
      adminId: req.admin._id,
      imageId: uploadResult.public_id,
      processingTime: `${processingTime}ms`,
      ip: req.ip,
    });

    // ✅ Decrypt data for response
    const decryptedAdData = decryptAdData(savedAd.toObject());

    res.status(201).json({
      success: true,
      message: "Advertisement created successfully",
      data: {
        ...decryptedAdData,
        imageInfo: {
          width: uploadResult.width,
          height: uploadResult.height,
          format: uploadResult.format,
          size: uploadResult.bytes,
        },
      },
      meta: {
        timestamp: new Date().toISOString(),
        processingTime: `${processingTime}ms`,
        encrypted: true, // Indicate data was encrypted
      },
    });
  } catch (err) {
    const processingTime = Date.now() - startTime;

    logger.error("Advertisement creation failed", {
      error: err.message,
      stack: err.stack,
      adminId: req.admin?._id,
      filename: req.file?.originalname,
      processingTime: `${processingTime}ms`,
      ip: req.ip,
    });

    if (err.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Duplicate advertisement detected",
        code: "DUPLICATE_KEY_ERROR",
      });
    }

    if (err.name === "ValidationError") {
      const mongooseErrors = Object.values(err.errors).map((e) => ({
        field: e.path,
        message: e.message,
        value: e.value,
      }));

      return res.status(400).json({
        success: false,
        message: "Database validation failed",
        code: "DB_VALIDATION_ERROR",
        errors: mongooseErrors,
      });
    }

    res.status(500).json({
      success: false,
      message: "Failed to create advertisement",
      code: "INTERNAL_ERROR",
      error: process.env.NODE_ENV === "production" ? undefined : err.message,
    });
  }
};

const updateAds = async (req, res) => {
  const startTime = Date.now();

  try {
    // ✅ CRITICAL: Check admin authentication FIRST
    if (!req.admin || !req.admin._id) {
      return res.status(401).json({
        success: false,
        message: "Admin authentication required",
        code: "ADMIN_AUTH_REQUIRED",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid advertisement ID format",
        code: "INVALID_ID_FORMAT",
      });
    }

    const sanitizedId = xss(req.params.id);

    // ✅ Find existing advertisement
    const existingAd = await Advertisement.findOne({
      _id: sanitizedId,
      isDeleted: false,
    });

    if (!existingAd) {
      return res.status(404).json({
        success: false,
        message: "Advertisement not found or already deleted",
        code: "AD_NOT_FOUND",
      });
    }

    // ✅ Authorization logging (Admins can update any advertisement)
    logger.info("Advertisement update attempt", {
      adId: sanitizedId,
      adminId: req.admin._id,
      ownerId: existingAd.uploadedBy,
      ip: req.ip,
    });

    // ✅ Validate text fields if provided
    let updateData = {};

    if (Object.keys(req.body).length > 0) {
      const { error, value } = updateAdvertisementSchema.validate(req.body, {
        abortEarly: false,
        stripUnknown: true,
      });

      if (error) {
        return res.status(400).json({
          success: false,
          message: "Validation failed",
          code: "VALIDATION_ERROR",
          errors: error.details.map((detail) => ({
            field: detail.path.join("."),
            message: detail.message,
          })),
        });
      }

      updateData = sanitizeInput(value);
    }

    // ✅ Handle image update with old image deletion
    let imageUpdateData = {};

    if (req.file) {
      const allowedTypes = [
        "image/jpeg",
        "image/jpg",
        "image/png",
        "image/webp",
      ];
      const maxSize = 5 * 1024 * 1024;

      if (!allowedTypes.includes(req.file.mimetype)) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid file type. Only JPEG, PNG, and WebP images are allowed.",
          code: "INVALID_FILE_TYPE",
        });
      }

      if (req.file.size > maxSize) {
        return res.status(400).json({
          success: false,
          message: "File size too large. Maximum size is 5MB.",
          code: "FILE_TOO_LARGE",
        });
      }

      logger.info("Updating advertisement image", {
        adId: sanitizedId,
        filename: req.file.originalname,
        size: req.file.size,
        adminId: req.admin._id,
        oldImageId: existingAd.image.public_id,
      });

      // ✅ Upload new image first
      const uploadResult = await uploadImageToCloudinary(
        req.file,
        req.admin._id
      );

      // ✅ Delete old image from Cloudinary
      if (existingAd.image && existingAd.image.public_id) {
        logger.info("Deleting old image", {
          publicId: existingAd.image.public_id,
          adId: sanitizedId,
        });

        // Delete asynchronously to not block the response
        setImmediate(async () => {
          await deleteImageFromCloudinary(existingAd.image.public_id);
        });
      }

      imageUpdateData = {
        image: {
          url: uploadResult.url,
          public_id: uploadResult.public_id,
        },
      };
    }

    // ✅ URL validation for updated link
    if (updateData.link) {
      try {
        const url = new URL(updateData.link);
        const blockedDomains = ["localhost", "127.0.0.1", "0.0.0.0"];
        if (blockedDomains.includes(url.hostname)) {
          return res.status(400).json({
            success: false,
            message: "Invalid link domain",
            code: "INVALID_DOMAIN",
          });
        }
      } catch (urlError) {
        return res.status(400).json({
          success: false,
          message: "Invalid link URL format",
          code: "INVALID_URL",
        });
      }
    }

    // ✅ Combine all updates
    let allUpdates = {
      ...updateData,
      ...imageUpdateData,
      updatedAt: new Date(),
    };

    if (Object.keys(allUpdates).length <= 1) {
      // Only updatedAt
      return res.status(400).json({
        success: false,
        message: "No valid fields provided for update",
        code: "NO_UPDATE_FIELDS",
      });
    }

    // ✅ Encrypt sensitive text fields if they are being updated
    if (updateData && Object.keys(updateData).length > 0) {
      const encryptedUpdateData = encryptAdData(updateData);
      allUpdates = {
        ...encryptedUpdateData,
        ...imageUpdateData,
        updatedAt: new Date(),
      };

      logger.info("Advertisement update data encrypted", {
        adId: sanitizedId,
        adminId: req.admin._id,
        fieldsToUpdate: Object.keys(updateData),
        encryptedFields: Object.keys(encryptedUpdateData),
      });
    }

    // ✅ Update advertisement
    const updatedAd = await Advertisement.findOneAndUpdate(
      { _id: sanitizedId, isDeleted: false },
      { $set: allUpdates },
      { new: true, runValidators: true }
    ).populate("uploadedBy", "firstName lastName userName");

    const processingTime = Date.now() - startTime;

    logger.info("Advertisement updated successfully", {
      adId: sanitizedId,
      adminId: req.admin._id,
      updatedFields: Object.keys(updateData),
      imageUpdated: !!req.file,
      processingTime: `${processingTime}ms`,
      ip: req.ip,
    });

    // ✅ Decrypt data for response
    const decryptedAdData = decryptAdData(updatedAd.toObject());

    res.status(200).json({
      success: true,
      message: "Advertisement updated successfully",
      data: decryptedAdData,
      meta: {
        timestamp: new Date().toISOString(),
        processingTime: `${processingTime}ms`,
        encrypted: true, // Indicate data was encrypted
      },
    });
  } catch (err) {
    const processingTime = Date.now() - startTime;

    logger.error("Advertisement update failed", {
      error: err.message,
      stack: err.stack,
      adId: req.params.id,
      adminId: req.admin?._id,
      processingTime: `${processingTime}ms`,
      ip: req.ip,
    });

    if (err.name === "ValidationError") {
      const mongooseErrors = Object.values(err.errors).map((e) => ({
        field: e.path,
        message: e.message,
        value: e.value,
      }));

      return res.status(400).json({
        success: false,
        message: "Database validation failed",
        code: "DB_VALIDATION_ERROR",
        errors: mongooseErrors,
      });
    }

    res.status(500).json({
      success: false,
      message: "Failed to update advertisement",
      code: "INTERNAL_ERROR",
      error: process.env.NODE_ENV === "production" ? undefined : err.message,
    });
  }
};

const deleteAds = async (req, res) => {
  const startTime = Date.now();

  try {
    // ✅ CRITICAL: Check admin authentication FIRST
    if (!req.admin || !req.admin._id) {
      return res.status(401).json({
        success: false,
        message: "Admin authentication required",
        code: "ADMIN_AUTH_REQUIRED",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid advertisement ID format",
        code: "INVALID_ID_FORMAT",
      });
    }

    const sanitizedId = xss(req.params.id);

    const existingAd = await Advertisement.findOne({
      _id: sanitizedId,
      isDeleted: false,
    });

    if (!existingAd) {
      return res.status(404).json({
        success: false,
        message: "Advertisement not found or already deleted",
        code: "AD_NOT_FOUND",
      });
    }

    // ✅ Authorization logging (Admins can delete any advertisement)
    logger.info("Advertisement deletion initiated", {
      adId: sanitizedId,
      adminId: req.admin._id,
      ownerId: existingAd.uploadedBy,
      title: existingAd.title,
      ip: req.ip,
    });

    // ✅ Soft delete
    const deletedAd = await Advertisement.findOneAndUpdate(
      { _id: sanitizedId, isDeleted: false },
      {
        $set: {
          isDeleted: true,
          isActive: false,
          deletedAt: new Date(),
          deletedBy: req.admin._id,
        },
      },
      { new: true }
    );

    // ✅ Delete image from Cloudinary asynchronously
    if (deletedAd && deletedAd.image && deletedAd.image.public_id) {
      setImmediate(async () => {
        await deleteImageFromCloudinary(deletedAd.image.public_id);
      });
    }

    const processingTime = Date.now() - startTime;

    logger.info("Advertisement deleted successfully", {
      adId: sanitizedId,
      title: deletedAd.title,
      adminId: req.admin._id,
      imageId: deletedAd.image?.public_id,
      processingTime: `${processingTime}ms`,
      ip: req.ip,
    });

    res.status(200).json({
      success: true,
      message: "Advertisement deleted successfully",
      data: {
        id: deletedAd._id,
        title: deletedAd.title,
        deletedAt: deletedAd.deletedAt,
        deletedBy: req.admin._id,
      },
    });
  } catch (err) {
    const processingTime = Date.now() - startTime;

    logger.error("Advertisement deletion failed", {
      error: err.message,
      adId: req.params.id,
      adminId: req.admin?._id,
      processingTime: `${processingTime}ms`,
      ip: req.ip,
    });

    res.status(500).json({
      success: false,
      message: "Failed to delete advertisement",
      error: process.env.NODE_ENV === "production" ? undefined : err.message,
    });
  }
};

// ✅ Keep getAds and getAdsByID unchanged since they don't require admin auth
const getAds = async (req, res) => {
  const startTime = Date.now();

  try {
    const { error, value } = querySchema.validate(req.query, {
      stripUnknown: true,
      convert: true,
    });

    if (error) {
      return res.status(400).json({
        success: false,
        message: "Invalid query parameters",
        errors: error.details.map((detail) => ({
          field: detail.path.join("."),
          message: detail.message,
        })),
        code: "VALIDATION_ERROR",
      });
    }

    const sanitizedQuery = sanitizeInput(value);
    const { companyName, title, sortBy, order, page, limit } = sanitizedQuery;

    // ✅ Modified search approach for encrypted data
    let ads, total;

    if (companyName || title) {
      // When search is requested, fetch all active ads and filter after decryption
      logger.info("Performing encrypted data search", {
        searchTitle: title ? "***" : null,
        searchCompany: companyName ? "***" : null,
      });

      const allAds = await Advertisement.find({
        isDeleted: false,
        isActive: true,
      })
        .populate("uploadedBy", "firstName lastName userName")
        .sort({ [sortBy]: order === "asc" ? 1 : -1 })
        .lean();

      // Decrypt and filter
      const decryptedAds = [];
      for (const ad of allAds) {
        try {
          const decryptedAd = decryptAdData(ad);

          // Apply search filters
          let matches = true;
          if (
            title &&
            !decryptedAd.title?.toLowerCase().includes(title.toLowerCase())
          ) {
            matches = false;
          }
          if (
            companyName &&
            !decryptedAd.companyName
              ?.toLowerCase()
              .includes(companyName.toLowerCase())
          ) {
            matches = false;
          }

          if (matches) {
            decryptedAds.push(decryptedAd);
          }
        } catch (decryptError) {
          logger.warn("Could not decrypt ad for search", {
            adId: ad._id,
            error: decryptError.message,
          });
        }
      }

      // Apply pagination to filtered results
      total = decryptedAds.length;
      const startIndex = (page - 1) * limit;
      ads = decryptedAds.slice(startIndex, startIndex + limit);
    } else {
      // No search filters, use normal pagination
      const baseFilter = {
        isDeleted: false,
        isActive: true,
      };

      const [fetchedAds, totalCount] = await Promise.all([
        Advertisement.find(baseFilter)
          .populate("uploadedBy", "firstName lastName userName")
          .sort({ [sortBy]: order === "asc" ? 1 : -1 })
          .skip((page - 1) * limit)
          .limit(limit)
          .lean(),
        Advertisement.countDocuments(baseFilter),
      ]);

      // Decrypt the paginated results
      ads = decryptAdArray(fetchedAds);
      total = totalCount;
    }

    const totalPages = Math.ceil(total / limit);
    const processingTime = Date.now() - startTime;

    logger.info("Advertisements retrieved and decrypted", {
      totalAds: ads.length,
      searchPerformed: !!(companyName || title),
      processingTime: `${processingTime}ms`,
    });

    res.set({
      "Cache-Control": "public, max-age=300",
      ETag: `"ads-${total}-${page}-${limit}"`,
    });

    res.status(200).json({
      success: true,
      message: "Advertisements retrieved successfully",
      data: {
        advertisements: ads, // Already decrypted
        pagination: {
          currentPage: page,
          totalPages,
          totalItems: total,
          itemsPerPage: limit,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1,
        },
        filters: {
          companyName: companyName || null,
          title: title || null,
          sortBy,
          order,
        },
      },
      meta: {
        timestamp: new Date().toISOString(),
        processingTime: `${processingTime}ms`,
        cached: false,
        encrypted: true, // Indicate data was encrypted and decrypted
      },
    });
  } catch (err) {
    const processingTime = Date.now() - startTime;

    logger.error("Get advertisements failed", {
      error: err.message,
      stack: err.stack,
      query: req.query,
      processingTime: `${processingTime}ms`,
      ip: req.ip,
    });

    res.status(500).json({
      success: false,
      message: "Failed to fetch advertisements",
      error: process.env.NODE_ENV === "production" ? undefined : err.message,
    });
  }
};

const getAdsByID = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid advertisement ID format",
        code: "INVALID_ID_FORMAT",
      });
    }

    const sanitizedId = xss(req.params.id);

    const ad = await Advertisement.findOne({
      _id: sanitizedId,
      isDeleted: false,
      isActive: true,
    })
      .populate("uploadedBy", "firstName lastName userName")
      .lean();

    if (!ad) {
      return res.status(404).json({
        success: false,
        message: "Advertisement not found",
        code: "AD_NOT_FOUND",
      });
    }

    // ✅ Decrypt advertisement data before returning
    const decryptedAd = decryptAdData(ad);

    logger.info("Single advertisement retrieved and decrypted", {
      adId: sanitizedId,
      title: decryptedAd.title?.substring(0, 20) + "...",
    });

    res.set({
      "Cache-Control": "public, max-age=600",
      ETag: `"ad-${ad._id}-${ad.updatedAt}"`,
    });

    res.status(200).json({
      success: true,
      message: "Advertisement retrieved successfully",
      data: decryptedAd,
      meta: {
        encrypted: true, // Indicate data was encrypted and decrypted
      },
    });
  } catch (err) {
    logger.error("Get advertisement by ID failed", {
      error: err.message,
      id: req.params.id,
      ip: req.ip,
    });

    res.status(500).json({
      success: false,
      message: "Error retrieving advertisement",
      error: process.env.NODE_ENV === "production" ? undefined : err.message,
    });
  }
};

module.exports = {
  getAds,
  getAdsByID,
  addAds,
  updateAds,
  deleteAds,
};
