const express = require("express");
const router = express.Router();
const verifyAdmin = require("../middleware/verifyAdmin");
const { getAllJobs } = require("../controllers/jobManagement.controller");

/**
 * @route   GET /job-management
 * @desc    Get all jobs with filters (Admin only)
 * @access  Private/Admin
 */
router.get("/", verifyAdmin, getAllJobs);

module.exports = router;
