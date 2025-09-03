const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const rateLimit = require("express-rate-limit");
const {
  uploadIDPicture,
  uploadSelfie,
  getVerificationStatus,
  deleteDocument,
  getPendingVerifications,
} = require("../controllers/userIDVerification");
const verifyToken = require("../middleware/verifyToken");
const verifyAdmin = require("../middleware/verifyAdmin");
const router = express.Router();

// ==================== MULTER CONFIGURATION ====================

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, "../uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(
      null,
      `${file.fieldname}-${uniqueSuffix}${path.extname(file.originalname)}`
    );
  },
});

// File filter for images only
const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|webp/;
  const extname = allowedTypes.test(
    path.extname(file.originalname).toLowerCase()
  );
  const mimetype = allowedTypes.test(file.mimetype);

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new Error("Only image files (JPEG, JPG, PNG, WebP) are allowed"), false);
  }
};

// Configure multer with size limits
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: fileFilter,
});

// ==================== RATE LIMITING ====================

// Rate limiting for uploads
const uploadRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // Max 20 uploads per 15 minutes
  message: {
    success: false,
    message: "Too many upload attempts, please try again later",
    code: "UPLOAD_RATE_LIMIT_EXCEEDED",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limiting for status checks
const statusRateLimit = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 30, // Max 30 requests per minute
  message: {
    success: false,
    message: "Too many status check requests, please try again later",
    code: "STATUS_RATE_LIMIT_EXCEEDED",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// ==================== ERROR HANDLING MIDDLEWARE ====================

// Multer error handling middleware
const handleMulterError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({
        success: false,
        message: "File too large. Maximum size is 10MB",
        code: "FILE_TOO_LARGE",
      });
    }
    if (err.code === "LIMIT_UNEXPECTED_FILE") {
      return res.status(400).json({
        success: false,
        message: "Unexpected file field",
        code: "UNEXPECTED_FILE",
      });
    }
    return res.status(400).json({
      success: false,
      message: "File upload error",
      code: "UPLOAD_ERROR",
      details: err.message,
    });
  }

  if (err.message.includes("Only image files")) {
    return res.status(400).json({
      success: false,
      message: "Invalid file type. Only JPEG, JPG, PNG, and WebP are allowed",
      code: "INVALID_FILE_TYPE",
    });
  }

  next(err);
};

// ==================== ROUTES ====================

// ✅ Upload ID Picture
router.post(
  "/upload-id-picture",
  uploadRateLimit,
  verifyToken,
  upload.single("idPicture"),
  handleMulterError,
  uploadIDPicture
);

// ✅ Upload Selfie
router.post(
  "/upload-selfie",
  uploadRateLimit,
  verifyToken,
  upload.single("selfie"),
  handleMulterError,
  uploadSelfie
);

// ✅ Get verification status
router.get(
  "/status/:userId",
  statusRateLimit,
  verifyToken,
  getVerificationStatus
);

// ✅ Delete document (before verification)
router.delete(
  "/delete/:userId/:documentType",
  uploadRateLimit,
  verifyToken,
  deleteDocument
);

router.get("/pending", statusRateLimit, verifyAdmin, getPendingVerifications);
// ==================== ROUTE DOCUMENTATION ====================

/*
API ENDPOINTS:

1. POST /id-verification/upload-id-picture
   - Upload ID picture for verification
   - Requires authentication
   - Body: multipart/form-data with 'idPicture' file and 'userId'
   - Rate limited: 20 uploads per 15 minutes

2. POST /id-verification/upload-selfie
   - Upload selfie picture for verification
   - Requires authentication
   - Body: multipart/form-data with 'selfie' file and 'userId'
   - Rate limited: 20 uploads per 15 minutes

3. GET /id-verification/status/:userId
   - Get verification status and uploaded documents
   - Requires authentication
   - Rate limited: 30 requests per minute

4. DELETE /id-verification/delete/:userId/:documentType
   - Delete uploaded document (only before verification)
   - documentType: 'idPicture' or 'selfie'
   - Requires authentication
   - Rate limited: 20 requests per 15 minutes

5. GET /id-verification/pending
   - Get a list of pending verification requests
   - Requires admin authentication
   - Rate limited: 30 requests per minute
*/
module.exports = router;
