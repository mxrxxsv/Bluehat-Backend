// routes/dashboard.route.js
const express = require("express");
const router = express.Router();
const { getDashboardData } = require("../controllers/dashboard.controller");

router.get("/", getDashboardData);

module.exports = router;
