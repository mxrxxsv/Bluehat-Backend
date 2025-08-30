const Joi = require("joi");
const xss = require("xss");
const bcrypt = require("bcryptjs");
const mongoose = require("mongoose");

const Admin = require("../models/Admin");
const logger = require("../utils/logger");
const {
  generateAdminToken,
  setAdminTokenCookie,
} = require("../utils/adminTokenandCookie/generateAdminTokenAndCookie");

const SALT_RATE = 12;

// ==================== JOI VALIDATION SCHEMAS ====================

const adminSignupSchema = Joi.object({
  firstName: Joi.string()
    .trim()
    .min(2)
    .max(50)
    .pattern(/^[a-zA-Z\s]+$/)
    .required()
    .messages({
      "string.min": "First name must be at least 2 characters",
      "string.max": "First name cannot exceed 50 characters",
      "string.pattern.base": "First name can only contain letters and spaces",
      "any.required": "First name is required",
    }),

  lastName: Joi.string()
    .trim()
    .min(2)
    .max(50)
    .pattern(/^[a-zA-Z\s]+$/)
    .required()
    .messages({
      "string.min": "Last name must be at least 2 characters",
      "string.max": "Last name cannot exceed 50 characters",
      "string.pattern.base": "Last name can only contain letters and spaces",
      "any.required": "Last name is required",
    }),

  userName: Joi.string()
    .trim()
    .min(3)
    .max(30)
    .pattern(/^[a-zA-Z0-9_.-]+$/)
    .required()
    .messages({
      "string.min": "Username must be at least 3 characters",
      "string.max": "Username cannot exceed 30 characters",
      "string.pattern.base":
        "Username can only contain letters, numbers, dots, hyphens, and underscores",
      "any.required": "Username is required",
    }),

  password: Joi.string()
    .min(8)
    .max(128)
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .required()
    .messages({
      "string.min": "Password must be at least 8 characters",
      "string.max": "Password cannot exceed 128 characters",
      "string.pattern.base":
        "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character",
      "any.required": "Password is required",
    }),

  code: Joi.string()
    .length(6)
    .pattern(/^[A-Z0-9]+$/)
    .required()
    .messages({
      "string.length": "Admin code must be exactly 6 characters",
      "string.pattern.base":
        "Admin code must contain only uppercase letters and numbers",
      "any.required": "Admin code is required",
    }),
});

const adminLoginSchema = Joi.object({
  userName: Joi.string().trim().min(3).max(30).required().messages({
    "string.min": "Username must be at least 3 characters",
    "string.max": "Username cannot exceed 30 characters",
    "any.required": "Username is required",
  }),

  password: Joi.string().min(8).max(128).required().messages({
    "string.min": "Password must be at least 8 characters",
    "string.max": "Password cannot exceed 128 characters",
    "any.required": "Password is required",
  }),

  code: Joi.string().length(6).required().messages({
    "string.length": "Admin code must be exactly 6 characters",
    "any.required": "Admin code is required",
  }),
});

const getAllAdminsSchema = Joi.object({
  page: Joi.number().integer().min(1).max(1000).default(1),
  limit: Joi.number().integer().min(1).max(100).default(10),
  search: Joi.string().trim().max(100).optional(),
  sortBy: Joi.string()
    .valid("firstName", "lastName", "userName", "createdAt", "lastLogin")
    .default("createdAt"),
  order: Joi.string().valid("asc", "desc").default("desc"),
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

const handleAdminError = (
  error,
  res,
  operation = "Admin operation",
  req = null
) => {
  logger.error(`${operation} error`, {
    error: error.message,
    stack: error.stack,
    ip: req?.ip,
    userAgent: req?.get("User-Agent"),
    adminId: req?.admin?._id,
    requestBody: req?.body
      ? { ...req.body, password: "[REDACTED]", code: "[REDACTED]" }
      : undefined,
    timestamp: new Date().toISOString(),
  });

  // Handle specific error types
  if (error.name === "ValidationError") {
    const mongooseErrors = Object.values(error.errors).map((e) => ({
      field: e.path,
      message: e.message,
      value: e.value,
    }));

    return res.status(400).json({
      success: false,
      message: "Validation error",
      code: "VALIDATION_ERROR",
      errors: mongooseErrors,
    });
  }

  if (error.code === 11000) {
    const field = Object.keys(error.keyPattern)[0];
    return res.status(409).json({
      success: false,
      message: `${field} already exists`,
      code: "DUPLICATE_KEY_ERROR",
      field: field,
    });
  }

  // Don't expose internal errors in production
  if (process.env.NODE_ENV === "production") {
    return res.status(500).json({
      success: false,
      message: `${operation} failed. Please try again.`,
      code: "ADMIN_ERROR",
    });
  }

  return res.status(500).json({
    success: false,
    message: error.message,
    code: "ADMIN_ERROR",
  });
};

// ==================== CONTROLLER FUNCTIONS ====================

// Admin Signup
const signup = async (req, res) => {
  const startTime = Date.now();

  try {
    // ✅ Validate input data
    const { error, value } = adminSignupSchema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      logger.warn("Admin signup validation failed", {
        errors: error.details,
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
      });
    }

    // ✅ Sanitize input to prevent XSS
    const sanitizedData = sanitizeInput(value);
    const { firstName, lastName, userName, password, code } = sanitizedData;

    // ✅ Check for existing admin
    const existingAdmin = await Admin.findOne({
      userName: { $regex: new RegExp(`^${userName}$`, "i") },
    });

    if (existingAdmin) {
      logger.warn("Admin signup attempted with existing username", {
        userName,
        ip: req.ip,
        userAgent: req.get("User-Agent"),
        timestamp: new Date().toISOString(),
      });

      return res.status(409).json({
        success: false,
        message: "Username already exists. Please choose a different one.",
        code: "USERNAME_EXISTS",
      });
    }

    // ✅ Hash password and code
    const [hashedPassword, hashedCode] = await Promise.all([
      bcrypt.hash(password, SALT_RATE),
      bcrypt.hash(code, SALT_RATE),
    ]);

    // ✅ Create admin
    const newAdmin = new Admin({
      firstName,
      lastName,
      userName: userName.toLowerCase(),
      password: hashedPassword,
      code: hashedCode,
    });

    await newAdmin.save();

    // ✅ Generate JWT token
    const token = generateAdminToken(newAdmin._id);
    setAdminTokenCookie(res, token);

    const processingTime = Date.now() - startTime;

    logger.info("Admin signup successful", {
      adminId: newAdmin._id,
      userName: newAdmin.userName,
      firstName: newAdmin.firstName,
      lastName: newAdmin.lastName,
      ip: req.ip,
      userAgent: req.get("User-Agent"),
      processingTime: `${processingTime}ms`,
      timestamp: new Date().toISOString(),
    });

    res.status(201).json({
      success: true,
      message: "Admin account created successfully",
      code: "ADMIN_CREATED",
      data: {
        admin: {
          id: newAdmin._id,
          firstName: newAdmin.firstName,
          lastName: newAdmin.lastName,
          userName: newAdmin.userName,
          role: "admin",
          createdAt: newAdmin.createdAt,
        },
      },
      meta: {
        processingTime: `${processingTime}ms`,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (err) {
    const processingTime = Date.now() - startTime;

    logger.error("Admin signup failed", {
      error: err.message,
      stack: err.stack,
      ip: req.ip,
      userAgent: req.get("User-Agent"),
      requestBody: { ...req.body, password: "[REDACTED]", code: "[REDACTED]" },
      processingTime: `${processingTime}ms`,
      timestamp: new Date().toISOString(),
    });

    return handleAdminError(err, res, "Admin signup", req);
  }
};

// Admin Login
const login = async (req, res) => {
  const startTime = Date.now();

  try {
    // ✅ Validate input data
    const { error, value } = adminLoginSchema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      logger.warn("Admin login validation failed", {
        errors: error.details,
        ip: req.ip,
        userAgent: req.get("User-Agent"),
        timestamp: new Date().toISOString(),
      });

      return res.status(400).json({
        success: false,
        message: "Invalid credentials format",
        code: "VALIDATION_ERROR",
        errors: error.details.map((detail) => ({
          field: detail.path.join("."),
          message: detail.message,
        })),
      });
    }

    // ✅ Sanitize input to prevent XSS
    const sanitizedData = sanitizeInput(value);
    const { userName, password, code } = sanitizedData;

    // ✅ Find admin (include password and code fields)
    const admin = await Admin.findOne({
      userName: { $regex: new RegExp(`^${userName}$`, "i") },
    }).select("+password +code");

    if (!admin) {
      logger.warn("Admin login failed - admin not found", {
        userName,
        ip: req.ip,
        userAgent: req.get("User-Agent"),
        timestamp: new Date().toISOString(),
      });

      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
        code: "INVALID_CREDENTIALS",
      });
    }

    // ✅ Verify password and code
    const [isPasswordMatch, isCodeMatch] = await Promise.all([
      bcrypt.compare(password, admin.password),
      bcrypt.compare(code, admin.code),
    ]);

    if (!isPasswordMatch || !isCodeMatch) {
      logger.warn("Admin login failed - invalid credentials", {
        adminId: admin._id,
        userName: admin.userName,
        passwordMatch: isPasswordMatch,
        codeMatch: isCodeMatch,
        ip: req.ip,
        userAgent: req.get("User-Agent"),
        timestamp: new Date().toISOString(),
      });

      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
        code: "INVALID_CREDENTIALS",
      });
    }

    // ✅ Generate JWT token
    const token = generateAdminToken(admin._id);
    setAdminTokenCookie(res, token);

    // ✅ Update last login
    admin.lastLogin = new Date();
    await admin.save();

    const processingTime = Date.now() - startTime;

    logger.info("Admin login successful", {
      adminId: admin._id,
      userName: admin.userName,
      firstName: admin.firstName,
      lastName: admin.lastName,
      lastLogin: admin.lastLogin,
      ip: req.ip,
      userAgent: req.get("User-Agent"),
      processingTime: `${processingTime}ms`,
      timestamp: new Date().toISOString(),
    });

    res.status(200).json({
      success: true,
      message: "Admin login successful",
      code: "LOGIN_SUCCESS",
      data: {
        admin: {
          id: admin._id,
          firstName: admin.firstName,
          lastName: admin.lastName,
          userName: admin.userName,
          role: "admin",
          lastLogin: admin.lastLogin,
        },
      },
      meta: {
        processingTime: `${processingTime}ms`,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (err) {
    const processingTime = Date.now() - startTime;

    logger.error("Admin login failed", {
      error: err.message,
      stack: err.stack,
      ip: req.ip,
      userAgent: req.get("User-Agent"),
      requestBody: { ...req.body, password: "[REDACTED]", code: "[REDACTED]" },
      processingTime: `${processingTime}ms`,
      timestamp: new Date().toISOString(),
    });

    return handleAdminError(err, res, "Admin login", req);
  }
};

// Admin Profile (Protected Route)
const getAdminProfile = async (req, res) => {
  const startTime = Date.now();

  try {
    // ✅ Verify admin authentication
    if (!req.admin || !req.admin._id) {
      logger.warn("Unauthorized admin profile access attempt", {
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

    // ✅ Get fresh admin data
    const admin = await Admin.findById(req.admin._id).select("-password -code");

    if (!admin) {
      logger.warn("Admin profile requested for non-existent admin", {
        adminId: req.admin._id,
        ip: req.ip,
        userAgent: req.get("User-Agent"),
        timestamp: new Date().toISOString(),
      });

      return res.status(404).json({
        success: false,
        message: "Admin not found",
        code: "ADMIN_NOT_FOUND",
      });
    }

    const processingTime = Date.now() - startTime;

    logger.info("Admin profile retrieved", {
      adminId: admin._id,
      userName: admin.userName,
      ip: req.ip,
      userAgent: req.get("User-Agent"),
      processingTime: `${processingTime}ms`,
      timestamp: new Date().toISOString(),
    });

    res.status(200).json({
      success: true,
      message: "Admin profile retrieved successfully",
      code: "PROFILE_RETRIEVED",
      data: {
        admin: {
          id: admin._id,
          firstName: admin.firstName,
          lastName: admin.lastName,
          userName: admin.userName,
          role: "admin",
          createdAt: admin.createdAt,
          lastLogin: admin.lastLogin,
        },
      },
      meta: {
        processingTime: `${processingTime}ms`,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (err) {
    const processingTime = Date.now() - startTime;

    logger.error("Admin profile retrieval failed", {
      error: err.message,
      stack: err.stack,
      adminId: req.admin?._id,
      ip: req.ip,
      userAgent: req.get("User-Agent"),
      processingTime: `${processingTime}ms`,
      timestamp: new Date().toISOString(),
    });

    return handleAdminError(err, res, "Get admin profile", req);
  }
};

// Admin Logout
const logout = async (req, res) => {
  const startTime = Date.now();

  try {
    // ✅ Clear admin token cookie
    res.clearCookie("adminToken", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
    });

    const processingTime = Date.now() - startTime;

    logger.info("Admin logout successful", {
      adminId: req.admin?._id,
      userName: req.admin?.userName,
      ip: req.ip,
      userAgent: req.get("User-Agent"),
      processingTime: `${processingTime}ms`,
      timestamp: new Date().toISOString(),
    });

    res.status(200).json({
      success: true,
      message: "Admin logout successful",
      code: "LOGOUT_SUCCESS",
      meta: {
        processingTime: `${processingTime}ms`,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (err) {
    const processingTime = Date.now() - startTime;

    logger.error("Admin logout failed", {
      error: err.message,
      stack: err.stack,
      adminId: req.admin?._id,
      ip: req.ip,
      userAgent: req.get("User-Agent"),
      processingTime: `${processingTime}ms`,
      timestamp: new Date().toISOString(),
    });

    return handleAdminError(err, res, "Admin logout", req);
  }
};

// Check Admin Authentication
const checkAuth = async (req, res) => {
  const startTime = Date.now();

  try {
    // ✅ Verify admin authentication
    if (!req.admin || !req.admin._id) {
      return res.status(401).json({
        success: false,
        message: "Admin not authenticated",
        code: "NOT_AUTHENTICATED",
        isAuthenticated: false,
      });
    }

    // ✅ Get fresh admin data
    const admin = await Admin.findById(req.admin._id).select("-password -code");

    if (!admin) {
      logger.warn("Auth check for non-existent admin", {
        adminId: req.admin._id,
        ip: req.ip,
        userAgent: req.get("User-Agent"),
        timestamp: new Date().toISOString(),
      });

      return res.status(404).json({
        success: false,
        message: "Admin not found",
        code: "ADMIN_NOT_FOUND",
        isAuthenticated: false,
      });
    }

    const processingTime = Date.now() - startTime;

    logger.info("Admin auth check successful", {
      adminId: admin._id,
      userName: admin.userName,
      ip: req.ip,
      userAgent: req.get("User-Agent"),
      processingTime: `${processingTime}ms`,
      timestamp: new Date().toISOString(),
    });

    res.status(200).json({
      success: true,
      message: "Admin authentication verified",
      code: "AUTHENTICATED",
      isAuthenticated: true,
      data: {
        admin: {
          id: admin._id,
          firstName: admin.firstName,
          lastName: admin.lastName,
          userName: admin.userName,
          role: "admin",
          lastLogin: admin.lastLogin,
        },
      },
      meta: {
        processingTime: `${processingTime}ms`,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (err) {
    const processingTime = Date.now() - startTime;

    logger.error("Admin auth check failed", {
      error: err.message,
      stack: err.stack,
      adminId: req.admin?._id,
      ip: req.ip,
      userAgent: req.get("User-Agent"),
      processingTime: `${processingTime}ms`,
      timestamp: new Date().toISOString(),
    });

    return handleAdminError(err, res, "Check admin auth", req);
  }
};

// Get All Admins (Super Admin only)
const getAllAdmins = async (req, res) => {
  const startTime = Date.now();

  try {
    // ✅ Validate query parameters
    const { error, value } = getAllAdminsSchema.validate(req.query, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      logger.warn("Get all admins validation failed", {
        errors: error.details,
        adminId: req.admin?._id,
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
      });
    }

    // ✅ Verify admin authentication
    if (!req.admin || !req.admin._id) {
      logger.warn("Unauthorized get all admins attempt", {
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

    const sanitizedQuery = sanitizeInput(value);
    const { page, limit, search, sortBy, order } = sanitizedQuery;
    const skip = (page - 1) * limit;

    // ✅ Build search query
    let searchQuery = {};
    if (search) {
      searchQuery = {
        $or: [
          { firstName: { $regex: search, $options: "i" } },
          { lastName: { $regex: search, $options: "i" } },
          { userName: { $regex: search, $options: "i" } },
        ],
      };
    }

    // ✅ Build sort object
    const sortObject = {};
    sortObject[sortBy] = order === "asc" ? 1 : -1;

    const [admins, totalCount] = await Promise.all([
      Admin.find(searchQuery)
        .select("-password -code")
        .sort(sortObject)
        .skip(skip)
        .limit(limit)
        .lean(), // ✅ Performance optimization

      Admin.countDocuments(searchQuery),
    ]);

    const processingTime = Date.now() - startTime;

    logger.info("Get all admins successful", {
      requestingAdminId: req.admin._id,
      totalAdmins: admins.length,
      totalCount,
      page,
      limit,
      search: search || "none",
      sortBy,
      order,
      ip: req.ip,
      userAgent: req.get("User-Agent"),
      processingTime: `${processingTime}ms`,
      timestamp: new Date().toISOString(),
    });

    // ✅ Set cache headers
    res.set({
      "Cache-Control": "private, max-age=300", // 5 minutes for admin data
      "X-Total-Count": totalCount.toString(),
    });

    res.status(200).json({
      success: true,
      message: "Admins retrieved successfully",
      code: "ADMINS_RETRIEVED",
      data: {
        admins,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(totalCount / limit),
          totalItems: totalCount,
          itemsPerPage: limit,
          hasNextPage: page < Math.ceil(totalCount / limit),
          hasPrevPage: page > 1,
        },
        filters: {
          search: search || null,
          sortBy,
          order,
        },
      },
      meta: {
        processingTime: `${processingTime}ms`,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (err) {
    const processingTime = Date.now() - startTime;

    logger.error("Get all admins failed", {
      error: err.message,
      stack: err.stack,
      adminId: req.admin?._id,
      query: req.query,
      ip: req.ip,
      userAgent: req.get("User-Agent"),
      processingTime: `${processingTime}ms`,
      timestamp: new Date().toISOString(),
    });

    return handleAdminError(err, res, "Get all admins", req);
  }
};

module.exports = {
  signup,
  login,
  getAdminProfile,
  logout,
  checkAuth,
  getAllAdmins,
};
