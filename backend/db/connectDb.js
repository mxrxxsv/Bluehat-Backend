const mongoose = require("mongoose");

const connectDb = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI, {
      // Connection pool settings
      maxPoolSize: process.env.NODE_ENV === "production" ? 20 : 10, // More connections in production
      minPoolSize: 2, // Minimum connections to maintain
      maxIdleTimeMS: 30000, // Close connections after 30 seconds of inactivity

      // Timeout settings
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      connectTimeoutMS: 10000, // Connection timeout

      // Network settings
      family: 4, // Use IPv4

      // Add authentication if using MongoDB Auth
      ...(process.env.MONGO_AUTH && {
        authSource: "admin",
        authMechanism: "SCRAM-SHA-1",
      }),
    });

    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`❌ Database connection failed: ${error.message}`);
    throw error;
  }
};

module.exports = connectDb;
