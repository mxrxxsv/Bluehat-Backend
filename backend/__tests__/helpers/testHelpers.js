const jwt = require("jsonwebtoken");
const speakeasy = require("speakeasy");

// Generate test JWT token
const generateTestToken = (userId, userType = "worker") => {
  return jwt.sign(
    { id: userId, userType },
    process.env.JWT_SECRET || "test-secret-key",
    { expiresIn: "1h" }
  );
};

// Create authenticated request headers
const getAuthHeaders = (token) => {
  return {
    Cookie: `token=${token}`,
  };
};

// Create test user (credential + profile)
const createTestUser = async (Credential, ProfileModel, userData, userType) => {
  const { mockCredentials } = require("./testData");
  const { encryptAES128 } = require("../../utils/encipher");

  // Generate TOTP secret
  const secret = speakeasy.generateSecret({ length: 20 });

  // Create credential
  const credential = await Credential.create({
    email: mockCredentials[userType].email,
    password: mockCredentials[userType].hashedPassword,
    userType,
    totpSecret: secret.base32,
    isAuthenticated: true,
  });

  // Encrypt sensitive user data for test environment
  const encryptedUserData = { ...userData };
  if (userData.firstName)
    encryptedUserData.firstName = encryptAES128(userData.firstName);
  if (userData.lastName)
    encryptedUserData.lastName = encryptAES128(userData.lastName);

  // Encrypt address fields if present
  if (userData.address) {
    encryptedUserData.address = {
      region: userData.address.region
        ? encryptAES128(userData.address.region)
        : "",
      province: userData.address.province
        ? encryptAES128(userData.address.province)
        : "",
      city: userData.address.city ? encryptAES128(userData.address.city) : "",
      barangay: userData.address.barangay
        ? encryptAES128(userData.address.barangay)
        : "",
      street: userData.address.street
        ? encryptAES128(userData.address.street)
        : "",
    };
  }

  // Create profile
  const profile = await ProfileModel.create({
    credentialId: credential._id,
    ...encryptedUserData,
  });

  return { credential, profile };
};

// Clean up test data
const cleanupTestData = async (models) => {
  for (const model of models) {
    await model.deleteMany({});
  }
};

// Wait for a condition to be true (for async operations)
const waitFor = (conditionFn, timeout = 5000, interval = 100) => {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    const checkCondition = () => {
      if (conditionFn()) {
        resolve();
      } else if (Date.now() - startTime > timeout) {
        reject(new Error("Timeout waiting for condition"));
      } else {
        setTimeout(checkCondition, interval);
      }
    };
    checkCondition();
  });
};

module.exports = {
  generateTestToken,
  getAuthHeaders,
  createTestUser,
  cleanupTestData,
  waitFor,
};
