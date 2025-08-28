const jwt = require("jsonwebtoken");
const Admin = require("../models/Admin");

const verifyAdmin = async (req, res, next) => {
  try {
    let token = req.cookies.adminToken;

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "No token found",
      });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // FETCH ACTUAL ADMIN DATA FROM DATABASE
    const admin = await Admin.findById(decoded.id).select(
      "-username -password -code"
    );

    if (!admin) {
      return res.status(401).json({
        success: false,
        message: "Admin not found",
      });
    }

    // Set complete admin object (not just decoded token)
    req.admin = admin;
    next();
  } catch (error) {
    console.error("Admin verification error:", error);
    return res.status(403).json({
      success: false,
      message: "Invalid token",
    });
  }
};

// EXPORT WITH CORRECT NAME
module.exports = verifyAdmin;
