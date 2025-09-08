const Joi = require("joi");
const xss = require("xss");
const mongoose = require("mongoose");
const logger = require("../utils/logger");
const Client = require("../models/Client");
const Worker = require("../models/Worker");
const SkillCategory = require("../models/SkillCategory");
const cloudinary = require("../db/cloudinary");
const { encryptAES128, decryptAES128 } = require("../utils/encipher");

// ✅ VALIDATION SCHEMAS
const profilePictureSchema = Joi.object({
  image: Joi.any().required(),
});

const updateBasicProfileSchema = Joi.object({
  firstName: Joi.string().min(2).max(50).required(),
  lastName: Joi.string().min(2).max(50).required(),
  middleName: Joi.string().max(50).allow("", null),
  suffixName: Joi.string().max(10).allow("", null),
  contactNumber: Joi.string()
    .pattern(/^[0-9+\-\s()]+$/)
    .min(7)
    .max(20)
    .required(),
  sex: Joi.string()
    .valid("male", "female", "other", "prefer not to say")
    .required(),
  dateOfBirth: Joi.date().iso().max("now").required(),
  maritalStatus: Joi.string()
    .valid(
      "single",
      "married",
      "separated",
      "divorced",
      "widowed",
      "prefer not to say"
    )
    .required(),
  address: Joi.object({
    region: Joi.string().min(2).max(100).required(),
    province: Joi.string().min(2).max(100).required(),
    city: Joi.string().min(2).max(100).required(),
    barangay: Joi.string().min(2).max(100).required(),
    street: Joi.string().min(2).max(200).required(),
  }).required(),
});

const updateWorkerBiographySchema = Joi.object({
  biography: Joi.string().max(1000).allow(""),
});

const createPortfolioSchema = Joi.object({
  projectTitle: Joi.string().min(2).max(100).required(),
  description: Joi.string().min(10).max(500).required(),
});

const updatePortfolioSchema = Joi.object({
  portfolioId: Joi.string().hex().length(24).required(),
  projectTitle: Joi.string().min(2).max(100).required(),
  description: Joi.string().min(10).max(500).required(),
});

const addExperienceSchema = Joi.object({
  companyName: Joi.string().min(2).max(100).required(),
  position: Joi.string().min(2).max(100).required(),
  startYear: Joi.number()
    .integer()
    .min(1900)
    .max(new Date().getFullYear())
    .required(),
  endYear: Joi.number()
    .integer()
    .min(1900)
    .max(new Date().getFullYear())
    .allow(null),
  responsibilities: Joi.string().max(500).allow(""),
});

const addSkillCategorySchema = Joi.object({
  skillCategoryId: Joi.string().hex().length(24).required(),
});

const paramIdSchema = Joi.object({
  id: Joi.string().hex().length(24).required(),
});

// ✅ UTILITY FUNCTIONS
const sanitizeInput = (data) => {
  if (typeof data === "string") {
    return xss(data.trim());
  }
  if (typeof data === "object" && data !== null) {
    const sanitized = {};
    for (const [key, value] of Object.entries(data)) {
      sanitized[key] = sanitizeInput(value);
    }
    return sanitized;
  }
  return data;
};

const handleProfileError = (err, res, operation, req) => {
  logger.error(`${operation} failed`, {
    error: err.message,
    stack: err.stack,
    userId: req.user?._id,
    userType: req.user?.userType,
    ip: req.ip,
    userAgent: req.get("User-Agent"),
    timestamp: new Date().toISOString(),
  });

  if (err.name === "ValidationError") {
    return res.status(400).json({
      success: false,
      message: "Validation failed",
      code: "VALIDATION_ERROR",
      errors: Object.values(err.errors).map((e) => ({
        field: e.path,
        message: e.message,
      })),
    });
  }

  if (err.name === "CastError") {
    return res.status(400).json({
      success: false,
      message: "Invalid ID format",
      code: "INVALID_ID",
    });
  }

  return res.status(500).json({
    success: false,
    message: "Internal server error",
    code: "INTERNAL_ERROR",
  });
};

// ✅ PROFILE PICTURE CONTROLLERS
const uploadProfilePicture = async (req, res) => {
  const startTime = Date.now();

  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No image file provided",
        code: "NO_FILE",
      });
    }

    const Model = req.user.userType === "client" ? Client : Worker;
    const profile = await Model.findOne({ credentialId: req.user.id }); 

    if (!profile) {
      return res.status(404).json({
        success: false,
        message: "Profile not found",
        code: "PROFILE_NOT_FOUND",
      });
    }

    // ✅ Delete old profile picture if exists
    if (profile.profilePicture?.public_id) {
      try {
        await cloudinary.uploader.destroy(profile.profilePicture.public_id);
      } catch (deleteError) {
        logger.warn("Failed to delete old profile picture", {
          publicId: profile.profilePicture.public_id,
          error: deleteError.message,
          userId: req.user.id,
        });
      }
    }

    // ✅ Upload new image
    const uploadResult = await new Promise((resolve, reject) => {
      cloudinary.uploader
        .upload_stream(
          {
            folder: "profile_pictures",
            public_id: `${req.user.userType}_${req.user.id}_${Date.now()}`, 
            transformation: [
              { width: 500, height: 500, crop: "fill", gravity: "face" },
              { quality: "auto", fetch_format: "auto" },
            ],
          },
          (error, result) => {
            if (error) reject(error);
            else resolve(result);
          }
        )
        .end(req.file.buffer);
    });

    // ✅ Update profile
    profile.profilePicture = {
      url: uploadResult.secure_url,
      public_id: uploadResult.public_id,
    };
    await profile.save();

    const processingTime = Date.now() - startTime;

    logger.info("Profile picture uploaded successfully", {
      userId: req.user.id,
      userType: req.user.userType,
      profileId: profile._id,
      imageUrl: uploadResult.secure_url,
      imageSize: req.file.size,
      ip: req.ip,
      userAgent: req.get("User-Agent"),
      processingTime: `${processingTime}ms`,
      timestamp: new Date().toISOString(),
    });

    return res.status(200).json({
      success: true,
      message: "Profile picture uploaded successfully",
      data: { image: uploadResult.secure_url },
    });
  } catch (err) {
    const processingTime = Date.now() - startTime;

    logger.error("Profile picture upload failed", {
      error: err.message,
      stack: err.stack,
      userId: req.user?.id, 
      ip: req.ip,
      processingTime: `${processingTime}ms`,
      timestamp: new Date().toISOString(),
    });

    return res.status(500).json({
      success: false,
      message: "Server error during image upload",
      code: "UPLOAD_ERROR",
    });
  }
};


const removeProfilePicture = async (req, res) => {
  const startTime = Date.now();

  try {
    const Model = req.user.userType === "client" ? Client : Worker;
    const profile = await Model.findOne({ credentialId: req.user._id });

    if (!profile) {
      return res.status(404).json({
        success: false,
        message: "Profile not found",
        code: "PROFILE_NOT_FOUND",
      });
    }

    if (!profile.profilePicture?.public_id) {
      return res.status(404).json({
        success: false,
        message: "No profile picture found",
        code: "NO_PICTURE",
      });
    }

    // ✅ Delete from Cloudinary
    await cloudinary.uploader.destroy(profile.profilePicture.public_id);

    // ✅ Update profile
    profile.profilePicture = { url: "", public_id: "" };
    await profile.save();

    const processingTime = Date.now() - startTime;

    logger.info("Profile picture removed successfully", {
      userId: req.user._id,
      userType: req.user.userType,
      profileId: profile._id,
      ip: req.ip,
      userAgent: req.get("User-Agent"),
      processingTime: `${processingTime}ms`,
      timestamp: new Date().toISOString(),
    });

    res.status(200).json({
      success: true,
      message: "Profile picture removed successfully",
      code: "PICTURE_REMOVED",
      meta: {
        processingTime: `${processingTime}ms`,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (err) {
    return handleProfileError(err, res, "Remove profile picture", req);
  }
};

// ✅ BASIC PROFILE CONTROLLERS
const updateBasicProfile = async (req, res) => {
  const startTime = Date.now();

  try {
    // ✅ Validate input
    const { error, value } = updateBasicProfileSchema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      logger.warn("Basic profile update validation failed", {
        errors: error.details,
        userId: req.user._id,
        userType: req.user.userType,
        ip: req.ip,
        timestamp: new Date().toISOString(),
      });

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

    const sanitizedData = sanitizeInput(value);

    // ✅ Encrypt sensitive data
    const encryptedData = {
      ...sanitizedData,
      firstName: encryptAES128(sanitizedData.firstName),
      lastName: encryptAES128(sanitizedData.lastName),
      middleName: sanitizedData.middleName
        ? encryptAES128(sanitizedData.middleName)
        : null,
      suffixName: sanitizedData.suffixName
        ? encryptAES128(sanitizedData.suffixName)
        : null,
      contactNumber: encryptAES128(sanitizedData.contactNumber),
    };

    const Model = req.user.userType === "client" ? Client : Worker;
    const profile = await Model.findOneAndUpdate(
      { credentialId: req.user._id },
      encryptedData,
      { new: true, runValidators: true }
    );

    if (!profile) {
      return res.status(404).json({
        success: false,
        message: "Profile not found",
        code: "PROFILE_NOT_FOUND",
      });
    }

    const processingTime = Date.now() - startTime;

    logger.info("Basic profile updated successfully", {
      userId: req.user._id,
      userType: req.user.userType,
      profileId: profile._id,
      updatedFields: Object.keys(sanitizedData),
      ip: req.ip,
      userAgent: req.get("User-Agent"),
      processingTime: `${processingTime}ms`,
      timestamp: new Date().toISOString(),
    });

    res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      code: "PROFILE_UPDATED",
      meta: {
        processingTime: `${processingTime}ms`,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (err) {
    return handleProfileError(err, res, "Update basic profile", req);
  }
};

// ✅ WORKER-SPECIFIC CONTROLLERS
const updateWorkerBiography = async (req, res) => {
  const startTime = Date.now();

  try {
    if (req.user.userType !== "worker") {
      return res.status(403).json({
        success: false,
        message: "Only workers can update biography",
        code: "ACCESS_DENIED",
      });
    }

    // ✅ Validate input
    const { error, value } = updateWorkerBiographySchema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      logger.warn("Biography update validation failed", {
        errors: error.details,
        userId: req.user._id,
        ip: req.ip,
        timestamp: new Date().toISOString(),
      });

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

    const sanitizedData = sanitizeInput(value);

    const worker = await Worker.findOneAndUpdate(
      { credentialId: req.user._id },
      { biography: sanitizedData.biography },
      { new: true, runValidators: true }
    );

    if (!worker) {
      return res.status(404).json({
        success: false,
        message: "Worker profile not found",
        code: "PROFILE_NOT_FOUND",
      });
    }

    const processingTime = Date.now() - startTime;

    logger.info("Worker biography updated successfully", {
      userId: req.user._id,
      workerId: worker._id,
      biographyLength: sanitizedData.biography.length,
      ip: req.ip,
      userAgent: req.get("User-Agent"),
      processingTime: `${processingTime}ms`,
      timestamp: new Date().toISOString(),
    });

    res.status(200).json({
      success: true,
      message: "Biography updated successfully",
      code: "BIOGRAPHY_UPDATED",
      meta: {
        processingTime: `${processingTime}ms`,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (err) {
    return handleProfileError(err, res, "Update worker biography", req);
  }
};

// ✅ PORTFOLIO CONTROLLERS
const createPortfolio = async (req, res) => {
  const startTime = Date.now();

  try {
    if (req.user.userType !== "worker") {
      return res.status(403).json({
        success: false,
        message: "Only workers can create portfolio items",
        code: "ACCESS_DENIED",
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Portfolio image is required",
        code: "NO_IMAGE",
      });
    }

    // ✅ Validate input
    const { error, value } = createPortfolioSchema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      logger.warn("Portfolio creation validation failed", {
        errors: error.details,
        userId: req.user._id,
        ip: req.ip,
        timestamp: new Date().toISOString(),
      });

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

    const sanitizedData = sanitizeInput(value);

    // ✅ Upload image to Cloudinary
    const uploadResult = await new Promise((resolve, reject) => {
      cloudinary.uploader
        .upload_stream(
          {
            folder: "portfolio",
            public_id: `portfolio_${req.user._id}_${Date.now()}`,
            transformation: [
              { width: 800, height: 600, crop: "fill" },
              { quality: "auto", fetch_format: "auto" },
            ],
          },
          (error, result) => {
            if (error) reject(error);
            else resolve(result);
          }
        )
        .end(req.file.buffer);
    });

    // ✅ Add to worker portfolio
    const portfolioItem = {
      _id: new mongoose.Types.ObjectId(),
      projectTitle: sanitizedData.projectTitle,
      description: sanitizedData.description,
      image: {
        url: uploadResult.secure_url,
        public_id: uploadResult.public_id,
      },
    };

    const worker = await Worker.findOneAndUpdate(
      { credentialId: req.user._id },
      { $push: { portfolio: portfolioItem } },
      { new: true, runValidators: true }
    );

    if (!worker) {
      // ✅ Clean up uploaded image if worker not found
      await cloudinary.uploader.destroy(uploadResult.public_id);
      return res.status(404).json({
        success: false,
        message: "Worker profile not found",
        code: "PROFILE_NOT_FOUND",
      });
    }

    const processingTime = Date.now() - startTime;

    logger.info("Portfolio item created successfully", {
      userId: req.user._id,
      workerId: worker._id,
      portfolioId: portfolioItem._id,
      projectTitle: sanitizedData.projectTitle,
      imageUrl: uploadResult.secure_url,
      ip: req.ip,
      userAgent: req.get("User-Agent"),
      processingTime: `${processingTime}ms`,
      timestamp: new Date().toISOString(),
    });

    res.status(201).json({
      success: true,
      message: "Portfolio item created successfully",
      code: "PORTFOLIO_CREATED",
      data: {
        portfolioItem: {
          id: portfolioItem._id,
          projectTitle: portfolioItem.projectTitle,
          description: portfolioItem.description,
          image: portfolioItem.image,
        },
      },
      meta: {
        processingTime: `${processingTime}ms`,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (err) {
    return handleProfileError(err, res, "Create portfolio", req);
  }
};

const updatePortfolio = async (req, res) => {
  const startTime = Date.now();

  try {
    if (req.user.userType !== "worker") {
      return res.status(403).json({
        success: false,
        message: "Only workers can update portfolio items",
        code: "ACCESS_DENIED",
      });
    }

    // ✅ Validate input
    const { error, value } = updatePortfolioSchema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      logger.warn("Portfolio update validation failed", {
        errors: error.details,
        userId: req.user._id,
        ip: req.ip,
        timestamp: new Date().toISOString(),
      });

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

    const sanitizedData = sanitizeInput(value);

    const worker = await Worker.findOne({ credentialId: req.user._id });

    if (!worker) {
      return res.status(404).json({
        success: false,
        message: "Worker profile not found",
        code: "PROFILE_NOT_FOUND",
      });
    }

    // ✅ Find portfolio item
    const portfolioItem = worker.portfolio.id(sanitizedData.portfolioId);

    if (!portfolioItem) {
      return res.status(404).json({
        success: false,
        message: "Portfolio item not found",
        code: "PORTFOLIO_NOT_FOUND",
      });
    }

    // ✅ Update portfolio item
    portfolioItem.projectTitle = sanitizedData.projectTitle;
    portfolioItem.description = sanitizedData.description;

    // ✅ Update image if provided
    if (req.file) {
      // Delete old image
      if (portfolioItem.image?.public_id) {
        try {
          await cloudinary.uploader.destroy(portfolioItem.image.public_id);
        } catch (deleteError) {
          logger.warn("Failed to delete old portfolio image", {
            publicId: portfolioItem.image.public_id,
            error: deleteError.message,
          });
        }
      }

      // Upload new image
      const uploadResult = await new Promise((resolve, reject) => {
        cloudinary.uploader
          .upload_stream(
            {
              folder: "portfolio",
              public_id: `portfolio_${req.user._id}_${Date.now()}`,
              transformation: [
                { width: 800, height: 600, crop: "fill" },
                { quality: "auto", fetch_format: "auto" },
              ],
            },
            (error, result) => {
              if (error) reject(error);
              else resolve(result);
            }
          )
          .end(req.file.buffer);
      });

      portfolioItem.image = {
        url: uploadResult.secure_url,
        public_id: uploadResult.public_id,
      };
    }

    await worker.save();

    const processingTime = Date.now() - startTime;

    logger.info("Portfolio item updated successfully", {
      userId: req.user._id,
      workerId: worker._id,
      portfolioId: sanitizedData.portfolioId,
      updatedFields: req.file
        ? ["projectTitle", "description", "image"]
        : ["projectTitle", "description"],
      ip: req.ip,
      userAgent: req.get("User-Agent"),
      processingTime: `${processingTime}ms`,
      timestamp: new Date().toISOString(),
    });

    res.status(200).json({
      success: true,
      message: "Portfolio item updated successfully",
      code: "PORTFOLIO_UPDATED",
      data: {
        portfolioItem: {
          id: portfolioItem._id,
          projectTitle: portfolioItem.projectTitle,
          description: portfolioItem.description,
          image: portfolioItem.image,
        },
      },
      meta: {
        processingTime: `${processingTime}ms`,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (err) {
    return handleProfileError(err, res, "Update portfolio", req);
  }
};

const deletePortfolio = async (req, res) => {
  const startTime = Date.now();

  try {
    if (req.user.userType !== "worker") {
      return res.status(403).json({
        success: false,
        message: "Only workers can delete portfolio items",
        code: "ACCESS_DENIED",
      });
    }

    // ✅ Validate parameters
    const { error, value } = paramIdSchema.validate(req.params, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      return res.status(400).json({
        success: false,
        message: "Invalid portfolio ID",
        code: "INVALID_PARAM",
        errors: error.details.map((detail) => ({
          field: detail.path.join("."),
          message: detail.message,
        })),
      });
    }

    const { id: portfolioId } = sanitizeInput(value);

    const worker = await Worker.findOne({ credentialId: req.user._id });

    if (!worker) {
      return res.status(404).json({
        success: false,
        message: "Worker profile not found",
        code: "PROFILE_NOT_FOUND",
      });
    }

    // ✅ Find portfolio item
    const portfolioItem = worker.portfolio.id(portfolioId);

    if (!portfolioItem) {
      return res.status(404).json({
        success: false,
        message: "Portfolio item not found",
        code: "PORTFOLIO_NOT_FOUND",
      });
    }

    // ✅ Delete image from Cloudinary
    if (portfolioItem.image?.public_id) {
      try {
        await cloudinary.uploader.destroy(portfolioItem.image.public_id);
      } catch (deleteError) {
        logger.warn("Failed to delete portfolio image from Cloudinary", {
          publicId: portfolioItem.image.public_id,
          error: deleteError.message,
        });
      }
    }

    // ✅ Remove from portfolio array
    portfolioItem.remove();
    await worker.save();

    const processingTime = Date.now() - startTime;

    logger.info("Portfolio item deleted successfully", {
      userId: req.user._id,
      workerId: worker._id,
      portfolioId: portfolioId,
      ip: req.ip,
      userAgent: req.get("User-Agent"),
      processingTime: `${processingTime}ms`,
      timestamp: new Date().toISOString(),
    });

    res.status(200).json({
      success: true,
      message: "Portfolio item deleted successfully",
      code: "PORTFOLIO_DELETED",
      meta: {
        processingTime: `${processingTime}ms`,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (err) {
    return handleProfileError(err, res, "Delete portfolio", req);
  }
};

// ✅ CERTIFICATE CONTROLLERS
const uploadCertificate = async (req, res) => {
  const startTime = Date.now();

  try {
    if (req.user.userType !== "worker") {
      return res.status(403).json({
        success: false,
        message: "Only workers can upload certificates",
        code: "ACCESS_DENIED",
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Certificate file is required",
        code: "NO_FILE",
      });
    }

    // ✅ Upload to Cloudinary
    const uploadResult = await new Promise((resolve, reject) => {
      cloudinary.uploader
        .upload_stream(
          {
            folder: "certificates",
            public_id: `certificate_${req.user._id}_${Date.now()}`,
            resource_type: "auto", // Support images and PDFs
          },
          (error, result) => {
            if (error) reject(error);
            else resolve(result);
          }
        )
        .end(req.file.buffer);
    });

    // ✅ Add to worker certificates
    const certificate = {
      _id: new mongoose.Types.ObjectId(),
      url: uploadResult.secure_url,
      public_id: uploadResult.public_id,
    };

    const worker = await Worker.findOneAndUpdate(
      { credentialId: req.user._id },
      { $push: { certificates: certificate } },
      { new: true, runValidators: true }
    );

    if (!worker) {
      // ✅ Clean up uploaded file if worker not found
      await cloudinary.uploader.destroy(uploadResult.public_id);
      return res.status(404).json({
        success: false,
        message: "Worker profile not found",
        code: "PROFILE_NOT_FOUND",
      });
    }

    const processingTime = Date.now() - startTime;

    logger.info("Certificate uploaded successfully", {
      userId: req.user._id,
      workerId: worker._id,
      certificateId: certificate._id,
      certificateUrl: uploadResult.secure_url,
      fileSize: req.file.size,
      ip: req.ip,
      userAgent: req.get("User-Agent"),
      processingTime: `${processingTime}ms`,
      timestamp: new Date().toISOString(),
    });

    res.status(201).json({
      success: true,
      message: "Certificate uploaded successfully",
      code: "CERTIFICATE_UPLOADED",
      data: {
        certificate: {
          id: certificate._id,
          url: certificate.url,
          public_id: certificate.public_id,
        },
      },
      meta: {
        processingTime: `${processingTime}ms`,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (err) {
    return handleProfileError(err, res, "Upload certificate", req);
  }
};

const deleteCertificate = async (req, res) => {
  const startTime = Date.now();

  try {
    if (req.user.userType !== "worker") {
      return res.status(403).json({
        success: false,
        message: "Only workers can delete certificates",
        code: "ACCESS_DENIED",
      });
    }

    // ✅ Validate parameters
    const { error, value } = paramIdSchema.validate(req.params, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      return res.status(400).json({
        success: false,
        message: "Invalid certificate ID",
        code: "INVALID_PARAM",
        errors: error.details.map((detail) => ({
          field: detail.path.join("."),
          message: detail.message,
        })),
      });
    }

    const { id: certificateId } = sanitizeInput(value);

    const worker = await Worker.findOne({ credentialId: req.user._id });

    if (!worker) {
      return res.status(404).json({
        success: false,
        message: "Worker profile not found",
        code: "PROFILE_NOT_FOUND",
      });
    }

    // ✅ Find certificate
    const certificate = worker.certificates.id(certificateId);

    if (!certificate) {
      return res.status(404).json({
        success: false,
        message: "Certificate not found",
        code: "CERTIFICATE_NOT_FOUND",
      });
    }

    // ✅ Delete from Cloudinary
    if (certificate.public_id) {
      try {
        await cloudinary.uploader.destroy(certificate.public_id);
      } catch (deleteError) {
        logger.warn("Failed to delete certificate from Cloudinary", {
          publicId: certificate.public_id,
          error: deleteError.message,
        });
      }
    }

    // ✅ Remove from certificates array
    certificate.remove();
    await worker.save();

    const processingTime = Date.now() - startTime;

    logger.info("Certificate deleted successfully", {
      userId: req.user._id,
      workerId: worker._id,
      certificateId: certificateId,
      ip: req.ip,
      userAgent: req.get("User-Agent"),
      processingTime: `${processingTime}ms`,
      timestamp: new Date().toISOString(),
    });

    res.status(200).json({
      success: true,
      message: "Certificate deleted successfully",
      code: "CERTIFICATE_DELETED",
      meta: {
        processingTime: `${processingTime}ms`,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (err) {
    return handleProfileError(err, res, "Delete certificate", req);
  }
};

// ✅ EXPERIENCE CONTROLLERS
const addExperience = async (req, res) => {
  const startTime = Date.now();

  try {
    if (req.user.userType !== "worker") {
      return res.status(403).json({
        success: false,
        message: "Only workers can add experience",
        code: "ACCESS_DENIED",
      });
    }

    // ✅ Validate input
    const { error, value } = addExperienceSchema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      logger.warn("Experience addition validation failed", {
        errors: error.details,
        userId: req.user._id,
        ip: req.ip,
        timestamp: new Date().toISOString(),
      });

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

    const sanitizedData = sanitizeInput(value);

    // ✅ Validate end year if provided
    if (
      sanitizedData.endYear &&
      sanitizedData.endYear < sanitizedData.startYear
    ) {
      return res.status(400).json({
        success: false,
        message: "End year cannot be earlier than start year",
        code: "INVALID_DATE_RANGE",
      });
    }

    const experience = {
      _id: new mongoose.Types.ObjectId(),
      ...sanitizedData,
    };

    const worker = await Worker.findOneAndUpdate(
      { credentialId: req.user._id },
      { $push: { experience: experience } },
      { new: true, runValidators: true }
    );

    if (!worker) {
      return res.status(404).json({
        success: false,
        message: "Worker profile not found",
        code: "PROFILE_NOT_FOUND",
      });
    }

    const processingTime = Date.now() - startTime;

    logger.info("Experience added successfully", {
      userId: req.user._id,
      workerId: worker._id,
      experienceId: experience._id,
      companyName: sanitizedData.companyName,
      position: sanitizedData.position,
      ip: req.ip,
      userAgent: req.get("User-Agent"),
      processingTime: `${processingTime}ms`,
      timestamp: new Date().toISOString(),
    });

    res.status(201).json({
      success: true,
      message: "Experience added successfully",
      code: "EXPERIENCE_ADDED",
      data: {
        experience: experience,
      },
      meta: {
        processingTime: `${processingTime}ms`,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (err) {
    return handleProfileError(err, res, "Add experience", req);
  }
};

const deleteExperience = async (req, res) => {
  const startTime = Date.now();

  try {
    if (req.user.userType !== "worker") {
      return res.status(403).json({
        success: false,
        message: "Only workers can delete experience",
        code: "ACCESS_DENIED",
      });
    }

    // ✅ Validate parameters
    const { error, value } = paramIdSchema.validate(req.params, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      return res.status(400).json({
        success: false,
        message: "Invalid experience ID",
        code: "INVALID_PARAM",
        errors: error.details.map((detail) => ({
          field: detail.path.join("."),
          message: detail.message,
        })),
      });
    }

    const { id: experienceId } = sanitizeInput(value);

    const worker = await Worker.findOne({ credentialId: req.user._id });

    if (!worker) {
      return res.status(404).json({
        success: false,
        message: "Worker profile not found",
        code: "PROFILE_NOT_FOUND",
      });
    }

    // ✅ Find experience
    const experience = worker.experience.id(experienceId);

    if (!experience) {
      return res.status(404).json({
        success: false,
        message: "Experience not found",
        code: "EXPERIENCE_NOT_FOUND",
      });
    }

    // ✅ Remove from experience array
    experience.remove();
    await worker.save();

    const processingTime = Date.now() - startTime;

    logger.info("Experience deleted successfully", {
      userId: req.user._id,
      workerId: worker._id,
      experienceId: experienceId,
      ip: req.ip,
      userAgent: req.get("User-Agent"),
      processingTime: `${processingTime}ms`,
      timestamp: new Date().toISOString(),
    });

    res.status(200).json({
      success: true,
      message: "Experience deleted successfully",
      code: "EXPERIENCE_DELETED",
      meta: {
        processingTime: `${processingTime}ms`,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (err) {
    return handleProfileError(err, res, "Delete experience", req);
  }
};

// ✅ SKILL CATEGORY CONTROLLERS
const addSkillCategory = async (req, res) => {
  const startTime = Date.now();

  try {
    if (req.user.userType !== "worker") {
      return res.status(403).json({
        success: false,
        message: "Only workers can add skill categories",
        code: "ACCESS_DENIED",
      });
    }

    // ✅ Validate input
    const { error, value } = addSkillCategorySchema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      logger.warn("Skill category addition validation failed", {
        errors: error.details,
        userId: req.user._id,
        ip: req.ip,
        timestamp: new Date().toISOString(),
      });

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

    const { skillCategoryId } = sanitizeInput(value);

    // ✅ Check if skill category exists
    const skillCategory = await SkillCategory.findById(skillCategoryId);

    if (!skillCategory) {
      return res.status(404).json({
        success: false,
        message: "Skill category not found",
        code: "SKILL_CATEGORY_NOT_FOUND",
      });
    }

    const worker = await Worker.findOne({ credentialId: req.user._id });

    if (!worker) {
      return res.status(404).json({
        success: false,
        message: "Worker profile not found",
        code: "PROFILE_NOT_FOUND",
      });
    }

    // ✅ Check if skill category already added
    const existingSkill = worker.skillsByCategory.find(
      (skill) => skill.skillCategoryId.toString() === skillCategoryId
    );

    if (existingSkill) {
      return res.status(400).json({
        success: false,
        message: "Skill category already added",
        code: "SKILL_ALREADY_EXISTS",
      });
    }

    // ✅ Add skill category
    worker.skillsByCategory.push({ skillCategoryId });
    await worker.save();

    const processingTime = Date.now() - startTime;

    logger.info("Skill category added successfully", {
      userId: req.user._id,
      workerId: worker._id,
      skillCategoryId: skillCategoryId,
      skillCategoryName: skillCategory.categoryName,
      ip: req.ip,
      userAgent: req.get("User-Agent"),
      processingTime: `${processingTime}ms`,
      timestamp: new Date().toISOString(),
    });

    res.status(201).json({
      success: true,
      message: "Skill category added successfully",
      code: "SKILL_CATEGORY_ADDED",
      data: {
        skillCategory: {
          id: skillCategory._id,
          name: skillCategory.categoryName,
        },
      },
      meta: {
        processingTime: `${processingTime}ms`,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (err) {
    return handleProfileError(err, res, "Add skill category", req);
  }
};

const removeSkillCategory = async (req, res) => {
  const startTime = Date.now();

  try {
    if (req.user.userType !== "worker") {
      return res.status(403).json({
        success: false,
        message: "Only workers can remove skill categories",
        code: "ACCESS_DENIED",
      });
    }

    // ✅ Validate parameters
    const { error, value } = paramIdSchema.validate(req.params, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      return res.status(400).json({
        success: false,
        message: "Invalid skill category ID",
        code: "INVALID_PARAM",
        errors: error.details.map((detail) => ({
          field: detail.path.join("."),
          message: detail.message,
        })),
      });
    }

    const { id: skillCategoryId } = sanitizeInput(value);

    const worker = await Worker.findOne({ credentialId: req.user._id });

    if (!worker) {
      return res.status(404).json({
        success: false,
        message: "Worker profile not found",
        code: "PROFILE_NOT_FOUND",
      });
    }

    // ✅ Find and remove skill category
    const skillIndex = worker.skillsByCategory.findIndex(
      (skill) => skill.skillCategoryId.toString() === skillCategoryId
    );

    if (skillIndex === -1) {
      return res.status(404).json({
        success: false,
        message: "Skill category not found in worker profile",
        code: "SKILL_NOT_FOUND",
      });
    }

    worker.skillsByCategory.splice(skillIndex, 1);
    await worker.save();

    const processingTime = Date.now() - startTime;

    logger.info("Skill category removed successfully", {
      userId: req.user._id,
      workerId: worker._id,
      skillCategoryId: skillCategoryId,
      ip: req.ip,
      userAgent: req.get("User-Agent"),
      processingTime: `${processingTime}ms`,
      timestamp: new Date().toISOString(),
    });

    res.status(200).json({
      success: true,
      message: "Skill category removed successfully",
      code: "SKILL_CATEGORY_REMOVED",
      meta: {
        processingTime: `${processingTime}ms`,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (err) {
    return handleProfileError(err, res, "Remove skill category", req);
  }
};

// ✅ GET PROFILE CONTROLLERS
const getProfile = async (req, res) => {
  const startTime = Date.now();

  try {
    const Model = req.user.userType === "client" ? Client : Worker;
    const populateOptions =
      req.user.userType === "worker"
        ? { path: "skillsByCategory.skillCategoryId", select: "categoryName" }
        : "";

    let profile = await Model.findOne({ credentialId: req.user._id })
      .populate(populateOptions)
      .lean();

    if (!profile) {
      return res.status(404).json({
        success: false,
        message: "Profile not found",
        code: "PROFILE_NOT_FOUND",
      });
    }

    // ✅ Decrypt sensitive data
    try {
      profile.firstName = decryptAES128(profile.firstName);
      profile.lastName = decryptAES128(profile.lastName);
      if (profile.middleName)
        profile.middleName = decryptAES128(profile.middleName);
      if (profile.suffixName)
        profile.suffixName = decryptAES128(profile.suffixName);
      profile.contactNumber = decryptAES128(profile.contactNumber);
    } catch (decryptError) {
      logger.warn("Failed to decrypt profile data", {
        userId: req.user._id,
        profileId: profile._id,
        error: decryptError.message,
      });
    }

    // ✅ Remove sensitive fields
    delete profile.credentialId;
    delete profile.__v;

    const processingTime = Date.now() - startTime;

    logger.info("Profile retrieved successfully", {
      userId: req.user._id,
      userType: req.user.userType,
      profileId: profile._id,
      ip: req.ip,
      userAgent: req.get("User-Agent"),
      processingTime: `${processingTime}ms`,
      timestamp: new Date().toISOString(),
    });

    res.status(200).json({
      success: true,
      message: "Profile retrieved successfully",
      code: "PROFILE_RETRIEVED",
      data: {
        profile: profile,
      },
      meta: {
        processingTime: `${processingTime}ms`,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (err) {
    return handleProfileError(err, res, "Get profile", req);
  }
};

// ✅ EXPORTS
module.exports = {
  uploadProfilePicture,
  removeProfilePicture,
  updateBasicProfile,
  updateWorkerBiography,
  createPortfolio,
  updatePortfolio,
  deletePortfolio,
  uploadCertificate,
  deleteCertificate,
  addExperience,
  deleteExperience,
  addSkillCategory,
  removeSkillCategory,
  getProfile,
};
