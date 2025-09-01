const cloudinary = require("cloudinary").v2;
const logger = require("./logger");
require("dotenv").config();

// ✅ Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true, // Force HTTPS URLs
});

// ✅ Verify configuration on startup
const verifyCloudinaryConfig = () => {
  try {
    const { cloud_name, api_key, api_secret } = cloudinary.config();

    if (!cloud_name || !api_key || !api_secret) {
      throw new Error("Missing Cloudinary configuration");
    }

    logger.info("Cloudinary configuration verified successfully", {
      cloud_name,
      timestamp: new Date().toISOString(),
    });

    return true;
  } catch (error) {
    logger.error("Cloudinary configuration failed", {
      error: error.message,
      timestamp: new Date().toISOString(),
    });
    return false;
  }
};

// ✅ Helper function to delete multiple files
const deleteMultipleFiles = async (publicIds) => {
  try {
    if (!Array.isArray(publicIds) || publicIds.length === 0) {
      return { success: true, deleted: [] };
    }

    const result = await cloudinary.api.delete_resources(publicIds);

    logger.info("Multiple files deleted from Cloudinary", {
      deletedCount: Object.keys(result.deleted).length,
      publicIds,
      timestamp: new Date().toISOString(),
    });

    return {
      success: true,
      deleted: result.deleted,
      failed: result.partial ? result.partial : {},
    };
  } catch (error) {
    logger.error("Failed to delete multiple files from Cloudinary", {
      error: error.message,
      publicIds,
      timestamp: new Date().toISOString(),
    });

    return {
      success: false,
      error: error.message,
    };
  }
};

// ✅ Helper function to get file info
const getFileInfo = async (publicId) => {
  try {
    const result = await cloudinary.api.resource(publicId);
    return {
      success: true,
      data: result,
    };
  } catch (error) {
    logger.warn("Failed to get file info from Cloudinary", {
      error: error.message,
      publicId,
      timestamp: new Date().toISOString(),
    });

    return {
      success: false,
      error: error.message,
    };
  }
};

// ✅ Helper function for optimized upload with retries
const uploadWithRetry = async (fileBuffer, options, maxRetries = 3) => {
  let lastError;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const result = await new Promise((resolve, reject) => {
        cloudinary.uploader
          .upload_stream(
            {
              ...options,
              timeout: 60000, // 60 seconds timeout
            },
            (error, result) => {
              if (error) reject(error);
              else resolve(result);
            }
          )
          .end(fileBuffer);
      });

      logger.info("File uploaded to Cloudinary successfully", {
        publicId: result.public_id,
        url: result.secure_url,
        attempt,
        timestamp: new Date().toISOString(),
      });

      return {
        success: true,
        data: result,
      };
    } catch (error) {
      lastError = error;

      logger.warn(`Cloudinary upload attempt ${attempt} failed`, {
        error: error.message,
        attempt,
        maxRetries,
        publicId: options?.public_id,
        timestamp: new Date().toISOString(),
      });

      // Wait before retry (exponential backoff)
      if (attempt < maxRetries) {
        await new Promise((resolve) =>
          setTimeout(resolve, Math.pow(2, attempt) * 1000)
        );
      }
    }
  }

  logger.error("All Cloudinary upload attempts failed", {
    error: lastError.message,
    maxRetries,
    publicId: options?.public_id,
    timestamp: new Date().toISOString(),
  });

  return {
    success: false,
    error: lastError.message,
  };
};

// ✅ Verify configuration on module load
verifyCloudinaryConfig();

module.exports = {
  ...cloudinary,
  verifyCloudinaryConfig,
  deleteMultipleFiles,
  getFileInfo,
  uploadWithRetry,
};
