const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const Admin = require("../models/Admin");
const verifyAdmin = require("../middleware/verifyAdmin");

// JWT Token Generation Function
const generateAdminToken = (adminId) => {
  return jwt.sign(
    { id: adminId, role: "admin" },
    process.env.JWT_SECRET,
    { expiresIn: "24h" } // Token expires in 24 hours
  );
};

// Set JWT Cookie Function
const setAdminTokenCookie = (res, token) => {
  res.cookie("adminToken", token, {
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
  });
};

// Admin Signup
router.post("/signup", async (req, res) => {
  try {
    const { firstName, lastName, userName, password, code } = req.body;

    // Validation
    if (!firstName || !lastName || !userName || !password || !code) {
      return res.status(400).json({
        success: false,
        message: "All fields are required",
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 8 characters long",
      });
    }

    if (code.length !== 6) {
      return res.status(400).json({
        success: false,
        message: "Admin code is not valid",
      });
    }

    // Check for existing admin
    const existingAdmin = await Admin.findOne({ userName });
    if (existingAdmin) {
      return res.status(400).json({
        success: false,
        message: "Your username is not valid. Please choose a different one.",
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create admin
    const newAdmin = new Admin({
      firstName,
      lastName,
      userName,
      password: hashedPassword,
      code,
    });

    await newAdmin.save();

    // Generate JWT token
    const token = generateAdminToken(newAdmin._id);
    setAdminTokenCookie(res, token);

    res.status(201).json({
      success: true,
      message: "Admin created successfully",
      admin: {
        id: newAdmin._id,
        firstName: newAdmin.firstName,
        lastName: newAdmin.lastName,
        role: "admin",
      },
    });
  } catch (error) {
    console.error("Admin signup error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
});

// Admin Login
router.post("/login", async (req, res) => {
  try {
    const { userName, password } = req.body;

    // Validation
    if (!userName || !password) {
      return res.status(400).json({
        success: false,
        message: "Username and password are required",
      });
    }

    // Find admin (include password field)
    const admin = await Admin.findOne({ userName }).select("+password");
    if (!admin) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    // Verify password
    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    // Generate JWT token
    const token = generateAdminToken(admin._id);
    setAdminTokenCookie(res, token);

    // Update last login
    admin.lastLogin = new Date();
    await admin.save();

    res.status(200).json({
      success: true,
      message: "Login successful",
      admin: {
        id: admin._id,
        firstName: admin.firstName,
        lastName: admin.lastName,
        role: "admin",
      },
    });
  } catch (error) {
    console.error("Admin login error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
});

// Admin Profile (Protected Route)
router.get("/profile", verifyAdmin, async (req, res) => {
  try {
    res.status(200).json({
      success: true,
      admin: {
        id: req.admin._id,
        firstName: req.admin.firstName,
        lastName: req.admin.lastName,
        role: "admin",
      },
    });
  } catch (error) {
    console.error("Get admin profile error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
});

// Admin Logout
router.post("/logout", verifyAdmin, async (req, res) => {
  try {
    res.clearCookie("adminToken");
    res.status(200).json({
      success: true,
      message: "Logout successful",
    });
  } catch (error) {
    console.error("Admin logout error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
});

// Check Admin Authentication
router.get("/check-auth", verifyAdmin, async (req, res) => {
  try {
    res.status(200).json({
      success: true,
      isAuthenticated: true,
      admin: {
        id: req.admin._id,
        firstName: req.admin.firstName,
        lastName: req.admin.lastName,
        role: "admin",
      },
    });
  } catch (error) {
    console.error("Check admin auth error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
});

// Get All Admins (Super Admin only)
router.get("/all", verifyAdmin, async (req, res) => {
  try {
    const admins = await Admin.find({}).select("-password -code");

    res.status(200).json({
      success: true,
      count: admins.length,
      admins: admins,
    });
  } catch (error) {
    console.error("Get all admins error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
});

module.exports = router;
