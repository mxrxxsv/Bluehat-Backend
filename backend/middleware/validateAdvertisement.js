const Joi = require("joi");
const logger = require("../utils/logger");

// Joi schema for pre-upload validation (same as in controller but separate)
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
      // Remove potentially harmful characters but keep basic punctuation
      sanitized[key] = value.replace(/[<>]/g, "").trim();
    } else {
      sanitized[key] = value;
    }
  }
  return sanitized;
};

// Middleware to validate advertisement data BEFORE file upload
const validateAdvertisementData = async (req, res, next) => {
  try {
    // Validate admin authentication
    if (!req.admin || !req.admin._id) {
      logger.warn("Unauthorized advertisement validation attempt", {
        ip: req.ip,
        userAgent: req.get("User-Agent"),
        timestamp: new Date().toISOString(),
      });

      return res.status(401).json({
        success: false,
        message: "Admin authentication required",
        code: "ADMIN_AUTH_REQUIRED",
      });
    }

    // Validate admin role
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

    // ✅ Debug: Log request body to understand what's being sent
    logger.info("Advertisement validation - request body debug", {
      adminId: req.admin._id,
      bodyKeys: Object.keys(req.body || {}),
      bodyContent: req.body,
      contentType: req.get("Content-Type"),
      hasFile: !!req.file,
      ip: req.ip,
    });

    // Joi validation
    const { error, value } = advertisementSchema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      logger.warn("Advertisement data validation failed (pre-upload)", {
        errors: error.details,
        adminId: req.admin._id,
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

    logger.info("Advertisement data pre-validation successful", {
      adminId: req.admin._id,
      title: sanitizedData.title.substring(0, 20) + "...",
      companyName: sanitizedData.companyName.substring(0, 20) + "...",
    });

    next();
  } catch (error) {
    logger.error("Advertisement validation middleware error", {
      error: error.message,
      stack: error.stack,
      adminId: req.admin?._id,
      ip: req.ip,
    });

    return res.status(500).json({
      success: false,
      message: "Internal server error during validation",
      code: "VALIDATION_MIDDLEWARE_ERROR",
    });
  }
};

module.exports = {
  validateAdvertisementData,
};
