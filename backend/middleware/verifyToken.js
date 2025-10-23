const jwt = require("jsonwebtoken");

// Accept auth token from either cookie (preferred) or Authorization: Bearer header
const verifyToken = (req, res, next) => {
  const authHeader = req.get("Authorization") || "";
  let token = req.cookies?.token;

  if (!token && authHeader.startsWith("Bearer ")) {
    token = authHeader.slice(7).trim();
  }

  if (!token) {
    return res.status(401).json({ success: false, message: "No token found" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(403).json({ success: false, message: "Invalid token" });
  }
};

module.exports = verifyToken;
