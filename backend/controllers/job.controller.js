const mongoSanitize = require("mongo-sanitize");
const mongoose = require("mongoose");

const SkillCategory = require("../models/SkillCategory");
const Job = require("../models/Job");
const Client = require("../models/Client");
const Worker = require("../models/Worker");
const Credential = require("../models/Credential");

// Get all jobs (public, only verified/not deleted) with pagination & filtering
const getAllJobs = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(mongoSanitize(req.query.page) || 1));
    const limit = Math.max(
      1,
      Math.min(100, parseInt(mongoSanitize(req.query.limit) || 10))
    );
    const category = mongoSanitize(req.query.category);
    const location = mongoSanitize(req.query.location);
    const search = mongoSanitize(req.query.search);
    const status = mongoSanitize(req.query.status);
    const sortBy = mongoSanitize(req.query.sortBy) || "createdAt";
    const order = mongoSanitize(req.query.order) || "desc";

    // Build filter - only show verified jobs from verified clients
    const filter = {
      isVerified: true,
      isDeleted: false,
    };

    // Category filter
    if (category && mongoose.Types.ObjectId.isValid(category)) {
      filter.category = category;
    }

    // Location filter (case-insensitive partial match)
    if (location) {
      filter.location = { $regex: location, $options: "i" };
    }

    // Status filter
    if (
      status &&
      ["open", "hired", "in_progress", "completed", "cancelled"].includes(
        status
      )
    ) {
      filter.status = status;
    }

    // Search filter (search in description only - based on your schema)
    if (search) {
      filter.description = { $regex: search, $options: "i" };
    }

    const sortOrder = order === "asc" ? 1 : -1;
    const validSortFields = ["createdAt", "price"];
    const sortField = validSortFields.includes(sortBy) ? sortBy : "createdAt";

    // Get jobs with populated client info (only verified clients)
    const jobs = await Job.aggregate([
      { $match: filter },
      // Lookup client profile
      {
        $lookup: {
          from: "clients",
          localField: "clientId",
          foreignField: "_id",
          as: "clientProfile",
        },
      },
      // Lookup client credential to verify they're verified
      {
        $lookup: {
          from: "credentials",
          localField: "clientProfile.credentialId",
          foreignField: "_id",
          as: "clientCredential",
        },
      },
      // Only include jobs from verified clients
      {
        $match: {
          "clientCredential.isVerified": true,
          "clientCredential.isBlocked": { $ne: true },
        },
      },
      // Lookup category
      {
        $lookup: {
          from: "skillcategories",
          localField: "category",
          foreignField: "_id",
          as: "categoryInfo",
        },
      },
      // Lookup hired worker if exists
      {
        $lookup: {
          from: "workers",
          localField: "hiredWorker",
          foreignField: "_id",
          as: "hiredWorkerInfo",
        },
      },
      {
        $addFields: {
          client: { $arrayElemAt: ["$clientProfile", 0] },
          categoryName: { $arrayElemAt: ["$categoryInfo.categoryName", 0] },
          hiredWorkerProfile: { $arrayElemAt: ["$hiredWorkerInfo", 0] },
        },
      },
      {
        $project: {
          clientProfile: 0,
          clientCredential: 0,
          categoryInfo: 0,
          hiredWorkerInfo: 0,
          "client.credentialId": 0,
        },
      },
      { $sort: { [sortField]: sortOrder } },
      { $skip: (page - 1) * limit },
      { $limit: Number(limit) },
    ]);

    // Get total count for pagination
    const totalCount = await Job.countDocuments({
      ...filter,
      clientId: {
        $in: await Client.find({
          credentialId: {
            $in: await Credential.find({
              isVerified: true,
              isBlocked: { $ne: true },
              userType: "client",
            }).distinct("_id"),
          },
        }).distinct("_id"),
      },
    });

    res.status(200).json({
      success: true,
      message: "Jobs retrieved successfully",
      data: {
        jobs,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(totalCount / limit),
          totalItems: totalCount,
          itemsPerPage: limit,
          hasNextPage: page < Math.ceil(totalCount / limit),
          hasPrevPage: page > 1,
        },
        filters: {
          category,
          location,
          search,
          status,
          sortBy: sortField,
          order,
        },
      },
    });
  } catch (err) {
    console.error("Get all jobs error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve jobs",
      error: process.env.NODE_ENV === "production" ? undefined : err.message,
    });
  }
};

// Get jobs by category
const getJobsByCategory = async (req, res) => {
  try {
    const { categoryId } = req.params;
    const page = Math.max(1, parseInt(mongoSanitize(req.query.page) || 1));
    const limit = Math.max(
      1,
      Math.min(100, parseInt(mongoSanitize(req.query.limit) || 10))
    );
    const location = mongoSanitize(req.query.location);
    const status = mongoSanitize(req.query.status);
    const sortBy = mongoSanitize(req.query.sortBy) || "createdAt";
    const order = mongoSanitize(req.query.order) || "desc";

    if (!mongoose.Types.ObjectId.isValid(categoryId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid category ID",
      });
    }

    // Verify category exists
    const category = await SkillCategory.findById(categoryId);
    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    // Build filter
    const filter = {
      category: categoryId,
      isVerified: true,
      isDeleted: false,
    };

    // Add location filter if provided
    if (location) {
      filter.location = { $regex: location, $options: "i" };
    }

    // Add status filter if provided
    if (
      status &&
      ["open", "hired", "in_progress", "completed", "cancelled"].includes(
        status
      )
    ) {
      filter.status = status;
    }

    const sortOrder = order === "asc" ? 1 : -1;
    const validSortFields = ["createdAt", "price"];
    const sortField = validSortFields.includes(sortBy) ? sortBy : "createdAt";

    const jobs = await Job.find(filter)
      .populate({
        path: "clientId",
        select: "firstName lastName profilePicture",
        populate: {
          path: "credentialId",
          match: { isVerified: true, isBlocked: { $ne: true } },
          select: "email",
        },
      })
      .populate("category", "categoryName")
      .populate("hiredWorker", "firstName lastName")
      .sort({ [sortField]: sortOrder })
      .skip((page - 1) * limit)
      .limit(limit);

    // Filter out jobs from unverified clients
    const verifiedJobs = jobs.filter((job) => job.clientId?.credentialId);

    const totalCount = await Job.countDocuments({
      ...filter,
      clientId: {
        $in: await Client.find({
          credentialId: {
            $in: await Credential.find({
              isVerified: true,
              isBlocked: { $ne: true },
              userType: "client",
            }).distinct("_id"),
          },
        }).distinct("_id"),
      },
    });

    res.status(200).json({
      success: true,
      message: `Jobs in ${category.categoryName} category retrieved successfully`,
      data: {
        category: {
          id: category._id,
          name: category.categoryName,
        },
        jobs: verifiedJobs,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(totalCount / limit),
          totalItems: totalCount,
          itemsPerPage: limit,
          hasNextPage: page < Math.ceil(totalCount / limit),
          hasPrevPage: page > 1,
        },
        filters: {
          location,
          status,
          sortBy: sortField,
          order,
        },
      },
    });
  } catch (err) {
    console.error("Get jobs by category error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve jobs by category",
      error: process.env.NODE_ENV === "production" ? undefined : err.message,
    });
  }
};

// Get jobs by location
const getJobsByLocation = async (req, res) => {
  try {
    const { location } = req.params;
    const page = Math.max(1, parseInt(mongoSanitize(req.query.page) || 1));
    const limit = Math.max(
      1,
      Math.min(100, parseInt(mongoSanitize(req.query.limit) || 10))
    );
    const category = mongoSanitize(req.query.category);
    const status = mongoSanitize(req.query.status);
    const sortBy = mongoSanitize(req.query.sortBy) || "createdAt";
    const order = mongoSanitize(req.query.order) || "desc";

    if (!location || location.trim().length < 2) {
      return res.status(400).json({
        success: false,
        message: "Location must be at least 2 characters long",
      });
    }

    // Build filter
    const filter = {
      location: { $regex: mongoSanitize(location), $options: "i" },
      isVerified: true,
      isDeleted: false,
    };

    // Add category filter if provided
    if (category && mongoose.Types.ObjectId.isValid(category)) {
      filter.category = category;
    }

    // Add status filter if provided
    if (
      status &&
      ["open", "hired", "in_progress", "completed", "cancelled"].includes(
        status
      )
    ) {
      filter.status = status;
    }

    const sortOrder = order === "asc" ? 1 : -1;
    const validSortFields = ["createdAt", "price"];
    const sortField = validSortFields.includes(sortBy) ? sortBy : "createdAt";

    const jobs = await Job.find(filter)
      .populate({
        path: "clientId",
        select: "firstName lastName profilePicture",
        populate: {
          path: "credentialId",
          match: { isVerified: true, isBlocked: { $ne: true } },
          select: "email",
        },
      })
      .populate("category", "categoryName")
      .populate("hiredWorker", "firstName lastName")
      .sort({ [sortField]: sortOrder })
      .skip((page - 1) * limit)
      .limit(limit);

    // Filter out jobs from unverified clients
    const verifiedJobs = jobs.filter((job) => job.clientId?.credentialId);

    const totalCount = await Job.countDocuments({
      ...filter,
      clientId: {
        $in: await Client.find({
          credentialId: {
            $in: await Credential.find({
              isVerified: true,
              isBlocked: { $ne: true },
              userType: "client",
            }).distinct("_id"),
          },
        }).distinct("_id"),
      },
    });

    // Get location statistics
    const locationStats = await Job.aggregate([
      {
        $match: {
          location: { $regex: location, $options: "i" },
          isVerified: true,
          isDeleted: false,
        },
      },
      {
        $group: {
          _id: "$location",
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
      { $limit: 5 },
    ]);

    res.status(200).json({
      success: true,
      message: `Jobs in ${location} retrieved successfully`,
      data: {
        location: location,
        jobs: verifiedJobs,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(totalCount / limit),
          totalItems: totalCount,
          itemsPerPage: limit,
          hasNextPage: page < Math.ceil(totalCount / limit),
          hasPrevPage: page > 1,
        },
        filters: {
          category,
          status,
          sortBy: sortField,
          order,
        },
        locationStats,
      },
    });
  } catch (err) {
    console.error("Get jobs by location error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve jobs by location",
      error: process.env.NODE_ENV === "production" ? undefined : err.message,
    });
  }
};

// Get single job by ID
const getJobById = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid job ID",
      });
    }

    const job = await Job.findOne({
      _id: req.params.id,
      isDeleted: false,
    })
      .populate("category", "categoryName")
      .populate({
        path: "clientId",
        select: "firstName lastName profilePicture",
        populate: {
          path: "credentialId",
          match: { isVerified: true, isBlocked: { $ne: true } },
          select: "email",
        },
      })
      .populate("hiredWorker", "firstName lastName profilePicture");

    if (!job || !job.clientId?.credentialId) {
      return res.status(404).json({
        success: false,
        message: "Job not found or client not verified",
      });
    }

    res.status(200).json({
      success: true,
      message: "Job retrieved successfully",
      data: job,
    });
  } catch (err) {
    console.error("Get job by ID error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve job",
      error: process.env.NODE_ENV === "production" ? undefined : err.message,
    });
  }
};

// Create a job (only verified clients) with content filtering
const postJob = async (req, res) => {
  try {
    // Extract and sanitize input based on your schema
    const { description, price, location, category } = req.body;

    // Verify user is authenticated and is a client
    if (!req.user || req.user.userType !== "client") {
      return res.status(401).json({
        success: false,
        message: "Only clients can post jobs",
      });
    }

    // Check if client is verified
    const clientCredential = await Credential.findById(req.user.id);
    if (!clientCredential || !clientCredential.isVerified) {
      return res.status(403).json({
        success: false,
        message: "Only verified clients can post jobs",
      });
    }

    if (clientCredential.isBlocked) {
      return res.status(403).json({
        success: false,
        message: "Your account is blocked",
      });
    }

    // Validate required fields based on your schema
    if (!description || !price || !location || !category) {
      return res.status(400).json({
        success: false,
        message: "Description, price, location, and category are required",
      });
    }

    // Validate description length based on your schema
    if (description.trim().length < 20 || description.trim().length > 2000) {
      return res.status(400).json({
        success: false,
        message: "Description must be between 20 and 2000 characters",
      });
    }

    // BAD WORDS DETECTION
    const badWords = [
      // Profanity
      "fuck",
      "shit",
      "damn",
      "bitch",
      "asshole",
      "bastard",
      "crap",
      "piss",
      "hell",
      "bloody",
      "goddamn",
      "motherfucker",
      "cocksucker",
      "dickhead",

      // Sexual content
      "sex",
      "porn",
      "nude",
      "naked",
      "sexual",
      "erotic",
      "adult",
      "xxx",
      "escort",
      "massage",
      "intimate",
      "sensual",
      "fetish",
      "kinky",

      // Inappropriate services
      "prostitution",
      "drugs",
      "weed",
      "marijuana",
      "cocaine",
      "heroin",
      "gambling",
      "casino",
      "betting",
      "loan shark",
      "money laundering",

      // Violence/Illegal
      "kill",
      "murder",
      "weapon",
      "gun",
      "knife",
      "bomb",
      "explosive",
      "terrorist",
      "violence",
      "assault",
      "abuse",
      "threat",
      "blackmail",

      // Scam/Fraud
      "scam",
      "fraud",
      "fake",
      "counterfeit",
      "illegal",
      "stolen",
      "pirated",
      "cheat",
      "deceive",
      "ponzi",
      "pyramid scheme",
      "mlm scam",

      // Discriminatory
      "racist",
      "sexist",
      "homophobic",
      "discrimination",
      "hate",
      "nazi",

      // Filipino bad words (add common ones)
      "putang",
      "gago",
      "tanga",
      "bobo",
      "ulol",
      "kingina",
      "pakyu",
      "buwisit",
      "hayup",
      "puta",
      "tangina",
      "kupal",
      "peste",
    ];

    // Create regex pattern for bad words (case-insensitive, word boundaries)
    const badWordPattern = new RegExp(
      "\\b(" + badWords.join("|") + ")\\b",
      "gi"
    );

    // Check description for bad words
    const descriptionText = description.toLowerCase().trim();
    const containsBadWords = badWordPattern.test(descriptionText);

    if (containsBadWords) {
      console.log(
        `Inappropriate content detected in job post by user ${req.user.id}: "${description}"`
      );

      return res.status(400).json({
        success: false,
        message: "Failed to process your post because of inappropriate content",
      });
    }

    // Additional content checks (optional - more sophisticated)
    const suspiciousPatterns = [
      /\b(easy money|quick cash|work from home scam|get rich quick)\b/gi,
      /\b(no experience needed.{0,50}high pay)\b/gi,
      /\b(guaranteed.{0,20}(money|income|profit))\b/gi,
      /\b(adult entertainment|escort service|massage parlor)\b/gi,
      /\b(click here|visit my website|buy now)\b/gi,
    ];

    const hasSuspiciousContent = suspiciousPatterns.some((pattern) =>
      pattern.test(descriptionText)
    );

    if (hasSuspiciousContent) {
      console.log(
        `Suspicious content detected in job post by user ${req.user.id}: "${description}"`
      );

      return res.status(400).json({
        success: false,
        message: "Failed to process your post because of inappropriate content",
      });
    }

    // Validate category
    if (!mongoose.Types.ObjectId.isValid(category)) {
      return res.status(400).json({
        success: false,
        message: "Invalid category ID",
      });
    }

    const categoryExists = await SkillCategory.findById(category);
    if (!categoryExists) {
      return res.status(400).json({
        success: false,
        message: "Category does not exist",
      });
    }

    // Find client profile
    const clientProfile = await Client.findOne({ credentialId: req.user.id });
    if (!clientProfile) {
      return res.status(400).json({
        success: false,
        message: "Client profile not found",
      });
    }

    // Validate price based on your schema
    const numPrice = Number(price);
    if (isNaN(numPrice) || numPrice < 0 || numPrice > 1000000) {
      return res.status(400).json({
        success: false,
        message: "Price must be between 0 and 1,000,000",
      });
    }

    // Validate location length based on your schema
    if (location.trim().length > 200) {
      return res.status(400).json({
        success: false,
        message: "Location must be 200 characters or less",
      });
    }

    // Create job using your schema fields
    const job = new Job({
      clientId: clientProfile._id, // Reference to Client model, not Credential
      description: mongoSanitize(description).trim(),
      price: numPrice,
      location: mongoSanitize(location).trim(),
      category,
      // status defaults to "open"
      // isVerified defaults to false
      // isDeleted defaults to false
      // hiredWorker defaults to null
      // createdAt is set automatically
    });

    await job.save();

    // Populate job with category info for response
    await job.populate("category", "categoryName");

    res.status(201).json({
      success: true,
      message: "Job created successfully",
      data: job,
    });
  } catch (err) {
    console.error("Post job error:", err);

    // Handle validation errors from your schema
    if (err.name === "ValidationError") {
      const errors = Object.values(err.errors).map((e) => e.message);
      return res.status(400).json({
        success: false,
        message: "Validation error",
        errors,
      });
    }

    res.status(400).json({
      success: false,
      message: "Failed to create job",
      error: process.env.NODE_ENV === "production" ? undefined : err.message,
    });
  }
};

// Update a job (only owner)
const updateJob = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid job ID",
      });
    }

    // Verify user is authenticated and is a client
    if (!req.user || req.user.userType !== "client") {
      return res.status(401).json({
        success: false,
        message: "Only clients can update jobs",
      });
    }

    const job = await Job.findById(req.params.id);
    if (!job || job.isDeleted) {
      return res.status(404).json({
        success: false,
        message: "Job not found",
      });
    }

    // Find client profile to verify ownership
    const clientProfile = await Client.findOne({ credentialId: req.user.id });
    if (!clientProfile) {
      return res.status(400).json({
        success: false,
        message: "Client profile not found",
      });
    }

    // Verify ownership
    if (job.clientId.toString() !== clientProfile._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "Only the job owner can update this job",
      });
    }

    // Check if job is verified (admin-approved)
    if (job.isVerified) {
      return res.status(403).json({
        success: false,
        message: "Cannot edit a job that has already been verified by admin",
      });
    }

    // Update allowed fields based on your schema
    const allowedFields = [
      "description",
      "price",
      "location",
      "category",
      "status",
    ];

    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        if (field === "price") {
          const numPrice = Number(req.body.price);
          if (isNaN(numPrice) || numPrice < 0 || numPrice > 1000000) {
            return res.status(400).json({
              success: false,
              message: "Price must be between 0 and 1,000,000",
            });
          }
          job.price = numPrice;
        } else if (field === "category") {
          const newCategory = mongoSanitize(req.body.category);
          if (!mongoose.Types.ObjectId.isValid(newCategory)) {
            return res.status(400).json({
              success: false,
              message: "Invalid category ID",
            });
          }
          const categoryExists = await SkillCategory.findById(newCategory);
          if (!categoryExists) {
            return res.status(400).json({
              success: false,
              message: "Category does not exist",
            });
          }
          job.category = newCategory;
        } else if (field === "status") {
          const validStatuses = [
            "open",
            "hired",
            "in_progress",
            "completed",
            "cancelled",
          ];
          if (!validStatuses.includes(req.body.status)) {
            return res.status(400).json({
              success: false,
              message:
                "Status must be one of: open, hired, in_progress, completed, cancelled",
            });
          }
          job.status = req.body.status;
        } else if (field === "description") {
          const desc = mongoSanitize(req.body.description).trim();
          if (desc.length < 20 || desc.length > 2000) {
            return res.status(400).json({
              success: false,
              message: "Description must be between 20 and 2000 characters",
            });
          }
          job.description = desc;
        } else if (field === "location") {
          const loc = mongoSanitize(req.body.location).trim();
          if (loc.length > 200) {
            return res.status(400).json({
              success: false,
              message: "Location must be 200 characters or less",
            });
          }
          job.location = loc;
        }
      }
    }

    const updatedJob = await job.save();
    await updatedJob.populate("category", "categoryName");

    res.status(200).json({
      success: true,
      message: "Job updated successfully",
      data: updatedJob,
    });
  } catch (err) {
    console.error("Update job error:", err);

    // Handle validation errors
    if (err.name === "ValidationError") {
      const errors = Object.values(err.errors).map((e) => e.message);
      return res.status(400).json({
        success: false,
        message: "Validation error",
        errors,
      });
    }

    res.status(400).json({
      success: false,
      message: "Failed to update job",
      error: process.env.NODE_ENV === "production" ? undefined : err.message,
    });
  }
};

// Soft delete a job (only owner)
const deleteJob = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid job ID",
      });
    }

    // Verify user is authenticated and is a client
    if (!req.user || req.user.userType !== "client") {
      return res.status(401).json({
        success: false,
        message: "Only clients can delete jobs",
      });
    }

    const job = await Job.findById(req.params.id);
    if (!job || job.isDeleted) {
      return res.status(404).json({
        success: false,
        message: "Job not found",
      });
    }

    // Find client profile to verify ownership
    const clientProfile = await Client.findOne({ credentialId: req.user.id });
    if (!clientProfile) {
      return res.status(400).json({
        success: false,
        message: "Client profile not found",
      });
    }

    // Verify ownership
    if (job.clientId.toString() !== clientProfile._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "Only the job owner can delete this job",
      });
    }

    // Soft delete
    job.isDeleted = true;
    await job.save();

    res.status(200).json({
      success: true,
      message: "Job deleted successfully",
    });
  } catch (err) {
    console.error("Delete job error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to delete job",
      error: process.env.NODE_ENV === "production" ? undefined : err.message,
    });
  }
};

module.exports = {
  getAllJobs,
  getJobsByCategory,
  getJobsByLocation,
  getJobById,
  postJob,
  updateJob,
  deleteJob,
};
