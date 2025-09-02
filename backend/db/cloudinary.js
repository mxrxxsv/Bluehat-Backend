const cloudinary = require("cloudinary").v2;
const logger = require("../utils/logger");
require("dotenv").config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const testConnection = async () => {
  try {
    const result = await cloudinary.api.ping();
    logger.info("Cloudinary connection successful", {
      status: result.status,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error("Cloudinary connection failed", {
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
};

testConnection();
module.exports = cloudinary;
