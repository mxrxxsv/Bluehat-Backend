const express = require("express");
const router = express.Router();
const Advertisement = require("../models/Advertisement");
const verifyAdmin = require("../middleware/verifyAdmin");
const { body, validationResult } = require("express-validator");
const rateLimiter = require("../utils/rateLimit");

// Input validation for advertisement fields
const validateAd = [
  body("title")
    .isString()
    .isLength({ max: 100 })
    .withMessage("Title is required and must be less than 100 chars"),
  body("companyName")
    .isString()
    .isLength({ max: 100 })
    .withMessage("Company Name is required and must be valid"),
  body("description")
    .isString()
    .isLength({ max: 1000 })
    .withMessage("Description is required and max 1000 chars"),
  body("imageUrl").isURL().withMessage("Invalid image URL"),
  body("link").isURL().withMessage("Invalid link"),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).json({ errors: errors.array() });
    }
    next();
  },
];

// CREATE Advertisement (Admin only)
router.post("/", verifyAdmin, validateAd, async (req, res) => {
  try {
    const { title, companyName, description, imageUrl, link } = req.body;

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
router.get("/", rateLimiter, async (req, res) => {
  try {
    const {
      companyName,
      sortBy = "createdAt",
      order = "desc",
      page = 1,
      limit = 10,
    } = req.query;

    const filter = {
      isDeleted: false,
      ...(companyName && { companyName: new RegExp(companyName, "i") }),
    };

    const ads = await Advertisement.find(filter)
      .populate("uploadedBy", "userName")
      .sort({ [sortBy]: order === "asc" ? 1 : -1 })
      .skip((parseInt(page) - 1) * parseInt(limit))
      .limit(parseInt(limit));

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
      _id: req.params.id,
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
    const { title, companyName, description, imageUrl, link } = req.body;

    const updatedAd = await Advertisement.findByIdAndUpdate(
      req.params.id,
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
      req.params.id,
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
