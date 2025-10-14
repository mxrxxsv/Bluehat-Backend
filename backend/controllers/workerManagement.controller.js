const mongoose = require("mongoose");
const Joi = require("joi");
const xss = require("xss");
const Worker = require("../models/Worker");
const Credential = require("../models/Credential");
const { decryptAES128 } = require("../utils/encipher");
const logger = require("../utils/logger");

// ==================== JOI SCHEMAS ====================
const blockWorkerSchema = Joi.object({
  reason: Joi.string().trim().min(5).max(200).required().messages({
    "string.min": "Block reason must be at least 5 characters",
    "string.max": "Block reason cannot exceed 200 characters",
    "any.required": "Block reason is required",
  }),
});

// ==================== HELPERS ====================
const sanitizeInput = (obj) => {
  if (typeof obj === "string") return xss(obj.trim());
  if (Array.isArray(obj)) return obj.map(sanitizeInput);
  if (typeof obj === "object" && obj !== null) {
    const sanitized = {};
    for (const [key, value] of Object.entries(obj)) {
      sanitized[key] = sanitizeInput(value);
    }
    return sanitized;
  }
  return obj;
};

// ==================== CONTROLLERS ====================
// Get all workers (decrypted) with pagination
const getWorkers = async (req, res) => {
  const startTime = Date.now();

  try {
    // ✅ Validate query parameters for pagination
    const { error, value } = Joi.object({
      page: Joi.number().integer().min(1).max(1000).default(1),
      sortBy: Joi.string()
        .valid(
          "createdAt",
          "firstName",
          "lastName",
          "email",
          "rating",
          "verifiedAt"
        )
        .default("createdAt"),
      order: Joi.string().valid("asc", "desc").default("desc"),
      search: Joi.string().trim().allow("").max(100).optional().messages({
        "string.min": "Search term must be at least 2 characters",
        "string.max": "Search term cannot exceed 100 characters",
      }),
      accountStatus: Joi.string()
        .valid("all", "active")
        .default("all")
        .messages({
          "any.only": "Account status must be one of: all, active",
        }),
      verificationStatus: Joi.string()
        .valid(
          "verified",
          "unverified",
          "pending",
          "rejected",
          "not_submitted",
          "all"
        )
        .default("all")
        .messages({
          "any.only":
            "Verification status must be one of: verified, unverified, pending, rejected, not_submitted, all",
        }),
      workStatus: Joi.string()
        .valid("available", "working", "not available", "all")
        .default("all")
        .messages({
          "any.only":
            "Work status must be one of: available, working, not available, all",
        }),
      blockedStatus: Joi.string()
        .valid("blocked", "active", "all")
        .default("all")
        .messages({
          "any.only": "Blocked status must be one of: blocked, active, all",
        }),
      minRating: Joi.number().min(0).max(5).optional(),
      maxRating: Joi.number().min(0).max(5).optional(),
    }).validate(req.query, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      logger.warn("Get workers validation failed", {
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

    // ✅ Sanitize query parameters
    const sanitizedQuery = sanitizeInput(value);
    const {
      page,
      sortBy,
      order,
      search,
      accountStatus,
      verificationStatus,
      workStatus,
      blockedStatus,
      minRating,
      maxRating,
    } = sanitizedQuery;

    // ✅ Fixed limit to 30 workers per page
    const limit = 30;
    const skip = (page - 1) * limit;
    const sortOrder = order === "asc" ? 1 : -1;

    // ✅ Build match conditions for aggregation
    const matchConditions = {
      "cred.userType": "worker",
    };

    // Add account status filter (only active for now since no blocking system)
    if (accountStatus === "active") {
      // Only active accounts (no additional filtering needed as there's no blocking)
    }

    // Add verification status filter
    if (verificationStatus !== "all") {
      if (verificationStatus === "verified") {
        matchConditions["isVerified"] = true;
      } else if (verificationStatus === "unverified") {
        matchConditions["isVerified"] = false;
      } else if (verificationStatus === "pending") {
        matchConditions["verificationStatus"] = "pending";
      } else if (verificationStatus === "rejected") {
        matchConditions["verificationStatus"] = "rejected";
      } else if (verificationStatus === "not_submitted") {
        matchConditions["verificationStatus"] = "not_submitted";
      }
    }

    // Add work status filter
    if (workStatus !== "all") {
      matchConditions["status"] = workStatus;
    }

    // Add blocked status filter
    if (blockedStatus !== "all") {
      if (blockedStatus === "blocked") {
        matchConditions["blocked"] = true;
      } else if (blockedStatus === "active") {
        matchConditions["blocked"] = { $ne: true };
      }
    }

    // ✅ Build aggregation pipeline
    const pipeline = [
      {
        $lookup: {
          from: "credentials",
          localField: "credentialId",
          foreignField: "_id",
          as: "cred",
        },
      },
      { $unwind: "$cred" },
      { $match: matchConditions },
      {
        $project: {
          firstName: 1,
          middleName: 1,
          lastName: 1,
          suffixName: 1,
          profilePicture: 1,
          sex: 1,
          address: 1,
          contactNumber: 1,
          dateOfBirth: 1,
          maritalStatus: 1,
          verificationStatus: 1,
          isVerified: 1,
          verifiedAt: 1,
          status: 1,
          rating: 1,
          totalRatings: 1,
          blocked: 1,
          blockReason: 1,
          skillsByCategory: 1,
          experience: 1,
          biography: 1,
          createdAt: 1,
          credentialId: "$cred._id",
          email: "$cred.email",
          userType: "$cred.userType",
          // Calculate average rating
          averageRating: {
            $cond: {
              if: { $gt: ["$totalRatings", 0] },
              then: { $divide: ["$rating", "$totalRatings"] },
              else: 0,
            },
          },
        },
      },
    ];

    // ✅ Add search functionality if search term provided
    if (search) {
      pipeline.push({
        $match: {
          $or: [
            { email: { $regex: search, $options: "i" } },
            { biography: { $regex: search, $options: "i" } },
          ],
        },
      });
    }

    // Add rating filter
    if (minRating !== undefined || maxRating !== undefined) {
      const ratingMatch = {};
      if (minRating !== undefined) {
        ratingMatch["averageRating"] = { $gte: minRating };
      }
      if (maxRating !== undefined) {
        if (ratingMatch["averageRating"]) {
          ratingMatch["averageRating"]["$lte"] = maxRating;
        } else {
          ratingMatch["averageRating"] = { $lte: maxRating };
        }
      }
      pipeline.push({ $match: ratingMatch });
    }

    // ✅ Get total count for pagination
    const totalCountPipeline = [...pipeline, { $count: "total" }];
    const totalCountResult = await Worker.aggregate(totalCountPipeline);
    const totalCount =
      totalCountResult.length > 0 ? totalCountResult[0].total : 0;

    // ✅ Add sorting, skip, and limit
    const sortField = sortBy === "rating" ? "averageRating" : sortBy;
    pipeline.push(
      { $sort: { [sortField]: sortOrder } },
      { $skip: skip },
      { $limit: limit }
    );

    // ✅ Execute aggregation
    const docs = await Worker.aggregate(pipeline);

    // ✅ Decrypt sensitive data
    let successfulDecryptions = 0;
    let failedDecryptions = 0;

    for (let i = 0; i < docs.length; i++) {
      const worker = docs[i];
      try {
        if (worker.firstName)
          worker.firstName = decryptAES128(worker.firstName);
        if (worker.lastName) worker.lastName = decryptAES128(worker.lastName);
        if (worker.middleName)
          worker.middleName = decryptAES128(worker.middleName);
        if (worker.suffixName)
          worker.suffixName = decryptAES128(worker.suffixName);
        if (worker.contactNumber)
          worker.contactNumber = decryptAES128(worker.contactNumber);
        if (worker.address) {
          if (worker.address.street)
            worker.address.street = decryptAES128(worker.address.street);
          if (worker.address.barangay)
            worker.address.barangay = decryptAES128(worker.address.barangay);
          if (worker.address.city)
            worker.address.city = decryptAES128(worker.address.city);
          if (worker.address.province)
            worker.address.province = decryptAES128(worker.address.province);
          if (worker.address.region)
            worker.address.region = decryptAES128(worker.address.region);
        }
        successfulDecryptions++;
      } catch (decryptError) {
        logger.error("Decryption error", {
          error: decryptError.message,
          workerId: worker._id,
          timestamp: new Date().toISOString(),
        });
        failedDecryptions++;
      }
    }

    // ✅ Calculate pagination data
    const totalPages = Math.ceil(totalCount / limit);
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;

    // ✅ Get statistics
    const statsAggregation = await Worker.aggregate([
      {
        $lookup: {
          from: "credentials",
          localField: "credentialId",
          foreignField: "_id",
          as: "cred",
        },
      },
      { $unwind: "$cred" },
      { $match: { "cred.userType": "worker" } },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          blocked: { $sum: { $cond: [{ $eq: ["$blocked", true] }, 1, 0] } },
          active: { $sum: { $cond: [{ $ne: ["$blocked", true] }, 1, 0] } },
          approved: { $sum: { $cond: [{ $eq: ["$isVerified", true] }, 1, 0] } },
          pending: { $sum: { $cond: [{ $eq: ["$verificationStatus", "pending"] }, 1, 0] } },
        },
      },
    ]);

    const statistics =
      statsAggregation.length > 0
        ? {
          total: statsAggregation[0].total,
          blocked: statsAggregation[0].blocked,
          active: statsAggregation[0].active,
          approved: statsAggregation[0].approved,
          pending: statsAggregation[0].pending,
        }
        : {
          total: 0,
          blocked: 0,
          active: 0,
          approved: 0,
          pending: 0,
        };

    const processingTime = Date.now() - startTime;

    logger.info("Workers retrieved with pagination", {
      page,
      limit,
      totalCount,
      totalPages,
      workersReturned: docs.length,
      successfulDecryptions,
      failedDecryptions,
      sortBy,
      order,
      search: search || "none",
      accountStatus,
      verificationStatus,
      workStatus,
      blockedStatus,
      processingTime: `${processingTime}ms`,
      timestamp: new Date().toISOString(),
    });

    res.status(200).json({
      success: true,
      message: "Workers retrieved successfully",
      code: "WORKERS_RETRIEVED",
      data: {
        workers: docs,
        pagination: {
          currentPage: page,
          totalPages,
          totalItems: totalCount,
          itemsPerPage: limit,
          hasNextPage,
          hasPrevPage,
          nextPage: hasNextPage ? page + 1 : null,
          prevPage: hasPrevPage ? page - 1 : null,
        },
        statistics,
        filters: {
          search: search || null,
          accountStatus,
          verificationStatus,
          workStatus,
          blockedStatus,
          sortBy,
          order,
        },
      },
      meta: {
        successfulDecryptions,
        failedDecryptions,
        processingTime: `${processingTime}ms`,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    const processingTime = Date.now() - startTime;

    logger.error("Error fetching workers", {
      error: error.message,
      stack: error.stack,
      ip: req.ip,
      userAgent: req.get("User-Agent"),
      processingTime: `${processingTime}ms`,
      timestamp: new Date().toISOString(),
    });

    res.status(500).json({
      success: false,
      message: "Failed to retrieve workers due to server error",
      code: "WORKERS_RETRIEVAL_ERROR",
      meta: {
        processingTime: `${processingTime}ms`,
        timestamp: new Date().toISOString(),
      },
    });
  }
};

// Get single worker details by ID
const getWorkerDetails = async (req, res) => {
  const startTime = Date.now();

  try {
    const { id } = req.params;

    // Validate worker ID
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid worker ID format",
        code: "INVALID_WORKER_ID",
      });
    }

    // Find worker with credential data
    const workerData = await Worker.aggregate([
      {
        $match: { _id: new mongoose.Types.ObjectId(id) },
      },
      {
        $lookup: {
          from: "credentials",
          localField: "credentialId",
          foreignField: "_id",
          as: "cred",
        },
      },
      { $unwind: "$cred" },
      { $match: { "cred.userType": "worker" } },
      {
        $project: {
          firstName: 1,
          middleName: 1,
          lastName: 1,
          suffixName: 1,
          profilePicture: 1,
          sex: 1,
          address: 1,
          contactNumber: 1,
          dateOfBirth: 1,
          maritalStatus: 1,
          verificationStatus: 1,
          isVerified: 1,
          verifiedAt: 1,
          skillsByCategory: 1,
          experience: 1,
          portfolio: 1,
          biography: 1,
          blocked: 1,
          blockReason: 1,
          createdAt: 1,
          credentialId: "$cred._id",
          email: "$cred.email",
          userType: "$cred.userType",
        },
      },
    ]);

    if (!workerData || workerData.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Worker not found",
        code: "WORKER_NOT_FOUND",
      });
    }

    const worker = workerData[0];

    // Decrypt sensitive data
    try {
      if (worker.firstName) worker.firstName = decryptAES128(worker.firstName);
      if (worker.lastName) worker.lastName = decryptAES128(worker.lastName);
      if (worker.middleName)
        worker.middleName = decryptAES128(worker.middleName);
      if (worker.suffixName)
        worker.suffixName = decryptAES128(worker.suffixName);
      if (worker.contactNumber)
        worker.contactNumber = decryptAES128(worker.contactNumber);

      if (worker.address) {
        if (worker.address.street)
          worker.address.street = decryptAES128(worker.address.street);
        if (worker.address.barangay)
          worker.address.barangay = decryptAES128(worker.address.barangay);
        if (worker.address.city)
          worker.address.city = decryptAES128(worker.address.city);
        if (worker.address.province)
          worker.address.province = decryptAES128(worker.address.province);
        if (worker.address.region)
          worker.address.region = decryptAES128(worker.address.region);
      }
    } catch (decryptError) {
      logger.error("Decryption error for worker details", {
        error: decryptError.message,
        workerId: id,
      });
    }

    res.status(200).json({
      success: true,
      message: "Worker details retrieved successfully",
      data: { worker },
    });
  } catch (error) {
    logger.error("Error fetching worker details", { error: error.message });
    res.status(500).json({
      success: false,
      message: "Failed to retrieve worker details",
    });
  }
};

// Block a worker (update Worker model)
const blockWorker = async (req, res) => {
  const startTime = Date.now();
  try {
    const { id } = req.params;
    const { error, value } = blockWorkerSchema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      logger.warn("Block worker validation failed", {
        errors: error.details,
        workerId: id,
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

    const sanitizedReason = sanitizeInput(value.reason);

    // Find worker and block
    const worker = await Worker.findById(id);
    if (!worker) {
      return res.status(404).json({
        success: false,
        message: "Worker not found",
        code: "WORKER_NOT_FOUND",
      });
    }

    worker.blocked = true;
    worker.blockReason = sanitizedReason;
    await worker.save();

    logger.info("Worker blocked", {
      workerId: id,
      reason: sanitizedReason,
      processingTime: `${Date.now() - startTime}ms`,
    });

    res.status(200).json({
      success: true,
      message: "Worker blocked successfully",
      data: {
        workerId: id,
        blocked: true,
        blockReason: sanitizedReason,
      },
      meta: {
        processingTime: `${Date.now() - startTime}ms`,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    logger.error("Error blocking worker", { error: error.message });
    res.status(500).json({
      success: false,
      message: "Error blocking worker",
      error: error.message,
    });
  }
};

// Unblock a worker (update Worker model)
const unblockWorker = async (req, res) => {
  const startTime = Date.now();
  try {
    const { id } = req.params;

    // Find worker and unblock
    const worker = await Worker.findById(id);
    if (!worker) {
      return res.status(404).json({
        success: false,
        message: "Worker not found",
        code: "WORKER_NOT_FOUND",
      });
    }

    worker.blocked = false;
    await worker.save();

    logger.info("Worker unblocked", {
      workerId: id,
      processingTime: `${Date.now() - startTime}ms`,
    });

    res.status(200).json({
      success: true,
      message: "Worker unblocked successfully",
      data: {
        workerId: id,
        blocked: false,
      },
      meta: {
        processingTime: `${Date.now() - startTime}ms`,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    logger.error("Error unblocking worker", { error: error.message });
    res.status(500).json({
      success: false,
      message: "Error unblocking worker",
      error: error.message,
    });
  }
};

module.exports = {
  getWorkers,
  getWorkerDetails,
  blockWorker,
  unblockWorker,
};
