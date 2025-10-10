const multer = require("multer");
const path = require("path");
const crypto = require("crypto");
const Joi = require("joi");
const logger = require("../utils/logger");

// ✅ Use memory storage for Cloudinary uploads
const storage = multer.memoryStorage();

// Joi schema for validation during upload
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

// Sanitize input to prevent XSS
const sanitizeInput = (data) => {
  const sanitized = {};
  for (const [key, value] of Object.entries(data)) {
    if (typeof value === "string") {
      sanitized[key] = value.replace(/[<>]/g, "").trim();
    } else {
      sanitized[key] = value;
    }
  }
  return sanitized;
};

// ✅ Enhanced file filter with detailed validation
const fileFilter = (req, file, cb) => {
  try {
    // Check file type by MIME type
    const allowedMimes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];

    if (!allowedMimes.includes(file.mimetype)) {
      const error = new Error(
        "Invalid file type. Only JPEG, PNG, and WebP images are allowed."
      );
      error.code = "INVALID_FILE_TYPE";
      return cb(error, false);
    }

    // Check file extension as additional security
    const allowedExtensions = [".jpg", ".jpeg", ".png", ".webp"];
    const fileExtension = path.extname(file.originalname).toLowerCase();

    if (!allowedExtensions.includes(fileExtension)) {
      const error = new Error(
        "Invalid file extension. Only .jpg, .jpeg, .png, and .webp files are allowed."
      );
      error.code = "INVALID_FILE_EXTENSION";
      return cb(error, false);
    }

    // Check for suspicious filenames
    const suspiciousPatterns = [
      /\.php$/i,
      /\.exe$/i,
      /\.bat$/i,
      /\.cmd$/i,
      /\.sh$/i,
      /\.js$/i,
      /\.html$/i,
      /\.htm$/i,
      /\.svg$/i,
    ];

    const isSuspicious = suspiciousPatterns.some((pattern) =>
      pattern.test(file.originalname)
    );

    if (isSuspicious) {
      const error = new Error("Suspicious file name detected.");
      error.code = "SUSPICIOUS_FILENAME";
      return cb(error, false);
    }

    cb(null, true);
  } catch (error) {
    const uploadError = new Error("File validation failed");
    uploadError.code = "FILE_VALIDATION_ERROR";
    uploadError.originalError = error;
    cb(uploadError, false);
  }
};

// ✅ Enhanced multer configuration with field validation
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
    files: 1,
    fieldSize: 10 * 1024 * 1024,
    fieldNameSize: 100,
    headerPairs: 2000,
  },
});

// ✅ Advertisement-specific upload middleware with data validation
const uploadAdvertisementWithValidation = (req, res, next) => {
  const singleUpload = upload.single("image");

  singleUpload(req, res, async (err) => {
    try {
      // Handle multer errors first
      if (err) {
        logger.error("File upload error", {
          error: err.message,
          code: err.code,
          adminId: req.admin?._id,
          ip: req.ip,
        });

        if (err.code === "LIMIT_FILE_SIZE") {
          return res.status(400).json({
            success: false,
            message: "File size too large. Maximum size is 5MB.",
            code: "FILE_TOO_LARGE",
          });
        }

        if (err.code === "INVALID_FILE_TYPE") {
          return res.status(400).json({
            success: false,
            message: err.message,
            code: "INVALID_FILE_TYPE",
          });
        }

        return res.status(400).json({
          success: false,
          message: "File upload failed",
          code: "UPLOAD_ERROR",
        });
      }

      // Validate that file was provided
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

      // Log what we received for debugging
      logger.info("Advertisement upload - received data", {
        adminId: req.admin._id,
        bodyKeys: Object.keys(req.body || {}),
        bodyContent: req.body,
        fileInfo: {
          filename: req.file.originalname,
          size: req.file.size,
          mimetype: req.file.mimetype,
        },
        ip: req.ip,
      });

      // ✅ CRITICAL: Validate form data AFTER multer parsing but BEFORE proceeding
      const { error, value } = advertisementSchema.validate(req.body, {
        abortEarly: false,
        stripUnknown: true,
      });

      if (error) {
        logger.warn("Advertisement data validation failed (post-parsing)", {
          errors: error.details,
          adminId: req.admin._id,
          receivedBody: req.body,
          ip: req.ip,
        });

        return res.status(400).json({
          success: false,
          message: "Validation failed",
          code: "VALIDATION_ERROR",
          errors: error.details.map((detail) => ({
            field: detail.path.join("."),
            message: detail.message,
            value: detail.context?.value,
          })),
        });
      }

      // Sanitize and validate URL
      const sanitizedData = sanitizeInput(value);
      const { link } = sanitizedData;

      try {
        const url = new URL(link);
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

      // Store validated data for controller use
      req.validatedData = sanitizedData;

      logger.info("Advertisement validation successful", {
        adminId: req.admin._id,
        title: sanitizedData.title.substring(0, 20) + "...",
        companyName: sanitizedData.companyName.substring(0, 20) + "...",
        fileSize: req.file.size,
      });

      next();
    } catch (validationError) {
      logger.error("Advertisement validation middleware error", {
        error: validationError.message,
        stack: validationError.stack,
        adminId: req.admin?._id,
        ip: req.ip,
      });

      return res.status(500).json({
        success: false,
        message: "Internal server error during validation",
        code: "VALIDATION_MIDDLEWARE_ERROR",
      });
    }
  });
};

module.exports = uploadAdvertisementWithValidation;
