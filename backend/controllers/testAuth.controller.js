const bcrypt = require("bcryptjs");
const Credential = require("../models/Credential");
const Worker = require("../models/Worker");
const Client = require("../models/Client");
const generateTokenandSetCookie = require("../utils/generateTokenandCookie");
const { decryptAES128 } = require("../utils/encipher");

/**
 * Test-only login endpoint that bypasses TOTP verification
 * This should ONLY be enabled in test environment
 */
const testLogin = async (req, res) => {
  // Security check: only allow in test environment
  if (process.env.NODE_ENV !== "test") {
    return res.status(403).json({
      success: false,
      message: "This endpoint is only available in test environment",
    });
  }

  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required",
      });
    }

    // Find credential with password field
    const credential = await Credential.findOne({ email }).select(
      "+password +email"
    );

    if (!credential) {
      return res.status(400).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, credential.password);

    if (!isPasswordValid) {
      return res.status(400).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    // Get user profile based on userType
    let user;
    if (credential.userType === "worker") {
      user = await Worker.findOne({ credentialId: credential._id });
    } else if (credential.userType === "client") {
      user = await Client.findOne({ credentialId: credential._id });
    }

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User profile not found",
      });
    }

    // Update credential
    credential.isAuthenticated = true;
    credential.lastLogin = new Date();
    credential.loginAttempts = 0;
    credential.lockUntil = undefined;
    await credential.save();

    // Generate token and set cookie
    generateTokenandSetCookie(res, credential);

    // Decrypt user data if encrypted (handle both encrypted and plain text for test environment)
    let firstName = user.firstName;
    let lastName = user.lastName;

    try {
      // Try to decrypt - if it fails, it's probably plain text
      if (firstName && typeof firstName === "string" && firstName.length > 20) {
        firstName = decryptAES128(firstName);
      }
      if (lastName && typeof lastName === "string" && lastName.length > 20) {
        lastName = decryptAES128(lastName);
      }
    } catch (error) {
      // If decryption fails, use the original values (plain text in test env)
      firstName = user.firstName;
      lastName = user.lastName;
    }

    // Return success response
    return res.status(200).json({
      success: true,
      message: "Test login successful",
      user: {
        id: credential._id,
        email: credential.email,
        userType: credential.userType,
        firstName: firstName,
        lastName: lastName,
      },
    });
  } catch (error) {
    console.error("Test login error:", error);
    console.error("Error stack:", error.stack);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
      stack: process.env.NODE_ENV === "test" ? error.stack : undefined,
    });
  }
};

module.exports = {
  testLogin,
};
