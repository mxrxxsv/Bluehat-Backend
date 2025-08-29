const mongoose = require("mongoose");

const connectDb = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI, {
      // Security options
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
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
