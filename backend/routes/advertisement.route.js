const express = require("express");
const router = express.Router();
const Advertisement = require("../models/Advertisement");
const verifyAdmin = require("../middleware/verifyAdmin");
const mongoSanitize = require("mongo-sanitize");
const { authLimiter } = require("../utils/rateLimit");

// CREATE Advertisement (Admin only)
router.post("/", verifyAdmin, validateAd, async (req, res) => {
  try {
    // Sanitize input
    const title = mongoSanitize(req.body.title);
    const companyName = mongoSanitize(req.body.companyName);
    const description = mongoSanitize(req.body.description);
    const imageUrl = mongoSanitize(req.body.imageUrl);
    const link = mongoSanitize(req.body.link);

    const newAd = new Advertisement({
      title,
      companyName,
      description,
      imageUrl,
      link,
      uploadedBy: req.user._id,
    });

    const savedAd = await newAd.save();
    res.status(201).json(savedAd);
  } catch (err) {
    res
      .status(400)
      .json({ message: "Failed to create advertisement", error: err.message });
  }
});

// GET All Advertisements (with filters, pagination, and rate limiting)
router.get("/", authLimiter, async (req, res) => {
  try {
    // Sanitize query parameters
    const companyName = mongoSanitize(req.query.companyName);
    const sortBy = mongoSanitize(req.query.sortBy || "createdAt");
    const order = mongoSanitize(req.query.order || "desc");
    const page = parseInt(mongoSanitize(req.query.page || "1"));
    const limit = parseInt(mongoSanitize(req.query.limit || "10"));

    // Escape regex special characters for companyName search
    function escapeRegex(str) {
      return str ? str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") : "";
    }

    const filter = {
      isDeleted: false,
      ...(companyName && {
        companyName: new RegExp(escapeRegex(companyName), "i"),
      }),
    };

    const ads = await Advertisement.find(filter)
      .populate("uploadedBy", "userName")
      .sort({ [sortBy]: order === "asc" ? 1 : -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    const total = await Advertisement.countDocuments(filter);

    const totalPages = Math.ceil(total / limit);
    res.status(200).json({
      total,
      page: Number(page),
      limit: Number(limit),
      totalPages,
      hasNextPage: Number(page) < totalPages,
      hasPrevPage: Number(page) > 1,
      results: ads,
    });
  } catch (err) {
    res
      .status(500)
      .json({ message: "Failed to fetch advertisements", error: err.message });
  }
});

// GET Advertisement by ID
router.get("/:id", async (req, res) => {
  try {
    const ad = await Advertisement.findOne({
      _id: mongoSanitize(req.params.id),
      isDeleted: false,
    }).populate("uploadedBy", "userName");

    if (!ad)
      return res.status(404).json({ message: "Advertisement not found" });

    res.status(200).json(ad);
  } catch (err) {
    res
      .status(500)
      .json({ message: "Error retrieving advertisement", error: err.message });
  }
});

// UPDATE Advertisement (Admin only)
router.put("/:id", verifyAdmin, validateAd, async (req, res) => {
  try {
    // Sanitize input
    const title = mongoSanitize(req.body.title);
    const companyName = mongoSanitize(req.body.companyName);
    const description = mongoSanitize(req.body.description);
    const imageUrl = mongoSanitize(req.body.imageUrl);
    const link = mongoSanitize(req.body.link);

    const updatedAd = await Advertisement.findByIdAndUpdate(
      mongoSanitize(req.params.id),
      { $set: { title, companyName, description, imageUrl, link } },
      { new: true, runValidators: true }
    );

    if (!updatedAd)
      return res.status(404).json({ message: "Advertisement not found" });

    res.status(200).json(updatedAd);
  } catch (err) {
    res
      .status(400)
      .json({ message: "Failed to update advertisement", error: err.message });
  }
});

// SOFT DELETE Advertisement (Admin only)
router.delete("/:id", verifyAdmin, async (req, res) => {
  try {
    const deletedAd = await Advertisement.findByIdAndUpdate(
      mongoSanitize(req.params.id),
      { isDeleted: true },
      { new: true }
    );

    if (!deletedAd)
      return res.status(404).json({ message: "Advertisement not found" });

    res.status(200).json({ message: "Advertisement deleted successfully" });
  } catch (err) {
    res
      .status(500)
      .json({ message: "Failed to delete advertisement", error: err.message });
  }
});

module.exports = router;
