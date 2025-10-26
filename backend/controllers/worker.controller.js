const mongoose = require("mongoose");
const Joi = require("joi");
const Worker = require("../models/Worker");
const Credential = require("../models/Credential");
const SkillCategory = require("../models/SkillCategory");
const Review = require("../models/Review");
const { decryptAES128 } = require("../utils/encipher");
const logger = require("../utils/logger");

// ==================== JOI SCHEMAS ====================
const getWorkersSchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  category: Joi.string()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .optional()
    .messages({
      "string.pattern.base": "Invalid category ID format",
    }),
  location: Joi.string().trim().min(2).max(200).optional().messages({
    "string.min": "Location must be at least 2 characters",
    "string.max": "Location cannot exceed 200 characters",
  }),
  status: Joi.string()
    .valid("available", "working", "not available")
    .optional()
    .messages({
      "any.only": "Status must be one of: available, working, not available",
    }),
  minRating: Joi.number().min(0).max(5).optional().messages({
    "number.min": "Minimum rating cannot be less than 0",
    "number.max": "Minimum rating cannot exceed 5",
  }),
});

// ==================== HELPERS ====================
const sanitizeInput = (obj) => {
  if (typeof obj === "string") return obj.trim();
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

// Get all ID-verified workers with pagination and filtering
const getAllWorkers = async (req, res) => {
  const startTime = Date.now();

  try {
    // Validate query parameters
    const { error, value } = getWorkersSchema.validate(req.query, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      logger.warn("Get workers validation failed", {
        errors: error.details,
        ip: req.ip,
        userAgent: req.get("User-Agent"),
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

    const sanitizedQuery = sanitizeInput(value);
    const { page, category, location, status, minRating } = sanitizedQuery;

    // Log minRating for debugging
    if (minRating !== undefined) {
      logger.info("MinRating filter applied", {
        minRating,
        type: typeof minRating,
      });
    }

    const limit = 12; // Fixed limit as per requirement
    const skip = (page - 1) * limit;

    // Build aggregation pipeline
    const pipeline = [
      // Join with credentials to get account verification status
      {
        $lookup: {
          from: "credentials",
          localField: "credentialId",
          foreignField: "_id",
          as: "credential",
        },
      },
      { $unwind: "$credential" },

      // ⭐ CRITICAL: Only show verified, non-blocked workers
      {
        $match: {
          "credential.userType": "worker",
          blocked: { $ne: true },
          isVerified: true,
        },
      },

      // Join with skill categories
      {
        $lookup: {
          from: "skillcategories",
          localField: "skillsByCategory.skillCategoryId",
          foreignField: "_id",
          as: "skillsData",
        },
      },

      // Join with reviews to calculate rating statistics
      {
        $lookup: {
          from: "reviews",
          let: { workerId: "$_id" },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ["$workerId", "$$workerId"] },
                revieweeType: "worker",
                isDeleted: false,
              },
            },
            {
              $group: {
                _id: null,
                averageRating: { $avg: "$rating" },
                totalReviews: { $sum: 1 },
              },
            },
          ],
          as: "reviewStats",
        },
      },

      // Flatten skills and add rating from reviews
      {
        $addFields: {
          skills: {
            $map: {
              input: "$skillsByCategory",
              as: "sbc",
              in: {
                skillCategoryId: "$$sbc.skillCategoryId",
                categoryName: {
                  $arrayElemAt: [
                    {
                      $map: {
                        input: {
                          $filter: {
                            input: "$skillsData",
                            cond: {
                              $eq: ["$$this._id", "$$sbc.skillCategoryId"],
                            },
                          },
                        },
                        as: "cat",
                        in: "$$cat.categoryName",
                      },
                    },
                    0,
                  ],
                },
              },
            },
          },
          email: "$credential.email",
          isAccountVerified: "$credential.isAuthenticated",
          averageRating: {
            $ifNull: [{ $arrayElemAt: ["$reviewStats.averageRating", 0] }, 0],
          },
          totalRatings: {
            $ifNull: [{ $arrayElemAt: ["$reviewStats.totalReviews", 0] }, 0],
          },
        },
      },
    ];

    // Add status filter if provided
    if (status) {
      pipeline.push({
        $match: { status },
      });
    }

    // Add category filter if provided
    if (category) {
      pipeline.push({
        $match: {
          "skillsByCategory.skillCategoryId": new mongoose.Types.ObjectId(
            category
          ),
        },
      });
    }

    // Add rating filter if provided (exact match, rounded to nearest integer)
    if (minRating !== undefined) {
      const ratingFilter = {
        $match: {
          $expr: {
            $eq: [{ $round: "$averageRating" }, Number(minRating)],
          },
        },
      };
      pipeline.push(ratingFilter);
      logger.info("Rating filter added to pipeline", {
        minRating: Number(minRating),
        filterStage: JSON.stringify(ratingFilter),
      });
    }

    // Project only needed fields
    pipeline.push({
      $project: {
        credentialId: 1,
        firstName: 1,
        lastName: 1,
        suffixName: 1,
        sex: 1,
        address: 1,
        profilePicture: 1,
        biography: 1,
        skillsByCategory: 1,
        status: 1,
        email: 1,
        isAccountVerified: 1,
        isVerified: 1,
        verificationStatus: 1,
        hasCompleteDocuments: 1,
        verifiedAt: 1,
        createdAt: 1,
        skills: 1,
        averageRating: 1,
        totalRatings: 1,
      },
    });

    // Get total count for pagination
    const totalCountPipeline = [...pipeline, { $count: "total" }];
    const totalCountResult = await Worker.aggregate(totalCountPipeline);
    const totalCount =
      totalCountResult.length > 0 ? totalCountResult[0].total : 0;

    // Add sorting by rating (descending) and pagination
    pipeline.push(
      { $sort: { averageRating: -1 } },
      { $skip: skip },
      { $limit: limit }
    );

    // Execute aggregation
    const workers = await Worker.aggregate(pipeline);

    // Log some sample ratings for debugging
    if (workers.length > 0 && minRating !== undefined) {
      const sampleRatings = workers.slice(0, 3).map((w) => ({
        id: w._id,
        averageRating: w.averageRating,
        totalRatings: w.totalRatings,
      }));
      logger.info("Sample worker ratings after filter", {
        minRating: Number(minRating),
        sampleCount: workers.length,
        sampleRatings,
      });
    }

    // Decrypt sensitive data and apply location filters
    const decryptedWorkers = [];
    let successfulDecryptions = 0;
    let failedDecryptions = 0;

    for (const worker of workers) {
      try {
        // Decrypt personal data
        if (worker.firstName)
          worker.firstName = decryptAES128(worker.firstName);
        if (worker.lastName) worker.lastName = decryptAES128(worker.lastName);
        if (worker.suffixName)
          worker.suffixName = decryptAES128(worker.suffixName);

        // Decrypt address
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

        // Apply location filter after decryption (case-insensitive partial match)
        let includeWorker = true;
        if (location && worker.address) {
          const locationLower = location.toLowerCase();
          const cityMatch = worker.address.city
            ?.toLowerCase()
            .includes(locationLower);
          const provinceMatch = worker.address.province
            ?.toLowerCase()
            .includes(locationLower);
          const regionMatch = worker.address.region
            ?.toLowerCase()
            .includes(locationLower);
          const barangayMatch = worker.address.barangay
            ?.toLowerCase()
            .includes(locationLower);

          includeWorker =
            cityMatch || provinceMatch || regionMatch || barangayMatch;
        }

        if (includeWorker) {
          // Format the worker data for list view
          const formattedWorker = {
            _id: worker._id,
            credentialId: worker.credentialId,
            profilePicture: worker.profilePicture,
            fullName: `${worker.firstName} ${worker.lastName}${
              worker.suffixName ? ` ${worker.suffixName}` : ""
            }`,
            location: `${worker.address?.city || "N/A"}, ${
              worker.address?.province || "N/A"
            }`,
            address: worker.address,
            skills: worker.skills || [],
            biography: worker.biography,
            status: worker.status,
            rating: worker.averageRating || 0,
            totalRatings: worker.totalRatings || 0,
          };

          decryptedWorkers.push(formattedWorker);
        }

        successfulDecryptions++;
      } catch (decryptError) {
        logger.error("Decryption error", {
          error: decryptError.message,
          workerId: worker._id,
        });
        failedDecryptions++;
      }
    }

    // Calculate pagination
    const totalPages = Math.ceil(totalCount / limit);
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;

    const processingTime = Date.now() - startTime;

    logger.info("Verified workers retrieved successfully", {
      page,
      limit,
      totalCount,
      workersReturned: decryptedWorkers.length,
      successfulDecryptions,
      failedDecryptions,
      filters: { category, location, status, minRating },
      processingTime: `${processingTime}ms`,
    });

    res.status(200).json({
      success: true,
      message: "Verified workers retrieved successfully",
      code: "WORKERS_RETRIEVED",
      data: {
        workers: decryptedWorkers,
        pagination: {
          currentPage: page,
          totalPages,
          totalItems: totalCount,
          itemsPerPage: limit,
          hasNextPage,
          hasPrevPage,
        },
        filters: {
          category: category || null,
          location: location || null,
          status: status || null,
          minRating: minRating || null,
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
      processingTime: `${processingTime}ms`,
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

// Get single worker details by ID (ID-verified workers only)
const getWorkerById = async (req, res) => {
  const startTime = Date.now();

  try {
    const { id } = req.params;
    const { includeUnverified = false } = req.query;

    // Validate worker ID
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid worker ID format",
        code: "INVALID_WORKER_ID",
      });
    }

    // Find worker with all details
    const workerData = await Worker.aggregate([
      {
        $match: { _id: new mongoose.Types.ObjectId(id) },
      },
      {
        $lookup: {
          from: "credentials",
          localField: "credentialId",
          foreignField: "_id",
          as: "credential",
        },
      },
      { $unwind: "$credential" },
      {
        $match: {
          "credential.userType": "worker",
          blocked: { $ne: true },
          isVerified: true,
        },
      },
      {
        $lookup: {
          from: "skillcategories",
          localField: "skillsByCategory.skillCategoryId",
          foreignField: "_id",
          as: "skillsData",
        },
      },
      // Join with reviews for rating calculation
      {
        $lookup: {
          from: "reviews",
          let: { workerId: "$_id" },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ["$workerId", "$$workerId"] },
                revieweeType: "worker",
                isDeleted: false,
              },
            },
          ],
          as: "reviewsData",
        },
      },
      // Join with reviews to get review statistics
      {
        $lookup: {
          from: "reviews",
          let: { workerId: "$_id" },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ["$workerId", "$$workerId"] },
                revieweeType: "worker",
                isDeleted: false,
              },
            },
            {
              $group: {
                _id: null,
                averageRating: { $avg: "$rating" },
                totalReviews: { $sum: 1 },
              },
            },
          ],
          as: "reviewStats",
        },
      },
      // Join with ID verification documents
      {
        $lookup: {
          from: "idpictures",
          localField: "idPictureId",
          foreignField: "_id",
          as: "idPicture",
        },
      },
      {
        $lookup: {
          from: "selfies",
          localField: "selfiePictureId",
          foreignField: "_id",
          as: "selfie",
        },
      },
      {
        $addFields: {
          email: "$credential.email",
          isAccountVerified: "$credential.isAuthenticated",
          skills: {
            $map: {
              input: "$skillsByCategory",
              as: "sbc",
              in: {
                skillCategoryId: "$$sbc.skillCategoryId",
                categoryName: {
                  $arrayElemAt: [
                    {
                      $map: {
                        input: {
                          $filter: {
                            input: "$skillsData",
                            cond: {
                              $eq: [
                                "$$this._id",
                                { $toObjectId: "$$sbc.skillCategoryId" },
                              ],
                            },
                          },
                        },
                        as: "cat",
                        in: "$$cat.categoryName",
                      },
                    },
                    0,
                  ],
                },
              },
            },
          },
          averageRating: {
            $ifNull: [{ $arrayElemAt: ["$reviewStats.averageRating", 0] }, 0],
          },
          totalRatings: {
            $ifNull: [{ $arrayElemAt: ["$reviewStats.totalReviews", 0] }, 0],
          },
          reviews: "$reviewsData",
          hasCompleteDocuments: {
            $and: [
              { $ne: ["$idPictureId", null] },
              { $ne: ["$selfiePictureId", null] },
            ],
          },
          idPictureData: { $arrayElemAt: ["$idPicture", 0] },
          selfieData: { $arrayElemAt: ["$selfie", 0] },
        },
      },
      {
        $project: {
          credential: 0,
          skillsData: 0,
          reviewsData: 0,
          idPicture: 0,
          selfie: 0,
        },
      },
    ]);

    if (!workerData || workerData.length === 0) {
      return res.status(404).json({
        success: false,
        message: includeUnverified
          ? "Worker not found or not verified"
          : "Worker not found or not verified",
        code: "WORKER_NOT_FOUND",
        details: {
          requirement: includeUnverified
            ? "Worker must have verified account"
            : "Worker must be verified",
        },
      });
    }

    const worker = workerData[0];

    // Decrypt sensitive data
    try {
      if (worker.firstName) worker.firstName = decryptAES128(worker.firstName);
      if (worker.lastName) worker.lastName = decryptAES128(worker.lastName);
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

    // Decrypt skills category names
    if (worker.skills && worker.skills.length > 0) {
      worker.skills = worker.skills.map((s) => ({
        skillCategoryId: s.skillCategoryId,

        categoryName: s.categoryName || null,
      }));
    }

    // Format the response
    const formattedWorker = {
      _id: worker._id,
      credentialId: worker.credentialId,
      fullName: `${worker.firstName} ${worker.lastName}${
        worker.suffixName ? " " + worker.suffixName : ""
      }`,
      contactNumber: worker.contactNumber,
      sex: worker.sex,
      dateOfBirth: worker.dateOfBirth,
      maritalStatus: worker.maritalStatus,
      address: worker.address,
      profilePicture: worker.profilePicture,
      biography: worker.biography,
      skills: worker.skills || [],
      portfolio: worker.portfolio || [],
      experience: worker.experience || [],
      education: worker.education || [],
      certificates: worker.certificates || [],
      reviews: worker.reviews || [],
      status: worker.status,
      currentJob: worker.currentJob,
      rating: worker.averageRating,
      totalRatings: worker.totalRatings,
      verificationBadge: worker.isVerified
        ? "Verified"
        : "Pending Verification",
    };

    const processingTime = Date.now() - startTime;

    logger.info("Worker details retrieved", {
      workerId: id,
      isVerified: worker.isVerified,
      verificationStatus: worker.verificationStatus,
      processingTime: `${processingTime}ms`,
    });

    res.status(200).json({
      success: true,
      message: "Worker details retrieved successfully",
      code: "WORKER_DETAILS_RETRIEVED",
      data: {
        worker: formattedWorker,
      },
      meta: {
        processingTime: `${processingTime}ms`,
        timestamp: new Date().toISOString(),
        verificationNote: worker.isVerified
          ? "This worker is verified"
          : "This worker is not yet verified",
      },
    });
  } catch (error) {
    const processingTime = Date.now() - startTime;

    logger.error("Error fetching worker details", {
      error: error.message,
      stack: error.stack,
      workerId: req.params.id,
      processingTime: `${processingTime}ms`,
    });

    res.status(500).json({
      success: false,
      message: "Failed to retrieve worker details due to server error",
      code: "WORKER_DETAILS_ERROR",
      meta: {
        processingTime: `${processingTime}ms`,
        timestamp: new Date().toISOString(),
      },
    });
  }
};

module.exports = {
  getAllWorkers,
  getWorkerById,
};
