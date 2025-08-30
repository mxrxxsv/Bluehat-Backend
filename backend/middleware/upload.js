const multer = require("multer");
const path = require("path");
const crypto = require("crypto");

// ✅ Use memory storage for Cloudinary uploads
const storage = multer.memoryStorage();

// ✅ Enhanced file filter with detailed validation
const fileFilter = (req, file, cb) => {
  try {
    // Check file type by MIME type
    const allowedMimes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];

    if (!allowedMimes.includes(file.mimetype)) {
      const error = new Error(
        "Invalid file type. Only JPEG, PNG, and WebP images are allowed."
      );
      error.code = "INVALID_FILE_TYPE";
      return cb(error, false);
    }

    // Check file extension as additional security
    const allowedExtensions = [".jpg", ".jpeg", ".png", ".webp"];
    const fileExtension = path.extname(file.originalname).toLowerCase();

    if (!allowedExtensions.includes(fileExtension)) {
      const error = new Error(
        "Invalid file extension. Only .jpg, .jpeg, .png, and .webp files are allowed."
      );
      error.code = "INVALID_FILE_EXTENSION";
      return cb(error, false);
    }

    // Check for suspicious filenames
    const suspiciousPatterns = [
      /\.php$/i,
      /\.exe$/i,
      /\.bat$/i,
      /\.cmd$/i,
      /\.sh$/i,
      /\.js$/i,
      /\.html$/i,
      /\.htm$/i,
      /\.svg$/i, // SVG can contain scripts
    ];

    const isSuspicious = suspiciousPatterns.some((pattern) =>
      pattern.test(file.originalname)
    );

    if (isSuspicious) {
      const error = new Error(
        "Suspicious file detected. File type not allowed."
      );
      error.code = "SUSPICIOUS_FILE";
      return cb(error, false);
    }

    // Validate filename length
    if (file.originalname.length > 255) {
      const error = new Error(
        "Filename too long. Maximum 255 characters allowed."
      );
      error.code = "FILENAME_TOO_LONG";
      return cb(error, false);
    }

    // Check for null bytes in filename (security)
    if (file.originalname.includes("\0")) {
      const error = new Error("Invalid filename detected.");
      error.code = "INVALID_FILENAME";
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

// ✅ Enhanced multer configuration
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
    files: 1, // Only 1 file at a time
    fieldSize: 10 * 1024 * 1024, // 10MB field size limit
    fieldNameSize: 100, // 100 bytes field name limit
    headerPairs: 2000, // Limit header pairs
  },

  // ✅ Enhanced error handling
  onError: (err, next) => {
    console.error("Multer upload error:", {
      error: err.message,
      code: err.code,
      timestamp: new Date().toISOString(),
    });
    next(err);
  },

  // ✅ File naming for better tracking
  filename: (req, file, cb) => {
    const uniqueSuffix =
      Date.now() + "-" + crypto.randomBytes(6).toString("hex");
    const sanitizedName = file.originalname
      .replace(/[^a-zA-Z0-9\.\-_]/g, "") // Remove special characters
      .toLowerCase();

    cb(null, `${uniqueSuffix}-${sanitizedName}`);
  },
});

// ✅ Enhanced upload middleware with additional validation
const uploadMiddleware = (req, res, next) => {
  const singleUpload = upload.single("image");

  singleUpload(req, res, (err) => {
    if (err) {
      console.error("Upload middleware error:", {
        error: err.message,
        code: err.code,
        field: err.field,
        ip: req.ip,
        userAgent: req.get("User-Agent"),
        timestamp: new Date().toISOString(),
      });

      // Handle different types of errors
      if (err.code === "LIMIT_FILE_SIZE") {
        return res.status(400).json({
          success: false,
          message: "File too large. Maximum size is 5MB.",
          code: "FILE_TOO_LARGE",
          maxSize: "5MB",
        });
      }

      if (err.code === "LIMIT_FILE_COUNT") {
        return res.status(400).json({
          success: false,
          message: "Too many files. Only one image allowed.",
          code: "TOO_MANY_FILES",
          maxFiles: 1,
        });
      }

      if (err.code === "LIMIT_UNEXPECTED_FILE") {
        return res.status(400).json({
          success: false,
          message: "Unexpected file field. Use 'image' field name.",
          code: "UNEXPECTED_FILE_FIELD",
          expectedField: "image",
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

      if (err.code === "INVALID_FILE_EXTENSION") {
        return res.status(400).json({
          success: false,
          message:
            "Invalid file extension. Only .jpg, .jpeg, .png, and .webp files are allowed.",
          code: "INVALID_FILE_EXTENSION",
          allowedExtensions: [".jpg", ".jpeg", ".png", ".webp"],
        });
      }

      if (err.code === "SUSPICIOUS_FILE") {
        return res.status(400).json({
          success: false,
          message:
            "Suspicious file detected. File type not allowed for security reasons.",
          code: "SUSPICIOUS_FILE",
        });
      }

      if (err.code === "FILENAME_TOO_LONG") {
        return res.status(400).json({
          success: false,
          message: "Filename too long. Maximum 255 characters allowed.",
          code: "FILENAME_TOO_LONG",
          maxLength: 255,
        });
      }

      if (err.code === "INVALID_FILENAME") {
        return res.status(400).json({
          success: false,
          message: "Invalid filename detected.",
          code: "INVALID_FILENAME",
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

    // ✅ Additional file validation after successful upload
    if (req.file) {
      try {
        // Validate file buffer exists
        if (!req.file.buffer || req.file.buffer.length === 0) {
          return res.status(400).json({
            success: false,
            message: "Empty file uploaded. Please select a valid image.",
            code: "EMPTY_FILE",
          });
        }

        // Check file signature (magic numbers) for additional security
        const fileSignatures = {
          "image/jpeg": [0xff, 0xd8, 0xff],
          "image/png": [0x89, 0x50, 0x4e, 0x47],
          "image/webp": [0x52, 0x49, 0x46, 0x46], // RIFF
        };

        const signature = fileSignatures[req.file.mimetype];
        if (signature) {
          const fileStart = Array.from(
            req.file.buffer.slice(0, signature.length)
          );
          const signatureMatch = signature.every(
            (byte, index) => fileStart[index] === byte
          );

          if (!signatureMatch) {
            console.warn("File signature mismatch detected:", {
              fileName: req.file.originalname,
              mimetype: req.file.mimetype,
              expectedSignature: signature,
              actualSignature: fileStart,
              ip: req.ip,
            });

            return res.status(400).json({
              success: false,
              message: "File appears to be corrupted or not a valid image.",
              code: "INVALID_FILE_SIGNATURE",
            });
          }
        }

        // ✅ Fixed: Add metadata to file object with correct admin reference
        req.file.uploadTimestamp = new Date().toISOString();
        req.file.uploaderIP = req.ip;
        req.file.userAgent = req.get("User-Agent");
        req.file.adminId = req.admin?._id; // ✅ Changed from userId to adminId

        console.log("File upload successful:", {
          fileName: req.file.originalname,
          size: req.file.size,
          mimetype: req.file.mimetype,
          adminId: req.admin?._id, // ✅ Changed from userId to adminId
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

// ✅ Export the enhanced middleware
module.exports = uploadMiddleware;

// ✅ Also export the base multer instance for flexibility
module.exports.multer = upload;
module.exports.storage = storage;
module.exports.fileFilter = fileFilter;

// ✅ Export configuration for testing
module.exports.config = {
  maxFileSize: 5 * 1024 * 1024,
  allowedMimes: ["image/jpeg", "image/jpg", "image/png", "image/webp"],
  allowedExtensions: [".jpg", ".jpeg", ".png", ".webp"],
  maxFiles: 1,
};
