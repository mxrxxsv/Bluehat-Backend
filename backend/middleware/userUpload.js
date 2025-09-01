const multer = require("multer");
const path = require("path");
const crypto = require("crypto");

// ✅ Use memory storage for Cloudinary uploads
const storage = multer.memoryStorage();

// ✅ Enhanced file filter (same as your existing one)
const fileFilter = (req, file, cb) => {
  try {
    const allowedMimes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];

    if (!allowedMimes.includes(file.mimetype)) {
      const error = new Error(
        "Invalid file type. Only JPEG, PNG, and WebP images are allowed."
      );
      error.code = "INVALID_FILE_TYPE";
      return cb(error, false);
    }

    const allowedExtensions = [".jpg", ".jpeg", ".png", ".webp"];
    const fileExtension = path.extname(file.originalname).toLowerCase();

    if (!allowedExtensions.includes(fileExtension)) {
      const error = new Error(
        "Invalid file extension. Only .jpg, .jpeg, .png, and .webp files are allowed."
      );
      error.code = "INVALID_FILE_EXTENSION";
      return cb(error, false);
    }

    cb(null, true);
  } catch (error) {
    const uploadError = new Error("File validation failed.");
    uploadError.code = "FILE_VALIDATION_ERROR";
    uploadError.originalError = error.message;
    cb(uploadError, false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
    files: 1,
    fieldSize: 10 * 1024 * 1024,
    fieldNameSize: 100,
    headerPairs: 2000,
  },
});

// ✅ User upload middleware (for profile routes)
const uploadUserMiddleware = (req, res, next) => {
  const singleUpload = upload.single("image");

  singleUpload(req, res, (err) => {
    if (err) {
      console.error("Upload middleware error:", {
        error: err.message,
        code: err.code,
        userId: req.user?._id,
        ip: req.ip,
        timestamp: new Date().toISOString(),
      });

      // Handle different types of errors (same as your existing code)
      if (err.code === "LIMIT_FILE_SIZE") {
        return res.status(400).json({
          success: false,
          message: "File too large. Maximum size is 5MB.",
          code: "FILE_TOO_LARGE",
          maxSize: "5MB",
        });
      }

      if (err.code === "INVALID_FILE_TYPE") {
        return res.status(400).json({
          success: false,
          message:
            "Invalid file type. Only JPEG, PNG, and WebP images are allowed.",
          code: "INVALID_FILE_TYPE",
          allowedTypes: ["JPEG", "PNG", "WebP"],
        });
      }

      // Generic upload error
      return res.status(400).json({
        success: false,
        message: "File upload failed. Please try again.",
        code: "UPLOAD_ERROR",
        error: process.env.NODE_ENV === "production" ? undefined : err.message,
      });
    }

    // ✅ Additional file validation for users
    if (req.file) {
      try {
        if (!req.file.buffer || req.file.buffer.length === 0) {
          return res.status(400).json({
            success: false,
            message: "Empty file uploaded. Please select a valid image.",
            code: "EMPTY_FILE",
          });
        }

        // ✅ FIXED: Add metadata for user context
        req.file.uploadTimestamp = new Date().toISOString();
        req.file.uploaderIP = req.ip;
        req.file.userAgent = req.get("User-Agent");
        req.file.userId = req.user?._id; // ✅ Use req.user instead of req.admin
        req.file.userType = req.user?.userType;

        console.log("User file upload successful:", {
          fileName: req.file.originalname,
          size: req.file.size,
          mimetype: req.file.mimetype,
          userId: req.user?._id,
          userType: req.user?.userType,
          ip: req.ip,
          timestamp: req.file.uploadTimestamp,
        });
      } catch (validationError) {
        console.error("Post-upload validation error:", validationError);
        return res.status(400).json({
          success: false,
          message: "File validation failed after upload.",
          code: "POST_UPLOAD_VALIDATION_ERROR",
        });
      }
    }

    next();
  });
};

module.exports = uploadUserMiddleware;
