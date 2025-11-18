const express = require("express");
const router = express.Router();
const { getMonthlySummary } = require("../controllers/report.controller");

// Public or could be protected by admin auth middleware if needed
router.get("/summary", getMonthlySummary);

module.exports = router;
