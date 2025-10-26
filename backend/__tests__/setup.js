const mongoose = require("mongoose");
const { MongoMemoryServer } = require("mongodb-memory-server");

let mongoServer;

// Setup before all tests
beforeAll(async () => {
  try {
    // Create in-memory MongoDB instance
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();

    // Disconnect from any existing connection
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }

    // Connect to in-memory database
    await mongoose.connect(mongoUri);

    console.log("✅ Connected to test database");
  } catch (error) {
    console.error("❌ Failed to connect to test database:", error);
    throw error;
  }
});

// Cleanup after each test
afterEach(async () => {
  try {
    const collections = mongoose.connection.collections;
    for (const key in collections) {
      await collections[key].deleteMany();
    }
  } catch (error) {
    console.error("❌ Failed to clean up test data:", error);
  }
});

// Cleanup after all tests
afterAll(async () => {
  try {
    await mongoose.disconnect();
    await mongoServer.stop();
    console.log("✅ Disconnected from test database");
  } catch (error) {
    console.error("❌ Failed to disconnect from test database:", error);
  }
});

// Increase timeout for database operations
jest.setTimeout(30000);
