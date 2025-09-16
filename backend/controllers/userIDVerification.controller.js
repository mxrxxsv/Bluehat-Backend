const Joi = require("joi");
const xss = require("xss");
const mongoose = require("mongoose");
const cloudinary = require("../db/cloudinary");
const Credential = require("../models/Credential");
const Worker = require("../models/Worker");
const IDPicture = require("../models/IdPicture");
const Selfie = require("../models/Selfie");
const logger = require("../utils/logger");
const { encryptAES128, decryptAES128 } = require("../utils/encipher");

// ==================== VALIDATION SCHEMAS ====================

const uploadIDSchema = Joi.object({
  userId: Joi.string()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .required()
    .messages({
      "string.empty": "User ID is required",
      "string.pattern.base": "Invalid user ID format",
      "any.required": "User ID is required",
    }),
});

const verificationStatusSchema = Joi.object({
  userId: Joi.string()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .required()
    .messages({
      "string.empty": "User ID is required",
      "string.pattern.base": "Invalid user ID format",
      "any.required": "User ID is required",
    }),
});

const deleteDocumentSchema = Joi.object({
  userId: Joi.string()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .required()
    .messages({
      "string.empty": "User ID is required",
      "string.pattern.base": "Invalid user ID format",
      "any.required": "User ID is required",
    }),
  documentType: Joi.string().valid("idPicture", "selfie").required().messages({
    "string.empty": "Document type is required",
    "any.only": "Document type must be either 'idPicture' or 'selfie'",
    "any.required": "Document type is required",
  }),
});

// ==================== UTILITY FUNCTIONS ====================

// Sanitize input data
const sanitizeInput = (data) => {
  if (!data || typeof data !== "object") {
    return {};
  }

  const sanitized = {};
  for (const [key, value] of Object.entries(data)) {
    if (typeof value === "string") {
      sanitized[key] = xss(value.trim());
    } else if (Array.isArray(value)) {
      sanitized[key] = value.map((item) =>
        typeof item === "string" ? xss(item.trim()) : item
      );
    } else {
      sanitized[key] = value;
    }
  }
  return sanitized;
};

// Upload image to Cloudinary with enhanced error handling
const uploadToCloudinary = async (file, folder) => {
  try {
    if (!file || !file.path) {
      throw new Error("Invalid file provided for upload");
    }

    const result = await cloudinary.uploader.upload(file.path, {
      folder: `workerhub/${folder}`,
      transformation: [
        {
          width: 1200,
          height: 900,
          crop: "limit",
          quality: "auto:good",
          format: "webp",
        },
      ],
      allowed_formats: ["jpg", "jpeg", "png", "webp"],
      resource_type: "image",
    });

    logger.info("Cloudinary upload successful", {
      public_id: result.public_id,
      url: result.secure_url,
      bytes: result.bytes,
      format: result.format,
      folder,
      timestamp: new Date().toISOString(),
    });

    return {
      url: result.secure_url,
      public_id: result.public_id,
      bytes: result.bytes,
      format: result.format,
      width: result.width,
      height: result.height,
    };
  } catch (error) {
    logger.error("Cloudinary upload failed", {
      error: error.message,
      stack: error.stack,
      folder,
      file: file?.originalname,
      timestamp: new Date().toISOString(),
    });
    throw new Error(`Failed to upload image: ${error.message}`);
  }
};

// Delete image from Cloudinary with enhanced error handling
const deleteFromCloudinary = async (publicId) => {
  try {
    if (!publicId) {
      logger.warn("No public ID provided for deletion");
      return;
    }

    const result = await cloudinary.uploader.destroy(publicId);

    if (result.result === "ok") {
      logger.info("Cloudinary deletion successful", {
        public_id: publicId,
        result: result.result,
        timestamp: new Date().toISOString(),
      });
    } else {
      logger.warn("Cloudinary deletion warning", {
        public_id: publicId,
        result: result.result,
        timestamp: new Date().toISOString(),
      });
    }

    return result;
  } catch (error) {
    logger.error("Cloudinary deletion failed", {
      publicId,
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString(),
    });
    // Don't throw error for deletion failures to avoid blocking main operations
  }
};

// Handle verification errors
const handleVerificationError = (err, res, operation, req) => {
  const processingTime = Date.now() - (req.startTime || Date.now());

  // Log error details
  logger.error(`${operation} failed`, {
    error: err.message,
    stack: err.stack,
    userId: req.body?.userId || req.params?.userId,
    ip: req.ip,
    userAgent: req.get("User-Agent"),
    processingTime: `${processingTime}ms`,
    timestamp: new Date().toISOString(),
  });

  // Handle specific error types
  if (err.name === "ValidationError") {
    return res.status(400).json({
      success: false,
      message: "Validation failed",
      code: "VALIDATION_ERROR",
      errors: Object.values(err.errors).map((error) => ({
        field: error.path,
        message: error.message,
      })),
      meta: {
        processingTime: `${processingTime}ms`,
        timestamp: new Date().toISOString(),
      },
    });
  }

  if (err.name === "CastError") {
    return res.status(400).json({
      success: false,
      message: "Invalid ID format",
      code: "INVALID_ID_FORMAT",
      meta: {
        processingTime: `${processingTime}ms`,
        timestamp: new Date().toISOString(),
      },
    });
  }

  if (err.message.includes("duplicate key")) {
    return res.status(409).json({
      success: false,
      message: "Document already exists",
      code: "DUPLICATE_DOCUMENT",
      meta: {
        processingTime: `${processingTime}ms`,
        timestamp: new Date().toISOString(),
      },
    });
  }

  if (err.message.includes("Cloudinary")) {
    return res.status(500).json({
      success: false,
      message: "Image upload service temporarily unavailable",
      code: "UPLOAD_SERVICE_ERROR",
      meta: {
        processingTime: `${processingTime}ms`,
        timestamp: new Date().toISOString(),
      },
    });
  }

  // Generic server error
  return res.status(500).json({
    success: false,
    message: "Internal server error occurred",
    code: "INTERNAL_SERVER_ERROR",
    meta: {
      processingTime: `${processingTime}ms`,
      timestamp: new Date().toISOString(),
    },
  });
};

// Optimize verification data for response
const optimizeVerificationForResponse = (credential) => {
  try {
    let workerName = "Unknown Worker";

    // Decrypt worker name if available
    if (credential.workerId && credential.workerId.firstName) {
      try {
        const decryptedFirstName = decryptAES128(credential.workerId.firstName);
        const decryptedLastName = credential.workerId.lastName
          ? decryptAES128(credential.workerId.lastName)
          : "";
        workerName = `${decryptedFirstName} ${decryptedLastName}`.trim();
      } catch (decryptError) {
        logger.warn("Failed to decrypt worker name", {
          workerId: credential.workerId._id,
          error: decryptError.message,
          timestamp: new Date().toISOString(),
        });
      }
    }

    // Determine verification status
    let status = "pending";
    let statusMessage = "Verification documents pending";

    if (credential.isVerified) {
      status = "verified";
      statusMessage = "Account verified successfully";
    } else if (credential.isRejected) {
      status = "rejected";
      statusMessage = "Verification rejected";
    } else if (credential.isBlocked) {
      status = "blocked";
      statusMessage = "Account blocked";
    } else if (!credential.idPictureId || !credential.selfiePictureId) {
      status = "incomplete";
      statusMessage = "Please upload both ID picture and selfie";
    } else {
      status = "under_review";
      statusMessage = "Documents uploaded, under admin review";
    }

    return {
      id: credential._id,
      workerName,
      email: credential.email || null,
      userType: credential.userType,
      status,
      statusMessage,
      verificationDetails: {
        isVerified: credential.isVerified,
        isRejected: credential.isRejected,
        isBlocked: credential.isBlocked,
        verifiedAt: credential.verifiedAt,
        rejectedAt: credential.rejectedAt,
        verificationNotes: credential.verificationNotes,
        rejectionReason: credential.rejectionReason,
      },
      documents: {
        idPicture: credential.idPictureId
          ? {
              id: credential.idPictureId._id,
              url: credential.idPictureId.url,
              uploadedAt: credential.idPictureId.createdAt,
            }
          : null,
        selfie: credential.selfiePictureId
          ? {
              id: credential.selfiePictureId._id,
              url: credential.selfiePictureId.url,
              uploadedAt: credential.selfiePictureId.createdAt,
            }
          : null,
      },
      timestamps: {
        createdAt: credential.createdAt,
        updatedAt: credential.updatedAt,
      },
    };
  } catch (error) {
    logger.error("Error optimizing verification data", {
      credentialId: credential._id,
      error: error.message,
      timestamp: new Date().toISOString(),
    });

    // Return minimal safe data on error
    return {
      id: credential._id,
      workerName: "Unknown Worker",
      status: "error",
      statusMessage: "Error processing verification data",
    };
  }
};

// ==================== CONTROLLERS ====================

// ✅ Upload ID Picture
const uploadIDPicture = async (req, res) => {
  const startTime = Date.now();
  req.startTime = startTime;

  try {
    // Validate file upload
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "ID picture file is required",
        code: "FILE_REQUIRED",
        errors: [
          {
            field: "idPicture",
            message: "Please select an ID picture to upload",
          },
        ],
        meta: {
          processingTime: `${Date.now() - startTime}ms`,
          timestamp: new Date().toISOString(),
        },
      });
    }

    // Validate file type and size
    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    if (!allowedTypes.includes(req.file.mimetype)) {
      return res.status(400).json({
        success: false,
        message: "Invalid file type",
        code: "INVALID_FILE_TYPE",
        errors: [
          {
            field: "idPicture",
            message: "Only JPEG, JPG, PNG, and WebP files are allowed",
          },
        ],
        meta: {
          processingTime: `${Date.now() - startTime}ms`,
          timestamp: new Date().toISOString(),
        },
      });
    }

    // Validate request body
    const { error, value } = uploadIDSchema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      logger.warn("Upload ID picture validation failed", {
        errors: error.details,
        userId: req.body.userId,
        ip: req.ip,
        userAgent: req.get("User-Agent"),
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
        meta: {
          processingTime: `${Date.now() - startTime}ms`,
          timestamp: new Date().toISOString(),
        },
      });
    }

    const sanitizedData = sanitizeInput(value);
    const { userId } = sanitizedData;

    // Verify user exists and is a worker
    const credential = await Credential.findById(userId)
      .populate("workerId", "firstName lastName")
      .lean();

    if (!credential) {
      return res.status(404).json({
        success: false,
        message: "User not found",
        code: "USER_NOT_FOUND",
        meta: {
          processingTime: `${Date.now() - startTime}ms`,
          timestamp: new Date().toISOString(),
        },
      });
    }

    if (credential.userType !== "worker") {
      return res.status(403).json({
        success: false,
        message: "Only workers can upload ID verification documents",
        code: "INVALID_USER_TYPE",
        meta: {
          processingTime: `${Date.now() - startTime}ms`,
          timestamp: new Date().toISOString(),
        },
      });
    }

    // Check if user is already verified
    if (credential.isVerified) {
      return res.status(400).json({
        success: false,
        message: "User is already verified",
        code: "ALREADY_VERIFIED",
        meta: {
          processingTime: `${Date.now() - startTime}ms`,
          timestamp: new Date().toISOString(),
        },
      });
    }

    // Check if user is blocked
    if (credential.isBlocked) {
      return res.status(403).json({
        success: false,
        message: "Account is blocked. Cannot upload documents",
        code: "ACCOUNT_BLOCKED",
        meta: {
          processingTime: `${Date.now() - startTime}ms`,
          timestamp: new Date().toISOString(),
        },
      });
    }

    // Upload to Cloudinary
    const uploadResult = await uploadToCloudinary(req.file, "id-pictures");

    // Delete old ID picture if exists
    if (credential.idPictureId) {
      const oldIDPicture = await IDPicture.findById(credential.idPictureId);
      if (oldIDPicture) {
        await deleteFromCloudinary(oldIDPicture.public_id);
        await IDPicture.findByIdAndDelete(credential.idPictureId);
      }
    }

    // Create new ID picture record
    const newIDPicture = new IDPicture({
      url: uploadResult.url,
      public_id: uploadResult.public_id,
      bytes: uploadResult.bytes,
      format: uploadResult.format,
      width: uploadResult.width,
      height: uploadResult.height,
    });

    await newIDPicture.save();

    // Update credential with new ID picture
    await Credential.findByIdAndUpdate(userId, {
      idPictureId: newIDPicture._id,
      updatedAt: new Date(),
    });

    const processingTime = Date.now() - startTime;

    logger.info("ID picture uploaded successfully", {
      userId,
      idPictureId: newIDPicture._id,
      url: uploadResult.url,
      bytes: uploadResult.bytes,
      format: uploadResult.format,
      ip: req.ip,
      userAgent: req.get("User-Agent"),
      processingTime: `${processingTime}ms`,
      timestamp: new Date().toISOString(),
    });

    res.status(200).json({
      success: true,
      message: "ID picture uploaded successfully",
      code: "ID_PICTURE_UPLOADED",
      data: {
        idPicture: {
          id: newIDPicture._id,
          url: newIDPicture.url,
          uploadedAt: newIDPicture.createdAt,
          fileInfo: {
            bytes: uploadResult.bytes,
            format: uploadResult.format,
            dimensions: {
              width: uploadResult.width,
              height: uploadResult.height,
            },
          },
        },
      },
      meta: {
        processingTime: `${processingTime}ms`,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (err) {
    return handleVerificationError(err, res, "Upload ID picture", req);
  }
};

// ✅ Upload Selfie Picture
const uploadSelfie = async (req, res) => {
  const startTime = Date.now();
  req.startTime = startTime;

  try {
    // Validate file upload
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Selfie picture file is required",
        code: "FILE_REQUIRED",
        errors: [
          {
            field: "selfie",
            message: "Please select a selfie picture to upload",
          },
        ],
        meta: {
          processingTime: `${Date.now() - startTime}ms`,
          timestamp: new Date().toISOString(),
        },
      });
    }

    // Validate file type and size
    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    if (!allowedTypes.includes(req.file.mimetype)) {
      return res.status(400).json({
        success: false,
        message: "Invalid file type",
        code: "INVALID_FILE_TYPE",
        errors: [
          {
            field: "selfie",
            message: "Only JPEG, JPG, PNG, and WebP files are allowed",
          },
        ],
        meta: {
          processingTime: `${Date.now() - startTime}ms`,
          timestamp: new Date().toISOString(),
        },
      });
    }

    // Validate request body
    const { error, value } = uploadIDSchema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      logger.warn("Upload selfie validation failed", {
        errors: error.details,
        userId: req.body.userId,
        ip: req.ip,
        userAgent: req.get("User-Agent"),
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
        meta: {
          processingTime: `${Date.now() - startTime}ms`,
          timestamp: new Date().toISOString(),
        },
      });
    }

    const sanitizedData = sanitizeInput(value);
    const { userId } = sanitizedData;

    // Verify user exists and is a worker
    const credential = await Credential.findById(userId)
      .populate("workerId", "firstName lastName")
      .lean();

    if (!credential) {
      return res.status(404).json({
        success: false,
        message: "User not found",
        code: "USER_NOT_FOUND",
        meta: {
          processingTime: `${Date.now() - startTime}ms`,
          timestamp: new Date().toISOString(),
        },
      });
    }

    if (credential.userType !== "worker") {
      return res.status(403).json({
        success: false,
        message: "Only workers can upload verification documents",
        code: "INVALID_USER_TYPE",
        meta: {
          processingTime: `${Date.now() - startTime}ms`,
          timestamp: new Date().toISOString(),
        },
      });
    }

    // Check if user is already verified
    if (credential.isVerified) {
      return res.status(400).json({
        success: false,
        message: "User is already verified",
        code: "ALREADY_VERIFIED",
        meta: {
          processingTime: `${Date.now() - startTime}ms`,
          timestamp: new Date().toISOString(),
        },
      });
    }

    // Check if user is blocked
    if (credential.isBlocked) {
      return res.status(403).json({
        success: false,
        message: "Account is blocked. Cannot upload documents",
        code: "ACCOUNT_BLOCKED",
        meta: {
          processingTime: `${Date.now() - startTime}ms`,
          timestamp: new Date().toISOString(),
        },
      });
    }

    // Upload to Cloudinary
    const uploadResult = await uploadToCloudinary(req.file, "selfies");

    // Delete old selfie if exists
    if (credential.selfiePictureId) {
      const oldSelfie = await Selfie.findById(credential.selfiePictureId);
      if (oldSelfie) {
        await deleteFromCloudinary(oldSelfie.public_id);
        await Selfie.findByIdAndDelete(credential.selfiePictureId);
      }
    }

    // Create new selfie record
    const newSelfie = new Selfie({
      url: uploadResult.url,
      public_id: uploadResult.public_id,
      bytes: uploadResult.bytes,
      format: uploadResult.format,
      width: uploadResult.width,
      height: uploadResult.height,
    });

    await newSelfie.save();

    // Update credential with new selfie
    await Credential.findByIdAndUpdate(userId, {
      selfiePictureId: newSelfie._id,
      updatedAt: new Date(),
    });

    const processingTime = Date.now() - startTime;

    logger.info("Selfie uploaded successfully", {
      userId,
      selfieId: newSelfie._id,
      url: uploadResult.url,
      bytes: uploadResult.bytes,
      format: uploadResult.format,
      ip: req.ip,
      userAgent: req.get("User-Agent"),
      processingTime: `${processingTime}ms`,
      timestamp: new Date().toISOString(),
    });

    res.status(200).json({
      success: true,
      message: "Selfie uploaded successfully",
      code: "SELFIE_UPLOADED",
      data: {
        selfie: {
          id: newSelfie._id,
          url: newSelfie.url,
          uploadedAt: newSelfie.createdAt,
          fileInfo: {
            bytes: uploadResult.bytes,
            format: uploadResult.format,
            dimensions: {
              width: uploadResult.width,
              height: uploadResult.height,
            },
          },
        },
      },
      meta: {
        processingTime: `${processingTime}ms`,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (err) {
    return handleVerificationError(err, res, "Upload selfie", req);
  }
};

// ✅ Get verification status
const getVerificationStatus = async (req, res) => {
  const startTime = Date.now();
  req.startTime = startTime;

  try {
    // Validate request parameters
    const { error, value } = verificationStatusSchema.validate(req.params, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      logger.warn("Get verification status validation failed", {
        errors: error.details,
        userId: req.params.userId,
        ip: req.ip,
        userAgent: req.get("User-Agent"),
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
        meta: {
          processingTime: `${Date.now() - startTime}ms`,
          timestamp: new Date().toISOString(),
        },
      });
    }

    const sanitizedData = sanitizeInput(value);
    const { userId } = sanitizedData;

    // Find credential with populated images and worker data
    const credential = await Credential.findById(userId)
      .populate(
        "idPictureId",
        "url createdAt public_id bytes format width height"
      )
      .populate(
        "selfiePictureId",
        "url createdAt public_id bytes format width height"
      )
      .populate("workerId", "firstName lastName profilePicture")
      .select(
        "userType isVerified verifiedAt verificationNotes isRejected rejectedAt rejectionReason isBlocked email createdAt updatedAt"
      )
      .lean();

    if (!credential) {
      return res.status(404).json({
        success: false,
        message: "User not found",
        code: "USER_NOT_FOUND",
        meta: {
          processingTime: `${Date.now() - startTime}ms`,
          timestamp: new Date().toISOString(),
        },
      });
    }

    if (credential.userType !== "worker") {
      return res.status(403).json({
        success: false,
        message: "Only workers can check verification status",
        code: "INVALID_USER_TYPE",
        meta: {
          processingTime: `${Date.now() - startTime}ms`,
          timestamp: new Date().toISOString(),
        },
      });
    }

    // Optimize verification data for response
    const optimizedData = optimizeVerificationForResponse(credential);

    const processingTime = Date.now() - startTime;

    logger.info("Verification status retrieved", {
      userId,
      status: optimizedData.status,
      hasIdPicture: !!credential.idPictureId,
      hasSelfie: !!credential.selfiePictureId,
      ip: req.ip,
      userAgent: req.get("User-Agent"),
      processingTime: `${processingTime}ms`,
      timestamp: new Date().toISOString(),
    });

    res.status(200).json({
      success: true,
      message: "Verification status retrieved successfully",
      code: "VERIFICATION_STATUS_RETRIEVED",
      data: optimizedData,
      meta: {
        processingTime: `${processingTime}ms`,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (err) {
    return handleVerificationError(err, res, "Get verification status", req);
  }
};

// ✅ Delete uploaded document (before verification)
const deleteDocument = async (req, res) => {
  const startTime = Date.now();
  req.startTime = startTime;

  try {
    // Validate request parameters
    const { error, value } = deleteDocumentSchema.validate(req.params, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      logger.warn("Delete document validation failed", {
        errors: error.details,
        userId: req.params.userId,
        documentType: req.params.documentType,
        ip: req.ip,
        userAgent: req.get("User-Agent"),
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
        meta: {
          processingTime: `${Date.now() - startTime}ms`,
          timestamp: new Date().toISOString(),
        },
      });
    }

    const sanitizedData = sanitizeInput(value);
    const { userId, documentType } = sanitizedData;

    // Find credential
    const credential = await Credential.findById(userId).lean();
    if (!credential) {
      return res.status(404).json({
        success: false,
        message: "User not found",
        code: "USER_NOT_FOUND",
        meta: {
          processingTime: `${Date.now() - startTime}ms`,
          timestamp: new Date().toISOString(),
        },
      });
    }

    if (credential.userType !== "worker") {
      return res.status(403).json({
        success: false,
        message: "Only workers can delete verification documents",
        code: "INVALID_USER_TYPE",
        meta: {
          processingTime: `${Date.now() - startTime}ms`,
          timestamp: new Date().toISOString(),
        },
      });
    }

    // Check if user is already verified (can't delete after verification)
    if (credential.isVerified) {
      return res.status(400).json({
        success: false,
        message: "Cannot delete documents after verification",
        code: "ALREADY_VERIFIED",
        meta: {
          processingTime: `${Date.now() - startTime}ms`,
          timestamp: new Date().toISOString(),
        },
      });
    }

    let documentModel, documentField, documentId;

    if (documentType === "idPicture") {
      documentModel = IDPicture;
      documentField = "idPictureId";
      documentId = credential.idPictureId;
    } else {
      documentModel = Selfie;
      documentField = "selfiePictureId";
      documentId = credential.selfiePictureId;
    }

    if (!documentId) {
      return res.status(404).json({
        success: false,
        message: `${documentType} not found`,
        code: "DOCUMENT_NOT_FOUND",
        meta: {
          processingTime: `${Date.now() - startTime}ms`,
          timestamp: new Date().toISOString(),
        },
      });
    }

    // Find and delete document
    const document = await documentModel.findById(documentId);
    if (document) {
      await deleteFromCloudinary(document.public_id);
      await documentModel.findByIdAndDelete(documentId);
    }

    // Update credential
    await Credential.findByIdAndUpdate(userId, {
      [documentField]: undefined,
      updatedAt: new Date(),
    });

    const processingTime = Date.now() - startTime;

    logger.info("Document deleted successfully", {
      userId,
      documentType,
      documentId,
      ip: req.ip,
      userAgent: req.get("User-Agent"),
      processingTime: `${processingTime}ms`,
      timestamp: new Date().toISOString(),
    });

    res.status(200).json({
      success: true,
      message: `${documentType} deleted successfully`,
      code: "DOCUMENT_DELETED",
      data: {
        deletedDocument: {
          type: documentType,
          id: documentId,
          deletedAt: new Date().toISOString(),
        },
      },
      meta: {
        processingTime: `${processingTime}ms`,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (err) {
    return handleVerificationError(err, res, "Delete document", req);
  }
};

// ✅ Get all pending verifications (for admin)
const getPendingVerifications = async (req, res) => {
  const startTime = Date.now();
  req.startTime = startTime;

  try {
    // Find all pending verifications
    const pendingCredentials = await Credential.find({
      userType: "worker",
      isVerified: false,
      isRejected: false,
      isBlocked: false,
      idPictureId: { $exists: true },
      selfiePictureId: { $exists: true },
    })
      .populate("idPictureId", "url createdAt")
      .populate("selfiePictureId", "url createdAt")
      .populate("workerId", "firstName lastName profilePicture")
      .select("email userType createdAt updatedAt verificationNotes")
      .sort({ createdAt: -1 })
      .lean();

    // Optimize data for response
    const optimizedVerifications = pendingCredentials.map(
      optimizeVerificationForResponse
    );

    const processingTime = Date.now() - startTime;

    logger.info("Pending verifications retrieved", {
      count: pendingCredentials.length,
      ip: req.ip,
      userAgent: req.get("User-Agent"),
      processingTime: `${processingTime}ms`,
      timestamp: new Date().toISOString(),
    });

    res.status(200).json({
      success: true,
      message: "Pending verifications retrieved successfully",
      code: "PENDING_VERIFICATIONS_RETRIEVED",
      data: {
        verifications: optimizedVerifications,
        totalCount: pendingCredentials.length,
      },
      meta: {
        processingTime: `${processingTime}ms`,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (err) {
    return handleVerificationError(err, res, "Get pending verifications", req);
  }
};

// ==================== EXPORTS ====================

module.exports = {
  uploadIDPicture,
  uploadSelfie,
  getVerificationStatus,
  deleteDocument,
  getPendingVerifications,
};
