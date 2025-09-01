const express = require("express");
const router = express.Router();
const {
  uploadProfilePicture,
  removeProfilePicture,
  updateBasicProfile,
  updateWorkerBiography,
  createPortfolio,
  updatePortfolio,
  deletePortfolio,
  uploadCertificate,
  deleteCertificate,
  addExperience,
  deleteExperience,
  addSkillCategory,
  removeSkillCategory,
  getProfile,
} = require("../controllers/profile.controller");

const authenticateToken = require("../middleware/verifyToken");
const uploadUserMiddleware = require("../middleware/userUpload");
const { profileLimiter } = require("../utils/rateLimit");

// ✅ PROFILE PICTURE ROUTES
router.post(
  "/upload-picture",
  authenticateToken,
  profileLimiter,
  uploadUserMiddleware,
  uploadProfilePicture
);
router.delete(
  "/remove-picture",
  authenticateToken,
  profileLimiter,
  removeProfilePicture
);

// ✅ BASIC PROFILE ROUTES
router.get("/", authenticateToken, getProfile);
router.put("/basic", authenticateToken, profileLimiter, updateBasicProfile);

// ✅ WORKER-SPECIFIC ROUTES
router.put(
  "/biography",
  authenticateToken,
  profileLimiter,
  updateWorkerBiography
);

// ✅ PORTFOLIO ROUTES
router.post(
  "/portfolio",
  authenticateToken,
  profileLimiter,
  uploadUserMiddleware,
  createPortfolio
);
router.put(
  "/portfolio",
  authenticateToken,
  profileLimiter,
  uploadUserMiddleware,
  updatePortfolio
);
router.delete(
  "/portfolio/:id",
  authenticateToken,
  profileLimiter,
  deletePortfolio
);

// ✅ CERTIFICATE ROUTES
router.post(
  "/certificate",
  authenticateToken,
  profileLimiter,
  uploadUserMiddleware,
  uploadCertificate
);
router.delete(
  "/certificate/:id",
  authenticateToken,
  profileLimiter,
  deleteCertificate
);

// ✅ EXPERIENCE ROUTES
router.post("/experience", authenticateToken, profileLimiter, addExperience);
router.delete(
  "/experience/:id",
  authenticateToken,
  profileLimiter,
  deleteExperience
);

// ✅ SKILL CATEGORY ROUTES
router.post(
  "/skill-category",
  authenticateToken,
  profileLimiter,
  addSkillCategory
);
router.delete(
  "/skill-category/:id",
  authenticateToken,
  profileLimiter,
  removeSkillCategory
);

module.exports = router;
