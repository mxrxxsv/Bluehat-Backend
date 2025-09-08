// routes/clientManagement.routes.js
const express = require("express");
const {
  getClients,
  restrictClient,
  banClient,
} = require("../controllers/clientManagement.controller");
const verifyAdmin = require("../middleware/verifyAdmin");

const router = express.Router();

// 🔒 Admin-only routes for client management
router.get("/", verifyAdmin, getClients);
router.post("/:id/restrict", verifyAdmin, restrictClient);
router.post("/:id/ban", verifyAdmin, banClient);

module.exports = router;
