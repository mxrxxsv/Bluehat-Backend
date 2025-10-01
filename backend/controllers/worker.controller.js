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
  page: Joi.number().integer().min(1).max(1000).default(1),
  limit: Joi.number().integer().min(1).max(50).default(12),
  skills: Joi.string().trim().optional(),
  status: Joi.string()
    .valid("available", "working", "not available", "all")
    .default("all"),
  city: Joi.string().trim().optional(),
  province: Joi.string().trim().optional(),
  sortBy: Joi.string()
    .valid("createdAt", "rating", "firstName", "lastName", "verifiedAt")
    .default("rating"),
  order: Joi.string().valid("asc", "desc").default("desc"),
  search: Joi.string().trim().min(2).max(100).optional(),
  includeUnverified: Joi.boolean().default(false), // Admin can see unverified
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
    const {
      page,
      limit,
      skills,
      status,
      city,
      province,
      sortBy,
      order,
      search,
      includeUnverified,
    } = sanitizedQuery;

    const skip = (page - 1) * limit;
    const sortOrder = order === "asc" ? 1 : -1;

    // Build aggregation pipeline
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

      // ⭐ CRITICAL: Only show verified workers
      {
        $match: {
          "credential.userType": "worker",
          "credential.isBlocked": { $ne: true },
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

      // Flatten skills into an array of names
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
          isAccountVerified: "$credential.isVerified",
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

    // Add search filter
    if (search) {
      pipeline.push({
        $match: {
          $or: [
            { email: { $regex: search, $options: "i" } },
            { biography: { $regex: search, $options: "i" } }, // allow search in bio
          ],
        },
      });
    }

    // Add status filter
    if (status !== "all") {
      pipeline.push({
        $match: { status },
      });
    }

    // Add skills filter
    if (skills) {
      const skillsArray = skills.split(",").map((s) => s.trim());
      pipeline.push({
        $match: {
          skills: { $in: skillsArray.map((skill) => new RegExp(skill, "i")) },
        },
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
        skills: 1,
        status: 1,
        rating: 1,
        totalRatings: 1,
        averageRating: 1,
        email: 1,
        isAccountVerified: 1,
        isVerified: 1,
        verificationStatus: 1,
        hasCompleteDocuments: 1,
        verifiedAt: 1,
        createdAt: 1,
        biography: 1, // keep biography in projection
      },
    });

    // Get total count for pagination
    const totalCountPipeline = [...pipeline, { $count: "total" }];
    const totalCountResult = await Worker.aggregate(totalCountPipeline);
    const totalCount =
      totalCountResult.length > 0 ? totalCountResult[0].total : 0;

    // Add sorting, pagination
    const sortField = sortBy === "verifiedAt" ? "verifiedAt" : sortBy;
    pipeline.push(
      { $sort: { [sortField]: sortOrder } },
      { $skip: skip },
      { $limit: limit }
    );

    // Execute aggregation
    const workers = await Worker.aggregate(pipeline);

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

        // Apply location filters after decryption
        let includeWorker = true;
        if (
          city &&
          worker.address?.city?.toLowerCase() !== city.toLowerCase()
        ) {
          includeWorker = false;
        }
        if (
          province &&
          worker.address?.province?.toLowerCase() !== province.toLowerCase()
        ) {
          includeWorker = false;
        }

        if (includeWorker) {
          // Decrypt skills category names
          if (worker.skills && worker.skills.length > 0) {
            worker.skills = worker.skills.map((s) => ({
              skillCategoryId: s.skillCategoryId,

              categoryName: s.categoryName || null,
            }));
          }

          // Format the worker data for list view
          const formattedWorker = {
            _id: worker._id,
            credentialId: worker.credentialId,
            profilePicture: worker.profilePicture,
            fullName: `${worker.firstName} ${worker.lastName}${
              worker.suffixName ? ` ${worker.suffixName}` : ""
            }`,
            firstName: worker.firstName,
            lastName: worker.lastName,
            suffixName: worker.suffixName,
            sex: worker.sex,
            location: `${worker.address?.city || "N/A"}, ${
              worker.address?.province || "N/A"
            }`,
            address: worker.address,
            skills: worker.skills || [],
            biography: worker.biography,
            status: worker.status,
            rating: worker.averageRating,
            totalRatings: worker.totalRatings,
            email: worker.email,
            isAccountVerified: worker.isAccountVerified,
            isVerified: worker.isVerified,
            verificationStatus: worker.verificationStatus,
            hasCompleteDocuments: worker.hasCompleteDocuments,
            verifiedAt: worker.verifiedAt,
            createdAt: worker.createdAt,
            // 🏆 Badge for verified workers
            verificationBadge: worker.isVerified ? "✅ Verified" : "⏳ Pending",
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

    // Get enhanced statistics including verification status
    const statsAggregation = await Worker.aggregate([
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
          "credential.isBlocked": { $ne: true },
          "credential.isVerified": true,
          blocked: { $ne: true },
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          // Verification stats
          verified: {
            $sum: {
              $cond: [{ $eq: ["$isVerified", true] }, 1, 0],
            },
          },
          unverified: {
            $sum: {
              $cond: [{ $eq: ["$isVerified", false] }, 1, 0],
            },
          },
          // Work status stats (only for verified workers)
          available: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ["$status", "available"] },
                    { $eq: ["$isVerified", true] },
                  ],
                },
                1,
                0,
              ],
            },
          },
          working: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ["$status", "working"] },
                    { $eq: ["$isVerified", true] },
                  ],
                },
                1,
                0,
              ],
            },
          },
          notAvailable: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ["$status", "not available"] },
                    { $eq: ["$isVerified", true] },
                  ],
                },
                1,
                0,
              ],
            },
          },
          // Average rating for verified workers only
          averageRating: {
            $avg: {
              $cond: [
                { $eq: ["$isVerified", true] },
                { $divide: ["$rating", { $max: ["$totalRatings", 1] }] },
                null,
              ],
            },
          },
        },
      },
    ]);

    const statistics =
      statsAggregation.length > 0
        ? {
            total: statsAggregation[0].total,
            verified: statsAggregation[0].verified,
            unverified: statsAggregation[0].unverified,
            available: statsAggregation[0].available,
            working: statsAggregation[0].working,
            notAvailable: statsAggregation[0].notAvailable,
            averageRating: parseFloat(
              (statsAggregation[0].averageRating || 0).toFixed(2)
            ),
          }
        : {
            total: 0,
            verified: 0,
            unverified: 0,
            available: 0,
            working: 0,
            notAvailable: 0,
            averageRating: 0,
          };

    const processingTime = Date.now() - startTime;

    logger.info("Verified workers retrieved successfully", {
      page,
      limit,
      totalCount,
      workersReturned: decryptedWorkers.length,
      successfulDecryptions,
      failedDecryptions,
      filters: { skills, status, city, province, search },
      verificationFilter: includeUnverified ? "all" : "verified only",
      processingTime: `${processingTime}ms`,
    });

    res.status(200).json({
      success: true,
      message: includeUnverified
        ? "All workers retrieved successfully"
        : "Verified workers retrieved successfully",
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
          nextPage: hasNextPage ? page + 1 : null,
          prevPage: hasPrevPage ? page - 1 : null,
        },
        statistics,
        filters: {
          skills: skills || null,
          status,
          city: city || null,
          province: province || null,
          search: search || null,
          sortBy,
          order,
          verificationFilter: includeUnverified ? "all" : "verified_only",
        },
      },
      meta: {
        successfulDecryptions,
        failedDecryptions,
        processingTime: `${processingTime}ms`,
        timestamp: new Date().toISOString(),
        note: includeUnverified
          ? "Showing all workers regardless of verification"
          : "Showing only verified workers",
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
          "credential.isBlocked": { $ne: true },
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
      {
        $lookup: {
          from: "reviews",
          localField: "reviews",
          foreignField: "_id",
          as: "reviewsData",
          pipeline: [
            {
              $lookup: {
                from: "clients",
                localField: "clientId",
                foreignField: "_id",
                as: "client",
              },
            },
            { $unwind: { path: "$client", preserveNullAndEmptyArrays: true } },
            {
              $project: {
                rating: 1,
                comment: 1,
                createdAt: 1,
                clientName: {
                  $concat: ["$client.firstName", " ", "$client.lastName"],
                },
                clientProfilePicture: "$client.profilePicture",
              },
            },
            { $sort: { createdAt: -1 } },
            { $limit: 10 }, // Latest 10 reviews
          ],
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
          isAccountVerified: "$credential.isVerified",
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
            $cond: {
              if: { $gt: ["$totalRatings", 0] },
              then: { $divide: ["$rating", "$totalRatings"] },
              else: 0,
            },
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
      fullName: `${worker.firstName} ${
        worker.middleName ? worker.middleName + " " : ""
      }${worker.lastName}${worker.suffixName ? " " + worker.suffixName : ""}`,
      firstName: worker.firstName,
      middleName: worker.middleName,
      lastName: worker.lastName,
      suffixName: worker.suffixName,
      contactNumber: worker.contactNumber,
      sex: worker.sex,
      dateOfBirth: worker.dateOfBirth,
      maritalStatus: worker.maritalStatus,
      address: worker.address,
      profilePicture: worker.profilePicture,
      biography: worker.biography,
      skills: worker.skills || [],
      skillsByCategory: worker.skillsByCategory,
      portfolio: worker.portfolio || [],
      experience: worker.experience || [],
      certificates: worker.certificates || [],
      reviews: worker.reviews || [],
      status: worker.status,
      currentJob: worker.currentJob,
      rating: worker.averageRating,
      totalRatings: worker.totalRatings,
      email: worker.email,
      isAccountVerified: worker.isAccountVerified,
      isVerified: worker.isVerified,
      verificationStatus: worker.verificationStatus,
      hasCompleteDocuments: worker.hasCompleteDocuments,
      verificationDetails: {
        status: worker.verificationStatus,
        submittedAt: worker.idVerificationSubmittedAt,
        approvedAt: worker.idVerificationApprovedAt,
        rejectedAt: worker.idVerificationRejectedAt,
        isVerified: worker.isVerified,
        verifiedAt: worker.verifiedAt,
      },
      verificationBadge: worker.isVerified
        ? "✅ Verified"
        : "⏳ Pending Verification",
      createdAt: worker.createdAt,
      updatedAt: worker.updatedAt,
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
