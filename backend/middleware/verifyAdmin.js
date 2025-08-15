const jwt = require("jsonwebtoken");
const Admin = require("../models/Admin");

const verifyAdmin = async (req, res, next) => {
  try {
    let token;

    // Check for token in Authorization header
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      token = authHeader.split(" ")[1];
    }
    // Check for token in cookies (for web applications)
    else if (req.cookies && req.cookies.adminToken) {
      token = req.cookies.adminToken;
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Access denied. No token provided.",
      });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Find admin
    const admin = await Admin.findById(decoded.id);
    if (!admin) {
      return res.status(403).json({
        success: false,
        message: "Admin not found.",
      });
    }

    // Attach admin info to request
    req.admin = admin;
    next();
  } catch (err) {
    console.error("Admin verification error:", err);

    if (err.name === "TokenExpiredError") {
      return res.status(401).json({
        success: false,
        message: "Token expired. Please login again.",
      });
    }

    if (err.name === "JsonWebTokenError") {
      return res.status(401).json({
        success: false,
        message: "Invalid token.",
      });
    }

    return res.status(401).json({
      success: false,
      message: "Token verification failed.",
    });
  }
};

module.exports = verifyAdmin;
